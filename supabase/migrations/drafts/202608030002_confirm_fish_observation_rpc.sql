-- DRAFT ONLY. DO NOT APPLY.
--
-- Depends on 202608030001_blue_marina_fish_domain_final_schema.sql. This
-- document is a proposed incremental migration for review, not a production
-- deployment script.

-- The application confirmation contract needs an explicit state on the source
-- observation. The verification row remains the authoritative history.
alter table public.fish_observations
  add column if not exists verification_status text not null default 'pending'
  check (verification_status in ('pending', 'user_confirmed', 'expert_confirmed', 'rejected', 'archived'));

-- A request reservation and its completed response make client retries safe.
-- The request hash prevents one idempotency key from being reused for another
-- observation/species selection.
create table if not exists public.fish_observation_confirmations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  observation_id uuid not null references public.fish_observations(id) on delete cascade,
  selected_species_id uuid not null references public.fish_species(id) on delete restrict,
  verified_by uuid references auth.users(id) on delete set null,
  request_hash text not null,
  status text not null default 'processing' check (status in ('processing', 'completed')),
  result_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'completed') = (result_payload is not null))
);
create index if not exists fish_observation_confirmations_observation_idx
  on public.fish_observation_confirmations (observation_id, created_at desc);

-- Achievement events are immutable inputs to the personal read model. The
-- unique key prevents a retry or verification override from unlocking the
-- same observation achievement twice.
create table if not exists public.fish_achievement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid not null references public.fish_observations(id) on delete cascade,
  species_id uuid not null references public.fish_species(id) on delete restrict,
  achievement_type text not null,
  created_at timestamptz not null default now(),
  unique (observation_id, achievement_type)
);
create index if not exists fish_achievement_events_user_created_idx
  on public.fish_achievement_events (user_id, created_at desc);

alter table public.fish_observation_confirmations enable row level security;
alter table public.fish_achievement_events enable row level security;

-- Confirmation reservations are intentionally RPC-only. Achievement history is
-- readable only by its owner; no direct client write policy is proposed.
create policy fish_achievement_events_owner_read on public.fish_achievement_events
  for select using (user_id = auth.uid());

-- Owner update access on observations is intentionally narrow. This guard
-- keeps species confirmation and public sharing behind audited server flows.
create or replace function public.guard_fish_observation_protected_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $guard$
begin
  if new.species_id is distinct from old.species_id
     or new.verification_status is distinct from old.verification_status then
    if current_setting('fish.observation_mutation_context', true) is distinct from 'confirm_fish_observation' then
      raise exception using errcode = '42501', message = 'fish_observation_confirmation_rpc_required';
    end if;
  end if;

  if new.visibility = 'public' and old.visibility is distinct from 'public'
     and current_setting('fish.observation_mutation_context', true) is distinct from 'publish_fish_observation' then
    raise exception using errcode = '42501', message = 'fish_observation_publication_workflow_required';
  end if;

  if new.deletion_status = 'deleted' and old.deletion_status is distinct from 'deleted'
     and current_setting('fish.observation_mutation_context', true) is distinct from 'delete_fish_observation' then
    raise exception using errcode = '42501', message = 'fish_observation_deletion_workflow_required';
  end if;

  return new;
end;
$guard$;

create trigger fish_observations_protected_fields
before update of species_id, verification_status, visibility, deletion_status on public.fish_observations
for each row execute function public.guard_fish_observation_protected_fields();

create or replace function public.confirm_fish_observation(
  p_observation_id uuid,
  p_selected_species_id uuid,
  p_verification_type text,
  p_verified_by uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_caller uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'fish_role', '');
  v_request_hash text;
  v_confirmation_id uuid;
  v_existing_hash text;
  v_existing_result jsonb;
  v_observation public.fish_observations%rowtype;
  v_species public.fish_species%rowtype;
  v_current_verification_id uuid;
  v_current_species_id uuid;
  v_current_verification_type text;
  v_current_verified_by uuid;
  v_before jsonb;
  v_result jsonb;
  v_achievement_events_created integer := 0;
  v_old_species_count integer;
  v_old_species_first_observation_id uuid;
  v_old_species_latest_observation_id uuid;
  v_old_species_first_photo_id uuid;
  v_old_species_latest_photo_id uuid;
  v_old_species_first_discovered_at timestamptz;
  v_old_species_best_length_cm numeric;
  v_old_species_best_weight_g numeric;
begin
  perform set_config('fish.observation_mutation_context', 'confirm_fish_observation', true);

  if v_caller is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using errcode = '22023', message = 'idempotency_key_required';
  end if;

  if p_verified_by is distinct from v_caller then
    raise exception using errcode = '42501', message = 'verified_by_must_match_authenticated_actor';
  end if;

  if p_verification_type not in ('user_confirmed', 'expert_confirmed') then
    raise exception using errcode = '22023', message = 'unsupported_verification_type';
  end if;

  if v_role = 'fish_reviewer' and p_verification_type <> 'expert_confirmed' then
    raise exception using errcode = '42501', message = 'reviewer_requires_expert_confirmation';
  end if;

  if v_role not in ('fish_admin', 'fish_reviewer') and p_verification_type <> 'user_confirmed' then
    raise exception using errcode = '42501', message = 'owner_requires_user_confirmation';
  end if;

  v_request_hash := encode(
    digest(concat_ws('|', p_observation_id::text, p_selected_species_id::text, p_verification_type, p_verified_by::text), 'sha256'),
    'hex'
  );

  -- Reserve the key. A conflicting concurrent call waits for the first call to
  -- finish; it then returns the stored response below instead of duplicating work.
  insert into public.fish_observation_confirmations (
    idempotency_key, observation_id, selected_species_id, verified_by, request_hash
  ) values (
    btrim(p_idempotency_key), p_observation_id, p_selected_species_id, p_verified_by, v_request_hash
  ) on conflict (idempotency_key) do nothing
  returning id into v_confirmation_id;

  if v_confirmation_id is null then
    select id, request_hash, result_payload
      into v_confirmation_id, v_existing_hash, v_existing_result
    from public.fish_observation_confirmations
    where idempotency_key = btrim(p_idempotency_key)
    for update;

    if v_existing_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency_key_request_mismatch';
    end if;

    if v_existing_result is not null then
      return v_existing_result || jsonb_build_object('idempotent', true);
    end if;

    raise exception using errcode = '40001', message = 'confirmation_request_still_processing';
  end if;

  select * into v_observation
  from public.fish_observations
  where id = p_observation_id
  for update;

  if not found or v_observation.deletion_status <> 'active' then
    raise exception using errcode = 'P0002', message = 'observation_not_found_or_deleted';
  end if;

  if v_role not in ('fish_admin', 'fish_reviewer') and v_observation.user_id <> v_caller then
    raise exception using errcode = '42501', message = 'observation_owner_required';
  end if;

  select * into v_species
  from public.fish_species
  where id = p_selected_species_id
  for key share;

  if not found or v_species.archived_at is not null or v_species.publish_status = 'archived' then
    raise exception using errcode = '22023', message = 'species_not_selectable';
  end if;

  if v_role <> 'fish_admin' and (v_species.publish_status <> 'published' or v_species.fact_review_status <> 'approved') then
    raise exception using errcode = '22023', message = 'species_not_published_for_confirmation';
  end if;

  if v_role <> 'fish_admin' and not exists (
    select 1
    from public.fish_identification_attempts attempt
    cross join lateral jsonb_array_elements(attempt.candidates) candidate
    where attempt.observation_id = p_observation_id
      and attempt.status = 'completed'
      and coalesce(candidate ->> 'speciesId', candidate ->> 'species_id') = p_selected_species_id::text
  ) then
    raise exception using errcode = '22023', message = 'selected_species_is_not_an_ai_candidate';
  end if;

  select id, selected_species_id, verification_type, verified_by
    into v_current_verification_id, v_current_species_id, v_current_verification_type, v_current_verified_by
  from public.fish_observation_verifications
  where observation_id = p_observation_id and is_current
  for update;

  if v_current_verification_id is not null
     and v_current_species_id = p_selected_species_id
     and v_current_verification_type = p_verification_type
     and v_current_verified_by is not distinct from p_verified_by then
    v_result := jsonb_build_object(
      'success', true,
      'idempotent', true,
      'observationId', p_observation_id,
      'speciesId', p_selected_species_id,
      'collectionUpdated', false,
      'achievementEventsCreated', 0,
      'warnings', jsonb_build_array('matching_current_verification_exists'),
      'blockReasons', jsonb_build_array()
    );

    update public.fish_observation_confirmations
    set status = 'completed', result_payload = v_result, completed_at = now()
    where id = v_confirmation_id;

    return v_result;
  end if;

  if v_current_verification_id is not null and v_role <> 'fish_admin' then
    raise exception using errcode = '22023', message = 'observation_already_confirmed';
  end if;

  v_before := jsonb_build_object(
    'observation', to_jsonb(v_observation),
    'currentVerificationId', v_current_verification_id,
    'currentSpeciesId', v_current_species_id
  );

  if v_current_verification_id is not null then
    update public.fish_observation_verifications
    set is_current = false, superseded_at = now()
    where id = v_current_verification_id;
  end if;

  insert into public.fish_observation_verifications (
    observation_id, selected_species_id, verification_type, verified_by, is_current
  ) values (
    p_observation_id, p_selected_species_id, p_verification_type, p_verified_by, true
  );

  update public.fish_observations
  set species_id = p_selected_species_id,
      verification_status = p_verification_type
  where id = p_observation_id;

  insert into public.fish_collections (
    user_id, species_id, first_discovered_at, discovery_count, first_observation_id,
    latest_observation_id, first_photo_id, latest_photo_id, best_length_cm, best_weight_g
  ) values (
    v_observation.user_id, p_selected_species_id, v_observation.captured_at, 1, p_observation_id,
    p_observation_id, v_observation.photo_media_id, v_observation.photo_media_id,
    v_observation.length_cm, v_observation.weight_g
  ) on conflict (user_id, species_id) do update set
    discovery_count = public.fish_collections.discovery_count + 1,
    latest_observation_id = excluded.latest_observation_id,
    latest_photo_id = coalesce(excluded.latest_photo_id, public.fish_collections.latest_photo_id),
    best_length_cm = case
      when public.fish_collections.best_length_cm is null then excluded.best_length_cm
      when excluded.best_length_cm is null then public.fish_collections.best_length_cm
      else greatest(public.fish_collections.best_length_cm, excluded.best_length_cm)
    end,
    best_weight_g = case
      when public.fish_collections.best_weight_g is null then excluded.best_weight_g
      when excluded.best_weight_g is null then public.fish_collections.best_weight_g
      else greatest(public.fish_collections.best_weight_g, excluded.best_weight_g)
    end;

  if nullif(btrim(v_observation.region), '') is not null then
    insert into public.fish_collection_regions (
      user_id, species_id, region, first_discovered_at, latest_discovered_at, discovery_count
    ) values (
      v_observation.user_id, p_selected_species_id, v_observation.region,
      v_observation.captured_at, v_observation.captured_at, 1
    ) on conflict (user_id, species_id, region) do update set
      latest_discovered_at = excluded.latest_discovered_at,
      discovery_count = public.fish_collection_regions.discovery_count + 1;
  end if;

  -- An admin override changes the canonical species for an already-counted
  -- observation. Rebuild the old aggregate from current verification history
  -- instead of decrementing a counter that might have been repaired elsewhere.
  if v_current_species_id is not null and v_current_species_id <> p_selected_species_id then
    select
      count(*)::integer,
      min(observation.captured_at),
      (array_agg(observation.id order by observation.captured_at asc, observation.id asc))[1],
      (array_agg(observation.id order by observation.captured_at desc, observation.id desc))[1],
      (array_agg(observation.photo_media_id order by observation.captured_at asc, observation.id asc))[1],
      (array_agg(observation.photo_media_id order by observation.captured_at desc, observation.id desc))[1],
      max(observation.length_cm),
      max(observation.weight_g)
    into
      v_old_species_count, v_old_species_first_discovered_at, v_old_species_first_observation_id,
      v_old_species_latest_observation_id, v_old_species_first_photo_id, v_old_species_latest_photo_id,
      v_old_species_best_length_cm, v_old_species_best_weight_g
    from public.fish_observations observation
    join public.fish_observation_verifications verification
      on verification.observation_id = observation.id and verification.is_current
    where observation.user_id = v_observation.user_id
      and observation.deletion_status = 'active'
      and verification.selected_species_id = v_current_species_id;

    if v_old_species_count = 0 then
      delete from public.fish_collections
      where user_id = v_observation.user_id and species_id = v_current_species_id;
    else
      update public.fish_collections
      set first_discovered_at = v_old_species_first_discovered_at,
          discovery_count = v_old_species_count,
          first_observation_id = v_old_species_first_observation_id,
          latest_observation_id = v_old_species_latest_observation_id,
          first_photo_id = v_old_species_first_photo_id,
          latest_photo_id = v_old_species_latest_photo_id,
          best_length_cm = v_old_species_best_length_cm,
          best_weight_g = v_old_species_best_weight_g
      where user_id = v_observation.user_id and species_id = v_current_species_id;
    end if;
  end if;

  insert into public.fish_achievement_events (
    user_id, observation_id, species_id, achievement_type
  ) values (
    v_observation.user_id, p_observation_id, p_selected_species_id, 'fish_observation_confirmed'
  ) on conflict (observation_id, achievement_type) do nothing;
  get diagnostics v_achievement_events_created = row_count;

  v_result := jsonb_build_object(
    'success', true,
    'idempotent', false,
    'observationId', p_observation_id,
    'speciesId', p_selected_species_id,
    'collectionUpdated', true,
    'achievementEventsCreated', v_achievement_events_created,
    'warnings', case when v_current_verification_id is null then '[]'::jsonb else jsonb_build_array('admin_override_reconciled_previous_collection') end,
    'blockReasons', jsonb_build_array()
  );

  insert into public.fish_change_logs (
    entity_type, entity_id, change_type, before_payload, after_payload, actor_type
  ) values (
    'fish_observation', p_observation_id, 'confirm_observation', v_before, v_result,
    case when v_role = 'fish_admin' then 'admin' when v_role = 'fish_reviewer' then 'reviewer' else 'system' end
  );

  update public.fish_observation_confirmations
  set status = 'completed', result_payload = v_result, completed_at = now()
  where id = v_confirmation_id;

  return v_result;
end;
$function$;

revoke all on function public.confirm_fish_observation(uuid, uuid, text, uuid, text) from public;
grant execute on function public.confirm_fish_observation(uuid, uuid, text, uuid, text) to authenticated;

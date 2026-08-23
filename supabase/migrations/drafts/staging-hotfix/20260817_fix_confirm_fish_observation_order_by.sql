-- STAGING HOTFIX. Replaces only confirm_fish_observation to make the
-- DISTINCT species rebuild loops use a valid deterministic UUID ordering.
begin;

create or replace function public.confirm_fish_observation(
  p_observation_id uuid,p_selected_species_id uuid,p_verification_type text,p_verified_by uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,auth,extensions,pg_temp as $$
declare
  v_caller uuid:=auth.uid(); v_role text:=public.current_fish_role();
  v_observation public.fish_observations%rowtype; v_species public.fish_species%rowtype;
  v_hash text; v_confirmation uuid; v_existing_hash text; v_existing_result jsonb;
  v_result jsonb; v_events integer:=0; v_has_current boolean:=false;
  v_current_verification_id uuid; v_previous_species_id uuid; v_rebuild_species_id uuid;
begin
  perform set_config('fish.observation_mutation_context','confirm_fish_observation',true);
  if v_caller is null then raise exception using errcode='42501',message='authentication_required'; end if;
  if p_verified_by is distinct from v_caller then raise exception using errcode='42501',message='verified_by_must_match_authenticated_actor'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key)='' then raise exception using errcode='22023',message='idempotency_key_required'; end if;
  if p_verification_type not in ('user_confirmed','expert_confirmed') then raise exception using errcode='22023',message='unsupported_verification_type'; end if;
  if v_role='fish_crawler' then raise exception using errcode='42501',message='crawler_confirmation_forbidden'; end if;
  if v_role not in ('fish_admin','fish_reviewer') and p_verification_type<>'user_confirmed' then raise exception using errcode='42501',message='owner_requires_user_confirmation'; end if;
  if v_role='fish_reviewer' and p_verification_type<>'expert_confirmed' then raise exception using errcode='42501',message='reviewer_requires_expert_confirmation'; end if;

  v_hash:=encode(digest(concat_ws('|',p_observation_id::text,p_selected_species_id::text,p_verification_type,p_verified_by::text),'sha256'),'hex');
  insert into public.fish_observation_confirmations(idempotency_key,observation_id,selected_species_id,verified_by,request_hash)
  values(btrim(p_idempotency_key),p_observation_id,p_selected_species_id,p_verified_by,v_hash)
  on conflict(idempotency_key) do nothing returning id into v_confirmation;
  if v_confirmation is null then
    select request_hash,result_payload into v_existing_hash,v_existing_result from public.fish_observation_confirmations
    where idempotency_key=btrim(p_idempotency_key) for update;
    if v_existing_hash is distinct from v_hash then raise exception using errcode='22023',message='idempotency_key_request_mismatch'; end if;
    if v_existing_result is not null then return v_existing_result||jsonb_build_object('idempotent',true); end if;
    raise exception using errcode='40001',message='confirmation_request_still_processing';
  end if;

  select * into v_observation from public.fish_observations where id=p_observation_id for update;
  if not found or v_observation.deletion_status<>'active' then raise exception using errcode='P0002',message='observation_not_found_or_deleted'; end if;
  if v_role not in ('fish_admin','fish_reviewer') and v_observation.user_id<>v_caller then raise exception using errcode='42501',message='observation_owner_required'; end if;
  select id,selected_species_id into v_current_verification_id,v_previous_species_id
  from public.fish_observation_verifications where observation_id=p_observation_id and is_current for update;
  v_has_current:=found;
  if v_has_current and v_role<>'fish_admin' then
    raise exception using errcode='22023',message='observation_already_confirmed';
  end if;
  v_previous_species_id:=coalesce(v_previous_species_id,v_observation.species_id);
  select * into v_species from public.fish_species where id=p_selected_species_id for key share;
  if not found or v_species.archived_at is not null or v_species.publish_status='archived' then raise exception using errcode='22023',message='species_not_selectable'; end if;
  if v_role<>'fish_admin' and (v_species.publish_status<>'published' or v_species.fact_review_status<>'approved') then raise exception using errcode='22023',message='species_not_published_for_confirmation'; end if;
  if v_role<>'fish_admin' and not exists(
    select 1 from public.fish_identification_attempts a cross join lateral jsonb_array_elements(a.candidates) c
    where a.observation_id=p_observation_id and a.status='completed' and coalesce(c->>'speciesId',c->>'species_id')=p_selected_species_id::text
  ) then raise exception using errcode='22023',message='selected_species_is_not_an_ai_candidate'; end if;

  -- UUID ordering is deterministic and remains valid with SELECT DISTINCT.
  for v_rebuild_species_id in
    select distinct species_id from unnest(array[v_previous_species_id,p_selected_species_id]) as s(species_id)
    where species_id is not null order by species_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_observation.user_id::text||':'||v_rebuild_species_id::text,0));
  end loop;

  if v_has_current then
    update public.fish_observation_verifications
    set is_current=false,superseded_at=now() where id=v_current_verification_id;
  end if;
  insert into public.fish_observation_verifications(observation_id,selected_species_id,verification_type,verified_by,is_current)
  values(p_observation_id,p_selected_species_id,p_verification_type,p_verified_by,true);
  update public.fish_observations set species_id=p_selected_species_id,verification_status=p_verification_type where id=p_observation_id;

  -- Rebuild exact aggregates instead of incrementing. This makes admin species
  -- corrections and retries safe for both the old and new species.
  for v_rebuild_species_id in
    select distinct species_id from unnest(array[v_previous_species_id,p_selected_species_id]) as s(species_id)
    where species_id is not null order by species_id
  loop
    insert into public.fish_collections(user_id,species_id,first_discovered_at,discovery_count,first_observation_id,latest_observation_id,first_photo_id,latest_photo_id,best_length_cm,best_weight_g)
    select v_observation.user_id,v_rebuild_species_id,min(o.captured_at),count(*)::integer,
      (array_agg(o.id order by o.captured_at,o.created_at,o.id))[1],
      (array_agg(o.id order by o.captured_at desc,o.created_at desc,o.id desc))[1],
      (array_agg(o.photo_media_id order by o.captured_at,o.created_at,o.id) filter(where o.photo_media_id is not null))[1],
      (array_agg(o.photo_media_id order by o.captured_at desc,o.created_at desc,o.id desc) filter(where o.photo_media_id is not null))[1],
      max(o.length_cm),max(o.weight_g)
    from public.fish_observations o
    where o.user_id=v_observation.user_id and o.species_id=v_rebuild_species_id
      and o.verification_status in ('user_confirmed','expert_confirmed') and o.deletion_status='active'
    having count(*)>0
    on conflict(user_id,species_id) do update set
      first_discovered_at=excluded.first_discovered_at,discovery_count=excluded.discovery_count,
      first_observation_id=excluded.first_observation_id,latest_observation_id=excluded.latest_observation_id,
      first_photo_id=excluded.first_photo_id,latest_photo_id=excluded.latest_photo_id,
      best_length_cm=excluded.best_length_cm,best_weight_g=excluded.best_weight_g,updated_at=now();
    delete from public.fish_collections c where c.user_id=v_observation.user_id and c.species_id=v_rebuild_species_id
      and not exists(select 1 from public.fish_observations o where o.user_id=c.user_id and o.species_id=c.species_id and o.verification_status in ('user_confirmed','expert_confirmed') and o.deletion_status='active');
    delete from public.fish_collection_regions where user_id=v_observation.user_id and species_id=v_rebuild_species_id;
    insert into public.fish_collection_regions(user_id,species_id,region,first_discovered_at,latest_discovered_at,discovery_count)
    select v_observation.user_id,v_rebuild_species_id,o.region,min(o.captured_at),max(o.captured_at),count(*)::integer
    from public.fish_observations o
    where o.user_id=v_observation.user_id and o.species_id=v_rebuild_species_id
      and o.verification_status in ('user_confirmed','expert_confirmed') and o.deletion_status='active'
      and nullif(btrim(o.region),'') is not null group by o.region;
  end loop;
  insert into public.fish_achievement_events(user_id,observation_id,species_id,achievement_type)
  values(v_observation.user_id,p_observation_id,p_selected_species_id,'fish_observation_confirmed') on conflict(observation_id,achievement_type) do nothing;
  get diagnostics v_events=row_count;
  if v_events=0 then
    update public.fish_achievement_events set species_id=p_selected_species_id
    where observation_id=p_observation_id and achievement_type='fish_observation_confirmed';
  end if;
  v_result:=jsonb_build_object('success',true,'idempotent',false,'observationId',p_observation_id,'speciesId',p_selected_species_id,'collectionUpdated',true,'achievementEventsCreated',v_events);
  insert into public.fish_change_logs(entity_type,entity_id,change_type,before_payload,after_payload,actor_type)
  values('fish_observation',p_observation_id,case when v_has_current then 'override_observation_confirmation' else 'confirm_observation' end,
    jsonb_build_object('speciesId',v_previous_species_id,'verificationStatus',v_observation.verification_status),v_result,
    case when v_role='fish_admin' then 'admin' when v_role='fish_reviewer' then 'reviewer' else 'system' end);
  update public.fish_observation_confirmations set status='completed',result_payload=v_result,completed_at=now() where id=v_confirmation;
  return v_result;
end $$;

revoke all on function public.confirm_fish_observation(uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_fish_observation(uuid,uuid,text,uuid,text) to authenticated;

commit;

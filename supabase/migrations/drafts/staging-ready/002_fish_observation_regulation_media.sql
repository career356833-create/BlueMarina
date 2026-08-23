-- DRAFT ONLY. Observation, collection, regulation and media persistence.
-- Transaction: yes. Dependency: 001_fish_core.sql.
begin;

create table public.fish_media (
  id uuid primary key default gen_random_uuid(), fish_species_id uuid references public.fish_species(id) on delete restrict,
  user_id uuid references auth.users(id) on delete cascade, observation_id uuid,
  media_kind text not null default 'image' check(media_kind in ('image','thumbnail','illustration','diagram','video')),
  origin_type text not null check(origin_type in ('source_original','ai_realistic','ai_character','user_catch_photo')),
  storage_bucket text check(storage_bucket in ('fish-observation-originals','fish-observation-processed','fish-observation-public')),
  storage_path text, source_url text, referenced_source_media_id text, image_hash text,
  copyright_status text not null default 'unknown' check(copyright_status in ('unknown','verified','licensed','restricted','rejected')),
  usage_status text not null default 'pending' check(usage_status in ('unknown','ready','pending','blocked','archived')),
  review_status text not null default 'pending' check(review_status in ('pending','needs_review','approved','rejected')),
  privacy text not null default 'private' check(privacy in ('private','shared','public')),
  exif_status text not null default 'unknown' check(exif_status in ('preserved','stripped','unknown')),
  deletion_status text not null default 'active' check(deletion_status in ('active','requested','deleted')),
  deleted_at timestamptz, generation_metadata jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(storage_path is not null or source_url is not null), check(origin_type<>'user_catch_photo' or user_id is not null),
  check(privacy<>'public' or (storage_bucket='fish-observation-public' and review_status='approved' and usage_status='ready' and exif_status='stripped' and generation_metadata->>'variantType'='public_watermarked'))
);
create index fish_media_species_idx on public.fish_media(fish_species_id,review_status,usage_status) where deletion_status='active';
create index fish_media_user_idx on public.fish_media(user_id,created_at desc) where deletion_status='active';

create table public.fish_observations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  species_id uuid references public.fish_species(id) on delete restrict, photo_media_id uuid,
  captured_at timestamptz not null, region text, fishing_spot_id text, marine_place_id text,
  length_cm numeric(8,2) check(length_cm is null or length_cm>=0), weight_g numeric(10,2) check(weight_g is null or weight_g>=0),
  notes text, visibility text not null default 'private' check(visibility in ('private','shared','public')),
  location_privacy text not null default 'hidden' check(location_privacy in ('exact','grid','hidden')),
  verification_status text not null default 'pending' check(verification_status in ('pending','user_confirmed','expert_confirmed','rejected','archived')),
  is_personal_record boolean not null default true, is_anonymous boolean not null default false,
  moderation_status text not null default 'pending' check(moderation_status in ('pending','reviewed','approved','rejected','archived')),
  deletion_status text not null default 'active' check(deletion_status in ('active','requested','deleted')),
  deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.fish_media add constraint fish_media_observation_fk foreign key(observation_id) references public.fish_observations(id) on delete cascade;
alter table public.fish_observations add constraint fish_observations_photo_media_fk foreign key(photo_media_id) references public.fish_media(id) on delete set null;
create index fish_observations_user_captured_idx on public.fish_observations(user_id,captured_at desc) where deletion_status='active';
create index fish_observations_species_captured_idx on public.fish_observations(species_id,captured_at desc) where deletion_status='active';

create table public.fish_observation_private_locations (
  observation_id uuid primary key references public.fish_observations(id) on delete cascade,
  exact_latitude numeric(9,6) check(exact_latitude between -90 and 90), exact_longitude numeric(9,6) check(exact_longitude between -180 and 180),
  accuracy_meters numeric(10,2) check(accuracy_meters is null or accuracy_meters>=0), grid_code text, geohash text, region_label text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(exact_latitude is not null or exact_longitude is null), check(exact_longitude is not null or exact_latitude is null)
);
create table public.fish_identification_attempts (
  id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.fish_observations(id) on delete cascade,
  provider text not null, model text not null, model_version text, prompt_version text, image_hash text not null,
  candidates jsonb not null default '[]'::jsonb, top_confidence numeric(5,4) check(top_confidence is null or top_confidence between 0 and 1),
  latency_ms integer check(latency_ms is null or latency_ms>=0), cost_metadata jsonb not null default '{}'::jsonb,
  status text not null check(status in ('queued','processing','completed','failed','cancelled')), failure_code text, failure_message text,
  retry_count integer not null default 0 check(retry_count>=0), created_at timestamptz not null default now(), completed_at timestamptz
);
create index fish_identification_attempts_observation_idx on public.fish_identification_attempts(observation_id,created_at desc);
create index fish_identification_attempts_image_hash_idx on public.fish_identification_attempts(image_hash);
create table public.fish_observation_verifications (
  id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.fish_observations(id) on delete cascade,
  selected_species_id uuid not null references public.fish_species(id) on delete restrict,
  verification_type text not null check(verification_type in ('ai_only','user_confirmed','expert_confirmed')),
  verified_by uuid references auth.users(id) on delete set null, confidence numeric(5,4) check(confidence is null or confidence between 0 and 1),
  note text, is_current boolean not null default true, verified_at timestamptz not null default now(), superseded_at timestamptz
);
create unique index fish_observation_verifications_current_uidx on public.fish_observation_verifications(observation_id) where is_current;
create index fish_observation_verifications_species_idx on public.fish_observation_verifications(selected_species_id,verification_type) where is_current;
create table public.fish_collections (
  user_id uuid not null references auth.users(id) on delete cascade, species_id uuid not null references public.fish_species(id) on delete restrict,
  first_discovered_at timestamptz not null, discovery_count integer not null default 1 check(discovery_count>=1),
  first_observation_id uuid references public.fish_observations(id) on delete set null, latest_observation_id uuid references public.fish_observations(id) on delete set null,
  first_photo_id uuid references public.fish_media(id) on delete set null, latest_photo_id uuid references public.fish_media(id) on delete set null,
  best_length_cm numeric(8,2) check(best_length_cm is null or best_length_cm>=0), best_weight_g numeric(10,2) check(best_weight_g is null or best_weight_g>=0),
  achievement_status text not null default 'tracking' check(achievement_status in ('locked','tracking','unlocked','completed')),
  updated_at timestamptz not null default now(), primary key(user_id,species_id)
);
create index fish_collections_user_latest_idx on public.fish_collections(user_id,first_discovered_at desc);
create table public.fish_collection_regions (
  user_id uuid not null, species_id uuid not null, region text not null, first_discovered_at timestamptz, latest_discovered_at timestamptz,
  discovery_count integer not null default 1 check(discovery_count>=1), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,species_id,region), foreign key(user_id,species_id) references public.fish_collections(user_id,species_id) on delete cascade
);
create table public.fish_observation_confirmations (
  id uuid primary key default gen_random_uuid(), idempotency_key text not null unique,
  observation_id uuid not null references public.fish_observations(id) on delete cascade,
  selected_species_id uuid not null references public.fish_species(id) on delete restrict,
  verified_by uuid references auth.users(id) on delete set null, request_hash text not null,
  status text not null default 'processing' check(status in ('processing','completed')),
  result_payload jsonb, created_at timestamptz not null default now(), completed_at timestamptz,
  check((status='completed')=(result_payload is not null))
);
create index fish_observation_confirmations_observation_idx on public.fish_observation_confirmations(observation_id,created_at desc);
create table public.fish_achievement_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid not null references public.fish_observations(id) on delete cascade,
  species_id uuid not null references public.fish_species(id) on delete restrict,
  achievement_type text not null, created_at timestamptz not null default now(), unique(observation_id,achievement_type)
);
create index fish_achievement_events_user_created_idx on public.fish_achievement_events(user_id,created_at desc);

create table public.regulation_source_records (
  id uuid primary key default gen_random_uuid(), source_provider text not null,
  source_type text not null check(source_type in ('LAW','ENFORCEMENT_DECREE','NOTICE','GUIDELINE','OTHER')),
  document_name text not null, document_url text not null, raw_storage_path text, raw_hash text not null,
  published_date date, effective_date date, parser_version text not null,
  crawl_status text not null check(crawl_status in ('pending','success','failed')),
  error_message text, source_missing_at timestamptz, last_seen_at timestamptz, collected_at timestamptz not null,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(source_provider,document_url,raw_hash)
);
create index regulation_source_records_document_idx on public.regulation_source_records(source_provider,document_url,collected_at desc);
create table public.regulation_source_versions (
  id uuid primary key default gen_random_uuid(), source_record_id uuid not null references public.regulation_source_records(id) on delete restrict,
  document_version text not null, revision_date date not null, effective_from date not null, effective_to date,
  source_hash text not null, source_locator jsonb, status text not null check(status in ('draft','active','expired','archived')),
  diff_summary text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(effective_to is null or effective_to>=effective_from), unique(source_record_id,source_hash)
);
create unique index regulation_source_versions_active_uidx on public.regulation_source_versions(source_record_id) where status='active';
create table public.regulation_rules (
  id uuid primary key default gen_random_uuid(), source_record_id uuid not null references public.regulation_source_records(id) on delete restrict,
  source_version_id uuid references public.regulation_source_versions(id) on delete restrict,
  regulation_type text not null check(regulation_type in ('CLOSED_SEASON','PROHIBITED_LENGTH','PROHIBITED_WEIGHT','REGION_SCOPE','EXCEPTION','OTHER')),
  region text, water_area text, fishery_type text, closed_season jsonb, prohibited_length jsonb, prohibited_weight jsonb,
  exception_conditions jsonb not null default '[]'::jsonb, legal_basis text, effective_from date, effective_to date,
  fact_review_status text not null default 'pending' check(fact_review_status in ('pending','reviewed','approved','rejected')),
  publish_status text not null default 'draft' check(publish_status in ('draft','review','published','archived')),
  confidence numeric(5,4) check(confidence is null or confidence between 0 and 1), version integer not null default 1 check(version>=1),
  note text, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(effective_to is null or effective_from is null or effective_to>=effective_from), check(publish_status<>'published' or fact_review_status='approved')
);
create index regulation_rules_active_lookup_idx on public.regulation_rules(publish_status,fact_review_status,effective_from,effective_to) where archived_at is null;
create index regulation_rules_region_idx on public.regulation_rules(region,water_area,fishery_type) where archived_at is null;
create table public.regulation_rule_species (
  regulation_rule_id uuid not null references public.regulation_rules(id) on delete restrict,
  fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  is_primary boolean not null default false, display_order integer not null default 0,
  review_status text not null default 'pending' check(review_status in ('pending','reviewed','approved','rejected')),
  note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(regulation_rule_id,fish_species_id)
);
create index regulation_rule_species_species_idx on public.regulation_rule_species(fish_species_id,regulation_rule_id);
create table public.regulation_change_logs (
  id uuid primary key default gen_random_uuid(), source_record_id uuid not null references public.regulation_source_records(id) on delete restrict,
  previous_version_id uuid references public.regulation_source_versions(id) on delete set null,
  next_version_id uuid references public.regulation_source_versions(id) on delete set null,
  regulation_rule_id uuid references public.regulation_rules(id) on delete set null,
  change_type text not null, changed_fields text[] not null default '{}', severity text not null check(severity in ('LOW','MEDIUM','HIGH')),
  before_payload jsonb, after_payload jsonb, actor_type text not null check(actor_type in ('system','crawler','importer','admin','reviewer')),
  created_at timestamptz not null default now()
);
create index regulation_change_logs_source_idx on public.regulation_change_logs(source_record_id,created_at desc);

create table public.fish_media_upload_sessions (
  id uuid primary key default gen_random_uuid(), media_id uuid not null references public.fish_media(id) on delete cascade,
  observation_id uuid not null references public.fish_observations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, idempotency_key text not null,
  state text not null check(state in ('requested','upload_url_issued','uploaded_unverified','verified','processing','ready_private','ready_for_ai','public_review_pending','published','quarantined','delete_pending','deleted','failed')),
  expires_at timestamptz not null, finalized_at timestamptz, created_at timestamptz not null default now(), unique(user_id,idempotency_key)
);
create table public.fish_media_cleanup_jobs (
  id uuid primary key default gen_random_uuid(), media_id uuid references public.fish_media(id) on delete set null,
  bucket text not null check(bucket in ('fish-observation-originals','fish-observation-processed','fish-observation-public')),
  storage_path text not null, cleanup_type text not null check(cleanup_type in ('expired_original_cleanup','orphan_storage_cleanup','abandoned_upload_cleanup','withdrawn_public_media_cleanup','deleted_observation_cleanup','training_consent_withdrawal_cleanup')),
  status text not null default 'pending' check(status in ('pending','leased','retry_scheduled','manual_review','completed','cancelled')),
  attempt_count integer not null default 0 check(attempt_count>=0), next_attempt_at timestamptz not null default now(),
  lease_token uuid, lease_expires_at timestamptz, last_error_code text, expected_version integer not null default 1 check(expected_version>0),
  created_at timestamptz not null default now(), completed_at timestamptz
);
create unique index fish_media_cleanup_jobs_active_uidx on public.fish_media_cleanup_jobs(bucket,storage_path,cleanup_type) where status in ('pending','leased','retry_scheduled');
create index fish_media_cleanup_jobs_claim_idx on public.fish_media_cleanup_jobs(status,next_attempt_at) where status in ('pending','retry_scheduled');

create trigger fish_media_updated_at before update on public.fish_media for each row execute function public.fish_domain_set_updated_at();
create trigger fish_observations_updated_at before update on public.fish_observations for each row execute function public.fish_domain_set_updated_at();
create trigger fish_private_locations_updated_at before update on public.fish_observation_private_locations for each row execute function public.fish_domain_set_updated_at();
create trigger fish_collections_updated_at before update on public.fish_collections for each row execute function public.fish_domain_set_updated_at();
create trigger fish_collection_regions_updated_at before update on public.fish_collection_regions for each row execute function public.fish_domain_set_updated_at();
create trigger regulation_source_records_updated_at before update on public.regulation_source_records for each row execute function public.fish_domain_set_updated_at();
create trigger regulation_source_versions_updated_at before update on public.regulation_source_versions for each row execute function public.fish_domain_set_updated_at();
create trigger regulation_rules_updated_at before update on public.regulation_rules for each row execute function public.fish_domain_set_updated_at();
commit;

-- DRAFT ONLY. DO NOT APPLY.
-- The media gateway must be server-side. This schema only provides durable
-- state for idempotency, cleanup retry, and reconciliation; it grants no
-- direct browser Storage access and creates no bucket/object in this draft.

create table public.fish_media_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.fish_media(id) on delete cascade,
  observation_id uuid not null references public.fish_observations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  state text not null check (state in ('requested', 'upload_url_issued', 'uploaded_unverified', 'verified', 'processing', 'ready_private', 'ready_for_ai', 'public_review_pending', 'published', 'quarantined', 'delete_pending', 'deleted', 'failed')),
  expires_at timestamptz not null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.fish_media_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  media_id uuid references public.fish_media(id) on delete set null,
  bucket text not null check (bucket in ('fish-observation-originals', 'fish-observation-processed', 'fish-observation-public')),
  storage_path text not null,
  cleanup_type text not null check (cleanup_type in ('expired_original_cleanup', 'orphan_storage_cleanup', 'abandoned_upload_cleanup', 'withdrawn_public_media_cleanup', 'deleted_observation_cleanup', 'training_consent_withdrawal_cleanup')),
  status text not null default 'pending' check (status in ('pending', 'leased', 'retry_scheduled', 'manual_review', 'completed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (bucket, storage_path, cleanup_type, status) deferrable initially immediate
);
create index fish_media_cleanup_jobs_claim_idx on public.fish_media_cleanup_jobs (status, next_attempt_at) where status in ('pending', 'retry_scheduled');

alter table public.fish_media_upload_sessions enable row level security;
alter table public.fish_media_cleanup_jobs enable row level security;
-- No browser policies: a future media gateway/worker uses a constrained
-- service identity and validates observation ownership before every action.

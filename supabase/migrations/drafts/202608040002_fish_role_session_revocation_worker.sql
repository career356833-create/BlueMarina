-- DRAFT ONLY. DO NOT APPLY.
-- Requires security, concurrency, and deployment review before promotion.
alter table public.fish_role_session_revocation_jobs
  add column if not exists revocation_type text not null default 'role_revoked'
    check (revocation_type in ('role_revoked','admin_role_changed','reviewer_role_revoked','crawler_credential_revoked','emergency_account_lockdown')),
  add column if not exists priority text not null default 'normal' check (priority in ('normal','critical')),
  add column if not exists expected_version integer not null default 1 check (expected_version > 0),
  add column if not exists provider_revocation_completed boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists dead_lettered_at timestamptz;

alter table public.fish_role_session_revocation_jobs drop constraint if exists fish_role_session_revocation_jobs_status_check;
alter table public.fish_role_session_revocation_jobs add constraint fish_role_session_revocation_jobs_status_check
  check (status in ('queued','claimed','retry_wait','completed','dead_letter','cancelled','manual_review'));

create unique index if not exists fish_role_one_active_revocation_job_per_operation
  on public.fish_role_session_revocation_jobs(operation_id)
  where status in ('queued','claimed','retry_wait');
create index if not exists fish_role_revocation_retry_wait_due
  on public.fish_role_session_revocation_jobs(priority desc, next_attempt_at, created_at)
  where status in ('queued','retry_wait');
create index if not exists fish_role_revocation_active_target
  on public.fish_role_session_revocation_jobs(target_user_id, lease_expires_at)
  where status = 'claimed';

create table if not exists public.fish_role_session_revocation_dead_letters (
  job_id uuid primary key references public.fish_role_session_revocation_jobs(job_id) on delete restrict,
  operation_id text not null,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  revocation_type text not null,
  attempt_count integer not null check (attempt_count > 0),
  last_error_code text not null,
  sanitized_context jsonb not null default '{}'::jsonb,
  requires_manual_review boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.fish_role_session_revocation_dead_letters enable row level security;

-- RPC sketch only. A promoted migration must set a fixed search_path, revoke PUBLIC,
-- verify the server-only executor role, use SKIP LOCKED, prevent two claimed rows for
-- the same target, and return the generated lease_token atomically.
-- create function private.claim_fish_role_session_revocation_jobs(...)
-- returns setof public.fish_role_session_revocation_jobs
-- language plpgsql security definer set search_path = pg_catalog, public, private ...;

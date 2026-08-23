-- DRAFT ONLY. DO NOT APPLY.
-- This supersedes raw reason/approval storage for role-management operations.
-- It does not alter auth.users and requires a deployment-owned service boundary.
create table public.fish_role_assignments (
  user_id uuid primary key references auth.users(id) on delete restrict,
  fish_role text check (fish_role in ('fish_reviewer','fish_admin','fish_crawler')),
  identity_type text not null check (identity_type in ('human_user','service_identity')),
  version integer not null default 1 check (version > 0), status text not null check (status in ('active','inactive')),
  assigned_at timestamptz, assigned_by uuid references auth.users(id) on delete restrict, revoked_at timestamptz, updated_at timestamptz not null default now()
);
create table public.fish_role_change_operations (
  operation_id uuid primary key default gen_random_uuid(), target_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('requested','locked','auth_update_pending','auth_updated','audit_pending','session_revocation_pending','completed','compensation_required','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index fish_role_one_active_operation_per_target on public.fish_role_change_operations(target_user_id) where status not in ('completed','failed');
create table public.fish_role_idempotency_records (
  idempotency_key_hash text primary key, request_hash text not null, operation_id uuid references public.fish_role_change_operations(operation_id) on delete restrict,
  status text not null check (status in ('pending','completed','failed','compensation_required')), sanitized_result jsonb, created_at timestamptz not null default now(), expires_at timestamptz
);
create table public.fish_role_operation_audit_logs (
  event_id uuid primary key, operation_id text not null, actor_user_id uuid not null references auth.users(id) on delete restrict, target_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('grant','revoke')), previous_role text check (previous_role in ('fish_reviewer','fish_admin','fish_crawler')), new_role text check (new_role in ('fish_reviewer','fish_admin','fish_crawler')),
  approval_id text not null, reason_hash text not null, idempotency_key_hash text not null, result text not null check (result in ('success','partial_failure')), session_revocation_status text not null check (session_revocation_status in ('not_required','revoked','pending')), created_at timestamptz not null default now()
);
create table public.fish_role_session_revocation_jobs (
  job_id uuid primary key, target_user_id uuid not null references auth.users(id) on delete restrict, operation_id text not null, attempt_count integer not null default 0,
  status text not null check (status in ('queued','claimed','retry_wait','completed','dead_letter')), lease_token text, lease_expires_at timestamptz, next_attempt_at timestamptz not null, last_error_code text
);
alter table public.fish_role_assignments enable row level security; alter table public.fish_role_change_operations enable row level security; alter table public.fish_role_idempotency_records enable row level security; alter table public.fish_role_operation_audit_logs enable row level security; alter table public.fish_role_session_revocation_jobs enable row level security;
-- No authenticated policies: role management is server-only. A deployment migration must add a SECURITY DEFINER transaction/RPC and fixed search_path before use.

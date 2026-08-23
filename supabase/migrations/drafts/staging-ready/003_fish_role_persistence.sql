-- DRAFT ONLY. Server-only Fish authorization persistence.
-- Transaction: yes. Dependency: 001 core; auth.users.
begin;
create table public.fish_role_assignments (
  user_id uuid primary key references auth.users(id) on delete restrict,
  fish_role text check(fish_role in ('fish_reviewer','fish_admin','fish_crawler')),
  identity_type text not null check(identity_type in ('human_user','service_identity')),
  version integer not null default 1 check(version>0), status text not null check(status in ('active','inactive')),
  assigned_at timestamptz, assigned_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz, updated_at timestamptz not null default now()
);
create table public.fish_role_change_operations (
  operation_id uuid primary key default gen_random_uuid(), target_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check(status in ('requested','locked','auth_update_pending','auth_updated','audit_pending','session_revocation_pending','completed','compensation_required','failed')),
  lease_token uuid, lease_expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index fish_role_one_active_operation_per_target on public.fish_role_change_operations(target_user_id) where status not in ('completed','failed');
create table public.fish_role_idempotency_records (
  idempotency_key_hash text primary key, request_hash text not null,
  operation_id uuid references public.fish_role_change_operations(operation_id) on delete restrict,
  status text not null check(status in ('pending','completed','failed','compensation_required')),
  sanitized_result jsonb, created_at timestamptz not null default now(), expires_at timestamptz
);
create table public.fish_role_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  previous_role text check(previous_role in ('fish_reviewer','fish_admin','fish_crawler')),
  new_role text check(new_role in ('fish_reviewer','fish_admin','fish_crawler')),
  action text not null check(action in ('grant','revoke')),
  reason_hash text not null, approval_reference_hash text not null,
  idempotency_key_hash text not null, request_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(actor_user_id,idempotency_key_hash)
);
create table public.fish_role_operation_audit_logs (
  event_id uuid primary key, operation_id text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check(action in ('grant','revoke')),
  previous_role text check(previous_role in ('fish_reviewer','fish_admin','fish_crawler')),
  new_role text check(new_role in ('fish_reviewer','fish_admin','fish_crawler')),
  approval_id text not null, reason_hash text not null, idempotency_key_hash text not null,
  result text not null check(result in ('success','partial_failure')),
  session_revocation_status text not null check(session_revocation_status in ('not_required','revoked','pending')),
  created_at timestamptz not null default now()
);
create table public.fish_role_session_revocation_jobs (
  job_id uuid primary key, target_user_id uuid not null references auth.users(id) on delete restrict,
  operation_id text not null, revocation_type text not null default 'role_revoked' check(revocation_type in ('role_revoked','admin_role_changed','reviewer_role_revoked','crawler_credential_revoked','emergency_account_lockdown')),
  priority text not null default 'normal' check(priority in ('normal','critical')),
  expected_version integer not null default 1 check(expected_version>0), attempt_count integer not null default 0 check(attempt_count>=0),
  status text not null check(status in ('queued','claimed','retry_wait','completed','dead_letter','cancelled','manual_review')),
  lease_token text, lease_expires_at timestamptz, next_attempt_at timestamptz not null,
  provider_revocation_completed boolean not null default false, last_error_code text,
  created_at timestamptz not null default now(), completed_at timestamptz, dead_lettered_at timestamptz
);
create unique index fish_role_one_active_revocation_job_per_operation on public.fish_role_session_revocation_jobs(operation_id) where status in ('queued','claimed','retry_wait');
create index fish_role_revocation_retry_wait_due on public.fish_role_session_revocation_jobs(priority desc,next_attempt_at,created_at) where status in ('queued','retry_wait');
create index fish_role_revocation_active_target on public.fish_role_session_revocation_jobs(target_user_id,lease_expires_at) where status='claimed';
create table public.fish_role_session_revocation_dead_letters (
  job_id uuid primary key references public.fish_role_session_revocation_jobs(job_id) on delete restrict,
  operation_id text not null, target_user_id uuid not null references auth.users(id) on delete restrict,
  revocation_type text not null, attempt_count integer not null check(attempt_count>0), last_error_code text not null,
  sanitized_context jsonb not null default '{}'::jsonb, requires_manual_review boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.fish_role_approvals (
  approval_id uuid primary key, reference_hash text not null unique,
  action text not null check(action in ('grant','revoke')), target_user_id uuid not null references auth.users(id) on delete restrict,
  requested_role text check(requested_role in ('fish_reviewer','fish_admin','fish_crawler')),
  target_identity_type text not null check(target_identity_type in ('human_user','service_identity')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null, expires_at timestamptz not null,
  status text not null check(status in ('pending','approved','consumption_pending','consumed','expired','revoked','rejected','reconciliation_required')),
  scope text not null, version integer not null default 1 check(version>0),
  consumed_by_operation_id uuid unique references public.fish_role_change_operations(operation_id) on delete restrict,
  check(approved_at<expires_at)
);
create table public.fish_role_approval_audit_logs (
  id uuid primary key default gen_random_uuid(), event text not null, approval_id uuid references public.fish_role_approvals(approval_id) on delete restrict,
  operation_id text not null, actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check(action in ('grant','revoke')), requested_role text check(requested_role in ('fish_reviewer','fish_admin','fish_crawler')),
  result text not null, error_code text, created_at timestamptz not null default now()
);
commit;

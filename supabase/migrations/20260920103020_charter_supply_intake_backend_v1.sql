-- Charter Supply Intake Backend V1.
-- Migration artifact only: do not apply to a remote environment without the
-- authentication, backup, RLS, and rollout checks documented for this feature.

create table public.charter_supply_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null check (submission_type in ('OPERATOR_ONBOARDING','BULK_IMPORT','OFFICIAL_CONNECTOR')),
  status text not null check (status in ('DRAFT','SUBMITTED','VALIDATION_FAILED','REVIEW_REQUIRED','APPROVED','REJECTED','PROMOTED')),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null,
  content_hash text not null,
  source_identity jsonb not null,
  raw_payload jsonb not null,
  normalized_payload jsonb not null,
  validation_result jsonb not null default '{}'::jsonb,
  registration_crosswalk jsonb not null default '{}'::jsonb,
  promotion_readiness text not null default 'REVIEW_REQUIRED' check (promotion_readiness in ('READY','READY_WITH_LIMITATIONS','REVIEW_REQUIRED','REJECT')),
  review_notes text,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submitted_by, idempotency_key),
  unique (submitted_by, content_hash),
  check (char_length(idempotency_key) between 8 and 128),
  check (content_hash ~ '^[a-f0-9]{64}$'),
  check ((status <> 'APPROVED') or approved_at is not null),
  check ((status <> 'REJECTED') or rejected_at is not null)
);

create index charter_supply_submissions_status_idx on public.charter_supply_submissions (status, submitted_at desc);
create index charter_supply_submissions_submitter_idx on public.charter_supply_submissions (submitted_by, submitted_at desc);
create index charter_supply_submissions_content_hash_idx on public.charter_supply_submissions (submitted_by, content_hash);

create table public.charter_supply_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.charter_supply_submissions(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('APPROVE','REJECT','REQUEST_CHANGES')),
  reason text not null check (char_length(btrim(reason)) between 3 and 2000),
  review_snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index charter_supply_reviews_submission_idx on public.charter_supply_reviews (submission_id, created_at desc);

create table public.charter_supply_promotion_candidates (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.charter_supply_submissions(id) on delete restrict,
  candidate_payload jsonb not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  production_activated boolean not null default false check (production_activated = false),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.charter_supply_audit_logs (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.charter_supply_submissions(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('SUBMISSION_CREATED','SUBMISSION_VALIDATED','REVIEW_RECORDED','SUBMISSION_APPROVED','SUBMISSION_REJECTED','CHANGES_REQUESTED','PROMOTION_CANDIDATE_CREATED')),
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index charter_supply_audit_submission_idx on public.charter_supply_audit_logs (submission_id, created_at, id);

create function public.charter_supply_guard_immutable_source()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.raw_payload is distinct from old.raw_payload
     or new.submitted_by is distinct from old.submitted_by
     or new.idempotency_key is distinct from old.idempotency_key
     or new.content_hash is distinct from old.content_hash then
    raise exception using errcode = '22023', message = 'immutable_submission_source';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger charter_supply_guard_immutable_source_before_update
before update on public.charter_supply_submissions
for each row execute function public.charter_supply_guard_immutable_source();

alter table public.charter_supply_submissions enable row level security;
alter table public.charter_supply_reviews enable row level security;
alter table public.charter_supply_promotion_candidates enable row level security;
alter table public.charter_supply_audit_logs enable row level security;

revoke all on table public.charter_supply_submissions, public.charter_supply_reviews, public.charter_supply_promotion_candidates, public.charter_supply_audit_logs from public, anon, authenticated;
revoke all on sequence public.charter_supply_audit_logs_id_seq from public, anon, authenticated;
revoke execute on function public.charter_supply_guard_immutable_source() from public, anon, authenticated;
grant select, insert, update on table public.charter_supply_submissions to service_role;
grant select, insert on table public.charter_supply_reviews, public.charter_supply_promotion_candidates, public.charter_supply_audit_logs to service_role;
grant usage, select on sequence public.charter_supply_audit_logs_id_seq to service_role;

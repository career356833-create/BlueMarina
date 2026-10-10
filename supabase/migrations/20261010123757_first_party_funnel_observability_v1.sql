-- Additive first-party event storage. No existing business tables or historical rows change.
create table public.operational_funnel_baselines (
  environment text primary key check (environment in ('production','preview','development')),
  started_at timestamptz not null default now()
);
create table public.operational_funnel_events (
  id uuid primary key default gen_random_uuid(),
  environment text not null references public.operational_funnel_baselines(environment),
  event_name text not null check (event_name in ('landing_view','kakao_login_start','kakao_login_complete','charter_submission_start','market_new_start','community_new_start','saved_item_created','charter_submission_complete','market_submission_complete','community_submission_complete','moderation_approved','moderation_rejected','content_published')),
  occurred_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid,
  actor_class text not null check (actor_class in ('ANONYMOUS','REAL','QA','ADMIN','UNKNOWN')),
  subject_class text check (subject_class in ('REAL','QA','ADMIN','UNKNOWN')),
  domain text not null check (domain in ('GENERAL','CHARTER','MARKET','COMMUNITY')),
  route_key text not null check (route_key in ('HOME','FISHING_SPOTS','FISH','TODAY_SEA','CHARTERS','MARKET','COMMUNITY','LICENSE_GUIDE','LOGIN','ACCOUNT','CHARTER_ONBOARDING','MARKET_NEW','COMMUNITY_NEW','MODERATION','UNKNOWN')),
  return_route text check (return_route in ('HOME','FISHING_SPOTS','FISH','TODAY_SEA','CHARTERS','MARKET','COMMUNITY','LICENSE_GUIDE','LOGIN','ACCOUNT','CHARTER_ONBOARDING','MARKET_NEW','COMMUNITY_NEW','MODERATION','UNKNOWN')),
  entity_id text check (length(entity_id) between 1 and 100 and entity_id ~ '^[a-zA-Z0-9_-]+$'),
  dedupe_key text not null check (dedupe_key ~ '^[a-f0-9]{64}$'),
  utm_source text not null default 'UNKNOWN' check (utm_source in ('UNKNOWN','google','naver','kakao','instagram','facebook','youtube')),
  utm_medium text not null default 'UNKNOWN' check (utm_medium in ('UNKNOWN','cpc','organic','social','referral','email')),
  utm_campaign text not null default 'UNKNOWN' check (utm_campaign in ('UNKNOWN','launch-v1','charter-pilot-v1','market-pilot-v1','community-pilot-v1')),
  referrer_category text not null default 'UNKNOWN' check (referrer_category in ('UNKNOWN','DIRECT','GOOGLE','NAVER','INSTAGRAM','YOUTUBE')),
  metadata_version smallint not null default 1 check (metadata_version = 1),
  unique(environment,dedupe_key),
  check (actor_class <> 'ANONYMOUS' or user_id is null)
);
create index operational_funnel_events_window on public.operational_funnel_events(environment,occurred_at);
create index operational_funnel_events_user on public.operational_funnel_events(user_id) where user_id is not null;
alter table public.operational_funnel_events enable row level security;
alter table public.operational_funnel_baselines enable row level security;
revoke all on public.operational_funnel_events, public.operational_funnel_baselines from public, anon, authenticated, service_role;
grant select, insert on public.operational_funnel_events, public.operational_funnel_baselines to service_role;
-- Intentionally no user policies, UPDATE, DELETE or TRUNCATE grants. Retention requires a privileged maintenance operator.
comment on table public.operational_funnel_events is 'V1 best-effort minimal events; no backfill. Recommend raw retention 90 days. No automatic purge configured.';

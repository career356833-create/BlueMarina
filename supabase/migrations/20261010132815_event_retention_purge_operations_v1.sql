-- Only raw operational_funnel_events are eligible; business records and baselines are untouched.
create schema if not exists bm_operations_private;
revoke all on schema bm_operations_private from public, anon, authenticated, service_role;

create table public.operational_funnel_retention_status (
  singleton boolean primary key default true check (singleton),
  configured_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_deleted_count bigint check (last_deleted_count >= 0),
  last_status text not null default 'NEVER_RUN' check (last_status in ('NEVER_RUN','SUCCESS','ERROR')),
  last_error_code text check (last_error_code ~ '^[A-Z0-9]{5}$')
);
alter table public.operational_funnel_retention_status enable row level security;
revoke all on public.operational_funnel_retention_status from public, anon, authenticated, service_role;
grant select on public.operational_funnel_retention_status to service_role;
insert into public.operational_funnel_retention_status(singleton) values (true);

-- timestamptz already rejects malformed strings/null. Reject infinity too; future finite rows
-- are retained, surfaced for attention, and never treated as expired prematurely.
alter table public.operational_funnel_events add constraint operational_funnel_events_finite_time check (isfinite(occurred_at));

create function bm_operations_private.purge_operational_funnel_events()
returns void language plpgsql security invoker
set search_path = pg_catalog
set timezone = 'UTC'
set lock_timeout = '2s'
as $$
declare
  cutoff timestamptz := now() - interval '90 days';
  deleted_count bigint := 0;
begin
  -- Serialize maintenance without blocking ingestion or an already running purge.
  if not pg_try_advisory_xact_lock(731804192) then return; end if;
  begin
    delete from public.operational_funnel_events
      where environment in ('production','preview','development') and occurred_at < cutoff;
    get diagnostics deleted_count = row_count;
    update public.operational_funnel_retention_status
      set last_run_at = clock_timestamp(), last_deleted_count = deleted_count,
          last_status = 'SUCCESS', last_error_code = null where singleton;
  exception when query_canceled or others then
    -- Subtransaction rolls back deletion on failure. Never persist payload/error messages.
    update public.operational_funnel_retention_status
      set last_run_at = clock_timestamp(), last_deleted_count = 0,
          last_status = 'ERROR', last_error_code = sqlstate where singleton;
  end;
end;
$$;
revoke all on function bm_operations_private.purge_operational_funnel_events() from public, anon, authenticated, service_role;

-- Read-only aggregate RPC. Server authenticates operations_admin before calling.
-- No raw identifiers, SQL error text, scheduler credentials, or mutation authority returned.
create function public.operational_funnel_retention_summary(p_environment text)
returns jsonb language sql stable security invoker
set search_path = pg_catalog
set timezone = 'UTC'
as $$
  select jsonb_build_object(
    'retentionDays',90, 'checkedAt',now(),
    'oldestRetained',min(e.occurred_at),
    'eligibleRows',count(*) filter (where e.occurred_at < now() - interval '90 days'),
    'futureRows',count(*) filter (where e.occurred_at > now()),
    'configuredAt',s.configured_at,'lastRunAt',s.last_run_at,
    'lastDeletedRows',s.last_deleted_count,'lastResult',s.last_status,
    'lastRunScope','ALL_ENVIRONMENTS','schedule','DAILY_0317_UTC')
  from public.operational_funnel_retention_status s
  left join public.operational_funnel_events e on e.environment = p_environment
  where s.singleton and p_environment in ('production','preview','development')
  group by s.singleton;
$$;
revoke all on function public.operational_funnel_retention_summary(text) from public, anon, authenticated, service_role;
grant execute on function public.operational_funnel_retention_summary(text) to service_role;
comment on table public.operational_funnel_events is 'Minimal first-party raw events. All actors/environments expire after 90 days and are deleted by the next daily purge; failures may delay deletion. No historical backfill.';

-- BEGIN PG_CRON: platform integration is verified on Supabase, not emulated by local SQL tests.
create extension if not exists pg_cron;
select cron.schedule('blue-marina-funnel-retention-v1', '17 3 * * *',
  'set statement_timeout = ''30s''; select bm_operations_private.purge_operational_funnel_events();');
-- END PG_CRON

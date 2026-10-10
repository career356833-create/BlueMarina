# Blue Marina Event Retention & Purge Operations V1

## Scope and baseline

Baseline main/origin/Production: `a58095bfb623d335c1e7a6889cb0f4e9f41b50cb`, READY. Project: `mlfvpaikfpjrgrhwlrjn`, Tokyo, ACTIVE_HEALTHY, PostgreSQL 17.6.1.155. This is the existing authorized backend. No new provider, project, identity, feature flag or environment variable.

Decision and final verification are recorded in `reports/platform/event-retention-purge-operations-v1.json`. Fresh Kakao Acquisition Gate and Real Device Navigation Gate remain PARKED. Authenticated event E2E remains pending.

## Storage audit and dependency graph

| Object | Purpose and initial size | Time / index / FK | Access and dependency |
| --- | --- | --- | --- |
| `public.operational_funnel_events` | Minimal raw funnel history; 2 rows before work | `occurred_at` non-null timestamptz/default DB now; PK id, unique environment/dedupe, environment/time index, partial user index. Environment FK to baseline; user FK to auth.users ON DELETE CASCADE. | RLS; anon/authenticated no table grants. service_role SELECT/INSERT only. Operations reads bounded 90-day history, max 10,000. Only this table's expired rows are purged. |
| `public.operational_funnel_baselines` | One observed-since timestamp per environment; 1 row before work | environment PK; started_at/default DB now | RLS; server SELECT/INSERT. Preserved indefinitely as minimal non-personal collection-start metadata; not a conversion aggregate and not deleted by purge. |
| `public.operational_funnel_retention_status` (new) | One singleton operational status, no event identities/payload | configured_at, last_run_at, last_deleted_count, SUCCESS/ERROR/NEVER_RUN, SQLSTATE only | RLS; server SELECT only. PostgreSQL maintenance owner writes. No accumulating custom audit history. |

Initial oldest event: 2026-10-10T12:50:47.995329Z; newest: 2026-10-10T12:58:36.750822Z. Expired 0; future 0. No raw event payloads were exported.

Flow: event ingest → raw table → recent 90-day scan → Today/7d/30d aggregates. No persistent long-term aggregate table exists. Current retained business KPI reads business tables separately. Removing >90-day rows does not change Today/7d/30d event counts, same-window distinct sessions/users, or current business KPI. QA/admin/UNKNOWN exclusions and same-session classification inspect the same bounded scan as before. Moderation/publication observations follow the same window; original moderation logs remain untouched. First observed save means earliest **retained** observation, never lifetime first action. Dedupe keys expire with their raw rows, so very late replays after expiry cannot rely on removed keys; business idempotency remains independent. No history is backfilled, estimated or restored.

## Retention contract

- All environments and actor classes (including QA/Real/admin/anonymous) use the same 90-day raw policy.
- Eligibility is exactly `occurred_at < now() - interval '90 days'`, using UTC. Exactly at cutoff is retained; next run can then expire it.
- Run once daily at 03:17 UTC / 12:17 KST. Healthy operation can retain rows for nearly 91 days; failed jobs may delay longer. **This is not an absolute maximum-90-day deletion promise.** The UI/privacy text says 90-day threshold plus next daily cleanup.
- Cookie lifetime remains 30 minutes. No raw IP, token, contact, GPS, full URL, form body, password or user agent added.
- Native timestamptz and NOT NULL reject malformed/null timestamps. New finite-time check rejects infinity. Finite future timestamps are preserved until genuinely expired and counted as anomalies; no early deletion or timestamp fabrication. Normal ingest uses the DB default and does not accept client timestamps.
- Logical row deletion covers the live raw table, not physical media sanitization or provider backup retention. Existing provider backup policy remains separate. No longer-term conversion store is created.
- Auth, profiles, saved, Charter/Market/Community rows, moderation logs, Storage, Fish/Fishing Spots/Marine records are outside purge scope.

## Database implementation and privileges

Migration `20261010132815_event_retention_purge_operations_v1.sql` adds one status table, a finite-time constraint, two functions and one pg_cron job. Existing migrations are unchanged. pg_cron 1.6.4 was available and preloaded but not installed; this migration enables the official in-database module.

`bm_operations_private.purge_operational_funnel_events()` is SECURITY INVOKER, owned by postgres, with no arguments, fixed `search_path=pg_catalog`, UTC, 2-second lock timeout. No dynamic SQL or arbitrary cutoff. Schema access and EXECUTE are revoked from PUBLIC/anon/authenticated/service_role; only the DB maintenance owner can run it. The app receives no DELETE, UPDATE, TRUNCATE or purge invocation authority. No SECURITY DEFINER added.

The scheduled command sets a 30-second statement timeout. Advisory transaction lock prevents concurrent purge runs; a busy run is skipped. A nested exception block rolls back deletion on error and persists only SQLSTATE/ERROR/count 0, never SQLERRM. A process crash, connection failure or status-write failure can leave the preceding status unchanged; the UI detects absence of a recent run after 26 hours. Ordinary inserts take compatible table locks, and no business mutation calls the cleanup function.

`public.operational_funnel_retention_summary(text)` is SECURITY INVOKER; only service_role can execute. It returns current-environment oldest/eligible/future counts plus global maintenance status, no raw user/session/entity identifiers. The server endpoint validates the existing operations_admin role with auth.getUser before invoking this read-only RPC. Unauthorized status remains 401/403; private/no-store + noindex/nofollow headers are retained.

The existing `(environment, occurred_at)` index supports each of three fixed environments plus cutoff and current-environment reads. At 2 initial rows a sequential scan is also appropriate. No duplicate/extra index or batch orchestration added. Revisit scale if job duration approaches the 30-second bound. pg_cron job_run_details is provider scheduler metadata, not a new event audit system; no unrelated cron history is deleted by this job.

## Scheduler and operating procedure

Named job: `blue-marina-funnel-retention-v1`; schedule `17 3 * * *`; role postgres; active verified. Command has no HTTP request, service key, token or public purge endpoint. Existing jobs are not rescheduled.

The Operations panel shows oldest event, purge-eligible count, future anomaly count, last run/result/deleted rows (explicitly ALL_ENVIRONMENTS). Retention requests are independent from funnel metrics, with manual refresh and unavailable state instead of zero. Configured daily schedule is not represented as a live Cron health check: inspect Cron directly for active state. NEVER_RUN under 26h is PENDING; ERROR, future anomalies or >26h since last run/configuration is NEEDS_ATTENTION. A normal eligible tail between daily runs is expected.

DB operator read-only checks:

```sql
select public.operational_funnel_retention_summary('production');
select jobname, schedule, active, username
from cron.job where jobname = 'blue-marina-funnel-retention-v1';
select status, start_time, end_time
from cron.job_run_details where jobid = (
  select jobid from cron.job where jobname = 'blue-marina-funnel-retention-v1'
) order by start_time desc limit 5;
```

On failure: inspect the singleton SQLSTATE and Cron run status without exporting raw event data; resolve connectivity/locks; then an authorized DB operator may run `select bm_operations_private.purge_operational_funnel_events();` with statement_timeout 30s. The cutoff cannot be overridden. Emergency pause uses `cron.alter_job` for this named job only, then verify inactive; do not drop the extension or disable unrelated jobs. Resume daily schedule after verification. No application button performs maintenance.

## Verification and limits

Actual PostgreSQL logic ran in isolated PGlite with no remote credentials: cutoff equality/1μs older, all 5 actor classes × 3 environments, <90-day/future preservation, malformed/null/infinity rejection, unrelated sentinel/baseline preservation, all client/server purge denials, safe aggregate RPC, zero-row repeat, forced deletion failure rollback and service-role ingest after failure. Scheduler-specific SQL is excluded from PGlite and verified on the actual Supabase installation.

Reproduce SQL tests with externally installed `@electric-sql/pglite@0.5.8`: set `PGLITE_TEST_MODULE` to its module directory, then run `node --test tests/platform/event-retention-purge-operations-v1.test.cjs`. Without that explicit dependency, the PostgreSQL group reports SKIP rather than a false pass. This task's full run supplies it and executes all six SQL subtests. No production credentials or production fixtures are used. Existing funnel regression tests are run alongside it.

Production zero-row invocation had an explicit eligible-row guard; SUCCESS/deleted 0. No synthetic old events or timestamps created remotely and no Real event deleted for testing. Natural first daily scheduler execution is not yet observed. Security Advisor: no new WARN/ERROR; one expected server-only RLS/no-policy INFO added. Existing two authenticated SECURITY DEFINER warnings and disabled leaked-password protection warning remain unchanged.

Official references: [Supabase Cron](https://supabase.com/docs/guides/cron), [installation](https://supabase.com/docs/guides/cron/install), [scheduling and monitoring](https://supabase.com/docs/guides/cron/quickstart), [server-only RLS info](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [existing SECURITY DEFINER warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Changelog index and the 15.19/17.11 breaking-change note were checked; this migration introduces none of the affected custom operators, ltree or cipher operations.

Authenticated event and Operations visual E2E are pending. Technical privacy text is updated to actual cleanup timing; legal basis, consent and policy effective-date review are not certified by this implementation. No separate QA identity or verified real traffic experiment is currently available.

## Next primary priority

Freeze current Production and wait for actual use. Do not fabricate traffic or reopen either parked gate.

## Final Production evidence

Runtime commit `cbbdcf5201369003ecad11138405cd42965fdad3`, deployment `dpl_2UuzCXHNVdRjG7ggi6WwfKJCvyh8` READY on https://blue-marina.vercel.app. Production ingest first/replay 204/204; raw rows 2→3 only, distinct dedupe keys 3, identified rows 0. The deliberate anonymous smoke is not verified Real activation. Retention/funnel unauthorized APIs both 401 with private/no-store and noindex/nofollow. Invalid event 400, foreign Origin 403, privacy 200 with actual retention text. Cookie HttpOnly/Secure/SameSite=Lax unchanged. Eligible 0, purge SUCCESS/deleted 0, cron active. All 22 business/core/Auth/Storage/baseline fingerprints still unchanged after deployment.

Clean-source validation: targeted 27/27 (new retention/SQL 10 + existing funnel 17), full 1329 PASS / 1 existing SKIP, typecheck/lint/build/diff PASS. Clean HEAD archive plus exact whitelist; 2,099 source files matched the commit, excluding two prebuild-regenerated MapLibre assets during comparison (restored to committed input bytes before deployment). The local dependency installation builds Next 15.5.27; Vercel installs the committed lockfile separately. Documentation-only follow-up commits do not change verified runtime behavior. Authenticated visual E2E and first natural daily Cron execution remain unverified.

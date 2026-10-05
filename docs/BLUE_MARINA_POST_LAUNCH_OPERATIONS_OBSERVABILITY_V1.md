# Blue Marina post-launch operations & observability V1

Decision: **POST_LAUNCH_OPERATIONS_OBSERVABILITY_READY_WITH_LIMITATIONS**. Clean-checkout verification and authorized Production QA passed on 2026-10-05. The temporary operations role and global session were revoked, and the temporary identity was banned after QA.

The existing `/admin/operations` and GET `/api/operations/health` are extended. Supabase `auth.getUser` and exact trusted `app_metadata.operations_role=operations_admin` are unchanged. Domain administrators retain moderation access, not operations-home access. The API remains private/no-store and noindex/nofollow.

Business aggregates are read from existing tables with up to 1000 rows per table, bounded concurrency, 5-second requests and the existing 60-second per-instance cache. QA classification uses trusted `blue_marina_qa=true`, explicit QA markers and parent QA lineage. Titles and identity IDs are processed only on the server and never returned. Missing owners produce unclassified/UNKNOWN Real KPI. Failed or capped reads never become zero.

Charter public counts use the production registry; APPROVED does not mean public. Market ACTIVE and Community ACTIVE+APPROVED follow existing publication rules. Comments/reactions counts are total stored records, partitioned by QA and Real; they do not imply public visibility.

Current Production status uses the existing public GitHub/Vercel deployment integration. READY requires matching Production environment, running SHA and exact deployment URL; failed lookup is UNKNOWN. No new credential is installed. Main SHA is checked independently. Previous READY rollback and runtime log evidence are separately collected with existing read-only Vercel CLI access. New deployments never inherit old READY status. Runtime figures are bounded request-log samples with explicit window, count, age and truncation state. Auth event metrics without a source are UNKNOWN.

Navigation uses existing versioned validated snapshots, no new KHOA fan-out. Stored validated categories and fresh VALID categories are separate. Stale warnings never become current or SAFE. Kakao SDK is checked in the authorized browser; MapLibre canvas and station-dependent providers remain UNKNOWN if not actually observed. No safety inference is added.

Security and core data counts are timestamped remote audit evidence, not a full scan per request. Advisor ERROR/WARN/INFO are retained without inventing CRITICAL/HIGH mappings. Storage private/public bucket counts are read live; objects may be unavailable if the Storage SQL schema is not exposed. A separate audit count is labeled with its timestamp.

No mutations, alerts, automated rollback, new analytics vendor or business features are added to the dashboard. Temporary authorized QA identities/roles are limited to verification and removed afterward.

## Verified implementation

Operations targeted 34/34 (18 new tests), clean full 1278 PASS / 1 SKIP, typecheck/lint/build/diff PASS. The clean archive contains main plus only the 15-file operations whitelist. Unrelated dirty worktree tests/assets are excluded. Production desktop 1280x900 and mobile 390x844 show no horizontal overflow; queue links have a 44px tap area. The existing moderation destination opens, and an operations-only identity sees counts without domain approval actions.

Read-only Production data: Charter pending Total 1 / QA 1 / Real 0; Market pending 1 / 1 / 0; Community pending 0. Public counts are 0 across all three. Community comments/reactions are 1 each, both QA; unresolved reports 0. The historical Charter source URL marker `blue-marina-e2e-test` and Market activation marker are explicitly recognized even when owned by an ordinary Kakao identity.

Navigation stores 4/9 validated categories, 201 records, currently 0 fresh VALID categories. Warning current state is unavailable after freshness expiry. Security audit: RLS 16/16, private buckets 4, public buckets 0; Advisor ERROR 0 / WARN 3 / INFO 28. Existing fish SECURITY DEFINER grants and disabled leaked-password protection are warnings, not silently remapped to invented severities.

Next primary priority: supply/content acquisition. Actual public offers/listings/posts and Real pending are all zero; no contacts or publication are performed by this task.

## Production evidence and cleanup

Verified implementation SHA: `634686624cbd2c44e375cdc4338b879595c2772b`; deployment `dpl_54APVJG3gwKD9Phsbpiwas95fNqN`, READY. The operations page and API showed main match=true with the GitHub/Vercel SHA-and-URL evidence. All 11 representative HTTP probes were HEALTHY. Authorized API 200 (4.335 seconds in the measured sample), anonymous API 401 and anonymous page 404. Private/no-store and noindex/nofollow remained present. Response checks excluded QA identity, email, password, access/refresh token and server key.

Kakao SDK was AVAILABLE in the browser; RISA was AVAILABLE. FEMO, KMA observation/warning/forecast and KHOA tide/navigation-warning flags were DISABLED. Navigation aids were PARTIAL; MapLibre canvas and ROMS were UNKNOWN, not implied broken or healthy. No provider flag was changed.

After role removal, the same valid token received 403. After global session revocation and ban, it received 401; the browser showed Not found. Final read-only audit at 2026-10-05T13:36:33Z: Auth 21 total / 18 QA / 3 Real, active QA 0, active QA operations admins 0, banned QA 18. The one task-created banned QA identity and its trigger-created profile remain private audit records; no existing identity was deleted. Charter/Market/Community rows remain 3/3/7. Storage remains four private buckets, zero public buckets and one existing object. Business writes, schema changes, feature-flag changes and Vercel setting changes: all zero.

Domain-role isolation was exercised in automated tests; no temporary domain administrator was granted remotely. The remote QA proved operations-only access, anonymous denial and ordinary-user denial after role removal. Physical-device QA is outside this task.

## Remaining limitations

- Auth event metrics are UNKNOWN without an event source. Runtime logs are manually refreshed bounded samples, not a continuous error stream or traffic-wide rate.
- Security/data/rollback evidence is timestamped and must be refreshed before operational action; live Storage object count remains UNKNOWN where its schema is not exposed.
- Source snapshots are old and cannot establish current warning absence or navigation safety. No GPS/route safety inference is added.
- GitHub public API failure/rate limit yields UNKNOWN. The shared 60-second per-instance cache is not distributed monitoring.

Read-only deployment-status source: [GitHub deployment statuses](https://docs.github.com/en/rest/deployments/statuses?apiVersion=2022-11-28). Release and rollback procedure: [deployment policy](BLUE_MARINA_RELEASE_DEPLOYMENT_POLICY_V1.md).

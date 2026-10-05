# Blue Marina post-launch operations & observability V1

Clean-checkout implementation verification passed. Production QA follows the scoped implementation push; its final evidence and temporary-role cleanup will be appended before task completion.

The existing `/admin/operations` and GET `/api/operations/health` are extended. Supabase `auth.getUser` and exact trusted `app_metadata.operations_role=operations_admin` are unchanged. Domain administrators retain moderation access, not operations-home access. The API remains private/no-store and noindex/nofollow.

Business aggregates are read from existing tables with up to 1000 rows per table, bounded concurrency, 5-second requests and the existing 60-second per-instance cache. QA classification uses trusted `blue_marina_qa=true`, explicit QA markers and parent QA lineage. Titles and identity IDs are processed only on the server and never returned. Missing owners produce unclassified/UNKNOWN Real KPI. Failed or capped reads never become zero.

Charter public counts use the production registry; APPROVED does not mean public. Market ACTIVE and Community ACTIVE+APPROVED follow existing publication rules. Comments/reactions counts are total stored records, partitioned by QA and Real; they do not imply public visibility.

Deployment and log control-plane evidence is collected with existing read-only Vercel CLI access. Running deployment identity and main SHA are separate from the last audited READY deployment. New deployments never inherit old READY status. Runtime figures are bounded request-log samples with explicit window, count, age and truncation state. Auth event metrics without a source are UNKNOWN.

Navigation uses existing versioned validated snapshots, no new KHOA fan-out. Stored validated categories and fresh VALID categories are separate. Stale warnings never become current or SAFE. Kakao SDK is checked in the authorized browser; MapLibre canvas and station-dependent providers remain UNKNOWN if not actually observed. No safety inference is added.

Security and core data counts are timestamped remote audit evidence, not a full scan per request. Advisor ERROR/WARN/INFO are retained without inventing CRITICAL/HIGH mappings. Storage private/public bucket counts are read live; objects may be unavailable if the Storage SQL schema is not exposed. A separate audit count is labeled with its timestamp.

No mutations, alerts, automated rollback, new analytics vendor or business features are added to the dashboard. Temporary authorized QA identities/roles are limited to verification and removed afterward.

## Verified implementation

Operations targeted 31/31, clean full 1275 PASS / 1 SKIP, typecheck/lint/build/diff PASS. The clean archive contains main plus only the 14-file operations whitelist. Unrelated dirty worktree tests/assets are excluded. Desktop 1280x900 and mobile 390x844 show no horizontal overflow; queue links have a 44px tap area.

Read-only Production data: Charter pending Total 1 / QA 1 / Real 0; Market pending 1 / 1 / 0; Community pending 0. Public counts are 0 across all three. Community comments/reactions are 1 each, both QA; unresolved reports 0. The historical Charter source URL marker `blue-marina-e2e-test` and Market activation marker are explicitly recognized even when owned by an ordinary Kakao identity.

Navigation stores 4/9 validated categories, 201 records, currently 0 fresh VALID categories. Warning current state is unavailable after freshness expiry. Security audit: RLS 16/16, private buckets 4, public buckets 0; Advisor ERROR 0 / WARN 3 / INFO 28. Existing fish SECURITY DEFINER grants and disabled leaked-password protection are warnings, not silently remapped to invented severities.

Next primary priority: supply/content acquisition. Actual public offers/listings/posts and Real pending are all zero; no contacts or publication are performed by this task.

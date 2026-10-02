# Blue Marina Community Backend Production Activation V1

## Decision

`COMMUNITY_BACKEND_PRODUCTION_ACTIVE_WITH_LIMITATIONS` (2026-10-02 KST).

Kakao-authenticated posting, own-post retrieval and editing, comments, and reactions persist in the Production Supabase project `mlfvpaikfpjrgrhwlrjn`. New posts remain `SUBMITTED / REVIEW_REQUIRED` until an operator reviews them. No public Community post was created during activation.

## Release and schema

- Code commit: `de390e9695fb4834ef360c376aadc8ffba7425a2` (`feat(community): add durable moderated posting backend`), pushed to `origin/main` with only 14 Community files.
- Production alias: `https://blue-marina.vercel.app`, deployment `dpl_48WSb6cy96Tv69ypE3hCqu9iJbCY`, READY. Its code was redeployed from the committed Community build with `COMMUNITY_BACKEND_ENABLED=true` in Production. Before activation, the private API returned 503; afterward an unauthenticated own-post request returned 401.
- Remote migration `20261002054704_community_backend_production_v1` was the only newly applied migration. Remote history rose from 8 to 9 migrations.
- Four new tables: `community_posts`, `community_comments`, `community_reactions`, `community_reports`. They have `auth.users` ownership FKs, timestamps, indexes, state constraints, and RLS.
- Before remote apply, a full logical custom archive was created outside Git. Its SHA-256 is `66C69E89F4B138B9ECDDE20CBAAB688E28C3CDB25036D7C46C112615B5C35942`; `pg_restore --list` succeeded (1,183 TOC entries). The archive is under the current user's LocalAppData `BlueMarinaCommunityV1/preapply-20261002` directory. A full restore of this current archive was not exercised.

## Access and moderation

Anon has no Community write privileges. Authenticated column grants and RLS permit only own records and editable content columns. Normal users cannot set post publication/moderation state or report resolution. Service-role writes are server-only and do not include `TRUNCATE`. The public reader returns only `ACTIVE / APPROVED` posts and active comments. API responses for authenticated and private operations are `private, no-store` and `noindex, nofollow`.

Server routes authenticate with `auth.getUser(token)`, validate payloads and explicit linked entity IDs, and apply size/rate boundaries. User-supplied images cannot be submitted to the server until a verified upload contract exists. Existing device-local drafts stay local and require a manual submit; they are never uploaded or published automatically. No inferred Fish, Fishing Spot, Charter, or Market links are created.

The Supabase Security Advisor reported no `CRITICAL` or `HIGH` finding after migration and no Community-specific warning. It still reports unrelated pre-existing INFO/WARN findings: RLS-without-policy on protected legacy tables, two callable security-definer functions, and leaked-password protection configuration. [Advisor remediation reference](https://supabase.com/docs/guides/database/database-linter).

## Production QA

An already signed-in Kakao test user created one clearly marked QA post, retrieved and edited it, and reloaded the page to confirm persistence. One QA comment and one `HELPFUL` reaction were written, then remained visible after reload. The displayed reaction count was the server-confirmed value `1`. The self-report action was disabled. A second account was not fabricated, so cross-user JWT and remote report submission were not exercised; local isolated SQL tests covered cross-user denial and reporter boundaries.

The QA post remains private as `SUBMITTED / REVIEW_REQUIRED`; it is labelled as test content and excluded from public-feed/KPI counts. The Production feed showed the honest empty state, and the remote `ACTIVE / APPROVED` post count was `0`. There are currently 1 QA post, 1 QA comment, 1 QA reaction, and 0 reports. Own comment deletion is available; the post has a soft-delete API, while this run retained the non-public QA record for auditability.

The feed, form and private detail were visually checked at 390×844; the feed was also checked at 1280×900. The mobile form's step navigation scrolls within its own row. No page-level clipping or action obstruction was observed in the inspected states. This was browser viewport QA, not a physical-device test.

## Data integrity and verification

The remote counts remained `fish_species=1,258`, `marine_organisms=3,016`, `auth.users=3`, `profiles=3`, Charter submissions `1`, Market listings `1`, storage buckets `4`, storage objects `1`. The only new data were the labelled Community QA rows. All four Community tables had RLS enabled; anon Community inserts and authenticated Community truncation were denied.

Local isolated Postgres verified migration application, own/cross-user access, direct publication denial, service-role moderation, public-reader visibility, and comment/reaction/report constraints. Community targeted tests passed. The full suite passed **1,341 tests with 1 pre-existing skip**; typecheck, lint, clean isolated build, and diff check passed.

## Remaining limits and next action

- No Community administration UI or approved public supplier content yet; operator moderation remains a controlled backend action.
- Image uploads are intentionally unavailable in durable submissions.
- Remote report E2E and a second user's JWT authorization E2E require a separate authorized account. They must not be claimed as passed.
- Full restore of the current pre-apply archive and physical-device QA were not performed.

The next planned task is `BLUE_MARINA RELEASE READINESS FINAL V1`. Navigation/AIS expansion is outside this activation.

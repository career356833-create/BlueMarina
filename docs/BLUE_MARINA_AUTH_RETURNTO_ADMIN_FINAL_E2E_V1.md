# Blue Marina Auth ReturnTo + Admin Operations Final E2E V1

Decision: `BLUE_MARINA_PLATFORM_CONNECTED_WITH_ENGINE_GAPS`. The Kakao return to `/community/new` now passed in the Production browser. Authenticated admin visual QA remains unverified.

## Production and OAuth

- Git `main` and `origin/main`: `a47ed74e2e40f34b25c6269ceb735debf3e1493a`; Production deployment `dpl_HmFEc6A8aLVQD4BiLJ2poTypStJW` is READY and serves `https://blue-marina.vercel.app`.
- The earlier long-open OAuth attempt returned `bad_oauth_state` / `OAuth state has expired` to the Production home and left `/account` logged out. A newly initiated `/community/new` → `/account/login?returnTo=%2Fcommunity%2Fnew` → Kakao SSO flow then reached `/account/auth/complete` and returned to `/community/new` without a loop. Account and Profile rendered as authenticated, and the Community author-only saved-post list appeared. This is `COMMUNITY_RETURNTO_PASS`; it does not prove which browser/cookie/time condition expired the first state.
- Supabase Kakao provider is enabled. Site URL is `https://blue-marina.vercel.app`; allowed redirects include `/account/login` and `/account/auth/callback` on that origin. The configured OAuth callback is the project's `/auth/v1/callback`. No secret value was recorded.
- `safeAuthReturnTo` allows exact internal `/community/new`, `/market/new`, and `/charters/onboarding` targets, and rejects external, protocol-relative, script, data and malformed paths. The auth/moderation targeted tests passed 12/12. The prior state-expiry URL and successful fresh retry support an expired prior OAuth state, not a callback or allowlist defect; the exact expiry trigger was not measured. No provider setting or scope was changed.

## Moderation and publication

- Production API E2E from the preceding Operations V1 run verified anonymous 401, normal user 403, domain-admin isolation, Community approve/reject/report/hide, Charter approval into a private promotion candidate, and Market approve/hide. The later private-preview patch also passed Production API checks: unpublished post body was visible only in the Community admin queue, owner UUID was masked, and Operations-only role received counts without items. All QA identities created in those runs were banned, and QA posts ended non-public.
- This run did not create a new Community post or repeat the browser submission → admin review → public → hide loop; the prior Production API E2E remains the moderation evidence. The authenticated Community writing screen rendered, retained the session and listed an existing owner-only post. The same normal Kakao user received Not found at `/admin/operations/moderation`. A read-only Auth audit found zero unbanned admin identities in all four domains, so authenticated 1280×900 and 390×844 admin visual QA could not be run. No ordinary user was granted a role.
- Read-only remote pending counts: Charter 1, Market 1, Community 1, reports 0. None of the three pending items carries the `[QA]` title/content marker. Counts are workload, not a claim of publication or verified supply.
- Unauthenticated `/admin/operations/moderation` returns HTTP 404, `noindex, nofollow`, and `private, no-store`.

## Platform assessment

The prior flow assessments remain `COMPLETE_WITH_FRICTION` for Fishing Spot → Conditions → Navigation, Account → Saved → Content, Charter and Market submission → moderation, Community submission → moderation → public, and Learning → Exam/Practice → Progress. Protected action → Kakao login → `/community/new` passed in this browser run. Both identified P1 items are resolved: exact Community returnTo and the Community moderation implementation. Remaining P1 count is zero. Charter, Market, Community and Operations moderation engines remain `PRODUCTION_READY_WITH_LIMITATIONS` based on the prior Production API E2E; authenticated admin browser usability remains unverified.

## Integrity and verification

- Security Advisor: no CRITICAL/HIGH findings in this check. Five checked moderation tables retain RLS. Existing INFO/WARN findings were not changed. No OAuth scope, redirect list, role, feature flag, migration, or public state was changed in this run.
- Clean `main` clone: 1,238 tests PASS, 1 existing SKIP, typecheck PASS, lint PASS, build PASS, diff check PASS. The dirty primary worktree produced three failures in old audit assertions; its unrelated changes were preserved.
- Current read-only remote integrity check: fish species 1,258, marine organisms 3,016, public QA Community posts 0 and public QA Market listings 0. Fishing Spots source count remains 1,405 in the committed dataset. No database mutation was performed in this run.
- This report distinguishes the passing Kakao return from the still-missing admin visual review. An approved, non-banned QA admin identity and safe login path are required before 1280×900 and 390×844 Production admin QA can be claimed. No QA post, admin identity, database row or role was created in this closure run.

## 2026-10-04 follow-up

The paragraph above describes the original audit, not the current state. Subsequent Production browser QA completed the 1280×900 and 390×844 Operations and domain moderation screens with sequential temporary QA roles. The domain-admin moderation 404 was fixed in `4254e727e44244a80a2f95ce7f553a5b14d07a02`. The QA account ended banned with all admin roles removed, zero Auth sessions and zero refresh tokens. A QA access JWT had appeared once in transient tool output; its recorded expiry has passed, and no value was persisted in Git or documentation.

The six Operations HTTP 302 errors were traced to probes against a Vercel SSO-protected deployment URL rather than the public canonical domain. Commit `b7896a5ac9bb45c076137a3eb2aff7e85d9de139` corrects the Production probe origin and redirect handling. The new deployment is READY and public routes return 200, but authenticated health cards were not reread because Production Auth values pulled through Vercel CLI were masked. The final status and limitations are recorded in [Blue Marina Admin UI Final QA V1](BLUE_MARINA_ADMIN_UI_FINAL_QA_V1.md) and its JSON report.

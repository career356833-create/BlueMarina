# Blue Marina Admin Moderation Operations V1

**Decision: `ADMIN_MODERATION_OPERATIONS_COMPLETE_WITH_LIMITATIONS`.** The prior `BLUE_MARINA_PLATFORM_FLOW_FRAGMENTED` finding is superseded by `BLUE_MARINA_PLATFORM_CONNECTED_WITH_ENGINE_GAPS`. The two identified P1 code gaps are closed: `/community/new` is an explicit internal OAuth return target, and Community submissions now have an authorized approval/rejection path. The Production Kakao round-trip and authenticated visual review remain separately tracked below; an API/local-app E2E is not presented as a browser/provider E2E.

## Implemented contracts

- `/community/new` is added to the existing exact-path return allowlist. External schemes, protocol-relative URLs, path normalization tricks and unlisted paths still fall back to `/account`. The Community form's existing login CTA retains `returnTo=/community/new`.
- `/admin/operations/moderation` combines four real database queues: Charter review, Market review, Community post review and Community reports. It is private, noindex, no-store at the API, absent from public navigation and bounded to the newest 50 rows per queue while displaying the exact pending count. A domain administrator sees only that domain's item details and actions; `operations_admin` alone sees all workload counts but no submission details or mutation controls. The `/admin/operations` home displays the four counts and links to this page.
- Charter and Market buttons call their existing review endpoints and state machines. Charter `APPROVE` creates an unactivated promotion candidate, not a public offer. Market `APPROVE` activates a listing under the existing contract; `HIDE` removes it from public reads. Both require a recorded reason of at least three characters.
- Community `APPROVE` moves `SUBMITTED/REVIEW_REQUIRED` to `ACTIVE/APPROVED`; `REJECT` moves it to `REJECTED/REJECTED`; `HIDE` moves an approved active post to `HIDDEN/APPROVED`. Report `RESOLVE` and `DISMISS` move `SUBMITTED` to `REVIEWED`. The existing public reader still requires `ACTIVE/APPROVED` and the owner can inspect submitted or rejected posts.
- Migration `20261003094425_community_moderation_operations_v1.sql` adds a private audit table and service-role-only atomic transition functions. Each event stores target, actor, action, previous state, next state and timestamp. The function rechecks `auth.users.raw_app_meta_data.community_role` on the server. Anonymous and authenticated PostgREST roles have neither audit-table read nor function execution grants.

## Verification and data boundary

The clean isolated checkout passed the existing nine migrations plus the new migration. Transaction-rolled-back SQL fixtures proved approval, rejection, report dismissal, audit events, public-state filtering and lack of authenticated function execution. The remote project `mlfvpaikfpjrgrhwlrjn` accepted the migration as version `20261003094425`; security advisors showed no CRITICAL/HIGH/ERROR findings before or after. Fish species remained 1,258 and marine organisms 3,016.

Against the local Next.js app connected to the production Supabase project, six clearly marked QA Auth identities exercised the real API: anonymous and normal users were denied; `charter_admin`, `market_admin` and `community_admin` could read and act only in their own domain; `operations_admin` could read all queue counts without seeing item details or mutating a domain. Two QA Community submissions covered approve → public feed/detail → hide and reject → owner-only. A separate QA actor submitted a report; the Community admin dismissed it. A QA Charter submission reached `APPROVED` and created an unactivated promotion candidate. A QA Market listing reached `ACTIVE`, appeared in the public API, then was hidden. Final public QA Community posts and Market listings were both zero; activated Charter candidates remained zero. Six QA identities were banned after testing and carry `blue_marina_qa` metadata. QA rows and events are retained as evidence and excluded from business KPI interpretation; no arbitrary SQL deletion was used.

The queue API returned private/no-store and noindex/nofollow headers. The new audit table has RLS on; anon/authenticated lack `SELECT`, and only service role can insert and execute the review functions. The browser does not receive the service-role key. The original worktree's unrelated changes are outside this release.

## Remaining limits

- The new Kakao browser OAuth return round-trip was not performed with an interactive Kakao session. Exact target and redirect-denial tests passed, but provider/browser E2E is still due.
- The in-app browser blocked the new localhost QA port, so authenticated 1280×900 and 390×844 visual review could not be completed in that environment. API E2E and production build passed; visual QA remains due.
- Market image-upload E2E was not repeated in this moderation run. The QA listing intentionally had no image; the existing private staging and upload contract were not changed.
- Charter still has no provider-approved public offers. Approval is only a promotion candidate; supplier consent and a separate production publication decision remain necessary.
- The prior four isolated public routes (`/boatpedia`, `/coming-soon`, `/dictionary`, `/marine-knowledge`) remain four; no unrelated content redesign was introduced. Physical navigation QA is outside this operation.

## Flow reassessment

| Journey | Status | Basis |
| --- | --- | --- |
| Fishing Spot → Conditions → Navigation | COMPLETE_WITH_FRICTION | Prior production smoke; physical GPS and held-spot limitations unchanged. |
| Account saved | COMPLETE_WITH_FRICTION | Existing owner-only API and UI; no new cross-user browser test here. |
| Charter | COMPLETE_WITH_FRICTION | Submission and admin approval E2E; provider/publication boundary still closed. |
| Market | COMPLETE_WITH_FRICTION | Submission, domain admin approval, public read and hide E2E; image path not repeated. |
| Community | COMPLETE_WITH_FRICTION | Submit, approve, reject, report and public/owner boundaries E2E; Kakao return browser check due. |
| Learning | COMPLETE_WITH_FRICTION | Existing learning flow unchanged; local-device persistence remains. |
| Login returnTo | COMPLETE_WITH_FRICTION | Exact internal target tests pass; Kakao browser round-trip due. |

The former two P1 implementation gaps have code and remote API verification; no new P1 was found. Browser/provider and visual evidence are follow-up limitations, not implied passes. The next roadmap is in `BLUE_MARINA_ENGINE_ROADMAP_V2.md`.

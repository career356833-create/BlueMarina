# Blue Marina Post-Admin Security Closure — 2026-10-05

Decision: POST_ADMIN_SECURITY_CLOSURE_COMPLETE_WITH_LIMITATIONS.
Platform: BLUE_MARINA_PLATFORM_CONNECTED_AND_ENGINE_READY.

Production deployment dpl_CXdh4T2LyYoawacJN558LqSKMegV is READY. The authenticated Operations response identifies source SHA 121f458f9cc90d601df7035d667e81ab1aed7c86, equal to main/origin at execution. Existing committed source was redeployed to pick up the approved modern Supabase keys; unrelated working-tree code was not deployed.

## Current incident closure

The broader QA reconciliation found 16 sessions and 16 unrevoked refresh rows, plus 12 banned QA identities retaining domain-admin metadata. This supersedes the narrower historical zero-session assertion below. Official Supabase Auth global sign-out completed for all 16 sessions; each temporarily unbanned QA identity was immediately re-banned. Remaining administrator fields were cleared through the Auth admin API. Final read-only audit: 20 users total, 17 banned QA users, QA admin roles 0, QA sessions 0, QA refresh tokens 0. No Auth internal-table DELETE was used.

A legacy Blue Marina service-role key was also exposed in transient tool output during investigation. Following explicit approval, Production now uses the project's modern publishable and server-only secret keys. Legacy apikey-header access was disabled, but a read-only test proved this alone insufficient: an old service-role JWT combined with the modern publishable key still returned HTTP 200. The already-previous HS256 signing key was therefore revoked; the current ECC signing key was unchanged. Legacy anon, legacy service-role, and mixed modern-apikey/old-service-JWT requests all now return HTTP 401. No key value is included here. The temporary credential file was deleted. The different-project credential pasted in chat was neither used nor rotated.

The 2026-10-05 authenticated Operations health API passed: Home, Sea, Navigation, Fishing Spots, Conditions and Today Sea are all HEALTHY, direct HTTP 200. Account, Charter intake, Market owner listings, Community owner posts and Operations/moderation APIs returned 200; anonymous Account/health returned 401. Login and session refresh passed after signing-key revocation. The browser bundle contains the modern publishable key and no legacy anon key. Private Market staging storage remains private. Disposable QA accounts were globally signed out and deleted.

## Health semantics and integrity

The protected deployment URL follows two redirects to external Vercel authentication and ends at its login page; that 200 is not application health. The canonical public host responds directly. Existing bounded same-origin redirect logic remains unchanged: canonical final 2xx HEALTHY; recoverable unexpected same-origin final 2xx DEGRADED; auth/off-origin/loops/failures ERROR. Upstream source availability remains independent; HTTP health never proves GPS, maps or PWA behavior.

Fish species 1,258; marine organisms 3,016; committed Fishing Spots 1,405. Public Market ACTIVE 0, public Community posts 0, public Charter offers 0. QA content remains private. No schema, content publication or feature-flag mutation. Account/Auth, Charter, Market, Community and Operations remain PRODUCTION_READY_WITH_LIMITATIONS, supported by prior workflow E2E plus current authenticated API smoke; no claim of a new full publication or Kakao OAuth E2E.

## Verification and limits

Current clean-source checks are recorded in reports/platform/admin-ui-final-qa-v1.json. The source is a git archive of the baseline plus only this five-file evidence/test changeset. Existing unrelated tracked/untracked files are preserved. Prior browser QA and advisor findings below are historical, not newly rerun. Pre-revocation credential use cannot be ruled out retrospectively. Next primary priority: real-device GPS/PWA QA.

References: [Supabase sign-out](https://supabase.com/docs/guides/auth/signout), [API keys](https://supabase.com/docs/guides/api/api-keys), [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys).

---

## Historical audit — 2026-10-04 (superseded where stated above)

# Blue Marina Admin QA and Post-Admin Security Closure V1

Date: 2026-10-04 KST. Decision: `POST_ADMIN_SECURITY_CLOSURE_COMPLETE_WITH_LIMITATIONS`. Platform status remains `BLUE_MARINA_PLATFORM_CONNECTED_WITH_ENGINE_GAPS` because authenticated Operations health cards were not reread after the fix.

## Admin browser QA and P1

The prior Production browser run used one temporary QA role at a time. Operations at 1280×900 and 390×844 showed workload counts without private queue content. Community, Charter, and Market admins reached only their own moderation queues at both viewport sizes. The Community QA post was rejected through the UI, not published. Charter and Market detail and review controls rendered; no approval or promotion was executed. The ordinary Kakao account received 404 at moderation. Community protected-action `returnTo` and the domain-admin moderation path are resolved; remaining P1 for those flows is 0. Commit `4254e727e44244a80a2f95ce7f553a5b14d07a02` contains the middleware correction.

## QA token incident

The first QA login attempt exposed an access JWT once in a transient tool result. Its value is absent from Git and these documents. The QA account was subsequently banned and all four admin role fields removed. The 2026-10-04 read-only Auth reconciliation found exactly one recently cleaned QA identity, still banned, with zero admin roles, zero `auth.sessions` rows and zero refresh tokens. The exposed JWT had passed its recorded expiry by the verification time. No explicit revocation command was needed or performed in this run because no active session or refresh token remained. The credential is no longer usable for a fresh authenticated session; use before expiry cannot be ruled out retrospectively. Supabase documents that access JWTs can remain valid until expiry after sign-out, so the zero-session result alone would not have closed the incident before expiration.

## Operations health root cause and fix

The six public paths `/`, `/sea`, `/sea/navigation`, `/fishing-spots`, `/fishing-spots/conditions`, and `/today-sea` each returned HTTP 200 on `https://blue-marina.vercel.app`. On the deployment-specific `VERCEL_URL` host, each returned 302 to Vercel SSO at `vercel.com`. The old probe intentionally used `redirect: manual` and classified those 302 responses as ERROR. This was a host-selection error, not a public route failure or a same-origin canonical redirect.

Commit `b7896a5ac9bb45c076137a3eb2aff7e85d9de139` makes Production probes use validated `NEXT_PUBLIC_SITE_URL`. A bounded manual probe follows at most three same-origin redirects: direct 2xx and a same-origin canonical redirect ending in 2xx are HEALTHY; an unexpected same-origin redirect ending in 2xx is DEGRADED; login redirects, off-origin redirects, loops, timeouts and final 4xx/5xx are ERROR. The card shows the final HTTP status and redirect count, and omits query strings from any displayed final URL. HTTP checks do not establish Kakao/MapLibre canvas rendering, GPS, hydration or PWA health.

The push triggered Production deployment `dpl_6cqeg9h4NnR27q3GuhWAk1iRztvB`. Vercel CLI reported READY and the canonical domain resolves to that deployment. The CLI did not expose an exact Git SHA for the deployment. A new authenticated Operations health API call could not be performed: Vercel CLI returned masked placeholders rather than usable Production Auth environment values. The temporary QA script stopped before listing or changing Auth users. The six Production public URLs were rechecked at HTTP 200, and anonymous Operations/moderation pages and health API remained 404/404/401 with private no-store and noindex headers. The final authenticated card states remain unverified; they are not recorded as a Production pass.

## Current integrity and limitations

Remote read-only counts: fish species 1,258; marine organisms 3,016; Charter pending 1; Market pending 1; Community pending 0; reports pending 0. Committed Fishing Spots source: 1,405. Public QA Community posts and Market listings: 0 each. Five checked moderation tables retain RLS. Supabase Security Advisor returned 0 CRITICAL/HIGH, with existing 3 WARN and 28 INFO findings. No Supabase schema, feature flag, or Vercel env change was made in this task.

Charter, Market, Community, and Operations/Moderation remain `PRODUCTION_READY_WITH_LIMITATIONS`: their prior Production admin workflows passed, but public supply/content remains sparse, authenticated health after this deployment is unverified, and individual publication transitions were not rerun. The Operations source-health cards remain independent from the route probe; degraded upstreams must not be treated as healthy because public pages answer 200.

Clean source plus the five-file health fix and final evidence passed 1,245 tests with 1 existing skip, typecheck, lint and isolated Next build (1,467 static pages). Targeted Operations and closure tests passed 15/15; diff check passed. The pre-existing dirty worktree contains unrelated tracked and untracked changes and was preserved.

Supabase session behavior: [Supabase Auth user sessions](https://supabase.com/docs/guides/auth/sessions). Existing advisor notices: [RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [executable security-definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Final clean-source verification — 2026-10-05

Targeted 16/16 PASS; full tests 1,246 PASS / 1 existing SKIP / 0 FAIL; typecheck PASS; lint PASS; isolated build PASS (1,467 static pages); diff check PASS. The first build failed because a C: archive referenced D: node_modules through a junction. The same unchanged source/dependencies built successfully in a separate D: validation directory. No product code workaround was added. Repository/worktree text scan: 2,768 files, no JWT/secret-key/credential-assignment hits. Unrelated file contents were hash-checked before exact staging.

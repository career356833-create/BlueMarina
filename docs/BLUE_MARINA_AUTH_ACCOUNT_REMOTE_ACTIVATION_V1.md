# Blue Marina Auth + Account Remote Activation V1

## Decision

`AUTH_ACCOUNT_REMOTE_ACTIVATION_PARTIAL`. The existing Supabase project is configured with the Production Site URL and one exact login return URL. The three Supabase variable names are present in Vercel Production, including a server-only service-role key. **Account remains disabled** and no Production deployment or test account was created. The new environment variables are not in the currently deployed build.

## Verified baseline

`main` and `origin/main` were both `18de3559cd632c9dd135a9af410c47bf0a3e9bd4`. Supabase project `mlfvpaikfpjrgrhwlrjn` has all seven migrations, both Account tables, RLS on both, no `anon`/`authenticated` TRUNCATE grant across the twelve backend tables, zero Auth users, zero profiles, zero saved items, 1,258 fish species, and 3,016 marine organisms. The Auth user insertion trigger for automatic profile creation is present. Its behavior has not yet been exercised by a signup.

## Auth and environment

The Supabase Auth Site URL is `https://blue-marina.vercel.app`; the exact redirect allowlist contains `https://blue-marina.vercel.app/account/login` and no wildcard. Email signup and confirmation are enabled. Anonymous sign-in is disabled. Access tokens expire after 3,600 seconds and refresh-token replay detection is on. Password reset has a Supabase email template, but Blue Marina has no reset UI.

Production Vercel now has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The anon key is intentionally public; the service-role key has no `NEXT_PUBLIC_` prefix and is used only by server code. Key values, user emails, passwords, and tokens are absent from these artifacts. `ACCOUNT_BACKEND_ENABLED` remains unset/OFF. The existing Production deployment was not rebuilt, so these newly configured variables are not evidence that the browser or API is connected.

## Why activation stopped

The committed `/account/login` page only signs in. A signup implementation is present in the pre-existing dirty worktree, alongside unrelated changes, but is not on `main`. Deploying that worktree would mix unrelated work into Production; this task also requires zero stage, commit, and push. A receiving test mailbox has not been supplied for the enabled confirmation flow. The Supabase dashboard warns that its built-in mail service is rate-limited and unsuitable for a Production app; custom SMTP is not configured. These conditions prevent a truthful signup → confirmation → login → profile → saved-item → session-restore Production E2E result.

The existing Production `/account/login`, `/account`, `/account/profile`, and `/account/saved` routes returned HTTP 200; unauthenticated `/api/account` returned 503 while the flag is OFF. Those are route/fail-closed checks, not an authenticated smoke test. No test account, saved item, profile update, Auth activation, or Home data-backed personalization was claimed.

The Account API's missing explicit `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow` headers were fixed in the local Account route. A local HTTP 503 response contained both headers. This task does not stage, commit, or deploy that worktree change; Production is not credited with the fix.

## Security and validation

An anonymous profile read was denied and a server-role Auth admin read succeeded using in-memory credentials without printing values. Supabase Security Advisor reported zero CRITICAL/HIGH findings; remaining notices were 27 INFO and 2 WARN, requiring separate review. Source-backed fish and marine row counts were unchanged. Legacy data digests were not recomputed in this task, so their unchanged status is not claimed.

`npm test`: 1,284 passed, one skipped, zero failed. Typecheck, lint, build, and `git diff --check` passed. No new Git stage, commit, or push; existing unrelated worktree changes remain. No Charter, Market, Operations, Community, database schema/data, or Production deployment was changed.

The next safe step is a clean, reviewable Account signup deployment and Production mail-delivery setup, followed by a real receiving-mailbox signup/confirmation and Account API rehearsal. Enable `ACCOUNT_BACKEND_ENABLED` only after those checks pass. See the [Supabase redirect URL guide](https://supabase.com/docs/guides/auth/concepts/redirect-urls) and [Supabase production Auth guidance](https://supabase.com/docs/guides/platform/going-into-prod#auth-rate-limits).

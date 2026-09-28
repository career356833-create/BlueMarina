# Blue Marina Social Auth Activation V1

## Scope

The Account sign-in page presents Kakao, Google, then email/password. The social flow uses Supabase Auth PKCE, an exact same-origin callback, server-side code exchange, and the existing internal return-path allowlist. The Account backend flag remains independent of sign-in.

## Configuration and rollout

- Supabase project: `mlfvpaikfpjrgrhwlrjn`.
- Supabase OAuth provider callback: `https://mlfvpaikfpjrgrhwlrjn.supabase.co/auth/v1/callback`.
- Blue Marina application callback: `https://blue-marina.vercel.app/account/auth/callback`. This exact URL was added to the Supabase Auth redirect allowlist.
- Kakao app: Blue Marina (`1525889`). Kakao Login is ON, the exact Supabase callback is registered on the REST API key, and the Supabase Kakao provider is enabled with its REST API key and active client secret. The app is not a Biz App, so `account_email` consent is unavailable. Supabase explicitly allows users without an email; the Account profile model accepts a null email. Nickname/photo consent remains disabled rather than requesting unnecessary personal data.
- A Production Kakao attempt reached Kakao but failed with `KOE205`: the Supabase redirect requests `account_email profile_image profile_nickname` while those consent items are not configured and `account_email` is unavailable for this non-Biz App. The Supabase Auth provider currently hardcodes `account_email` even when the dashboard permits users without an email ([issue #2574](https://github.com/supabase/auth/issues/2574); [fix PR #2579](https://github.com/supabase/auth/pull/2579) remains open). The public Kakao button is therefore disabled by default via `NEXT_PUBLIC_KAKAO_OAUTH_ENABLED`; it must not be enabled until the exact Production flow passes. No scope or Auth bypass is used.
- Kakao Developers warns that an account-unlink webhook is needed to learn about users who leave outside Blue Marina. That webhook is not configured; account lifecycle/privacy handling requires separate review before calling this a complete public rollout.
- The account owner enabled Google 2-step verification. A dedicated Google Cloud project, `blue-marina-auth`, was created because this account showed no existing projects. The owner approved using the signed-in Google account as the user-visible support email and approved Google's user-data policy. The web OAuth client uses the Production origin and exact Supabase callback. Its credentials were entered into the Supabase Google provider, which is enabled. The consent screen links to the Production home, privacy policy, and terms. After the approved test-user login passed, the owner authorized moving the external audience from **Testing** to **Production**; the Google console shows `프로덕션 단계`.
- That approved user completed the Production Google OAuth callback, signed in, restored the session after reload, signed out, and signed in again. Read-only DB verification found two total Auth users and two profiles, including exactly one Google user with one matching profile.
- The owner authorized replacing Vercel Production's mismatched `SUPABASE_SERVICE_ROLE_KEY` with the server-only key for this exact Supabase project. The environment change was redeployed to Production. `ACCOUNT_BACKEND_ENABLED=ON` after Production verification: unauthenticated Account API returns `401 AUTH_REQUIRED` with private/no-store and noindex headers; authenticated profile GET/UPDATE persisted across reload; a Fishing Spot save appeared in the Account list and was then deleted. The test display name was restored to blank. Read-only DB verification found two Auth users, two profiles, zero saved items, and zero profiles retaining the test display name.
- Production deployment is READY at `https://blue-marina.vercel.app` from the social-auth source commit `e34d426d0886a40f331624bf8c3baef9de3d04e7` with the updated environment. Google sign-in and Account are active; Kakao remains disabled pending provider scope resolution.

## Security boundary

No provider secret or service-role key belongs in client code, Git, or reports. The return target is validated against the existing internal allowlist; external targets fall back to `/account`. The callback and private Account API are non-indexable and non-cacheable. The profile trigger remains provider-neutral and unchanged. No Auth or RLS bypass is introduced.

## Remaining limitation

Kakao Production consent fails with `KOE205` before returning to Blue Marina because the hosted Supabase provider requests scopes that this non-Biz Kakao app cannot supply. Keep the Kakao button disabled until a supported provider configuration passes a complete Production callback and profile test. The external account-unlink webhook also remains unconfigured. Google and email/password remain available.

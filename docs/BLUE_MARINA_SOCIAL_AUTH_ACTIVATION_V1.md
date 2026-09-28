# Blue Marina Social Auth Activation V1

## Scope

The Account sign-in page presents Kakao, Google, then email/password. The social flow uses Supabase Auth PKCE, an exact same-origin callback, server-side code exchange, and the existing internal return-path allowlist. The Account backend flag remains independent of sign-in.

## Configuration and rollout

- Supabase project: `mlfvpaikfpjrgrhwlrjn`.
- Supabase OAuth provider callback: `https://mlfvpaikfpjrgrhwlrjn.supabase.co/auth/v1/callback`.
- Blue Marina application callback: `https://blue-marina.vercel.app/account/auth/callback`. This exact URL was added to the Supabase Auth redirect allowlist.
- Kakao app: Blue Marina (`1525889`). Kakao Login is ON, the exact Supabase callback is registered on the REST API key, and the Supabase Kakao provider is enabled with its REST API key and active client secret. The app is not a Biz App, so `account_email` consent is unavailable. Supabase explicitly allows users without an email; the Account profile model accepts a null email. Nickname/photo consent remains disabled rather than requesting unnecessary personal data.
- Kakao Developers warns that an account-unlink webhook is needed to learn about users who leave outside Blue Marina. That webhook is not configured; account lifecycle/privacy handling requires separate review before calling this a complete public rollout.
- The account owner enabled Google 2-step verification. A dedicated Google Cloud project, `blue-marina-auth`, was created because this account showed no existing projects. The owner approved using the signed-in Google account as the user-visible support email and approved Google's user-data policy. The web OAuth client uses the Production origin and exact Supabase callback. Its credentials were entered into the Supabase Google provider, which is enabled. The consent screen links to the Production home, privacy policy, and terms. The Google audience is still external **Testing** with one approved test user; general public Google login is not yet available.
- Keep `ACCOUNT_BACKEND_ENABLED=OFF` until a production OAuth login, profile auto-creation, Account API round-trip, and session restore pass.

## Security boundary

No provider secret or service-role key belongs in client code, Git, or reports. The return target is validated against the existing internal allowlist; external targets fall back to `/account`. The callback and private Account API are non-indexable and non-cacheable. The profile trigger remains provider-neutral and unchanged. No Auth or RLS bypass is introduced.

## Verification still required

After both providers are configured, verify Kakao and Google consent → callback → session → profile exactly once → Account route. Verify profile GET/UPDATE, saved create/list/delete, logout, reload, and session restore. Only then consider the Account backend flag and production deployment smoke. Record any provider-specific limitation without treating code tests as production E2E evidence.

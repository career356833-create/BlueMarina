# Blue Marina Supabase Environment and Migration Baseline V1

**Freeze decision: `SUPABASE_BACKEND_BASELINE_FROZEN_WITH_LIMITATIONS`.** The underlying environment audit remains `SUPABASE_ENVIRONMENT_BASELINE_READY_WITH_LIMITATIONS`. A fresh, isolated local Supabase Postgres 17 database accepted the complete migration chain without a pre-created `profiles` fixture. This establishes a locally reproducible schema baseline. It does not identify or create a Production project, and no remote migration or environment change occurred.

## Environment boundary

| Environment | Identity | Permitted role now |
| --- | --- | --- |
| LOCAL | Isolated Supabase CLI instance | Migration and Auth/RLS test only |
| STAGING | `mlfvpaikfpjrgrhwlrjn`, FishingPortal3568's Project | Existing Blue Marina fish/marine staging; read-only compatibility in this task |
| PRODUCTION | No confirmed or created project ref | No binding, migration, flag activation, or deploy |

The staging designation follows committed `BLUE_MARINA_STAGING_PROJECT_REF` code and the 1,258-fish/3,016-marine import provenance recorded in [Production Binding Identification V1](BLUE_MARINA_SUPABASE_PRODUCTION_BINDING_V1.md). A current read-only catalog check found the fish/marine tables and no `profiles`, `user_saved_items`, `charter_supply_*`, or `market_listing*` tables. The new baseline creates none of the existing `fish_*` or `marine_*` names. The populated staging DB must not be treated as a disposable migration target.

## Profiles and Auth

The new `20260920100000_blue_marina_profile_baseline_v1.sql` creates only the columns used by current Account code or its Auth link: `id` (UUID primary key, `auth.users(id)` with `ON DELETE CASCADE`), nullable `email`, nullable legacy-compatible `full_name`, nullable `display_name`, `avatar_url`, `region`, `bio`, and timestamps. `email` and `full_name` are included because `src/lib/account/server.ts` currently writes or reads them; the legacy daycare `supabase/schema.sql` is not used as the Blue Marina baseline. The later Account migration retains its field constraints and saved-items table.

An `AFTER INSERT` trigger on `auth.users` inserts only the new user ID into `public.profiles`. Its function lives in non-exposed `blue_marina_private`, uses a fixed empty search path, has no execute grant to API roles, and reads no user-editable metadata. `ON CONFLICT (id) DO NOTHING` prevents a duplicate profile. A trigger failure would fail the signup transaction; the local duplicate-key test confirmed a failed duplicate Auth insertion did not add another profile. Deleting an Auth user cascades to its profile. Email changes after signup are not synced by this trigger; Account's authenticated server update supplies email when used. That is a deliberate minimal baseline and a later product decision if email sync is required.

RLS is enabled immediately. `authenticated` receives own-row `SELECT` and limited-column `UPDATE` with matching `USING` and `WITH CHECK`; it cannot update `id` or `email` through those grants. `anon` receives no table privilege. There is no public profile read policy. The Account API revalidates a bearer token with `auth.getUser(token)` and applies user-ID filters before using a server-only service-role client. The previously untracked `20260927023446_blue_marina_account_service_role_grants_v1.sql` was reviewed and included in this exact freeze: it grants `service_role` only the required table operations (`SELECT/INSERT/UPDATE` on profiles; `SELECT/INSERT/UPDATE/DELETE` on saved items), creates no table, and grants nothing to anon or authenticated. It was not modified.

## Migration order and fresh-database result

The actual CLI timestamp order is:

1. `202606300001_blue_marina_learning_states.sql` (existing independent learning table)
2. `20260920100000_blue_marina_profile_baseline_v1.sql` (new)
3. `20260920103020_charter_supply_intake_backend_v1.sql` (existing)
4. `20260920115127_market_supply_backend_v1.sql` (existing)
5. `20260923100000_blue_marina_account_v1.sql` (existing)
6. `20260927023446_blue_marina_account_service_role_grants_v1.sql` (pre-existing artifact included after provenance and grant review)

This is **dependency-safe**: Account follows its profiles prerequisite; Charter/Market use `auth.users` directly and do not require Account. It differs from the requested logical activation order of **Auth/Profile → Account → Account grants → Charter → Market** because the already committed Charter/Market migration versions precede Account. Their file names and SQL were not rewritten: renumbering an existing migration can invalidate migration history in an environment that has recorded it. Preserve the safe CLI order and use the logical order for feature activation, or reconcile per-environment migration history before any future deliberate renumbering. Never simply apply the files in a hand-selected order and then assume CLI history matches.

An isolated CLI 2.113.0 instance had a fresh Supabase-compatible Postgres 17 schema and no `profiles` fixture. For the freeze, the check was repeated from a clean detached checkout of `HEAD` plus **only the five exact freeze files**. The fresh Supabase startup applied all six migrations, and the clean-copy targeted live tests passed 6/6. SQL tests created two local Auth users inside a rolled-back transaction: both profiles appeared; a duplicate Auth ID failed without duplicating a profile; own read/update succeeded; cross-user read/update returned no row; anon had no profile privileges; service role read both; deleting one Auth user removed its profile. No test Auth rows persisted. These are **local database checks**, not a hosted signup/session, Storage, or remote RLS acceptance test.

## Charter, Market, Storage

Fresh-local Charter and Market migrations passed, and the staging catalog shows no matching table-name collision. Both domains use `auth.users` foreign keys, RLS, and explicit service-role table/sequence grants. Their API flags stay fail-closed. A successful migration does not mean operator/seller roles, review actions, or public publication are ready for Production.

Existing staging Storage has three private fish-observation buckets. Market requires a separate **private** `market-listing-staging` bucket with an 8 MiB object limit and JPEG/PNG/WebP allowlist. The intended path is `<seller-id>/<listing-id>/<random-id>-<filename>`; issuance uses a server-validated owner/listing and a signed upload URL with `upsert:false`. Before activation, review `storage.objects` insert/select policies, signed URL lifetime, object ownership, listing ownership, allowed MIME/size, and approved-only read exposure. Do not grant broad public bucket access. No bucket or policy was created remotely in this task. [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) and [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) describe these boundaries.

## Auth and environment contract

For each environment, set the Auth Site URL to that environment's exact origin. The intended Production origin is `https://blue-marina.vercel.app`; confirm ownership before using it. List only the exact login/confirmation callback URLs needed by the app. Give staging its own URL and redirect allowlist. Do not add a broad Production wildcard for arbitrary Vercel previews; approve specific preview origins when required. Decide email-confirmation and signup policy explicitly, verify confirmation links and session refresh/expiry/logout, and verify deleted-user behavior. [Supabase redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls) supports exact Production callbacks.

The code expects `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or a compatible publishable-key contract after code verification), and server-only `SUPABASE_SERVICE_ROLE_KEY`. Never put the service-role key in `NEXT_PUBLIC_*` or this repository. `ACCOUNT_BACKEND_ENABLED`, `CHARTER_SUPPLY_INTAKE_ENABLED`, `MARKET_BACKEND_ENABLED`, and `MARKET_IMAGE_UPLOAD_ENABLED` remain **OFF** in Production until their gates pass. No value or secret was read into this document.

## New Production bootstrap and recovery sequence

1. Confirm the owner, billing, region, and purpose, then create a **new** Blue Marina Production Supabase project; do not select another existing project by name.
2. Record its ref and verify it is healthy, empty for Blue Marina product tables, backed up, and isolated from staging.
3. Apply the repository's **actual timestamp-ordered** baseline/migration set to a fresh test clone first, including the reviewed Account grants migration. Apply to Production only after staging QA and a reviewed restore plan.
4. Run database/security advisors; inspect RLS, grants, functions, Auth FK, and Data API exposure under anon/authenticated/service roles.
5. Configure Auth Site URL, exact redirect URLs, email/signup policy, confirmation templates, and session settings per environment.
6. Create the private Market staging bucket and narrowly scoped Storage policies only after review; verify image upload and read behavior with test objects.
7. Create disposable **test** user/admin actors under an approved QA plan; test signup/profile, cross-user denial, Charter submit/review, Market submit/review, and account deletion.
8. Configure Vercel Preview/Staging env against its matching backend first; set Production URL/publishable-or-anon key and server-only service key only for the confirmed Production project. Keep all four feature flags OFF.
9. Run Preview/Staging-like browser/API/DB/Auth/Storage smoke tests and verify no cross-environment reference or secret exposure.
10. Activate Account, Charter, and Market gates separately with monitoring and rollback criteria; enable image upload last, after Storage verification. Production deployment and activation are outside this task.

New migrations and `auth.users` linkage are not assumed reversible. Back up SQL schema/data, Auth users/config, and Storage bucket metadata/objects separately before any remote apply. Turning a feature flag OFF can stop application writes, but it does not undo SQL, created accounts, or uploaded files. Prefer reviewed forward fixes or a tested restore; do not issue blanket `DROP` or reset against a populated project.

## Remaining limitations

Production ref is unknown and no remote apply occurred. Hosted Auth signup/email redirect, remote RLS, service-role grants, Storage signed upload and real image bytes remain unverified. The Account grants migration originated as a separate pre-existing untracked worktree file; its provenance and permissions were checked before inclusion in this freeze. Existing unrelated tracked/untracked changes were preserved.

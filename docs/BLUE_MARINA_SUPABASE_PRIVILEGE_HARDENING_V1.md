# Blue Marina Supabase Privilege Hardening V1

## Decision

`SUPABASE_PRIVILEGE_HARDENING_COMPLETE_WITH_LIMITATIONS`. The RLS-bypassing table privilege blocker is removed from the existing Supabase project `mlfvpaikfpjrgrhwlrjn`. A single new migration, `20260927112051_blue_marina_privilege_hardening_v1.sql`, was applied by the official Supabase CLI and is the seventh recorded migration. No user, product, fish, marine or Storage data changed. Auth/Account activation remains a separate task because Production Auth URL/redirect, Vercel credentials/flags and real signup E2E are not in this scope.

## Precheck and root cause

Before the change, `main`, HEAD and `origin/main` were `1315c3c7bf61582e5d06ea73c5ae7ebb02e9e4a0`; the six remote migrations were present in official history. The seven legacy fish/marine table counts and digests matched the prior recovery baseline exactly. `fish_species` was 1,258, `marine_organisms` 3,016, `auth.users` 0, and three private fish Storage buckets held zero objects.

The affected tables are owned by `postgres` in the `public` schema. Its existing schema-scoped default ACL granted all table privileges to `anon`, `authenticated` and `service_role`, plus SELECT to `fish_auditor`. The Learning migration enabled RLS but did not revoke inherited table grants. The Account migration revoked Saved Items privileges from `anon`, but its broad inherited `authenticated` grants remained. In particular, `anon` could `TRUNCATE` Learning and `authenticated` could `TRUNCATE` Saved Items at the database role level. [PostgreSQL documents](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) that `TRUNCATE` is not governed by RLS. No destructive SQL was executed on the remote database.

## Migration and intended grants

The new migration revokes inherited privileges on the 12 Blue Marina Learning/Profile/Account/Charter/Market tables from `anon`, `authenticated` and `service_role`, then grants only the current product contracts. If the legacy `fish_auditor` role exists, its inherited SELECT on these cross-domain tables is removed; fresh Supabase databases without that role also apply the migration. Charter/Market audit sequences are reduced to `USAGE, SELECT` for `service_role`. The migration also revokes `TRUNCATE`, `REFERENCES`, `TRIGGER` and `MAINTAIN` from future `postgres`-owned `public` table defaults for the three platform roles. It leaves existing fish/marine tables, other schema owners, Supabase-managed schemas and future DML defaults unchanged.

| Table group | `anon` after | `authenticated` after | `service_role` after |
| --- | --- | --- | --- |
| Learning | none | SELECT, INSERT, UPDATE | none |
| Profiles | none | SELECT plus five column-limited UPDATE grants | SELECT, INSERT, UPDATE |
| Saved Items | none | SELECT, INSERT, UPDATE, DELETE with own-row RLS | SELECT, INSERT, UPDATE, DELETE |
| Charter submission | none | none | SELECT, INSERT, UPDATE |
| Charter review, promotion, audit | none | none | SELECT, INSERT |
| Market listings, images, contacts | none | none | SELECT, INSERT, UPDATE |
| Market review, audit | none | none | SELECT, INSERT |

The Learning client calls `auth.getUser()` before selecting or upserting a user's own state, so anonymous access is not required. Account's server uses a validated bearer token and a server-only service client. Saved Items gained an own-row UPDATE policy (`USING` and `WITH CHECK`) to match its authenticated CRUD contract. Profile auto-creation remains tied to `auth.users` and its column-limited direct edit contract remains intact. Charter and Market browser grants stay absent; administrative actions still require application-layer role validation.

## Verification

The existing six migrations plus the new migration applied to a fresh, network-isolated Supabase PostgreSQL 17.6 container. Transaction-rolled-back local fixtures proved: two Auth users create two profiles; an authenticated role reads and updates only its own Learning and Saved Items rows; cross-user update affects zero rows and cross-user insert is denied; the service role reads its intended data; `TRUNCATE` attempts by `anon` and `authenticated` are denied. A temporary local table showed the scoped future default ACL no longer grants `TRUNCATE` to browser or service roles.

Immediately before remote apply, all seven legacy data digests still matched and official migration history contained exactly six entries. A CLI dry run showed **only** `20260927112051_blue_marina_privilege_hardening_v1.sql`. `supabase migration up --linked --include-all` applied it and official history now contains seven entries. The post-apply 36 role/table privilege sets matched the intended matrix. On all 12 tables, `anon`, `authenticated` and `service_role` have no `TRUNCATE`, `REFERENCES` or `TRIGGER`; all 12 still have RLS enabled. The saved-item own-row UPDATE policy, profile column UPDATE, audit sequence boundary and removal of `fish_auditor` SELECT on these tables passed. The seven legacy counts/digests are identical; Auth users remain 0; Storage buckets and objects are unchanged.

Supabase Security Advisor reported **0 CRITICAL/HIGH** findings. Its 27 INFO RLS-with-no-policy notices include the service-only Charter/Market tables, which have RLS and no browser table privileges. Two WARN security-definer findings are pre-existing fish-domain functions. The advisor did not replace the explicit effective-privilege audit.

## Limits and next action

No remote Auth user or JWT fixture was created. The own-row and denial tests ran only in the isolated database; Production signup and API behavior still need E2E verification. The scoped default-ACL change prevents future inherited `TRUNCATE` for `postgres`-owned `public` tables, while future DML defaults remain broad and each future migration must explicitly review/revoke unnecessary grants. The existing default SELECT grant to fish_auditor also remains for future tables; this migration removes it only from the twelve current backend tables. Other Supabase owners' defaults were not altered.

The next task is `AUTH_ACCOUNT_REMOTE_ACTIVATION`: configure Supabase Auth Site URL/redirect, Vercel Supabase env, then test signup/login, automatic profile creation and Account API before enabling `ACCOUNT_BACKEND_ENABLED` and running Production smoke. This task did not alter Auth configuration, Vercel env/flags, Storage, deploy state, or Git stage/commit/push. Unrelated worktree changes remain untouched.


Local verification: targeted 4/4 PASS; full npm test 1,284 passed/1 skipped/0 failed; typecheck, lint, build (1,465 static pages), and git diff --check PASS. No Git files were staged, committed, or pushed.

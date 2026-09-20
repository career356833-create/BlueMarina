# Blue Marina Charter Supply Intake Backend Activation Rehearsal V1

## Decision

`SUPPLY_INTAKE_REHEARSAL_BLOCKED`

The repository baseline matched `main` and `origin/main` at `ac6f4bf18c633c6b4763a3186408e910d389980c`. A safe isolated database environment was not available, so the migration and live Auth, RLS, API, and lifecycle checks were not executed. No remote environment was used and production was not touched.

## Environment identification

The environment checks produced these results:

- Supabase CLI `2.113.0` is available.
- The Docker client is installed, but the Docker Desktop Linux engine is unavailable.
- Docker Desktop was launched and given two minutes to initialize; the engine socket remained unavailable.
- A direct attempt to start `com.docker.service` failed because the current session cannot open that Windows service.
- The repository has no `supabase/config.toml`, so there was no existing local project configuration to inspect or reuse.
- No explicitly identified isolated staging project was available.
- Any remote environment was therefore classified as `UNKNOWN` and was not contacted or mutated.

The selected rehearsal environment is `none`. The local candidate is unavailable, staging is unidentified, and production touched is `NO`.

## Attempted rehearsal steps

1. Verified the branch, `HEAD`, `origin/main`, and preserved the existing unrelated worktree.
2. Checked the Docker client and daemon. The client responded, while the daemon returned an unavailable named-pipe error.
3. Checked Supabase local status. It could not inspect container health because the Docker engine was unavailable.
4. Launched Docker Desktop with a hidden window and waited for the Linux engine.
5. Tried to start the Docker Desktop Windows service without elevation. Windows denied opening the service.
6. Checked for a repository-local Supabase configuration and found none.
7. Stopped before migration apply because neither a functioning isolated local instance nor an explicitly identified isolated staging project existed.

No destructive reset, remote database command, migration apply, actor creation, feature-flag change, rehearsal data insertion, or cleanup command was run.

## Credentials policy

No Supabase URL, anonymous key, service-role key, access token, password, or rehearsal credential was read into a report or written to the repository. No real user or production account was used. A future run must create clearly marked ephemeral users only inside the selected isolated environment, assign `app_metadata.charter_role = charter_admin` through a server-controlled administrative path, and remove those actors and their rehearsal rows after verification.

## Migration result

The target remains `supabase/migrations/20260920103020_charter_supply_intake_backend_v1.sql`. It was not applied. Consequently, the following live checks remain pending:

- Four table existence checks.
- Index and constraint checks.
- RLS activation and direct `anon`/`authenticated` denial checks.
- Minimum `service_role` privilege checks.
- Safe reapplication or duplicate execution behavior.

The existing repository tests still inspect the migration text for four RLS statements, revoked browser roles, the immutable source guard, and the production activation boundary. Those checks are static evidence and are not represented as live database results in the rehearsal report.

## Lifecycle result

The intended flow was not executed:

`migration → authenticated operator submission → server validation → REVIEW_REQUIRED → charter_admin review → APPROVED → promotion candidate`

The success and failure submissions, valid and invalid transitions, approval, rejection, request changes, bulk dry-run and submit, idempotent replay, MOF crosswalk persistence, promotion candidate persistence, and audit-log order all remain unverified against a live isolated database and API.

Every corresponding field in the JSON report uses `NOT_EXECUTED_ENVIRONMENT_BLOCKED`. False values mean the check was not executed; they do not assert a product failure. Counts that cannot be observed are `null` rather than zero.

## RLS, Auth, and API result

No normal rehearsal user or Charter administrator was created. Feature-flag OFF and ON behavior, missing and invalid token responses, non-admin review denial, direct table denial, service path access, standard error responses, and stack-trace suppression remain pending live verification.

The migration was not redirected to an unknown remote project. This preserves the requirement that production or identity-uncertain environments receive no schema or feature-flag changes.

## Known limitations

- Docker Desktop requires a healthy Linux engine before local Supabase can start.
- The current session could not start the Docker Desktop Windows service.
- A fresh isolated project configuration must be created outside the existing local data path.
- Static unit coverage does not substitute for Auth, RLS, PostgREST, and Route Handler integration evidence.
- The backend's existing in-memory rate limiter remains outside this rehearsal and still requires a distributed replacement before scaled production use.

## Production activation prerequisites

1. Start a healthy Docker Desktop Linux engine, or explicitly identify an isolated non-production staging Supabase project.
2. Create a separate local Supabase work directory and copy only the target migration into its migration directory; do not reset an existing database.
3. Apply the migration and verify the four tables, constraints, indexes, RLS, grants, and service path.
4. Create ephemeral normal and `charter_admin` rehearsal actors and validate the feature flag in both states.
5. Run the complete API lifecycle, bulk import, idempotency, crosswalk, promotion-candidate, audit, error-contract, and cleanup checks.
6. Confirm again that `src/lib/charters/registry.ts`, `/charters`, and all production activation state remain unchanged.

Production migration apply, production user creation, production feature-flag activation, automatic `PROMOTED` transition, and production Charter registry activation require a separate authorized rollout after this rehearsal passes.

## Verification

- Rehearsal artifact tests: 10/10 passed.
- Full repository tests: 931/931 passed.
- TypeScript typecheck: passed.
- ESLint: passed.
- Next.js production build: passed.
- Git diff check: passed.
- Staged files, commits, and pushes: 0/0/0.

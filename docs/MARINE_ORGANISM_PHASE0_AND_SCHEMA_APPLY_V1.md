# Marine Organism Phase 0 and Schema Apply V1

## Result

- Phase 0: `MARINE_ORGANISM_PHASE0_PASS`
- Schema apply: `MARINE_ORGANISM_SCHEMA_APPLY_PASS`
- Audit surface: ready
- Canary readiness: yes
- Marine Organism data import: 0 rows

## Phase 0

The target was staging project `mlfvpaikfpjrgrhwlrjn`. `main` and `origin/main` both pointed to `33f3f8aa070a6520183b133fdb02809334c894a0`; no file was staged. The administrator connected as `postgres` through the session pooler with database/public CREATE privileges. The auditor connected as `blue_marina_readonly_auditor` with transaction read-only enabled, no RLS bypass and no schema CREATE privilege.

The six target tables and all related Marine function, policy, trigger, and index names had no staging collision. `pgcrypto`, the three Fish authorization helpers, Supabase browser/service roles, and the auditor role were present. Static review found no Fish mutation, DROP, TRUNCATE, public write grant, data INSERT, or secret. Before apply, direct execution of the two trigger functions was explicitly revoked from PUBLIC and Supabase API roles.

## Fish Snapshot

Before and after apply:

- Fish species: 1,258
- NIFS species: 8
- MBRIS species identity: 1,250
- MBRIS source relations: 1,253
- Fish tables/RLS: 30/30
- Fish policies: 22
- Fish functions: 19
- Fish indexes: 78
- Fish triggers: 16

Policy, constraint, index, and trigger fingerprints were unchanged. Fish schema, RLS, ACL, and rows were not modified.

The Fish baseline contains the known scientific identities `Amphioctopus fangsiao`, `Chionoecetes japonicus`, and `Chionoecetes opilio`. They remain documented as `CROSS_DOMAIN_IDENTITY_REVIEW_REQUIRED` and did not block the separate Marine Organism schema.

## Atomic Apply

The reviewed bodies of the schema migration and audit-surface migration were executed in one transaction with `ON_ERROR_STOP`, a statement timeout, and a lock timeout. The transaction committed successfully and the administrator password environment variable was removed immediately.

Created and verified:

- Tables: 6
- Columns: 73
- Constraints: 44
- Indexes: 24
- Triggers: 6
- RLS-enabled tables: 6/6
- Policies: 17
- Audit functions: 6

All Marine inventory counts were zero after apply.

## ACL Result

Anonymous users can SELECT only the three public-facing tables and cannot write. Authenticated users receive the reviewed SELECT surface, crawler source-record INSERT privilege guarded by RLS, and reviewer-only `review_status` column update. They cannot update immutable slugs or delete Marine rows. Service/admin writes remain on the server credential boundary.

The six audit functions grant execution only to the dedicated auditor. PUBLIC, `anon`, `authenticated`, and `service_role` each have zero audit-function execution grants.

## Dry Run V2 and Canary

The post-schema remote dry-run mapped 3,016 READY records with zero internal ID, UUID, slug, normalized scientific-name, source identity, source-record ID, and relation-ID collision. Korean-name and taxonomy blockers were zero. The schema remained empty.

The canary plan contains 10 deterministic candidates: two each from CRUSTACEAN, CEPHALOPOD, GASTROPOD, BIVALVE, and ECHINODERM. It is a plan only; no canary row was imported.

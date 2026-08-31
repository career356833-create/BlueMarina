# Marine Organism Read-Only Audit Surface V1

## Boundary

The staging-only audit surface exposes Marine Organism canonical identity and source provenance to `blue_marina_readonly_auditor`. It does not grant direct table SELECT, `BYPASSRLS`, schema CREATE, browser execution, or mutation privileges.

Environment: staging

Project Ref: `mlfvpaikfpjrgrhwlrjn`

Applied SQL: `supabase/migrations/drafts/staging-hotfix/202608310002_add_marine_organism_readonly_audit_surface.sql`

## Functions

- `marine_organism_readonly_audit_organisms_v1()`
- `marine_organism_readonly_audit_source_records_v1()`
- `marine_organism_readonly_audit_sources_v1()`
- `marine_organism_readonly_audit_aliases_v1()`
- `marine_organism_readonly_audit_slug_aliases_v1()`
- `marine_organism_readonly_audit_change_logs_v1()`

All six functions are no-argument, `STABLE`, SQL-language, `SECURITY DEFINER` functions with `search_path = pg_catalog, public, pg_temp`. Their bodies contain static SELECT statements only.

## ACL

- PUBLIC EXECUTE: 0/6
- `anon` EXECUTE: 0/6
- `authenticated` EXECUTE: 0/6
- `service_role` EXECUTE: 0/6
- `blue_marina_readonly_auditor` EXECUTE: 6/6
- Auditor direct Marine table SELECT: 0/6
- Auditor schema CREATE: no
- Auditor `BYPASSRLS`: no

The two trigger functions also have no PUBLIC, browser-role, or service-role direct execution grant.

## Returned Data

The functions return canonical IDs, stable internal IDs, slugs, names, taxonomy columns, review/publish state, source identities and hashes, relation identity, reviewed aliases, and selected change-log identity keys. They exclude raw payload bodies, raw storage paths, source URLs, user data, credentials, tokens, and private application records.

## Initial Verification

Immediately after schema application all six inventory counts were zero. The auditor connected with `transaction_read_only=on`, could execute all six functions, and had no direct table SELECT privilege. No Marine Organism data row was created.

# Fish Supabase Read-Only Audit Surface V1

## Purpose

The staging role `blue_marina_readonly_auditor` remains subject to Fish RLS and does not receive `BYPASSRLS`, a Fish application role, table write privileges, or mutation RPC execution. Six narrow `SECURITY DEFINER` functions expose only canonical/source identity fields required by MBRIS remote preflight.

Environment: staging

Project Ref: `mlfvpaikfpjrgrhwlrjn`

Applied SQL: `supabase/migrations/drafts/staging-hotfix/20260830_add_fish_readonly_audit_surface.sql`

## RLS Root Cause

All six source tables have RLS enabled. `fish_species` permits public reads only when a row is `published`, `approved`, and not archived. Its remaining SELECT policies require reviewer/admin identity. `fish_source_records` requires reviewer/admin identity for SELECT. The other four tables have no SELECT policy and therefore return no rows to the auditor.

The auditor has no Auth JWT or active Fish role assignment, so the direct-table result is intentionally restricted:

- `fish_species`: 1 row
- `fish_source_records`: 0 rows
- `fish_species_sources`: 0 rows
- `fish_aliases`: 0 rows
- `fish_species_slug_aliases`: 0 rows
- `fish_change_logs`: 0 rows

No existing policy was changed.

## Functions

| Function | Returned data |
| --- | --- |
| `fish_readonly_audit_species_v1()` | Species UUID, slug, Korean/English/scientific names, normalized scientific identity, source/internal identity, review/publish state, archive state |
| `fish_readonly_audit_source_records_v1()` | Source UUID, provider/id, content hash, parser/status/current/archive state |
| `fish_readonly_audit_species_sources_v1()` | Relation UUID, species/source UUIDs, MBRIS source identity when present, primary/link/archive state |
| `fish_readonly_audit_aliases_v1()` | Species/alias identity, normalized alias, alias/source/review/archive state |
| `fish_readonly_audit_slug_aliases_v1()` | Species/slug-alias identity, redirect source, active state |
| `fish_readonly_audit_change_logs_v1()` | Entity/change/source UUIDs and selected import identity keys only |

The surface excludes source URLs, raw payloads, storage paths, before/after payload bodies, user data, observations, private locations, media paths, Auth data, credentials, and tokens.

## Security Contract

- Functions: 6
- Arguments: none
- Language: SQL
- Volatility: `STABLE`
- Security: `SECURITY DEFINER`
- Owner: `postgres`
- Search path: `pg_catalog, public, pg_temp`
- Dynamic SQL: none
- Side effects: none; every body contains one static SELECT
- PUBLIC EXECUTE: no
- `anon` EXECUTE: no
- `authenticated` EXECUTE: no
- `service_role` EXECUTE: no
- `blue_marina_readonly_auditor` EXECUTE: yes
- Existing RLS changes: none
- Auditor `BYPASSRLS`: false
- Auditor table write privileges: none
- Auditor schema CREATE: none
- Auditor mutation RPC execution: none

## Verified Inventory

The direct-table restriction remains active while the audit surface returns the complete current Fish identity inventory:

- Species: 9
- Source records: 8
- Species-source relations: 8
- Aliases: 1
- Slug aliases: 0
- Change logs: 29

Eight species are the expected NIFS imports. One extra disposable smoke-test species (`smoke-test-47cfd4da`) remains in staging. It is reported as drift and was not deleted or modified.

## Operational Boundary

This surface is only for metadata/canonical identity comparison. It is not an application API and must not be granted to browser roles. Future changes require the same static-body, minimal-column, explicit-ACL review.

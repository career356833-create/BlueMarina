# Fish Read-Only Auditor Select Grant V1

- Generated: 2026-08-30T11:52:29.975Z
- Environment: staging
- Project Ref: mlfvpaikfpjrgrhwlrjn
- Role: blue_marina_readonly_auditor
- Status: PARTIAL_GRANT_APPLIED_REMOTE_PREFLIGHT_BLOCKED
- RLS changed: NO
- BYPASSRLS granted: NO
- Mutation RPC EXECUTE granted: NO

## Grants Applied

- Schema: public USAGE
- Table SELECT objects:
  - public.fish_species
  - public.fish_source_records
  - public.fish_species_sources
  - public.fish_aliases
  - public.fish_species_slug_aliases
  - public.fish_change_logs

## Allowed Privilege Changes

- public.fish_species.SELECT
- public.fish_source_records.SELECT
- public.fish_species_sources.SELECT
- public.fish_aliases.SELECT
- public.fish_species_slug_aliases.SELECT
- public.fish_change_logs.SELECT

## Unexpected Privilege Changes

- none

## Remaining Blocker

Existing RLS policies call fish role helper functions that are not executable by the auditor. Because this task allowed only SELECT/USAGE grants, no helper EXECUTE grant or RLS policy change was applied.

No INSERT, UPDATE, DELETE, TRUNCATE, CREATE, role membership, BYPASSRLS, policy, default privilege, or mutation function privilege changes were made.

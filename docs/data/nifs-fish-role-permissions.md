# NIFS Fish Role Permissions

## Final role model

The fish encyclopedia uses a separate `app_metadata.fish_role` claim. This is
independent from the older institution roles in the repository.

- `fish_admin`: owns schema-level fish operations, source linkage, review,
  publication, archive/restore, and change-log writes.
- `fish_reviewer`: can review facts, media, AI content, categories, and
  relations. It cannot delete raw source versions, mutate source metadata, or
  publish a species.
- `fish_crawler`: can insert a new immutable source-record version only. It
  cannot create internal species IDs, final slugs, approval states, links, or
  published content.

No browser receives a service-role key. Claim issuance remains a server-side
administrative action.

## Table permission matrix

Legend: `R` select, `C` insert, `U` update, `D` delete. `-` means no direct
access. Archive is an update, not a delete.

| Table | Public | fish_admin | fish_reviewer | fish_crawler |
| --- | --- | --- | --- | --- |
| fish_source_records | - | R/C/U/D | R | C only |
| fish_species | published R | R/C/U/D | R + fact-review RPC | - |
| fish_species_sources | - | R/C/U/D | R | - |
| fish_species_slug_aliases | published R | R/C/U/D | R | - |
| fish_aliases | approved R | R/C/U/D | R + review RPC | - |
| fish_display_categories | active R | R/C/U/D | R | - |
| fish_species_display_categories | approved R | R/C/U/D | R + review RPC | - |
| fish_species_relations | approved R | R/C/U/D | R + review RPC | - |
| fish_generated_contents | approved published R | R/C/U/D | R + review RPC | - |
| fish_media | approved usable R | R/C/U/D | R + review RPC | - |
| fish_change_logs | - | R/C | R | - |

## Reviewer restrictions

Reviewer direct table writes are intentionally absent. The draft supplies one
`review_fish_entity` RPC that checks the `fish_reviewer` claim and updates only
the appropriate review-status column. It cannot alter provenance, canonical
slug, internal species ID, source version/current flags, or `publish_status`.

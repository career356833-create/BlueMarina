# NIFS Fish Supabase Schema Review

## Scope

This is a migration **draft** for the NIFS fish encyclopedia contract. It is
not applied to a Supabase project and does not alter any existing tables.

Draft SQL: `supabase/migrations/drafts/202607310001_nifs_fish_schema.sql`

## Decision: CHECK constraints instead of new PostgreSQL enums

The existing schema uses enums for older application domains. The fish contract
is still expected to evolve during the NIFS ingestion phase, so the draft uses
text columns with explicit `CHECK` constraints for status and controlled values.

This keeps TypeScript union changes and later migration changes additive rather
than requiring an enum-alter deployment. The database still rejects values
outside the agreed contracts.

## Tables

| Table | Layer | Purpose |
| --- | --- | --- |
| `fish_source_records` | source | Immutable-ish raw source versions, hashes, crawl state, and staging paths |
| `fish_species` | canonical | Internal species master and immutable canonical slug |
| `fish_species_sources` | canonical/source join | Source precedence and primary-source selection |
| `fish_species_slug_aliases` | identity | Permanent redirect aliases for old or legacy slugs |
| `fish_aliases` | identity | Search/display aliases, separate from route aliases |
| `fish_display_categories` | presentation | Admin-managed UI filter dictionary |
| `fish_species_display_categories` | presentation join | Multiple approved category assignments per species |
| `fish_species_relations` | relation | Related-species graph with directional and symmetric rules |
| `fish_generated_contents` | AI | Generated content, source hash, and approval gate |
| `fish_media` | media | Source/generated media provenance and use clearance |
| `fish_change_logs` | audit | Append-only change history |

Final table count: **11**. `fish_taxonomy` is intentionally not introduced at
this stage: taxonomy is a one-species canonical JSONB object and has no
independent lifecycle yet. Normalizing it later remains possible without
changing the public read model.

## Key constraints

### Source versioning

- `fish_source_records` is unique on `(source_provider, source_id, content_hash)`.
- One active `is_current` version per external source key is enforced with a
  partial unique index.
- Same hash means update `last_seen_at`; a new hash creates a new version and
  flips the older version out of `is_current` in a reviewed ingestion flow.
- Failed or missing source records are never a reason to delete an already
  published species.

### Identity and slug aliases

- `fish_species.id` is an opaque UUID internal ID.
- `fish_species.slug` is unique and immutable through a trigger.
- Old URLs live in `fish_species_slug_aliases`; `alias_slug` is globally unique
  and is intentionally retained instead of deleted.
- `fish_aliases` is for names/search only and permits the same alias text for
  different species when context is ambiguous.

### Display category

- Taxonomy remains in `fish_species.taxonomy`.
- UI categories live in a separate dictionary and a many-to-many assignment
  table.
- Only one approved active primary category is allowed per species.
- `ai_candidate` assignments cannot become public without approval.

### Related species

- Self-reference is rejected.
- `similar_appearance`, `same_taxon`, `same_habitat`, and `co_search` are
  symmetric. They must use the canonical UUID order, allowing only one row for
  the unordered pair and relation type.
- `confusable` and `substitute` remain directional as `source -> target`.

### Publication safety

- A generated item cannot be `published=true` unless its AI review is approved.
- Public reads include only species whose `publish_status='published'`.
- Public AI reads additionally require `published=true` and approved review.
- Public media reads additionally require approved review, `usage_status='ready'`,
  and a verified or licensed copyright status.

## RLS draft

The SQL enables RLS on all eleven fish tables.

| Actor | Access |
| --- | --- |
| Public / authenticated reader | Published species and approved presentation data only |
| `app_metadata.fish_role = admin` | Review and write access to all fish tables; read/append change logs |
| `app_metadata.fish_role = crawler` | Insert-only access to `fish_source_records` |

The draft intentionally does not grant crawler access to `fish_species`,
relations, categories, generated content, media, or publishing fields. A future
server-side importer should validate staging output and use an admin-controlled
path. Do not expose a Supabase service-role key to a browser.

## Existing database compatibility

- No existing table is altered.
- No existing enum, policy, storage bucket, or learning-state policy is changed.
- All draft object names start with `fish_` except two narrowly-scoped helper
  functions (`is_fish_admin`, `is_fish_crawler`).
- Existing `gen_random_uuid()` usage means this draft follows the repository's
  current UUID convention; it does not add extension setup.

## Validation scenarios represented by the schema

| Scenario | Schema behavior |
| --- | --- |
| Same source ID, new hash | Allowed as a new source version; current-version index requires the importer to retire the previous current row |
| Same scientific name, different source | Allowed; scientific name is indexed, not unique |
| Slug collision | Unique canonical slug rejects it; deterministic suffix must be decided before insertion |
| Slug redirect | Alias table maps an old slug to the same immutable species ID |
| Multiple categories | Join table supports many assignments; one approved primary only |
| Unapproved AI category | Stored as candidate but excluded from public read policy |
| Symmetric relation duplicate | Canonical pair `CHECK` plus unique triple rejects reverse/duplicate records |
| Directional relation | `confusable` and `substitute` retain source/target order |
| Source missing then archive | Source record can be marked `missing` then `archived`; species remains intact |
| Published source refresh | New source version can be linked/reviewed without forcing species unpublish |
| Unreviewed AI content | Cannot be marked published and has no public-read path |

## Still requiring approval before a real migration

1. The exact administrative claim issuance method for `app_metadata.fish_role`.
2. Whether source raw payloads belong in Postgres JSONB at production scale or
   should always be file paths in Supabase Storage.
3. The importer transaction policy for retiring `is_current` source versions
   and writing `fish_change_logs` atomically.
4. Whether public media should also permit a separately reviewed `restricted`
   copyright state for specific licensed contracts. The current draft blocks it.

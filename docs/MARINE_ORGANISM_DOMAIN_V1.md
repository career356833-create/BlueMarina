# Marine Organism Domain V1

## 1. Purpose

Marine Organism is Blue Marina's canonical domain for reviewed marine animals that are not fish. V1 covers crustaceans, cephalopods, gastropods, bivalves, echinoderms, and other explicitly validated marine invertebrates. It is not a general biological ontology.

## 2. Scope

Included groups are `CRUSTACEAN`, `CEPHALOPOD`, `GASTROPOD`, `BIVALVE`, `OTHER_MOLLUSK`, `ECHINODERM`, `CNIDARIAN`, `OTHER_MARINE_INVERTEBRATE`, and a guarded `OTHER_MARINE_ANIMAL` extension. Fish, freshwater/terrestrial records, unresolved taxonomy, plants, and algae are excluded from canonical admission.

Input is fixed at 3,167 MBRIS candidates: 3,016 READY, 93 REVIEW, and 58 OUT_OF_SCOPE. The first import contract maps only the 3,016 READY records.

## 3. Fish Domain separation

Marine organisms never enter `fish_species`. No Marine Organism table has a foreign key to a Fish data table. The domains share concepts such as source identity, internal IDs, aliases, review state, and lineage, but not persistence lifecycle.

Three READY records already have the same scientific identity in the frozen Fish baseline: `Amphioctopus fangsiao`, `Chionoecetes japonicus`, and `Chionoecetes opilio`. They are documented cross-domain identities. Their Marine Organism internal IDs and scientific-name slugs do not collide with Fish IDs or slugs. This draft does not change the frozen Fish rows.

The existing `is_fish_admin`, `is_fish_reviewer`, and `is_fish_crawler` helpers are reused only as the current app-wide authorization boundary. That dependency does not create a Fish data FK.

## 4. Data model

- `marine_organisms`: canonical identity, promoted taxonomy fields, full taxonomy JSONB, review/publish state.
- `marine_organism_source_records`: versioned source evidence owned by this domain.
- `marine_organism_sources`: canonical/source relation, precedence, and lineage.
- `marine_organism_aliases`: reviewed name and scientific synonym aliases.
- `marine_organism_slug_aliases`: redirect continuity for immutable slugs.
- `marine_organism_change_logs`: append-only change provenance.

Slug aliases are retained because canonical slugs are immutable. A taxonomy revision must not silently break existing routes.

## 5. Identity

The registry `internal_id` remains the stable business identity and is unique within Marine Organism. The importer deterministically derives canonical UUIDv5 from `marine-organism:<internalId>`, source UUIDv5 from source identity plus hash, and relation UUIDv5 from both IDs. Re-running a batch therefore targets the same rows.

Fish and Marine Organism have separate table and route-slug namespaces. Scientific names are unique after NFKC/space normalization inside Marine Organism. Slugs are lowercase ASCII kebab-case derived from the canonical scientific name. Korean transliteration and automatic numeric suffixes are prohibited.

## 6. Source and provenance

V1 selects a dedicated source table instead of reusing `fish_source_records`. Both domains preserve the same MBRIS provider/source strings, but separate storage prevents FK and archival coupling. A neutral common registry can be considered later only through an explicit migration.

Each relation stores field precedence and a source lineage object containing provider, sheet, row, hash, internal ID, and candidate artifact version.

## 7. Taxonomy

Frequently queried fields are promoted to columns: organism group, phylum, class, order, family, and genus. The full source taxonomy remains JSONB. V1 deliberately avoids a normalized taxonomic tree, accepted-name graph, or broad life ontology.

## 8. Review state

Canonical `korean_name` is non-null in V1. The 55 marine candidates without a sourced Korean name remain in REVIEW; no translation is inferred. Taxonomy-incomplete, uncertain, complex, or duplicate-identity candidates are also excluded from the first import.

Initial canonical rows are always `draft` and `pending`. Publication requires `published`, `approved`, and no archive timestamp.

## 9. RLS

Anonymous and authenticated users can read only published, approved, active canonical rows and approved active aliases. Reviewers can read internal evidence and update only `review_status`. Crawler credentials can insert source records. Admin policies exist, while broad mutation is intentionally kept behind server/service credentials rather than browser grants.

Default browser privileges are revoked before reviewed grants are added.

## 10. Import pipeline

The pipeline is `Source -> Candidate -> Validation -> Canonical Promotion`. `tools/mbris/import-marine-organisms.cjs --dry-run` maps the READY set, checks deterministic identity, scientific and slug uniqueness, taxonomy completeness, source identity, and initial state. `--execute` is deliberately unimplemented and fails closed until a separate approval.

Import execution must use batches inside explicit transactions, stop on the first error, roll back the whole batch, and validate source/relation/lineage counts after commit. Re-run idempotency keys are internal ID, source ID, and source hash.

## 11. Canary

The staging canary imported two deterministic READY records from each of five initial groups: crustacean, cephalopod, gastropod, bivalve, and echinoderm. The first transaction created one shared MBRIS source record, ten organisms, ten source relations, and ten change logs. The idempotency rerun inserted zero rows, and all organisms remain draft/pending and hidden from public access.

## 12. Audit strategy

The initial schema migration does not include SECURITY DEFINER audit functions. Phase 0 completed the independent SQL and ACL review and applied the separate staging audit migration at `supabase/migrations/drafts/staging-hotfix/202608310002_add_marine_organism_readonly_audit_surface.sql`. Its six metadata/read-only functions fix `search_path`, avoid application row leakage, revoke EXECUTE from PUBLIC/anon/authenticated/service_role, and grant only the dedicated auditor.

## 13. Future UI

Future UI may expose a marine-life encyclopedia, seafood or fishing-target flags, shellfish/crustacean/cephalopod collections, and biodiversity references. The current relevance flags are candidates, not claims of edibility or live product support.

## 14. Do Not Mix rules

- Do not insert Marine Organism rows into `fish_species`.
- Do not import REVIEW or OUT_OF_SCOPE records.
- Do not infer Korean names, taxonomy, edibility, bait use, or fishing-target status.
- Do not share Fish source-table FKs or mutate Fish RLS.
- Do not apply this draft or execute an import without a separate staging approval and preflight.

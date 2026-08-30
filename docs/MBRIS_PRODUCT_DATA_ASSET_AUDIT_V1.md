# MBRIS Product Data Asset Audit V1

Audit date: 2026-08-30
Project: Blue Marina
Scope: `data/mbris/**`, `tools/mbris/**`, `docs/mbris/**`, `reports/mbris/**`

This audit reclassifies the remaining MBRIS worktree from a product fish DB asset perspective. The key correction is that `normalized`, `priority`, and `taxonomy-master` files are not treated as disposable just because they are generated. They are derived product data assets unless proven to be true cache/debug output.

No MBRIS source, normalized data, priority data, or identity data was edited during this audit.

## Base

- Git branch: `main`
- HEAD: `dd1e105467b8456d3d61d9ed210ac4bdcd2dd1e1`
- Tracked MBRIS-related files: 169 by Git pathspec, 163 by filesystem scan under active MBRIS roots
- Untracked MBRIS-related status entries: 660 by Git pathspec
- Filesystem MBRIS total: 825 files / 70.59 MB
- Access note: `tools/mbris/.pytest_cache` is permission-denied in PowerShell scan and is classified as cache/review-required, not product data.

The previous "464 files" count was narrower than this audit. This audit includes raw API/detail provenance, cache/debug artifacts, and the local `tools/mbris/.env` path in the classification scope, so the total is higher.

## Reclassification

| Class | Files | Size | Meaning |
| --- | ---: | ---: | --- |
| PRODUCT_DB_CORE | 85 | 0.38 MB | Normalized species/detail records that can directly shape Fish DB rows after mapping review. |
| PRODUCT_DB_IDENTITY | 1 | 1.46 MB | Stable internal identity registry; must not be regenerated casually. |
| PRODUCT_DB_CURATED | 179 | 24.33 MB | Mapping, review, priority, and pipeline code assets with product decision value. |
| PRODUCT_DB_SNAPSHOT | 15 | 40.30 MB | Large normalized taxonomy/candidate/profile snapshots; derived but product-relevant. |
| SOURCE_ORIGINAL | 452 | 2.62 MB | Official/source API/catalog provenance, including raw request/response/detail files. |
| REBUILDABLE_INTERMEDIATE | 1 | 0.03 MB | Resume/state file for collection work. |
| TRUE_CACHE | 86 | 1.37 MB | Python bytecode/cache only. |
| DEBUG_LOG | 4 | 0.11 MB | Workbook analysis/debug HTML or analysis outputs. |
| REVIEW_REQUIRED | 2 | 0.00 MB | Local env/cache access edge cases that must not be staged blindly. |

Git preservation classes:

| Git policy | Files | Size | Action |
| --- | ---: | ---: | --- |
| MUST_PRESERVE_GIT | 180 | 25.78 MB | Keep in normal Git. Includes mappings, identity registry, tools/tests/docs/reports, and curated priority outputs. |
| MUST_PRESERVE_LFS | 3 | 25.48 MB | Preserve, but use Git LFS or equivalent artifact storage before staging. |
| PRESERVE_OPTIONAL | 550 | 17.84 MB | Useful provenance/snapshots; keep locally until storage policy is decided. |
| EXCLUDE_CACHE_DEBUG | 91 | 1.49 MB | Do not commit. |
| REVIEW_REQUIRED | 1 | 0.00 MB | Do not commit until manually inspected. |

## Normalized

`data/mbris/normalized/**` has 101 files / 42.14 MB. It is not cache by default.

Product DB interpretation:

- `data/mbris/normalized/detail/**`: PRODUCT_DB_CORE, IMPORT_READY after mapping and validation. These are detailed per-species normalized records.
- `data/mbris/normalized/blue-marina-fish-candidates.json`: PRODUCT_DB_SNAPSHOT, IMPORT_READY candidate source, 1,399 records.
- `data/mbris/normalized/fish-master-candidates.json`: PRODUCT_DB_SNAPSHOT, IMPORT_AFTER_MAPPING, 1,399 records.
- `data/mbris/normalized/fish-master-draft.json`: PRODUCT_DB_SNAPSHOT, IMPORT_AFTER_MAPPING, 1,399 records.
- `data/mbris/normalized/species-profile.json`: PRODUCT_DB_SNAPSHOT, IMPORT_AFTER_MAPPING, 4,332 records.
- `data/mbris/normalized/blue-marina-nonfish-candidates.json`: PRODUCT_DB_SNAPSHOT, REFERENCE_ONLY for Fish domain unless non-fish marine domain is introduced, 3,167 records.
- `data/mbris/normalized/nonfish-marine-candidates.*`: PRODUCT_DB_SNAPSHOT, REFERENCE_ONLY.
- `data/mbris/normalized/taxonomy-master.*`: PRODUCT_DB_SNAPSHOT, canonical snapshot/reference.
- `data/mbris/normalized/internal-id-registry.json`: PRODUCT_DB_IDENTITY, already tracked, MUST_PRESERVE_GIT.

Recommended handling:

- Preserve the fish candidates and fish master files until the FishSpecies import mapping is finalized.
- Do not import non-fish candidates into FishSpecies without a separate marine organism taxonomy decision.
- Keep `taxonomy-master.json` as a large canonical snapshot, but do not put it into normal Git without LFS.

## Priority

`data/mbris/priority/**` has 18 files / 22.57 MB.

These files encode product curation and service priority decisions, so they are PRODUCT_DB_CURATED, not cache:

- `data/mbris/priority/species-priority.json`: 4,332 records, MUST_PRESERVE_GIT.
- `data/mbris/priority/service-priority.json`: 4,332 records, MUST_PRESERVE_GIT.
- `data/mbris/priority/service-priority-resolved.json`: 4,332 records, MUST_PRESERVE_GIT.
- `data/mbris/priority/service-tier-a.json`
- `data/mbris/priority/service-tier-a-resolved.json`
- `data/mbris/priority/service-tier-b.json`
- `data/mbris/priority/service-tier-b-resolved.json`
- `data/mbris/priority/service-tier-c.json`
- `data/mbris/priority/service-tier-c-resolved.json`
- `data/mbris/priority/tier1-species.json`
- `data/mbris/priority/tier2-species.json`
- `data/mbris/priority/tier3-species.json`
- CSV summaries and summary JSON files under the same directory.

Import readiness:

- IMPORT_AFTER_MAPPING for Fish DB.
- Preserve before import because these files capture ranking and tier decisions that may not be reproducible from raw data alone without the exact scoring version.

## Taxonomy Snapshot

Key files:

| Path | Size | Class | Git policy | Runtime/build relevance |
| --- | ---: | --- | --- | --- |
| `data/mbris/normalized/taxonomy-master.json` | 19.08 MB | PRODUCT_DB_SNAPSHOT | MUST_PRESERVE_LFS | REQUIRED_AT_BUILD by `tools/species-importer/build-species-db-staging.cjs` |
| `data/mbris/normalized/taxonomy-master.csv` | 4.57 MB | PRODUCT_DB_SNAPSHOT | MUST_PRESERVE_LFS | OFFLINE_PIPELINE_ONLY |
| `data/mbris/raw/catalog/original/mbris-national-species-catalog.xlsx` | 1.84 MB | SOURCE_ORIGINAL | MUST_PRESERVE_LFS | OFFLINE_PIPELINE_ONLY |

Decision:

- `taxonomy-master.json` is not runtime app data, but it is a build/import dependency for the species importer. It must be preserved.
- Because it is a 19.08 MB generated snapshot, Git LFS or external artifact storage is recommended before staging.
- The XLSX is the official source provenance. It is binary and not diffable, so LFS is the correct Git preservation route even though the size is only 1.84 MB.

## Identity

Identity-critical files:

- `data/mbris/normalized/internal-id-registry.json`: PRODUCT_DB_IDENTITY, tracked, MUST_PRESERVE_GIT, REQUIRED_AT_BUILD.
- `data/mbris/mappings/**`: PRODUCT_DB_CURATED, tracked, MUST_PRESERVE_GIT.
- `data/mbris/reports/**`: PRODUCT_DB_CURATED, tracked, MUST_PRESERVE_GIT.

`internal-id-registry.json` prevents accidental internal ID churn. It is already preserved in Git and should remain the identity source of truth unless a formal registry migration is designed.

## Fish Domain

FishSpecies import readiness:

| Asset group | Readiness | Reason |
| --- | --- | --- |
| `data/mbris/normalized/detail/**` | IMPORT_READY | Per-species normalized detail records, small and structured. |
| `data/mbris/normalized/blue-marina-fish-candidates.json` | IMPORT_READY | Fish candidate set with 1,399 records. |
| `data/mbris/normalized/fish-master-candidates.json` | IMPORT_AFTER_MAPPING | Master candidate shape needs final FishSpecies mapping review. |
| `data/mbris/normalized/fish-master-draft.json` | IMPORT_AFTER_MAPPING | Draft import shape, needs staging/import contract validation. |
| `data/mbris/priority/**` | IMPORT_AFTER_MAPPING | Product priority/tier signals; not direct species rows without mapping. |
| `data/mbris/normalized/taxonomy-master.json` | IMPORT_AFTER_MAPPING | Broad taxonomy snapshot; import subset only. |
| `data/mbris/normalized/blue-marina-nonfish-candidates.*` | REFERENCE_ONLY | Not FishSpecies unless scope expands beyond fish. |
| `data/mbris/raw/**` | REFERENCE_ONLY | Provenance and audit source, not direct product row input. |
| cache/debug/env artifacts | NOT_FOR_IMPORT | Not product data. |

Runtime dependency check:

- App `src/**` did not show direct runtime use of MBRIS data in this audit.
- `tools/species-importer/build-species-db-staging.cjs` directly references `data/mbris/normalized/taxonomy-master.json`.
- MBRIS data is therefore OFFLINE_PIPELINE_ONLY / REQUIRED_AT_BUILD, not REQUIRED_AT_RUNTIME for the deployed app.

## Preservation

Exact preserve whitelist for normal Git:

- `data/mbris/mappings/**` already tracked.
- `data/mbris/normalized/internal-id-registry.json` already tracked.
- `data/mbris/reports/**` already tracked.
- `tools/mbris/**/*.py` excluding `__pycache__`.
- `tools/mbris/src/**` excluding `__pycache__`.
- `tools/mbris/tests/**` excluding `__pycache__`.
- `tools/mbris/.env.example`.
- `data/mbris/priority/**` should be a follow-up normal Git preservation candidate.

Exact preserve whitelist for Git LFS or artifact storage:

- `data/mbris/raw/catalog/original/mbris-national-species-catalog.xlsx`
- `data/mbris/normalized/taxonomy-master.json`
- `data/mbris/normalized/taxonomy-master.csv`

Optional preserve until final import strategy:

- `data/mbris/normalized/detail/**`
- `data/mbris/normalized/blue-marina-fish-candidates.*`
- `data/mbris/normalized/fish-master-candidates.*`
- `data/mbris/normalized/fish-master-draft.json`
- `data/mbris/normalized/species-profile.*`
- `data/mbris/normalized/nonfish-marine-candidates.*`
- `data/mbris/normalized/blue-marina-nonfish-candidates.*`
- `data/mbris/raw/api/**`
- `data/mbris/raw/detail/**`
- `data/mbris/raw/catalog/metadata.json`
- `data/mbris/state/detail-collection-state.json`

Exclude from Git:

- `tools/mbris/**/__pycache__/**`
- `tools/mbris/**/*.pyc`
- `tools/mbris/.pytest_cache/**`
- `tools/mbris/.env`
- `tools/mbris/mbris-page.html`
- `data/mbris/analysis/**`

## Risk

Secret/privacy scan result:

- Secret finding: 0 in scanned MBRIS files, excluding the local `tools/mbris/.env` file.
- `tools/mbris/.env` exists and must remain excluded. Its contents were not printed and should not be committed.
- Detected strings such as `MBRIS_API_KEY`, `password`, `token`, `cookie`, and `Authorization` are variable names, fake test fixtures, cookie names, or source metadata keys, not confirmed live secrets.

Preservation risk:

- Treating `normalized` and `priority` as cache would lose product decisions and reproducible import context.
- Treating every MBRIS file as normal Git would bloat the repo and include cache/debug files.
- Best next split is:
  1. Commit 3B: curated priority + Fish import snapshots that are small enough for Git.
  2. Commit 3C/LFS: official XLSX + taxonomy master snapshots.
  3. Keep raw API/detail provenance optional until the import strategy is final.

## Report

Generated report:

- `docs/MBRIS_PRODUCT_DATA_ASSET_AUDIT_V1.md`

No code, data, migration, Supabase, or Storage changes were made.

## Git

Recommended next Git plan:

- Commit 3B: `data/mbris/priority/**`, selected Fish import snapshots, and no cache/debug/env files.
- Commit 3C: LFS/artifact-backed preservation for the official XLSX and taxonomy master snapshots.
- Do not stage `tools/mbris/.env`, cache directories, debug HTML, or workbook analysis scratch files.

Final judgment:

MBRIS_PRODUCT_ASSET_RECLASSIFICATION_READY

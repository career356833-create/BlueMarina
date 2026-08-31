# Fish Canonical 1,258 Baseline V1

## Frozen baseline

The Blue Marina staging Fish canonical baseline is frozen at **1,258 species**. The freeze was rechecked through `blue_marina_readonly_auditor` with transaction read-only enabled and RLS bypass disabled. This operation made no database change.

| Check | Result |
|---|---:|
| Canonical species | 1,258 |
| NIFS species | 8 |
| MBRIS canonical species | 1,250 |
| Active MBRIS relations | 1,253 |
| MBRIS lineage | 1,253 |
| Duplicate scientific / slug / internal ID | 0 / 0 / 0 |
| Unexpected species | 0 |
| Draft / pending | 1,258 / 1,258 |
| Published exposure | 0 |

The policy, index, trigger, and constraint fingerprints match the last stable post-import state. Full import, review promotion, and mottled-skate canonical update idempotency evidence remains valid.

## Scope and exclusions

This baseline covers marine, coastal, and marine-fishing fish admitted through controlled promotion. It excludes:

- `Chaeturichthys jeoni`, pending an authoritative official Korean name.
- Five freshwater records retained in `FRESHWATER_FISH` future-domain evidence.
- Marine non-fish organisms, which require a separate domain and schema decision.

Freeze does not publish records or approve pending facts. It establishes a stable identity and provenance checkpoint.

## Required promotion path

Every later species must pass:

`Source -> Candidate -> Validation -> Canonical Promotion`

Raw NIFS, MBRIS, crawler, or manual source data must never be inserted directly into `FishSpecies`. Promotion must verify source identity, scientific identity, official Korean naming policy, aliases, immutable slug, product scope, lineage, and collision status.

## Corrected 145-record queue

The prior `mbris-nonfish-marine-organisms-v1.json` artifact remains preserved but must not be used as a marine-organism source. Its 145 records all originate from `육상담수종`: 143 are Teleostei and 2 are Petromyzonti. The correction artifact classifies them as `FRESHWATER_OR_NON_MARINE_FISH_SCOPE`.

## Marine-organism source

The primary future-domain input is `data/mbris/normalized/blue-marina-nonfish-candidates.json` with 3,167 records. It fully contains the older 2,933-record `nonfish-marine-candidates` subset and adds 234 echinoderms.

Taxonomy-driven admission preparation produced:

- `MARINE_ORGANISM_READY`: 3,016
- `MARINE_ORGANISM_REVIEW`: 93
- `OUT_OF_SCOPE`: 58

No record is authorized for `FishSpecies`. A future domain should share source identity, internal ID, alias, and provenance concepts with Fish Domain while using a separate entity/table boundary.

## Architecture recommendation

`Marine Organism` is the clearest working domain name because it separates non-fish organisms without implying edibility. `Marine Species` is broader but can blur the existing Fish boundary. `Seafood / Marine Life` mixes commercial use and biodiversity identity. Final naming and schema creation require a separate approval.

The exact Git preservation whitelist and excluded cache/debug groups are machine-readable in `reports/mbris/fish-canonical-1258-baseline-v1.json`.

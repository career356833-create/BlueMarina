# MBRIS Final Six Review V1

## Decision

All six remaining records are classified with no database write. There are no immediate marine canonical additions: one accepted marine species lacks a confirmed official Korean name, and five records are exclusively freshwater.

| Record | Accepted treatment | Habitat | Final classification | Action |
|---|---|---|---|---|
| `Chaeturichthys jeoni` | `Chaeturichthys jeoni`, species | Marine | `KOREAN_NAME_UNRESOLVED` | Keep blocked; do not approve 비늘쉬쉬망둑 without an official source |
| 열목어 | `Brachymystax tsinlingensis`; Korean source retains source trinomial | Freshwater | `FRESHWATER_FUTURE_DOMAIN` | Preserve for freshwater domain and resolve population taxonomy there |
| 끄리 | `Opsariichthys amurensis`; Korean source retains source trinomial | Freshwater | `FRESHWATER_FUTURE_DOMAIN` | Preserve for freshwater domain and resolve Korean population identity there |
| 참몰개 | `Squalidus gracilis`; Korean source retains source trinomial | Freshwater | `FRESHWATER_FUTURE_DOMAIN` | Preserve source trinomial and use a subspecies-aware future model |
| 몰개 | `Squalidus japonicus`; Korean source retains source trinomial | Freshwater | `FRESHWATER_FUTURE_DOMAIN` | Preserve source trinomial and use a subspecies-aware future model |
| 긴몰개 | `Squalidus gracilis`; Korean source retains source trinomial | Freshwater | `FRESHWATER_FUTURE_DOMAIN` | Preserve source trinomial and use a subspecies-aware future model |

International accepted-name records come from Eschmeyer's Catalog of Fishes, with the `Squalidus japonicus coreanus` synonym treatment checked in FishBase. Korean names and source trinomials are retained from the NIBR National Species List. Detailed URLs and accessed dates are in `reports/mbris/mbris-final-six-review-v1.json`.

## Read-only staging comparison

- Auditor: `blue_marina_readonly_auditor`, transaction read-only on, RLS bypass false.
- Canonical species: 1,258; NIFS species: 8.
- Duplicate scientific names: 0; duplicate slugs: 0; duplicate internal IDs: 0.
- Every collision axis for all six records is 0: source/accepted scientific name, Korean name, alias, internal ID, slug, and MBRIS source relation.
- Active MBRIS source relations: 1,253 with duplicate source relations 0.
- MBRIS lineage records: 1,253.
- Published exposure: 0. All 1,258 remain draft/pending.

## Freeze readiness

Status: `FISH_CANONICAL_1258_FREEZE_READY`.

The six excluded records do not create unresolved collisions inside the current canonical baseline. Existing full import and review import reruns are idempotent, and the latest schema/RLS fingerprints are unchanged. Future additions must use the promotion pipeline; freeze is not a publish or approval operation.

## Non-fish 145 next track

`reports/mbris/mbris-nonfish-marine-organisms-v1.json` contains 145 structurally complete records with no missing source identity, scientific name, or taxonomy hierarchy. It is not ready as a marine-organism input: all 145 originate from `육상담수종`; 143 are Teleostei and 2 are Petromyzonti. The current artifact is a mislabeled freshwater vertebrate scope queue.

Status: `MARINE_ORGANISM_TRACK_READY NO`.

Before that track starts, regenerate the input using an explicit non-fish marine taxonomic filter and keep this 145-record artifact as audit evidence rather than importing it.

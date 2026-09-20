# Fishing Condition Profile Expansion V1

## Decision

`PROFILE_EXPANSION_READY_WITH_EXCEPTIONS`

The complete 38-species condition priority pool was researched and normalized in two batches of 19. The artifacts are inactive research candidates. They do not activate runtime profiles, change scoring, create rankings or probabilities, or write to a database.

## Selection and batches

The source of truth is `reports/fish-canonical/condition-profile-priority-pool-v1.json`. Its existing priority order already puts protected condition identities first and then orders the remaining candidates by Fishing Spot usage. The split therefore preserves that order without inventing another rank.

Batch A contains ranks 1–19: 감성돔, 농어, 조피볼락, 참돔, 넙치, 주꾸미(NIFS ID), 주꾸미(MBRIS ID), 문어, 고등어, 방어, 노래미, 볼락, 돌돔, 붕장어, 숭어, 벵에돔, 도다리, 부시리, 학공치.

Batch B contains ranks 20–38: 삼치, 황어, 보리멸, 독가시치, 민어, 자리돔, 부세, 양태, 쏨뱅이, 전갱이, 벤자리, 짱뚱어, 다금바리, 망상어, 보구치, 성대, 쥐치, 전어, 쥐노래미.

Each ID occurs once. There are no missing or extra priority-pool IDs.

## Source hierarchy

Evidence was accepted in this order: NIFS, MBRIS, NIBR, WoRMS, FishBase, FAO, peer-reviewed papers, and other public institutions. The existing ten-profile artifact supplies its previously reviewed MBRIS, FishBase, FAO, public-institution, and paper evidence unchanged. New records use MBRIS public species records first. FishBase fills gaps where the MBRIS detail was absent or lacked the specific ecology field.

The artifacts record the evidence class on each field or source reference:

- `DIRECT_OFFICIAL`: NIFS, MBRIS, FAO, or another public institution;
- `DIRECT_SCIENTIFIC`: a paper or research-institute study;
- `DERIVED_FROM_OFFICIAL`: a transparent derivation from an official source;
- `SECONDARY_REFERENCE`: FishBase or another reviewed secondary compilation;
- `UNKNOWN`: no usable evidence.

NIBR and WoRMS were not needed for an ecology field in this batch, so their source counts remain zero. They were not added merely to increase coverage.

## Domain definitions

Temperature keeps `observedRange`, `preferredRange`, and `optimumRange` separate. FishBase climate-zone labels are not treated as observed or preferred temperature. Modelled AquaMaps preferred temperature is retained only when explicitly labelled as modelled and is classified as `SECONDARY_REFERENCE`.

Depth keeps `habitatDepth`, `fishingDepth`, and `observedDepth` separate. No fishing depth was inferred from species habitat. 붕장어 retains the MBRIS 0–800 m and FishBase 320–830 m records as a source conflict rather than averaging them.

Numeric salinity and dissolved-oxygen values are retained only from the existing reviewed profiles with documented units. The NIFS FEMO salinity boundary remains `UNIT_NOT_DOCUMENTED`; qualitative salinity cannot become a numeric canonical candidate.

Spawning months are stored only when the source explicitly connects the period to spawning. Seasonal occurrence, autumn/winter wording, and live-bearing birth periods remain preserved notes and enter `SEASONAL_AMBIGUITY` rather than being converted into spawning months. Catch or occurrence volume is never interpreted as spawning or abundance probability.

Habitat uses source-backed categorical labels plus a short source summary. Labels describe the source statement; they do not imply suitability scores.

## Readiness

| Scope | Ready | Partial | Limited | Insufficient |
| --- | ---: | ---: | ---: | ---: |
| Batch A | 5 | 3 | 11 | 0 |
| Batch B | 0 | 0 | 19 | 0 |
| Total | 5 | 3 | 30 | 0 |

`PROFILE_READY` means the existing reviewed profile has strong multi-domain evidence. `PROFILE_PARTIAL` has useful evidence but material unknown domains. `PROFILE_LIMITED` is usable only as research evidence because core fields are missing, a conflict remains, or a cross-system identity is being reused. `INSUFFICIENT_EVIDENCE` would mean that no useful profile domain could be supported; no species fell into that class because habitat evidence was available for all 38.

## Coverage

| Domain | Covered | Unknown |
| --- | ---: | ---: |
| Temperature | 11 | 27 |
| Depth | 27 | 11 |
| Salinity | 6 | 32 |
| Dissolved oxygen | 4 | 34 |
| Spawning | 21 | 17 |
| Migration | 14 | 24 |
| Habitat | 38 | 0 |

Unknown values remain empty and explicitly marked `UNKNOWN`.

## Existing profiles

Ten protected priority identities are reused. Nine match the v3 artifact by ID. The NIFS 주꾸미 UUID reuses the reviewed `BM-SPECIES-003107` profile through the preserved cross-system relationship and remains `PROFILE_LIMITED`. Evidence refreshes are zero, existing source values changed are zero, and all ten source profiles remain unchanged. The existing 갈치 profile is outside this 38-ID priority pool and is not copied into either batch.

## Exception queue

All limitations are grouped by category in `profile-expansion-exceptions-v1.json`. No one-species follow-up queue is created.

| Category | Species count |
| --- | ---: |
| Source conflict | 2 |
| Unit ambiguity | 2 |
| Taxonomy mismatch | 1 |
| Insufficient evidence | 0 |
| Incompatible depth definitions | 1 |
| Seasonal ambiguity | 4 |
| Unknown domain values | 38 |

The `UNKNOWN` group means at least one requested domain lacks evidence; it does not mean that the complete profile is unusable.

## Known limitations and next phase

Temperature, salinity, and dissolved-oxygen evidence remains sparse for most new species. FishBase modelled values are not field observations. Some source descriptions state only a season, depth maximum, or qualitative habitat. Those distinctions are preserved.

A future apply phase may select reviewed profile fields for production, but it must separately authorize runtime activation and verify every field's semantics against the scoring contract. This program performs no apply, score, recommendation, probability, ranking, route recommendation, or database operation.

## Reproduction

```text
node tools/fishing-condition/build-profile-expansion-v1.mjs
node tools/fishing-condition/build-profile-expansion-v1.mjs --check
node --test tests/fishing-condition/profile-expansion-v1.test.cjs
```

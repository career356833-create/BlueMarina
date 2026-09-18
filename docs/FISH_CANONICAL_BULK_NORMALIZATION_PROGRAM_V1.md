# Fish Canonical Bulk Normalization Program V1

## Decision

`BULK_NORMALIZATION_READY_WITH_EXCEPTIONS`

The frozen Fish canonical baseline can be reconstructed deterministically as 8 NIFS identities plus 1,250 MBRIS identities. All 1,258 records have at least one local authoritative source reference. The program performs research normalization only: it does not update production canonical data, runtime mapping, condition profiles, or a database.

## Bulk strategy

The program replaces one-species review loops with four layers:

1. Reconstruct and audit every canonical identity from frozen import artifacts.
2. Inventory every raw target species name from all 1,405 Fishing Spots.
3. Assign every canonical identity to one deterministic 150-250 record batch, except the final remainder.
4. Send only conflicts, aggregate/commercial aliases, cross-domain homonyms, and source-boundary mismatches to an exception queue.

The full inventory is stored separately from Batch 1 so every canonical record retains the required identity, taxonomy, alias, source, usage, and condition status fields.

## Canonical baseline

The reconstructed baseline contains:

| Source | Count |
|---|---:|
| MBRIS | 1,250 |
| NIFS | 8 |
| Total | 1,258 |

Identity status is `VERIFIED` for 1,256 records, `PARTIAL` for 1, and `CONFLICT` for 1. There are no duplicate accepted scientific-name groups, duplicate Korean-name groups, missing scientific names, or source gaps.

The partial row is the NIFS 제주 소라 identity, whose frozen scientific name and later accepted-name crosswalk differ. The conflict row is 오분자기, where the NIFS identity and MBRIS candidate refer to distinct accepted taxa. Neither is automatically rewritten.

## Taxonomy and identity rules

- Preserve each frozen `speciesId`; never synthesize a replacement ID.
- Treat the MBRIS normalized catalog identity as source canonical unless a reviewed crosswalk records a conflict or accepted-name update.
- Preserve NIFS raw scientific names and record accepted-name updates as research normalization.
- Use `null` for unavailable family or taxonomy fields.
- Detect collisions after normalizing comparison keys, but never delete or merge records.
- Keep draft/pending status unchanged.

## Alias and name rules

Only explicit approved aliases are eligible for `SAFE_ALIAS`. Exact Korean names are `CANONICAL_NAME`. Aggregate labels, commercial labels, regional names, spelling variants, and ambiguous multi-name cells stay separate classifications.

`우럭` is preserved as the existing Fishing Spot runtime alias for `조피볼락`. A separate MBRIS non-fish identity also uses the Korean name 우럭 for *Mya arenaria*. The bulk program records this as `CROSS_DOMAIN_HOMONYM` and does not change runtime behavior.

`갑오징어`, `망둑어`, and `망둥어` remain aggregate labels. `농어/  삼치` remains an ambiguous combined source value. `학꽁치` is an explicit typo-variant candidate for 학공치; no fuzzy matching is used. `무늬오징어` is a source-backed regional name for 흰꼴뚜기, but the target identity is outside the Fish 1,258 baseline.

## Fishing Spot inventory and coverage

The 1,405 spots contain 53 unique raw target names. The current runtime contract with ten condition-enabled canonical names and two explicit aliases reproduces 1,386 mapped and 19 unmapped spots.

Using the complete Fish baseline for identity/search coverage would give every currently unmapped spot at least one exact or explicitly safe identity, producing a potential 1,405/1,405. This is coverage analysis only. It does not enable condition navigation or change production mapping.

## Batch plan

The 1,258 identities are assigned exactly once:

| Batch | Size |
|---|---:|
| 001 | 200 |
| 002 | 200 |
| 003 | 200 |
| 004 | 200 |
| 005 | 200 |
| 006 | 200 |
| 007 | 58 |

Batch 1 prioritizes Fishing Spot usage, protected condition identities, approved aliases, and then clear source-backed identities. Later batches retain the same deterministic ordering. The 58-record final batch is the explicitly permitted remainder.

## Batch 1

Batch 1 contains exactly 200 records. Each row retains original and normalized values, identity status, source references, change type, and an exception flag. The artifact is research-only; `ALIAS_ADDED_CANDIDATE` records are candidates, not production alias writes.

## Exception handling

The exception queue contains only records or cross-system boundaries that need deeper review. Its categories include:

- taxonomy conflict or accepted-name difference;
- aggregate and commercial alias review;
- unsafe or incomplete alias evidence;
- the 우럭 cross-domain homonym;
- condition-enabled IDs that are outside the enumerated Fish baseline.

Automatic merge and delete remain disabled. Exceptions do not block deterministic processing of the other records.

## Condition profile separation

The priority pool contains 38 candidates selected from the protected current ten identities and Fishing Spot usage frequency. It does not research temperature, dissolved oxygen, salinity, spawning, migration, or habitat suitability.

Two protected condition IDs require later cross-system identity review: `주꾸미 (BM-SPECIES-003107)` and `문어 (BM-SPECIES-003111)` are not direct IDs in the enumerated Fish 1,258 baseline. The existing runtime IDs remain unchanged.

## Source hierarchy

The deterministic local inputs preserve NIFS and MBRIS as primary identity sources. Reviewed taxonomy crosswalk evidence records WoRMS, MolluscaBase, NIBR, FishBase, or GBIF references where already available. This batch does not perform 1,258 individual browser lookups.

## Artifacts

- `data/fish-canonical/bulk/v1/canonical-inventory-v1.json`
- `data/fish-canonical/bulk/v1/batch-001.json`
- `reports/fish-canonical/bulk-normalization-audit-v1.json`
- `reports/fish-canonical/bulk-normalization-batch-plan-v1.json`
- `reports/fish-canonical/bulk-normalization-exceptions-v1.json`
- `reports/fish-canonical/condition-profile-priority-pool-v1.json`
- `tools/fish-canonical/audit-and-build-bulk-normalization.mjs`
- `tests/fish-canonical/bulk-normalization-program-v1.test.cjs`

## Next batch execution

Resolve exception categories in bulk, update the reviewed source artifacts if evidence changes, then regenerate the complete inventory and all batches. Production apply, alias activation, condition profile research, and database writes remain separate later stages.

## Completion: Batch 1-7

`BULK_NORMALIZATION_COMPLETE_WITH_EXCEPTIONS`

All seven planned artifacts now exist with sizes `200 / 200 / 200 / 200 / 200 / 200 / 58`. Their union contains exactly 1,258 distinct IDs and equals the canonical inventory ID set. Missing IDs, extra IDs, duplicate batch IDs, and batch-plan deviations are all zero.

Across the full program, 1,253 rows are `NO_CHANGE`, one records an accepted scientific-name confirmation, three retain approved alias candidates, and one is `CONFLICT_REVIEW_REQUIRED`. No production value is applied by these change labels.

The final identity totals remain 1,256 verified, one partial, one conflict, and zero ambiguous, duplicate-candidate, or unresolved canonical identities. Accepted scientific-name collisions, Korean-name collisions, and synonym collisions are zero. Source coverage remains 1,258/1,258.

The exception queue remains at 43 entries, including 40 canonical species exceptions and three cross-system boundaries. It is now grouped into taxonomy conflict, accepted-name partial, alias ambiguity, aggregate alias, cross-domain homonym, condition-ID mismatch/outside-baseline, and other category batches. No entry was discarded to reduce the exception rate.

The prior 15 Fishing Spot expansion candidates were reconciled in the full program: 14 link to a Fish canonical baseline ID, while 흰꼴뚜기 is outside the Fish 1,258 boundary. This records identity linkage only and does not promote runtime mapping.

Fishing Spot coverage remains 1,386/1,405 in production. The complete identity/search layer has potential coverage of 1,405/1,405, while 14 raw names still lack a direct Fish-baseline identity. Those facts can coexist because each of the 19 currently unmapped spots contains at least one other source-backed Fish identity. Runtime mapping remains unchanged.

The condition profile priority pool remains 38 identities. Temperature, dissolved oxygen, salinity, seasonality, spawning, migration, and habitat profile research were not performed.

The completion report is `reports/fish-canonical/bulk-normalization-completion-v1.json`. Any subsequent manual work must operate on exception categories in bulk rather than returning to per-species loops.

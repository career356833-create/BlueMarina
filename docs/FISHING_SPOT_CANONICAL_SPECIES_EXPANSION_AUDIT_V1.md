# Fishing Spot Canonical Species Expansion Audit V1

## Decision

`CANONICAL_EXPANSION_CANDIDATES_FOUND`

This is an audit-only result. It does not add a canonical species, approve an alias, change runtime mapping, or write to a database. All potential coverage numbers remain conditional on a later canonical promotion and condition-profile review.

## Methodology

The audit reproduces the production mapping contract against `src/data/fishing-spots.json`:

1. Split each spot's `targetFish` only on the explicit `|` delimiter.
2. Apply only the approved aliases `광어 → 넙치` and `우럭 → 조피볼락`.
3. Treat a spot as currently mapped only when at least one resulting name exactly matches the current ten canonical species.
4. Extract every raw occurrence from the remaining 19 spots with its source row, region, spot type, and source provenance.
5. Review each unique raw name against official MBRIS or NIFS identity evidence. No fuzzy matching is used.
6. Keep aggregate, commercial, or ambiguous labels out of candidate promotion.

Input hashes are locked in the deterministic builder. The source dataset remains byte-identical.

## Current canonical species

The current ten are `참돔`, `감성돔`, `농어`, `조피볼락`, `넙치`, `갈치`, `고등어`, `방어`, `주꾸미`, and `문어`.

Current coverage is 1,386 of 1,405 spots. The 19 unmapped spots contain 75 raw occurrences across 17 unique names.

## Raw-name review

| Raw name | Occurrences | Spots | Classification | Proposed canonical | Scientific identity | Value | Outcome |
|---|---:|---:|---|---|---|---|---|
| 갑오징어 | 1 | 1 | `AGGREGATED_TAXON` | — | Multiple Sepiidae species | LOW | `DO_NOT_MAP` |
| 노래미 | 4 | 4 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 노래미 | *Hexagrammos agrammus* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 도다리 | 4 | 4 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 도다리 | *Pleuronichthys cornutus* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 망둑어 | 9 | 9 | `AGGREGATED_TAXON` | — | Multiple goby species | LOW | `DO_NOT_MAP` |
| 망상어 | 3 | 3 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 망상어 | *Ditrema temminckii* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 무늬오징어 | 5 | 5 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 흰꼴뚜기 | *Sepioteuthis lessoniana* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 벵에돔 | 1 | 1 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 벵에돔 | *Girella punctata* | LOW | `ADD_CANONICAL_SPECIES_LIKELY` |
| 보리멸 | 3 | 3 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 보리멸 | *Sillago sihama* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 볼락 | 2 | 2 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 볼락 | *Sebastes inermis* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 부시리 | 1 | 1 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 부시리 | *Seriola aureovittata* | LOW | `ADD_CANONICAL_SPECIES_LIKELY` |
| 붕장어 | 14 | 14 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 붕장어 | *Conger myriaster* | HIGH | `ADD_CANONICAL_SPECIES_LIKELY` |
| 성대 | 2 | 2 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 성대 | *Chelidonichthys spinosus* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 숭어 | 12 | 12 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 숭어 | *Mugil cephalus* | HIGH | `ADD_CANONICAL_SPECIES_LIKELY` |
| 전갱이 | 1 | 1 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 전갱이 | *Trachurus japonicus* | LOW | `ADD_CANONICAL_SPECIES_LIKELY` |
| 짱뚱어 | 9 | 9 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 짱뚱어 | *Boleophthalmus pectinirostris* | HIGH | `ADD_CANONICAL_SPECIES_LIKELY` |
| 학꽁치 | 3 | 3 | `TYPO_OR_VARIANT` | 학공치 | *Hyporhamphus sajori* | MEDIUM | `ADD_CANONICAL_SPECIES_LIKELY` |
| 황어 | 1 | 1 | `NEW_CANONICAL_SPECIES_CANDIDATE` | 황어 | *Pseudaspius hakonensis* | LOW | `ADD_CANONICAL_SPECIES_LIKELY` |

## Alias and taxonomy policy

No new name can safely map to the existing ten canonical species. In particular, `볼락` is the official name for *Sebastes inermis* and must not be collapsed into `조피볼락` (*Sebastes schlegelii*).

Two explicit aliases belong only to proposed species:

- `무늬오징어 → 흰꼴뚜기`: NIFS identifies 무늬오징어 as a common/dialect name for the standard Korean name 흰꼴뚜기.
- `학꽁치 → 학공치`: the source spelling is retained as an explicit variant candidate for the MBRIS standard name 학공치.

Neither is activated by this audit, and neither is implemented through fuzzy matching.

## Aggregate and commercial restrictions

`갑오징어` is not narrowed to `참갑오징어`; official review shows multiple cuttlefish species under the broader name. `망둑어` is not narrowed to 문절망둑, 말뚝망둥어, or another goby without spot-specific evidence. Both remain unmapped.

No raw name in this batch was classified solely as a commercial category. The absence of a commercial-category result does not relax the policy: a market label without a one-to-one taxonomic identity cannot become a canonical species.

## Candidate value and coverage impact

The review identifies 15 distinct proposed canonical species. `붕장어`, `숭어`, and `짱뚱어` have HIGH expansion value because they recur across many affected spots and have clear official identities. Repeated, clear identities have MEDIUM value; one-spot identities have LOW value pending broader service and evidence review. These are qualitative review labels, not scores or rankings.

If all 15 candidates were later approved, every one of the 19 currently unmapped spots would gain at least one canonical mapping, moving potential coverage from 1,386/1,405 to 1,405/1,405. This is coverage impact only. It does not approve production promotion.

## Authoritative sources

- [MBRIS taxon search](https://www.mbris.kr/pub/marine/tsearch/tsearch.do)
- [MBRIS public-data description](https://www.data.go.kr/data/15071288/fileData.do)
- [NIFS: 무늬오징어 is the common name for 흰꼴뚜기](https://www.nifs.go.kr/board/actionBoard0008View.do?BBS_CL_CD=B&BBS_ID=20250317204841171SMM&MENU_ID=M0000054)
- [NIFS species page: 전갱이](https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId=fish_1576639605226)

Each raw-name record in the JSON report includes the relevant official URL and source record reference.

## Next action

A separate review may choose a small promotion batch, create canonical records, and establish condition profiles. Aggregate labels must remain excluded. This audit ends before any canonical, runtime, database, or Supabase change.

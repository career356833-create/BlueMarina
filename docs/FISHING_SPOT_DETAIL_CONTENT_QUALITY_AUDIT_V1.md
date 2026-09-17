# Fishing Spot Detail Content Quality Audit V1

## Decision

`SPOT_DETAIL_DATA_READY_WITH_GAPS`

The current 1,405-record dataset satisfies the V1 minimum detail gate for every spot. It can support spot detail, map restoration, navigation destination creation, and the existing condition-selection fallback. It is not a complete operational or navigational dataset: coordinate transformation lineage, named departure points, and structured access restrictions remain unresolved.

## Current Dataset

- Runtime source: `src/data/fishing-spots.json`
- Records: 1,405
- Boat fishing points: 329
- Rock fishing points: 1,076
- Actual schema fields: 25
- Source mutation during audit: none
- External web enrichment: none

The dataset has no dedicated `coordinateSource`, `portName`, `accessInfo`, `departureInfo`, or `updatedAt` fields. `sourceCheckedAt` is the available source-review date. Facilities, cautions, descriptions, and source metadata are present on every record, but they are not substitutes for dedicated operational fields.

## Methodology

The deterministic offline audit is implemented in `tools/fishing-spots/audit-detail-content-quality.cjs`.

- Coordinates are parsed as WGS84 latitude and longitude.
- A conservative Korea-adjacent review box of latitude 32–39.5 and longitude 123–132.5 is used only to flag candidates.
- A point outside this box is `OUTLIER_REVIEW`, not automatically invalid.
- Exact duplicate groups use six-decimal coordinate equality.
- Near-duplicate candidates require at most 100 metres, the same region, and Korean-normalized bigram similarity of at least 0.72.
- No candidate is merged, deleted, renamed, or geocoded.
- Region-boundary validation is not claimed because no administrative polygon source is part of this audit.

## Coordinate Quality

| Measure | Count |
| --- | ---: |
| Valid numeric coordinates | 1,405 |
| Missing | 0 |
| Invalid | 0 |
| Outlier review | 0 |
| Zero coordinates | 0 |
| Swapped candidates | 0 |
| Map eligible | 1,405 |
| Navigation-destination eligible | 1,405 |

Every record retains an official source identity and `originalPoint`. However, there is no explicit coordinate-source field or documented transformation method from the original point to the runtime WGS84 pair. The audit therefore records 1,405 coordinate-lineage gaps even though all coordinate values are plausible.

Navigation eligibility means only that the existing destination adapter can accept the coordinate. It does not prove a safe route, hazard avoidance, navigable depth, or legal access.

## Duplicate Risk

- Duplicate IDs: 0 groups
- Exact same name and coordinate: 0 groups
- Same coordinate with different names: 6 groups, 13 spots
- Cross-region same-coordinate candidates: 2 groups, 4 spots
- Near-duplicate candidates within 100 metres: 1 pair

The cross-region candidates are `boat-60` with `boat-128`, and `boat-129` with `boat-321`. These require source-level coordinate verification before any product correction. The near candidate is `rock-151` with `rock-265`, separated by 80 metres with name similarity 0.727. None is automatically classified as the same real-world spot.

## Detail Field Coverage

| Field or presentation source | Present | Gap |
| --- | ---: | ---: |
| Region | 1,405 | 0 |
| City/subregion | 1,405 | 0 |
| Address | 1,405 | 0 |
| Description | 1,405 | 0 |
| Facilities presentation | 1,405 | 0 |
| Source review date | 1,405 | 0 |
| Structured port relationship | 0 | 1,405 |
| Structured access information | 0 | 1,405 |
| Structured departure information | 0 | 1,405 |

There are 119 free-text port-name candidates, but a text mention is not treated as a verified port relationship. All 329 boat spots carry generic boat/charter context in facilities, while none identifies a verified named departure point.

## Target Species

- Canonical set: 10 species
- Mapping mode: exact name plus approved aliases only
- Approved aliases: `광어 → 넙치`, `우럭 → 조피볼락`
- Mapped spots: 1,386
- Spots with no canonical mapping: 19
- Fuzzy mapping: none

Canonical spot coverage is descriptive, not a popularity ranking:

| Species | Spots |
| --- | ---: |
| 감성돔 | 991 |
| 농어 | 969 |
| 조피볼락 | 776 |
| 참돔 | 640 |
| 넙치 | 441 |
| 문어 | 57 |
| 주꾸미 | 57 |
| 고등어 | 50 |
| 방어 | 19 |
| 갈치 | 0 |

The 19 unmapped spots contain non-empty source labels such as 붕장어, 숭어, 망둑어, 짱뚱어, 도다리, 무늬오징어, 노래미, 볼락, 벵에돔, and 부시리. They are classified as unsupported by the current condition set, not as bad source data. Their detail pages correctly fall back to manual species selection.

## Provenance

All 1,405 records have `sourceName`, `sourceType`, `sourceUrl`, and `sourceCheckedAt`. Existing metadata identifies both source families as Ministry of Oceans and Fisheries public datasets, so the authority class is `OFFICIAL` for all records.

This complete record-level provenance does not close the narrower coordinate-transformation and named-departure lineage gaps.

## Completeness

The categorical result is:

- `CORE_COMPLETE`: 1,371
- `REVIEW_REQUIRED`: 34
- Other primary categories: 0

All 1,405 pass the V1 minimum gate: name, region, valid coordinate, at least one raw target species, and source provenance. The 34 review candidates comprise 19 no-canonical-mapping spots plus coordinate duplicate and near-duplicate candidates, with overlaps removed.

## Safety-Critical Gaps

- Coordinate transformation method is not explicit for 1,405 spots.
- Structured access and restriction fields are absent for 1,405 spots.
- Structured departure location is absent for 1,405 spots.
- All 1,405 points can create navigation destinations, but no point is asserted to have a safe route.
- Two same-coordinate groups cross administrative regions and need high-priority source verification.

## Next Enrichment

1. **HIGH: Coordinate and departure provenance**

   Resolve the six duplicate-coordinate groups first, document coordinate transformation lineage, and verify named departure points for boat spots.

2. **HIGH: Structured access and restrictions**

   Convert verified source facts into dedicated access, closure, parking, boarding, and restriction fields without inferring absent facts.

3. **MEDIUM: Unsupported species review**

   Review the 19 fallback spots against the canonical Fish domain. Extend the Fishing Condition set only with approved evidence; do not add fuzzy aliases.

## Artifacts

- Aggregate audit: `reports/fishing-spots/detail-content-quality-audit-v1.json`
- Per-spot candidates: `reports/fishing-spots/detail-content-review-candidates-v1.json`
- Deterministic tool: `tools/fishing-spots/audit-detail-content-quality.cjs`
- Tests: `tests/fishing-spots/detail-content-quality-audit-v1.test.cjs`

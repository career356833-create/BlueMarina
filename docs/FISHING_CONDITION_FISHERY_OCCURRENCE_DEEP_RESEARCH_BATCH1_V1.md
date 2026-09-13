# Fishery Occurrence Deep Research Batch 1 V1

## Decision

`OCCURRENCE_PROMOTION_CANDIDATES_FOUND`

Two research-only strict candidates were found: 고등어 and 주꾸미. 갈치 remains limited because the official KOSIS product label does not resolve the canonical `Trichiurus japonicus` identity against the NIFS `Trichiurus lepturus` record. Nothing is promoted to the production seasonality artifact in this batch.

## Method

The audit retained only records that identify a real capture-fishery production quantity in an explicit month. The bounded extract uses the 2023, 2024, and 2025 monthly CSV files from KOSIS table `DT_1EW0004`, filtered to `연근해어업`, the exact source product code, national administrative total, and total sales form. KOSIS documents the production metric in tonnes and exposes month, fishery, product, administrative region, and sales-form dimensions.[^1]

The MOF/data.go.kr landing dataset was reviewed for its dated landing contract. It exposes landing date, cooperative, landing market, standard product code and name, fishery, quantity, weight, and amount, but no product-code-level record for the three target species was retained in this bounded batch.[^2] Contract capability alone is not evidence.

NIFS identity snapshots and current fishery outlook publications were reviewed separately. Forecast and interpretive outlook material was not converted into historical occurrence evidence.[^3]

## Occurrence Boundary

`FISHERY_OCCURRENCE` means a source-backed record that a species or reviewed commercial category was caught, landed, or observed in a stated month or date. Production and landing volume are not abundance, catchability, catch probability, condition quality, or a statement that fishing will be good.

Different providers and years remain independent. Month ranges are not merged across sources, annual averages are not created, and a missing row is not converted to zero. CPUE, if later found, must remain `CPUE_MONTHLY_PATTERN`; it still cannot become catch probability.

## Identity Mapping

| Canonical species | Canonical scientific name | KOSIS label/code | NIFS identity | Status |
|---|---|---|---|---|
| 고등어 | `Scomber japonicus` | 고등어 / `110015` | `Scomber japonicus`, `fish_1571803943319` | `EXACT` |
| 갈치 | `Trichiurus japonicus` | 갈치 / `110009` | `Trichiurus lepturus`, `fish_1571806850754` | `COMMERCIAL_CATEGORY` |
| 주꾸미 | `Amphioctopus fangsiao` | 주꾸미 / `140415` | `Amphioctopus fangsiao`, `fish_1576639605227` | `EXACT` |

For 고등어, KOSIS separately exposes 망치고등어 `110016`, 원양 고등어류 `310040`, and 해면양식업 고등어 `210015`; all are excluded from the retained capture-fishery series. This makes `110015` substantially safer than an aggregate mackerel label, while still not proving biological abundance.

## KOSIS Result

| Species | Years | Retained rows | Monthly coverage | Geography | Fishery | Classification |
|---|---:|---:|---|---|---|---|
| 고등어 | 2023-2025 | 36 | 12 months in each year | National total | Coastal/offshore capture aggregate | `STRICT_OCCURRENCE_CANDIDATE` |
| 갈치 | 2023-2025 | 36 | 12 months in each year | National total | Coastal/offshore capture aggregate | `LIMITED_OCCURRENCE_EVIDENCE` |
| 주꾸미 | 2023-2025 | 35 | 2023-08 absent; all other months retained | National total | Coastal/offshore capture aggregate | `STRICT_OCCURRENCE_CANDIDATE` |

The missing 2023-08 주꾸미 row is preserved as missing rather than zero. The table also exposes provincial detail, but this batch retains the national series only; national data cannot be presented as East, West, South, Jeju, province, or landing-port occurrence.

## MOF Result

The MOF dataset is a strong future source for market-resolved evidence because it supports dates, landing markets, product codes, fisheries, quantities, and weights.[^2] This batch does not retain any MOF species records because an actual product-code extract and species-specific crosswalk were not completed. All three MOF candidates are therefore `REJECTED_FOR_OCCURRENCE` for this batch, not because the dataset is invalid, but because an unverified schema cannot substitute for records.

Market landings will require `MARKET_ACCESS_BIAS`, `LANDING_PORT_BIAS`, and `NON_MARKETED_CATCH_ABSENT`. They must remain separate from KOSIS production and may not be used to extend or fill its month ranges.

## NIFS Result

NIFS provides exact local identity corroboration for 고등어 and 주꾸미. Its 갈치 resource record uses `Trichiurus lepturus`, so it does not resolve the Blue Marina canonical `Trichiurus japonicus` identity. Existing resource-detail catch histories are annual, while recommendation periods are consumer guidance; neither is monthly occurrence evidence.

The NIFS fishery outlook board contains weekly and monthly forecast publications.[^3] Its material must be classified as `OBSERVATION`, `FORECAST`, or `INTERPRETIVE_OUTLOOK` at the statement level before reuse. No current outlook was promoted as historical occurrence.

## Species Results

### 고등어

The KOSIS identity is exact at the retained Korean product label and code. The source contains a complete 36-month capture-fishery national series for 2023-2025. The result is a strict research candidate, not a production promotion.

Monthly production is affected by effort, fleet and gear composition, weather, market channels, TAC, and closures. KOSIS production cannot be read as abundance. The 2025 official closure ran from 12 April to 12 May, with a separate April rule for small purse-seine and Jeju set-net fisheries.[^4] Current policy also includes TAC-related regulatory exemptions for participating fisheries, so regulatory effects must remain year- and fishery-specific.[^5]

### 갈치

KOSIS contains a complete 36-month national capture-fishery series under product code `110009`. However, the commercial label `갈치` does not establish which `Trichiurus` taxon each record contains, and it conflicts with the scientific name in the local NIFS resource record. The series is therefore limited and cannot be promoted to the canonical species without a defensible product-code taxonomy crosswalk.

The July closure, 18 cm minimum-size rule, fishery exceptions, and TAC arrangements can shape the monthly pattern.[^5][^6] These rules are limitations, not occurrence evidence.

### 주꾸미

KOSIS product code `140415` and the NIFS resource identity both map to canonical `Amphioctopus fangsiao`. The extract retains 35 explicit monthly rows across 2023-2025 and leaves 2023-08 missing. This is a strict research candidate.

The nationwide closed season from 11 May through 31 August is a direct and material limitation.[^7] Low or absent legal landings during that interval cannot be interpreted as biological absence, and recreational catches are outside the retained KOSIS production series.

## Promotion Readiness

| Species | Decision | Remaining review |
|---|---|---|
| 고등어 | `STRICT_OCCURRENCE_EVIDENCE_FOUND` | Confirm production-table semantics and attach year-specific regulation metadata during promotion |
| 갈치 | `LIMITED_OCCURRENCE_EVIDENCE_FOUND` | Resolve `Trichiurus` product-code taxonomy; do not promote as species exact |
| 주꾸미 | `STRICT_OCCURRENCE_EVIDENCE_FOUND` | Preserve the closed-season limitation and missing 2023-08 row |

Possible strict occurrence coverage after a separate promotion review is 2/10. Current production coverage remains 0/10.

## Immutable Boundaries

- `data/fishing-condition/seasonality/v1/species-seasonality.json` is unchanged.
- Species Environment Profile V2 and V3 are unchanged.
- Source Policy and Suitability Rule are unchanged.
- Runtime routes and services are unchanged.
- No score, probability, normalization, weighting, ranking, or recommendation is produced.

## Sources

[^1]: KOSIS, [어업별 품종별 통계, DT_1EW0004](https://kosis.kr/statisticsList/mass/mass_list.jsp?list_id=&org_id=101&process=statHtml&tbl_id=DT_1EW0004&vw_cd=), monthly CSV files for 2023-2025, accessed 2026-09-14.
[^2]: Ministry of Oceans and Fisheries / Public Data Portal, [수협 위판 및 일자별 위탁판매 데이터](https://www.data.go.kr/dataset/15012417/openapi.do), contract reviewed 2026-09-14.
[^3]: National Institute of Fisheries Science, [해어황예보](https://www.nifs.go.kr/board/actionBoard0014List.do?MENU_ID=M0000117), weekly and monthly publication board, accessed 2026-09-14.
[^4]: Ministry of Oceans and Fisheries, [2025년 고등어 금어기 안내](https://www.mof.go.kr/doc/ko/selectDoc.do?bbsSeq=22&docSeq=61347&menuSeq=851), 2025.
[^5]: Ministry of Oceans and Fisheries, [수산자원의 금어기·금지체장 기준 알림](https://www.mof.go.kr/doc/ko/selectDoc.do?bbsSeq=22&docSeq=66688&menuSeq=851), 2026.
[^6]: Ministry of Oceans and Fisheries, [갈치 포획·채취 금어기 별도 적용 공고](https://www.mof.go.kr/doc/ko/selectDoc.do?bbsSeq=9&docSeq=67101&menuSeq=375), 2026.
[^7]: Ministry of Oceans and Fisheries, [주꾸미 금어기 신설](https://www.mof.go.kr/doc/ko/selectDoc.do?bbsSeq=10&docSeq=19470&menuSeq=971), 2018.

# NIFS Ocean Section V1

## Status

`CONNECTED_HISTORICAL_PROFILE_SOURCE`

NIFS serial ocean observations are connected as a normalized, read-only historical profile source for the Fishing Condition Engine. This source does not produce climatology, scores, probabilities, rankings, or recommendations.

## Official source

- station metadata: `sooCode`, `https://www.nifs.go.kr/OpenAPI_json?id=sooCode`
- profile observations: `sooList`, `https://www.nifs.go.kr/OpenAPI_json?id=sooList`
- regions: `E` East Sea, `W` West Sea, `S` South Sea, `EC` East China Sea
- `sooList` query: `sdate` and `edate` in `yyyyMMdd`, maximum elapsed window 365 days

The implementation uses only `NIFS_SOO_API_KEY`, `NIFS_SOO_CODE_URL`, and `NIFS_SOO_LIST_URL` on the server. It has no fallback to another NIFS credential and never exposes the authenticated upstream URL.

## Identity and lifecycle

Station identity is exact `sln_cde + "-" + sta_cde`, for example `204-06`. Names and coordinates are not identity keys. A profile is exact `region + stationId + obs_dtm`; a depth row is exact `profileId + wtr_dep`.

`bld_dat` and `end_dat` are retained as source lifecycle dates. A blank `end_dat` is labelled `END_DATE_UNSET`, not `active`. The live metadata audit returned 358 unique station pairs across 33 historical line codes. This is broader than the modern 207-station operational survey set seen in the bounded profile window.

## Profile contract

Rows sharing `gru_nam`, `sln_cde`, `sta_cde`, and `obs_dtm` are grouped into one vertical profile. Samples are sorted by source depth. Numeric zero is valid data, including `wtr_dep=0`; only blank or null values are normalized to null.

Each depth sample can retain:

- water depth
- water temperature with raw `qc_wtr`
- salinity with raw `qc_sal`
- dissolved oxygen with raw `qc_dox`
- phosphate, nitrite, nitrate, and silicate
- pH, transparency, and pressure

The NIFS guide names the QC fields but does not provide a QC-code dictionary. The service currently returns raw code `2`; the implementation preserves it without assigning a quality meaning.

## Units and time

The inspected official field contract does not document units for `wtr_dep`, `wtr_tmp`, `sal`, `dox`, `nut_po4_p`, `nut_no2_n`, `nut_no3_n`, `nut_sio2_si`, `nut_ph`, `wtr_trn`, or `atm`. Every one of these fields is therefore labelled `UNIT_NOT_DOCUMENTED`. No unit is inferred from oceanographic convention.

`obs_dtm` is retained as observation wall-clock time. Since the official guide does not document a timezone, normalized profiles use `UNSPECIFIED_BY_NIFS` and do not append a UTC or KST offset.

## Coordinates and duplicates

Station metadata coordinates and historical profile coordinates are retained independently and compared. The bounded live audit found all 1,417 profile coordinates matching metadata. A mismatch is labelled `DRIFT`; neither side overwrites the other.

Exact duplicate depth rows are deduplicated and counted. A duplicate identity with conflicting content is counted as a conflict and causes the server source to fail closed. No latest-wins or fuzzy station matching is used.

## Server route

`GET /api/fishing-condition/environment/ocean-section`

Optional query parameters are `region`, `lineCode`, `stationCode`, `sdate`, and `edate`. Dates default to a bounded recent-year window. Invalid dates, unknown regions, unsafe identifiers, reversed ranges, and ranges over 365 elapsed days are rejected.

- profile cache: 12 hours
- station metadata cache: 24 hours
- stale fallback: 7 days, only after a previous successful exact date-window fetch
- upstream timeout: 30 seconds
- upstream payload cap: 4 MB
- normalized response cap: 15 MB
- profile-row cap: 10,000
- bounded in-process query cache: 16 date windows

Failure is isolated to this route. It does not affect `nifs-risa`, `nifs-femo-sea`, navigation, or KMA/KHOA layers.

The response exposes `filters` and `resultCounts` for the filtered result. The detailed `quality` object describes the complete upstream date-window audit before optional region/station filtering.

## Engine boundary

Source lineage is `NIFS` / `nifs-soo` / `HISTORICAL_OCEANOGRAPHIC_PROFILE`. Seven historical feature candidates are registered with `engineUse=NOT_ENABLED`: temperature, salinity, and dissolved oxygen by depth, plus phosphate, nitrite, nitrate, and silicate.

The profile shape supports future aggregation by month, region, station, and depth. V1 deliberately does not calculate monthly means, seasonal baselines, anomalies, fronts, species suitability, or a fishing-condition score.

## Source separation

- `nifs-risa`: near-real-time observed water temperature
- `nifs-femo-sea`: periodic fishery-environment surface/bottom observations
- `nifs-soo`: historical vertical oceanographic profiles

Variables from these sources remain separate and retain their own lineage. One source never overwrites another.

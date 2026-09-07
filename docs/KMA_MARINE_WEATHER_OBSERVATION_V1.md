# KMA Marine Weather Observation Overlay V1

Updated: 2026-09-07

## Decision

`/sea/navigation` connects a default-off KMA observation layer from three official API Hub sources. `stn_inf.php?inf=BUOY` supplies station identity and coordinates, `sea_obs.php` supplies the broad latest comprehensive observation, and `kma_buoy.php` supplies buoy-specific wave and dual wind-sensor detail. All three returned HTTP 200 in the final bounded smoke. The observation layer remains independent of `kma-marine-weather-forecast-zones`.

Final status: `CONNECTED_OBSERVATION`

## Live Contract

| Role | Endpoint | Final snapshot | Actual delimiter | Timestamp |
| --- | --- | --- | --- | --- |
| Station metadata | `stn_inf.php?inf=BUOY` | 76 rows, HTTP 200 | whitespace | current catalog |
| Comprehensive observation | `sea_obs.php` | 194 rows, HTTP 200 | comma | `TM`, KST `yyyyMMddHHmm` |
| Buoy detail | `kma_buoy.php` | 151 rows, HTTP 200 | whitespace | `TM`, KST `yyyyMMddHHmm` |

The original approval smoke returned 197, 154, and 76 rows. Counts are snapshot-dependent; the final quality pass returned 194, 151, and 76. No raw response or credential was stored.

Actual station fields are `STN_ID LON LAT STN_SP HT AD STN_KO STN_EN FCT_ID`. The comprehensive row order is `TP, TM, STN_ID, STN_KO, LON, LAT, WH, WD, WS, WS_GST, TW, TA, PA, HM`. Buoy detail is `TM STN WD1 WS1 WS1_GST WD2 WS2 WS2_GST PA HM TA TW WH_MAX WH_SIG WH_AVE WP WO`.

## Normalization

- Station and observation joins use exact station IDs only. Name and distance matching are forbidden.
- `TM` is preserved as `rawObservedAt` and normalized to ISO 8601 with `+09:00`.
- Observed missing sentinels `-99`, `-99.0`, and blank values become `null`; numeric zero remains zero.
- `sea_obs.WH` and `kma_buoy.WH_SIG` remain separate source-role values and never overwrite one another.
- Wind sensor 1 and sensor 2 values remain separate and are not averaged.
- Official units are preserved: wave height m, wind m/s and degree, temperature C, pressure hPa, humidity percent, and period seconds.

## Station And Join Quality

The catalog has 76/76 valid coordinates, no duplicate IDs, no same-ID coordinate conflicts, no missing names, and 76/76 FCT_ID coverage. Exact joins found comprehensive observations for 41 catalog stations and buoy detail for 43. All buoy-detail IDs had metadata. The broader `sea_obs` family contains many IDs outside the BUOY metadata catalog; those rows are disclosed in the JSON quality report and are not rendered using inferred coordinates.

`FCT_ID` is retained for future investigation only. This V1 does not assume that it is contract-identical to the existing forecast zone ID and performs no automatic forecast-observation pairing or comparison score.

## Missingness And Freshness

The final observation range was 06:30-07:00 KST and buoy detail 06:10-07:00 KST. Missingness is field-specific and expected across mixed station families. Exact counts, sentinel totals, and unmatched IDs are in `reports/kma/marine-weather-observation-quality-v1.json`.

Freshness is computed from `observedAt`, not request time:

- fresh: age up to 20 minutes
- stale: over 20 and up to 90 minutes
- unavailable: missing/invalid timestamp or over 90 minutes

Station metadata caches for 24 hours with a bounded seven-day last-good fallback. Each observation source caches independently for 10 minutes with a bounded 90-minute last-good fallback. A failed source degrades only its own data: station markers can remain while observation detail fails, buoy failure does not hide comprehensive data, and the forecast layer is unaffected.

## Server And MapLibre

Server-only routes:

- `/api/sea-info/marine-observations/stations`
- `/api/sea-info/marine-observations`
- `/api/sea-info/marine-observations/[stationId]`

Each upstream uses its own server-only credential and has no browser or `NEXT_PUBLIC_` fallback. The logical MapLibre layer is `kma-marine-weather-observations`, uses station-only Point GeoJSON, renders 76 restrained filled markers, and defaults OFF. Detail values are lazily requested for the selected exact station ID.

The control and panel labels deliberately distinguish `해양기상 예보` / `KMA FORECAST MODEL` from `해양기상 관측` / `KMA OBSERVATION`.

## Safety

UI notice:

`해양기상 관측정보는 최근 공식 관측자료의 참고 표시이며 실제 출항·운항 가능 여부 또는 공식 항법·기상정보를 대체하지 않습니다.`

The layer makes no departure judgment, severity inference, weather warning, weather routing, safe routing, capsize-risk estimate, waypoint blocking, or navigability decision. Official weather warnings remain a separate future source.

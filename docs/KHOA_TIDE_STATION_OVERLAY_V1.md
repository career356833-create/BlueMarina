# KHOA Tide Station Overlay V1

## Status

- Catalog status: `STATION_CONNECTED_DATA_PARTIAL`
- Provider: National Oceanographic Research Institute (KHOA)
- MapLibre logical layer: `khoa-tide-stations`
- Default visibility: OFF
- Audited station snapshot: 27 stations, 27 valid WGS84 coordinates

## Official boundary

Blue Marina reuses the existing server-only high/low tide forecast route:

- Blue Marina: `GET /api/sea-info/tide?stationId=<DT_CODE>&date=<yyyy-MM-dd>`
- Upstream: `GetTideFcstHghLwApiService`
- Authentication: server-only `KHOA_API_KEY`
- Upstream format: JSON
- Existing parser: `parseKhoaTidePayload`

KHOA's 2026 public-data notice lists this legacy forecast family among APIs being retired in favor of national-focus replacements. V1 therefore treats it as a transitional boundary and records failures without degrading the rest of navigation.

## Station catalog

The station endpoint `/api/sea-info/tide/stations` serves a source-backed snapshot gathered from successful official forecast responses. It contains station code, Korean name, region, latitude, and longitude only. Invalid coordinates and duplicate IDs are rejected. The static snapshot is cached separately from prediction data.

## Observation and prediction

- Current/recent observation: not connected by the verified existing contract; the UI says unavailable.
- Prediction: official high/low event time and raw predicted value from the existing normalizer.
- Prediction unit: not confirmed in the verified contract, so the UI does not append `cm` or `m`.
- High/low labels: source-backed; no local extrema inference.
- Horizon: the requested calendar day, as supported by the existing route.

## Datum boundary

Status: `DATUM_NOT_DOCUMENTED`.

The verified contract did not establish the vertical datum. Blue Marina must not combine these raw values with bathymetry, derive actual water depth or under-keel clearance, block waypoints, or infer safe passage.

## Cache and stale handling

- Station metadata: server/CDN cache for 24 hours with stale revalidation.
- Prediction: in-process fresh cache for 1 hour and stale fallback for up to 24 hours after an upstream failure.
- The panel distinguishes fresh and stale data and shows the last successful fetch time.
- An unavailable prediction affects only the selected tide station; station markers and all other navigation layers remain usable.

## MapLibre and UI

The unclustered point layer uses restrained teal circular markers. Twenty-seven stations do not justify clustering. The layer sits conceptually above warning geometry and below navigation aids and vessel overlays. Selecting a station opens a compact panel that explicitly separates unavailable observations from official predictions.

## Safety

`조위 관측·예측 정보는 참고용이며 실제 항해 수심, 통항 가능 여부 또는 공식 항법장비를 대체하지 않습니다.`

This overlay is not bathymetry, actual depth, clearance calculation, safe routing, or tide route optimization.

# KHOA Ocean Current Model V1

Updated: 2026-09-08

## Decision

**Catalog status: `CONNECTED_MODEL_DIRECTION_LIMITED`**

The dedicated `KHOA_ROMS_API_KEY` passed a bounded live contract check. `/sea/navigation` now exposes a default-off scalar point overlay named `KHOA ROMS MODEL`. It shows source current speed, raw current-direction value, model water temperature, and the raw valid-time string. It deliberately renders no direction arrows because no official KHOA source located in this audit defines whether `crdir` is a TO or FROM bearing.

This is numerical model forecast data, not a present observation or real-time current. It is isolated from routing, ETA, drift, tide, weather-risk, bathymetry, and ENC logic.

## Official Replacement

Public Data Portal notice `NOTICE_0000000004473` explicitly maps retired dataset `15039004`, `황동중국해(모델) 예측 유향 유속`, to KHOA ROMS dataset `15142227`.

- Notice: https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004473
- Dataset: https://www.data.go.kr/data/15142227/openapi.do
- Operation: `GetRomsApiService`
- Endpoint: `https://apis.data.go.kr/1192136/roms/GetRomsApiService`
- License: 공공저작물 출처표시 제1유형
- Development quota: 10,000 requests/day

## Live Contract

One credential smoke request and one bounded pagination audit used only bbox `34.0..34.1 / 123.2..123.3`.

| Metric | Result |
| --- | --- |
| HTTP / result | `200` / `00 NORMAL_SERVICE` |
| First-page latency | 329 ms |
| First-page rows | 300 |
| Total rows | 2,136 across 8 pages |
| Actual fields | `predcDt`, `lat`, `lot`, `crdir`, `crsp`, `wtem` |
| Raw bytes | 225,068 |
| Normalized audit bytes | 306,498 |
| Missing required values | 0 |
| Invalid coordinates | 0 |
| Duplicate coordinate-time rows | 0 |

No model-run time, forecast lead, grid ID, depth layer, salinity, sea level, U component, V component, or other undocumented field was present.

## Grid And Time Audit

The sample contained 12 unique spatial points: three latitudes and four longitudes. Observed sample spacing was approximately `0.02899°` latitude and `0.03197°` longitude. This is an observed sample spacing, not a published spatial resolution or CRS claim.

The response contained 178 unique hourly `predcDt` values, from `2026-09-07 00:00:00` through `2026-09-14 09:00:00`, a 177-hour span. The official guide conflicts between 72 hours, 148 hours, and eight days. `predcDt` is therefore retained as a raw model-valid-time candidate; timezone, model run time, and provider update cadence remain undocumented.

## Variables And Direction Gate

| Field | Display | Unit / status |
| --- | --- | --- |
| `crsp` | Current speed | m/s, source value |
| `crdir` | Raw current-direction value | deg, TO/FROM convention unknown |
| `wtem` | ROMS model water temperature | °C, not an observation |
| `predcDt` | Raw valid time | timezone unspecified |

Official KHOA, MOF, and Public Data Portal material reviewed for this source did not define the `crdir` angular convention. The V1 rendering gate therefore permits neutral points and text values only. Arrow rotation is prohibited until an official source-specific convention is documented.

## Server And MapLibre Boundary

- Route: `/api/sea-info/ocean-current`
- Credential: dedicated server-only `KHOA_ROMS_API_KEY`; no generic fallback
- Source bbox contract: each axis at most 1°
- Product request: one quantized 0.1° sample window around the viewport center
- Zoom gate: 8+
- Pagination: 300 rows/page, at most 8 pages and 2,400 raw rows
- Response cap: 400,000 raw bytes
- Pan protection: quantized cell dedupe and at least 15 seconds between changed-cell requests
- Cache: 30-minute fresh cache and 2-hour stale fallback, operational values rather than claims about provider cadence
- Layer: `khoa-ocean-current-model`, default OFF, neutral circle points only
- Failure: clears and disables only the ROMS layer; other map features remain available

The server selects one exact raw valid time and returns the full raw valid-time list. V1 does not animate time and does not infer model lead time.

## Safety Boundary

`해류·유향·유속 정보는 KHOA 수치모델 기반 참고자료이며 실제 현장 관측값 또는 공식 항법장비를 대체하지 않습니다.`

The layer is not an input to current-aware routing, ETA correction, drift prediction, fuel optimization, route recommendation, passage permission, or safe-routing decisions. It is not merged with tide, weather, bathymetry, or ENC.

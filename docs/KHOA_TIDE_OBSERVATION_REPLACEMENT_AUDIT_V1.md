# KHOA Tide Observation and Replacement API Audit V1

## Official replacement mapping

KHOA's 2026-01-12 public-data notice retires the legacy tide observation and forecast APIs and maps them to national-focus replacements:

- Observed and predicted tide level: data.go.kr `15142507`, `GetSurveyTideLevelApiService`
- High/low tide forecast: data.go.kr `15156018`, `GetTideFcstHghLwApiService`
- Latest observation data: data.go.kr `15155508`, `GetDTRecentApiService`

The existing Blue Marina high/low endpoint is already the active `15156018` replacement endpoint. No prediction endpoint migration is required.

Official sources:

- https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004473
- https://www.data.go.kr/data/15142507/openapi.do
- https://www.data.go.kr/data/15156018/openapi.do
- https://www.data.go.kr/data/15155508/openapi.do

## Verified contracts

The official guides document:

- `15142507`: `obsCode`, optional `reqDate` and `min`; `bscTdlvHgt` observed level in cm and `tdlvHgt` predicted level in cm.
- `15156018`: `obsCode`, optional `reqDate`; `predcDt`, `predcTdlvVl` in cm, and source-provided `extrSe` high/low classification.
- `15155508`: `obsCode`, optional `reqDate` and `min`; latest `bscTdlvHgt` in cm plus other observation fields.

None of the inspected official contracts documents the vertical datum. It remains `DATUM_NOT_DOCUMENTED`.

## Live verification

On 2026-09-06:

- `15156018`: HTTP 200, `resultCode=00`, prediction fields present for all 27 catalog stations.
- A dedicated local-only `15142507` credential reached HTTP 200 and `resultCode=00`, but that response contained no observation item.
- The latest six bounded probes completed DNS and TCP connection but ended before an HTTP response during an unstable TLS connection period.
- No credential rejection or request-contract error was observed with the dedicated credential, but an item containing `obsrvnDt` and `bscTdlvHgt` has not yet been verified live.

No key, request URL, or raw network log was stored. The existing forecast key is not reused for observation in application code.

## Fail-closed observation boundary

`/api/sea-info/tide/observation` requires both:

```text
KHOA_TIDE_OBSERVATION_ENABLED=true
KHOA_TIDE_OBSERVATION_API_KEY=<dedicated approved key>
```

The flag defaults to false, there is no `KHOA_API_KEY` fallback, and the browser never receives the service key. Until a dedicated key returns a verified observation item, the UI reports observation as pending while prediction remains independently available.

## Status

Catalog status remains `STATION_CONNECTED_DATA_PARTIAL` because a live observation item is not verified, the current network result is inconclusive, and the vertical datum is not documented. The confirmed `cm` unit does not authorize bathymetry combination, actual-depth calculation, clearance assessment, safe routing, or tide-aware route optimization.

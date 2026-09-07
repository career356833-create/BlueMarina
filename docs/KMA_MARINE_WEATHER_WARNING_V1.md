# KMA Marine Weather Warning V1

Updated: 2026-09-08

Status: `CONNECTED_WARNING_PANEL_ONLY`

## Live Sources

| Source | Endpoint | Format | Live result | Parsed rows | Cache |
| --- | --- | --- | --- | ---: | --- |
| Current warning | `wrn_now_data_new.php` | JSON | HTTP 200 | 6 | 5 minutes; stale fallback through 60 minutes |
| Warning history | `wrn_met_data.php` | EUC-KR CSV text | HTTP 200 | 59 (bounded previous 24 hours) | 20 minutes; isolated fallback through 60 minutes |
| Warning zones | `wrn_reg.php` | EUC-KR fixed-width text | HTTP 200 | 414 | 24 hours; isolated fallback through 7 days |

The browser calls only `/api/sea-info/weather-warnings`. `KMA_MARINE_WARNING_API_KEY` remains in the server environment and no authenticated upstream URL is returned or logged.

## Current Contract

Live fields used are `REG_UP`, `REG_ID`, `REG_KO`, `TM_FC`, `TM_EF`, `WRN`, `LVL`, `CMD`, and optional `ED_TM`. The live current endpoint supplies Korean labels (`풍랑`, `주의`, `연장`) while history supplies official codes. Both forms are normalized. `ED_TM` remains source text because it is not a structured absolute timestamp.

## Official Dictionaries And Lifecycle

- Warning type: `V` 풍랑, `W` 강풍, `T` 태풍.
- Level: `1` 예비특보, `2` 주의보, `3` 경보. No Blue Marina severity score is created.
- Command: `1` 발표, `2` 대치, `3` 해제, `4` 대치해제, `5` 연장, `6` 변경, `7` 변경해제.
- `UPCOMING`: a non-lift command with a future `TM_EF`.
- `ACTIVE`: command `1`, `2`, `5`, or `6` after `TM_EF`.
- `ENDED`: command `3`, `4`, or `7`.
- `UNKNOWN`: missing/unsupported command or effective time.

The public source does not distinguish a separate cancellation event, so `CANCELLED` is reserved and never inferred.

## Sea-Zone Filter

KMA's official warning DB dictionary defines `REG_TYPE=S` for sea and `REG_TYPE=L` for land. The public zone output does not repeat `REG_TYPE`, but its official `REG_ID` code family carries the same `S`/`L` prefix. V1 classifies exact `Sddddddd` identifiers as marine and never uses Korean area-name text. `V` is retained as the official marine wave-warning type; `W` and `T` are retained only for an official `S` region ID.

Live result: 414 zones, 113 official sea-code zones, 6 current rows, 6 marine-relevant rows, 0 excluded land rows, and 6/6 zone metadata joins.

## Zone And Geometry

The zone source supplies `REG_ID`, start/end validity, `REG_SP`, `REG_UP`, short name, and full name. It supplies no coordinate, bbox, polygon, or public geometry reference. The official DB dictionary documents internal geometry tables, but no reviewed public row API exposes them.

V1 is panel-only:

- Logical layer ID: `kma-marine-weather-warnings`
- Default: OFF
- Geometry: 0
- Current panel rows: 6
- No representative-point conversion, name matching, buffer, convex hull, or fabricated polygon

Forecast `FCT_ID` and warning `REG_ID` are separate contracts. No official equivalence was verified, so the application performs `NO_AUTO_MAPPING`.

## UI And Isolation

The panel displays warning type, official level, area, issue/effective time, lifecycle, receive time, freshness, and KMA attribution. It has its own state and toggle. KMA Observation, KMA Forecast, and KHOA Navigation Warning are not merged, deduplicated, or used as fallbacks.

Current-source failure returns only a last-good current snapshot no older than 60 minutes. History or zone failure does not fail current: history may remain unmatched and current `REG_ID`/`REG_KO` can still be shown. Failure of all KMA weather-warning requests degrades only this panel.

## Safety Boundary

`해상특보는 기상청 공식 특보의 참고 표시이며 실제 출항·운항 가능 여부를 자동 판정하지 않습니다. 최신 기상청 특보와 관계기관 안내를 반드시 확인하세요.`

No departure judgement, severity score, route blocking, automatic reroute, safe routing, waypoint prohibition, or navigability judgement is implemented.

## Official References

- KMA warning APIs: https://apihub.kma.go.kr/apiList.do?apiMov=%ED%8A%B9.%EC%A0%95%EB%B3%B4+%EC%9E%90%EB%A3%8C+%EC%A1%B0%ED%9A%8C&seqApi=10&seqApiSub=288
- KMA warning-zone APIs: https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=321
- KMA warning DB dictionary: https://apihub.kma.go.kr/static/html/attach/wrn_table.html
- Public Data Portal warning service: https://www.data.go.kr/dataset/15000415/openapi.do

# KHOA Navigation Aids Source Audit V2

## Decision

Status: `CONNECTED`

The dedicated data.go.kr credential returned a normal live response on 2026-09-03. Blue Marina connects the nationwide navigation-aid feed to `/sea/navigation` as an optional, default-off reference layer. It is not used by routing, collision avoidance, waypoint generation, or any navigation-safety decision.

## Official Contract

| Item | Verified value |
| --- | --- |
| Provider | 해양수산부 국립해양조사원(KHOA) |
| Portal dataset | `https://www.data.go.kr/data/3035490/openapi.do` |
| Endpoint | `https://apis.data.go.kr/1192136/Buoy/getBuoyInfo` |
| Protocol / format | REST GET / XML |
| Service version | 1.0 |
| Service start | 2019-04-01 |
| Source update cycle | Weekly |
| Published throughput | Up to 30 TPS |
| Authentication | Approved data.go.kr `ServiceKey` |
| License | 공공저작물 출처표시 제1유형 |

Request parameters are `ServiceKey`, `buoyNm`, `numOfRows`, and `pageNo`. `buoyNm` accepts only A01-A09. The live response confirmed `blfrNo`, `buoyKr`, `buoyEn`, `buoyNm`, `kindCd`, `seaNm`, `lgt_property`, `remark` when populated, `wgs84North`, and `wgs84East`. The live `kindCd` field supplements the web contract and is preserved as a raw detailed-type label.

## Live Smoke

The minimum A01 request returned HTTP 200, result code `00` (`NORMAL SERVICE`), 10 items, and a live A01 `totalCount` of 2,885. The published technical-document sample count of 2,542 is therefore treated as an example, not a current nationwide total.

Coordinates use directional decimal strings such as `42.2751667N` and `130.6366389E`. The adapter accepts this verified representation, plain decimal coordinates, and conventional DMS while still rejecting malformed or out-of-range coordinates.

## Inventory

One bounded request with up to 5,000 rows was made for each official category. No category required a second page at the audit date.

| Code | Official label | Live count |
| --- | --- | ---: |
| A01 | 고정표지 | 2,885 |
| A02 | 이동표지 | 2,465 |
| A03 | 교량등 | 3,524 |
| A04 | 무신호 | 139 |
| A05 | 레이콘 | 120 |
| A06 | AIS | 329 |
| A07 | 로란-C | 13 |
| A08 | DGPS | 40 |
| A09 | 항공무선표지국 | 9 |
| **Total responses** | | **9,524** |

- Unique `blfrNo`: 6,201
- Source IDs repeated at least once: 207
- Duplicate occurrences: 3,323
- Exact duplicate records removed from map payload: 3,321
- Normalized map records after exact deduplication: 6,203
- Missing source ID: 0

`blfrNo` is not globally unique per response row. Blue Marina preserves it as `sourceRecordId` and builds a stable feature ID from category, source ID, coordinates, Korean name, broad type, and detailed source type. It does not discard distinct records merely because they share a `blfrNo`.

Exactly two source IDs explain the 6,201-to-6,203 difference:

| `sourceRecordId` | Shared source facts | Variant difference |
| --- | --- | --- |
| `1282.1` | A01, 왕돌초 해양과학기지등, 36.6859167 / 129.7424444 | `kindCd` is empty in one row and `항해 목표용 표지` in the other |
| `3093` | A01, 대불항 삼표시멘트 돌핀 A호 등대, 34.7785556 / 126.4267778 | `kindCd` is empty in one row and `항해원조` in the other |

These are source-level metadata conflicts, not coordinate or name conflicts. The runtime identity is the stable hash described above, so both variants remain addressable instead of one silently overwriting the other. Canonical cleanup is deferred until KHOA identifies which detailed-type value is authoritative.

## Quality

| Check | Result |
| --- | ---: |
| Valid WGS84 coordinate pairs | 9,524 |
| Invalid coordinate pairs | 0 |
| `0,0` coordinate pairs | 0 |
| Outside the conservative South-Korea envelope | 91 |
| Missing Korean name | 0 |
| Missing English name | 47 |
| Missing broad type | 0 |
| Missing light characteristic | 935 |

Valid source coordinates range from latitude 15.1298611 to 59.4172222 and longitude 107.2226667 to 157.69525. The 91 records are valid WGS84 values but fall outside the deliberately conservative `30..40 / 122..133` South-Korea audit envelope. They are retained in the quality report and included in GeoJSON because they pass global WGS84 validation; they are not silently rewritten or deleted. Their presence reinforces that this optional reference layer is not authoritative navigation equipment.

The live `kindCd` distribution includes special, port-hand, starboard-hand, cardinal, isolated-danger, safe-water, mooring, and other source labels. Blue Marina displays this raw text but does not map it to ENC/IHO symbols or infer navigation safety.

## Busan Cross-check

Secondary source: `https://www.data.go.kr/data/15144073/fileData.do`, 부산지방해양수산청, 314 rows dated 2025-06-23.

- Sampled: 20 deterministic rows
- Normalized-name matches: 16/20
- Coordinate matches within 250 m: 14/20
- Type comparison: unavailable because the CSV has no separate structured type field
- Use-status comparison: unavailable because the nationwide API has no corresponding status field

The six differences include renamed/missing records and same-name records with distant coordinates. Source versions differ, so the regional file remains a sanity check rather than an equality oracle.

## Product Boundary

- Browser -> Blue Marina `/api/sea-info/navigation-aids` -> KHOA
- Dedicated server-only `KHOA_NAVIGATION_AIDS_API_KEY`; no `KHOA_API_KEY` fallback
- Nine official categories aggregated server-side
- Exact duplicates removed; invalid coordinates excluded and counted
- Cache: 24 hours, conservative relative to the weekly source update cycle
- API response is not persisted as a proprietary master database
- MapLibre source uses clustering through zoom 10
- Individual Blue Marina circle markers appear from zoom 7
- Layer ID: `khoa-navigation-aids`
- Toggle default: OFF
- Attribution: 국립해양조사원(KHOA)

## Safety

The layer must not drive route generation, collision avoidance, safe-route snapping, automatic buoy following, passage-clearance decisions, or official navigation judgments. It uses Blue Marina markers rather than ENC/IHO symbols.

Required UI wording:

`참고용 해양공간정보이며 공식 항법장비를 대체하지 않습니다.`

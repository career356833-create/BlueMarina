# KHOA Navigation Aids Source Audit V1

## Decision

Status: `BLOCKED_CREDENTIAL`

The official nationwide source and its published request/response contract are verified, but Blue Marina's existing local KHOA key returned HTTP 403 for this specific service on 2026-09-03. No response rows were available for quality analysis. The MapLibre layer, toggle, markers, popup, and runtime attribution are therefore not connected.

The repository contains only a disabled server boundary and a source-backed normalization contract. `KHOA_NAVIGATION_AIDS_ENABLED` defaults to `false`, and the boundary requires a dedicated `KHOA_NAVIGATION_AIDS_API_KEY`; it does not reuse `KHOA_API_KEY`.

## Primary Source

| Item | Verified value |
| --- | --- |
| Portal title | `항행통보` |
| Actual detailed function | Nationwide navigation-aid lookup by navigation-aid category |
| Provider | 해양수산부 국립해양조사원, 해도수로과 |
| Official catalog | `https://www.data.go.kr/data/3035490/openapi.do` |
| Endpoint | `https://apis.data.go.kr/1192136/Buoy/getBuoyInfo` |
| Service URL | `https://apis.data.go.kr/1192136/Buoy` |
| API type / format | REST / XML |
| Registered / modified | 2019-01-24 / 2025-08-06 |
| Cost | Free |
| Approval | Development automatic; production automatic |
| Development traffic | 10,000 requests; production increase available with a registered use case |
| License | 공공저작물 출처표시 제1유형 |
| Coverage | Description says Korean coastal navigation aids; the portal's structured spatial field is blank |
| Update | Detailed function says real-time navigation-aid information; no formal source revision cadence is published |

The 2026 KHOA notice retiring 35 ocean-observation APIs does not list this `Buoy` service. This is evidence that the service is not part of that retirement notice, not a guarantee of indefinite availability.

## Published Request Contract

| Blue Marina parameter | Official parameter | Required | Published meaning |
| --- | --- | --- | --- |
| server credential | `ServiceKey` | Yes | data.go.kr API key |
| `aidTypeCode` | `buoyNm` | No | Navigation-aid category code |
| `rows` | `numOfRows` | No | Results per page |
| `page` | `pageNo` | No | Page number |

The official contract does not publish bbox, region, name-search, or modified-date parameters. Blue Marina must not forward invented query fields.

## Published Response Contract

| Official field | Normalized field | Policy |
| --- | --- | --- |
| `blfrNo` | `id` | Required source identity |
| `buoyKr` | `koreanName` | Preserve text |
| `buoyEn` | `englishName` | Preserve text |
| `buoyNm` | `aidTypeLabelRaw` | Preserve official raw label |
| `seaNm` | `coastlineTypeRaw` | Preserve official raw value |
| `lgt_property` | `lightCharacteristicRaw` | Preserve without expanding Fl/Oc/Iso/Q abbreviations |
| `wgs84North` | `latitude` | Validate WGS84 numeric range |
| `wgs84East` | `longitude` | Validate WGS84 numeric range |
| `remark` | `remarks` | Preserve text |
| `totalCount`, `numOfRows`, `pageNo` | pagination metadata | Preserve as integers |

The response does not publish a per-row category code separate from `buoyNm`. Blue Marina sets `aidCategoryCode` only when the request was made with a verified A01-A09 filter; otherwise it remains null.

## Official Category Codes

| Code | Official label |
| --- | --- |
| A01 | 고정표지 |
| A02 | 이동표지 |
| A03 | 교량등 |
| A04 | 무신호 |
| A05 | 레이콘 |
| A06 | AIS |
| A07 | 로란-C |
| A08 | DGPS |
| A09 | 항공무선표지국 |

These are broad API request categories. No verified official mapping from them to the requested detailed display set (등대, 등표, 등부표, 부표, 입표, 등주, 교량표지) was found in the published web specification. Detailed marker classification remains `UNKNOWN_OFFICIAL_TYPE` until the technical HWP/code dictionary and live rows are reviewed.

## Live Smoke And Quality

One request for A01 with one row was attempted using the untracked local key. It returned HTTP 403. The key and request URL were not printed or persisted.

Because no authorized response was obtained, these values are `UNKNOWN`:

- nationwide `totalCount` and active/inactive counts
- valid-coordinate and malformed-coordinate counts
- duplicate ID and missing-name counts
- counts by detailed type
- actual response encoding variations
- 부산 sample match rate

## Secondary Validation Source

The 부산지방해양수산청 file dataset (`https://www.data.go.kr/data/15144073/fileData.do`) is regional validation material only. It contains 314 rows dated 2025-06-23 with name, use status, address, and position. It is free with no stated usage restriction. It is not a nationwide runtime source and was not added to attribution.

Cross-validation is pending because the nationwide API could not be read. Source dates and schemas differ, so future comparison should use 10-20 부산 records and report coordinate/name differences without forcing equality.

## Product Boundary

- Server route skeleton: `/api/sea-info/navigation-aids`
- Default state: disabled
- Dedicated server-only key: `KHOA_NAVIGATION_AIDS_API_KEY`
- Maximum page size: 100
- Timeout: 8 seconds
- Provisional cache: 6 hours; review after live update behavior is measured
- Invalid coordinates: excluded and counted
- Duplicate IDs: first record retained and duplicate IDs reported
- No raw response, API key, or request URL is persisted
- KHOA failure affects only this optional boundary; navigation core remains independent

The normalized records can become Point GeoJSON, but no MapLibre source or layer consumes them yet. A connected V1 should use non-ENC Blue Marina circle/symbol markers, default OFF, with low-zoom clustering or a conservative minzoom after nationwide volume is measured.

## Safety Limits

Navigation aids remain reference information only. They must not drive route generation, obstacle avoidance, passage clearance, buoy snapping, collision avoidance, or any safe-navigation guarantee. Blue Marina markers must not imitate licensed IHO/ENC chart symbols.

Required UI wording when connected:

`참고용 해양공간정보이며 공식 항법장비를 대체하지 않습니다.`

## Unblock Checklist

1. Apply for the `항행통보` / `Buoy` API in data.go.kr.
2. Store the approved key only as `KHOA_NAVIGATION_AIDS_API_KEY` in a server environment.
3. Repeat a one-row smoke and verify the XML contract.
4. Page through the nationwide result at a bounded rate and produce quality counts.
5. Review the official technical HWP for detailed type semantics.
6. Cross-check 10-20 부산 records.
7. Only then enable the flag and implement MapLibre registration, markers, toggle, popup, and browser tests.

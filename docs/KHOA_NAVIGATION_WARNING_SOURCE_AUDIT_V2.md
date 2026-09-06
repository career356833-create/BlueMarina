# KHOA Navigation Warning Source Audit V2

Updated: 2026-09-06

Status: `CONNECTED`

## Live Contract

- Source: 국립해양조사원(KHOA) `해양수산부 국립해양조사원_항행경보 현황`
- List: `NavigationalWarning/getNavigationalWarningInfo`
- Detail: `NavigationalWarning/getNavigationalWarningDetailInfo`
- Transport: REST GET, XML
- Live result: HTTP 200, `resultCode=00`, latest request `totalCount=5`
- Audit window: 2026-06-19 through 2026-09-06
- Sample: 589 list observations, 112 unique documents, 916 detail records

The browser never receives the `ServiceKey`. The server uses only `KHOA_NAVIGATION_WARNING_API_KEY`; unrelated KHOA keys are not fallback credentials.

## Request And Response

The live list accepted the documented `ServiceKey`, `date`, `numOfRows`, and `pageNo` parameters. Optional `doc_type`, `app_cat`, and `noti_cat` remain raw source filters. Observed list fields were `app_cat`, `area`, `basic`, `content`, `doc_num`, `doc_type`, `gov_cd`, `noti_cat`, and `title`.

Observed detail fields were `alarm_date`, `alarm_time`, `area`, `doc_num`, `position`, `position_desc`, `position_nm`, and `sea_pos`. Detail lookup is joined by `doc_num` without forwarding the numeric list `area`: the detail endpoint's documented area example uses a letter key, while a live numeric list area produced a no-data response. All returned detail records are retained.

The portal labels around `app_cat` and `noti_cat` are inconsistent with request code descriptions and sample values. V1 preserves both field names and raw values and does not silently swap their meanings.

## Quality

| Measure | Result |
| --- | ---: |
| Unique documents | 112 |
| Documents with repeated list observations | 85 |
| Detail records | 916 |
| Documents joined to detail | 102 |
| Documents without detail | 10 |
| Unique document and area records | 916 |
| Repeated detail records | 0 |
| Missing list title / content | 0 / 0 |
| Missing detail alarm date / time | 0 / 0 |

The machine-readable audit is `reports/khoa/navigation-warning-quality-v1.json`. It contains no credential or request URL.

## Position And Geometry

The observed coordinate form is hemisphere-suffix DMS, including optional decimal seconds, for example:

```text
37-04-35N, 126-32-30E
37-04-35N, 126-33-23E
37-02-58N, 126-33-23E
37-02-58N, 126-32-30E
```

The parser supports only this observed form and the source's encoded carriage-return separators. It does not implement speculative coordinate variants.

Conservative rendering rules:

- One valid coordinate is a `Point`. A stated radius is not converted into a guessed buffer.
- Two coordinates become a `LineString` only when `position_desc` explicitly describes sequential connection without an enclosed area.
- Three or more coordinates become a `Polygon` only when `position_desc` explicitly describes the area inside sequentially connected points. The renderer closes the ring while preserving raw text.
- Ambiguous, missing, or malformed values remain `geometry=null` and appear only in the list.
- Convex hulls and inferred buffers are prohibited.

Observed normalized geometry: 219 points, 0 lines, 692 polygons, and 15 list-only records. Five records failed strict parsing.

## Lifecycle And Time

No structured status, cancellation, supersession, or publication timestamp field was observed. `alarm_date` and `alarm_time` remain source-named schedule text and are not treated as publication timestamps. Every normalized record therefore has `status=UNKNOWN`; inferred status count is zero.

## Cache And Failure

- Server cache: 10 minutes
- Fresh threshold: 15 minutes
- Stale fallback: failed refresh with a last successful snapshot no older than 60 minutes
- Unavailable: no snapshot, or last success older than 60 minutes

KHOA publishes no refresh SLA. The UI shows the last successful fetch time. A warning-source failure changes only this layer to unavailable and does not affect the base map, existing four KHOA layers, GPS, destination, waypoint, track, or simulation.

## MapLibre And Panel

- Logical layer ID: `khoa-navigation-warnings`
- Default: OFF
- Geometry: restrained point marker, dashed line, translucent polygon and outline
- List: includes geometry and geometry-null warnings, freshness, and last successful fetch time
- Selection: source-backed title, document number, area, position name, schedule text, description, and content
- Focus: list selections with geometry focus the map; list-only records open text details

The static training/firing reference layer and dynamic warning layer remain independent. Spatial overlap is not interpreted as current firing activity.

## Safety Boundary

The layer is display-only. It does not block routes, reroute, prohibit waypoints, score risk, avoid collision, or determine whether passage is safe. The UI states:

> 항행경보는 공식 공개 안전정보의 참고 표시이며 실제 통항 가능 여부를 자동 판정하지 않습니다. 출항 전 최신 관계기관 안내와 공식 항법정보를 확인하세요.

The existing official-navigation-equipment disclaimer remains visible.

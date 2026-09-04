# KHOA Maritime Training and Firing Zone Layer V1

Updated: 2026-09-04

## Product Boundary

This layer is a static reference rendering of an official public boundary dataset. It does not report whether training or firing is currently active, whether passage is permitted, or whether a route is safe.

`STATIC_REFERENCE_LAYER != ACTIVE_WARNING_LAYER`

The V1 layer does not participate in destination selection, waypoint snapping, route generation, rerouting, ETA, collision or grounding avoidance, or safety decisions. Blue Marina has no verified active-warning route or API for this dataset, so the UI does not offer a fake latest-warning action.

Required UI warnings:

- `공식 공개 구역 경계 참고자료이며 현재 훈련·사격 실시 여부 또는 통항 가능 여부를 나타내지 않습니다. 출항 전 최신 항행경보와 관계기관 안내를 확인하세요.`
- `참고용 해양공간정보이며 공식 항법장비를 대체하지 않습니다.`

## Official Source

| Field | Value |
| --- | --- |
| Dataset | `해양수산부 국립해양조사원_해상훈련및사격구역_20260415` |
| Provider | 해양수산부 국립해양조사원 |
| Official page | https://www.data.go.kr/data/15116506/fileData.do |
| Published / modified | 2026-04-15 |
| Update cycle | Annual |
| Format | SHP archive |
| License | 공공저작물 출처표시 제1유형 |
| Collection method | 타기관 업무 협조 |
| Provider limitation | 일부 누락 가능성 있음 |

The unchanged official archive is `data/khoa/navigation/training-firing-zone/raw/khoa-training-firing-zone-20260415.zip`.

- Bytes: `102891`
- SHA-256: `f0e10d29c1ac67746d2fcdde16b359200e215f0e118befb0d1fbe5d54d544d8a`
- Source CRS: EPSG:5179 authority declared in the embedded WKT
- Source encoding: UTF-8 declared by `.cpg`
- Source geometry: single-part `POLYLINE` boundary records

## Raw Audit

- Features: 60
- Source vertices: 6,958
- Null geometries: 0
- Invalid derived geometries: 0
- Exactly closed boundaries: 57
- Boundaries snapped within the 0.01 m closure tolerance: 3
- Maximum closure gap: 0.00012532446479578973 m
- Duplicate source geometries: 1 pair (`R-97E` and `R-97F` remain distinct source records)
- Duplicate full features: 0
- WGS84 bounds: `[124.069444, 32.566442, 131.416667, 38.566667]`

The official source is a boundary line dataset rather than ready-made polygons. V1 creates a polygon only when a source line is already closed within 0.01 m. It snaps only the final coordinate to the first coordinate. A larger gap fails conversion. No boundary is inferred and no geometry simplification is applied.

## Conversion

Reproduce the derived layer:

```powershell
python -m pip install -r tools/khoa/requirements.txt
python tools/khoa/convert-training-firing-zone.py `
  --input data/khoa/navigation/training-firing-zone/raw/khoa-training-firing-zone-20260415.zip `
  --output data/khoa/navigation/training-firing-zone/derived/training-firing-zone.geojson `
  --public-output public/data/khoa/navigation/khoa-maritime-training-firing-zone.geojson `
  --report data/khoa/navigation/training-firing-zone/derived/conversion-report.json
```

The converter is checksum-bound to the archived source, transforms its embedded CRS to EPSG:4326, and preserves all source fields in `sourceRaw`. Missing fields remain null. Product fields are mapped only from actual source columns:

| Product field | Source field |
| --- | --- |
| `name` | `ZONE_NM` |
| `locationName` | `ZONE_DTL` |
| `referenceChartNumber` | `RFRNC_INFO` |
| `referenceChartScale` | `RFRNC_I_01` |
| `referenceChartName` | `RFRNC_I_02` |
| `organization` | `REL_DEPT` |
| `revisionYear` | `RVSN_YR` |
| `effectiveDateText` | `TKEF_YMD_C` |

Derived output:

- Geometry: 60 Polygon features
- Vertices: 6,958
- Simplification: 0 m
- Browser payload: 247,526 bytes
- SHA-256: `a04b5cc40e30d07e353fba26e554be8be406bf606a731e7576a5d865daeb379c`

## MapLibre Integration

- Layer ID: `khoa-maritime-training-firing-zone`
- Data URL: `/data/khoa/navigation/khoa-maritime-training-firing-zone.geojson`
- Default visibility: OFF
- Draw order: harbor zone, training/firing zone, deep-water route, navigation aids, navigation overlays
- Style: restrained amber fill and dashed outline
- Interaction: click details show source-backed fields and KHOA attribution only

The layer has an independent loading/error/visibility state. A fetch or parse failure does not disable the base map, harbor zone, deep-water route, navigation aids, or navigation calculations.

## Performance

The 247,526-byte national snapshot is suitable for one static GeoJSON fetch in V1. No tile server or runtime transformation is needed. If future releases grow materially, the immutable raw source must remain preserved while a separately reported regional-chunk or vector-tile derivative is introduced.

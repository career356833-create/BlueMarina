# KHOA Harbor Zone Layer V1

Updated: 2026-09-02

## Official Source

- Dataset: `해양수산부 국립해양조사원_항만구역_20250811`
- Provider: 해양수산부 국립해양조사원, 해도수로과
- Reference: https://www.data.go.kr/data/15130180/fileData.do
- Published and modified: 2025-08-11
- Update cycle: annual
- Format: SHP Polygon archive
- License: 이용허락범위 제한 없음
- Portal limitation: 일부 누락 가능성 있음

The official ZIP is preserved unchanged at `data/khoa/navigation/harbor-zone/raw/khoa-harbor-zone-20250811.zip`. Its SHA-256 is recorded in `raw/source-metadata.json`. Extracted official components are retained for inspectability; the converter always accepts the untouched ZIP.

## Conversion

- Source CRS: EPSG:5179, Korea 2000 / Unified CS
- Target CRS: EPSG:4326
- Declared DBF encoding: EUC-KR
- Source geometry: Polygon, 70 features
- Null and duplicate geometry counts are recorded in `derived/conversion-report.json`.
- Source attributes mapped without inference: object ID, Korean/English name, harbor type code, related institution code, status code, and minimum display scale.
- Full source records remain as serialized provenance in `sourceRaw`.

The official source contains 302,501 vertices. The runtime copy applies a topology-preserving 25 metre simplification in source CRS and six-decimal WGS84 coordinate precision. This display-scale optimization reduces the browser payload to 24,284 vertices and about 0.59 MiB. It is not written back to the official archive. Reproduce it with `tools/khoa/convert-harbor-zone.py`.

## MapLibre Product Boundary

- Layer ID: `khoa-harbor-zone`
- Rendering: muted marine-blue Polygon fill and thin solid outline
- Default visibility: OFF
- Layer order: above the base raster; below `khoa-deep-water-route`; below all navigation accuracy, track, bearing, waypoint, destination, and vessel layers
- Interaction: source-backed feature details only
- Attribution: `국립해양조사원(KHOA)` through the shared source attribution

## Limitations And Safety

The layer is static reference information. It does not determine safe entry, departure availability, passage permission, collision avoidance, grounding risk, or route legality. It is not used for destination snapping, routing, bearing, ETA, arrival, waypoint, track, or simulation calculations.

Required UI statement:

`참고용 해양공간정보이며 공식 항법장비를 대체하지 않습니다.`

If future releases materially increase payload size, retain the official raw archive and generate separate regional chunks or PMTiles/vector tiles. Do not silently replace the source geometry.

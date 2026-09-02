# KHOA Marine Layer Catalog V1

Updated: 2026-09-02

This catalog separates public reference layers from navigation-critical products. A listed dataset is not an endorsement for route planning. Blue Marina must not describe any layer here as a safe route or a replacement for an approved chart, ECDIS, ENC, or onboard navigation equipment.

## Connected Layer

### A. Deep-water-route area

| Field | Value |
| --- | --- |
| Provider | Ministry of Oceans and Fisheries, Korea Hydrographic and Oceanographic Agency (KHOA) |
| Official dataset | `해양수산부 국립해양조사원_깊은수심항로부_20250811` |
| Official reference | https://www.data.go.kr/data/15130169/fileData.do |
| Format / cadence | SHP / annual static snapshot |
| License | 이용허락범위 제한 없음 |
| Source CRS / encoding | EPSG:5179 / EUC-KR declared by `.cpg` |
| Access | Official data.go.kr file download; reproducible without scraping |
| MapLibre integration | **CONNECTED** as `khoa-deep-water-route`, Polygon fill plus dashed outline |
| Product use | Optional reference overlay and source-backed feature details only |
| Blocker | None for this 5-feature snapshot. Refresh automation needs an explicit release check. |

The official archive and checksum are under `data/khoa/navigation/deep-water-route/raw`. The canonical EPSG:4326 GeoJSON and conversion report are under `derived`. The browser copy is under `public/data/khoa/navigation`.

Reproduce the conversion:

```powershell
python -m pip install -r tools/khoa/requirements.txt
python tools/khoa/convert-deep-water-route.py `
  --input data/khoa/navigation/deep-water-route/raw/khoa-deep-water-route-20250811.zip `
  --output data/khoa/navigation/deep-water-route/derived/khoa-deep-water-route.geojson `
  --public-output public/data/khoa/navigation/khoa-deep-water-route.geojson `
  --report data/khoa/navigation/deep-water-route/derived/conversion-report.json
```

The source DBF declares EUC-KR, but some Korean values already contain replacement characters. The converter preserves them in `sourceRaw`; it does not guess missing text. Only source-backed canonical fields are presented.

### B. Harbor-zone area

| Field | Value |
| --- | --- |
| Provider | Ministry of Oceans and Fisheries, Korea Hydrographic and Oceanographic Agency (KHOA) |
| Official dataset | `해양수산부 국립해양조사원_항만구역_20250811` |
| Official reference | https://www.data.go.kr/data/15130180/fileData.do |
| Format / cadence | SHP / annual static snapshot |
| License | 이용허락범위 제한 없음 |
| Source CRS / encoding | EPSG:5179 / EUC-KR declared by `.cpg` |
| Access | Official data.go.kr file download; raw archive and checksum preserved |
| MapLibre integration | **CONNECTED** as `khoa-harbor-zone`, subtle Polygon fill plus outline, default OFF |
| Product use | Optional reference overlay and source-backed feature details only |
| Performance | 70 features; 25 m topology-preserving display simplification; about 0.59 MiB; no tile server in V1 |

Reproduce the derived harbor layer:

```powershell
python -m pip install -r tools/khoa/requirements.txt
python tools/khoa/convert-harbor-zone.py `
  --input data/khoa/navigation/harbor-zone/raw/khoa-harbor-zone-20250811.zip `
  --output data/khoa/navigation/harbor-zone/derived/khoa-harbor-zone.geojson `
  --public-output public/data/khoa/navigation/khoa-harbor-zone.geojson `
  --report data/khoa/navigation/harbor-zone/derived/conversion-report.json
```

The official 302,501-vertex geometry remains unchanged under `raw`. The browser-specific derived copy is explicitly separate and does not represent a legal or safe-navigation boundary determination. See `KHOA_HARBOR_ZONE_LAYER_V1.md`.

## Candidate Catalog

| Candidate | Status | Provider | Format / access | License | Time model | MapLibre path | Phase | Current blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C. ROMS surface current/speed/temperature | `RESEARCHED/API_REPLACEMENT_REQUIRED` | KHOA | KHOA/public-data API family; response commonly includes forecast time and coordinates | Verify per replacement API | Forecast / near-real-time | Server-normalized current vectors or raster/vector tiles | Phase 4 | KHOA announced retirement/replacement of 35 legacy APIs in 2026. The active replacement endpoint, terms, key, grid density, and cache policy must be verified before coding. |
| D. Tide stations | `EXISTING_KHOA_BOUNDARY` | KHOA | Public-data APIs and Blue Marina's existing server-only tide boundary | Verify per active API | Observation / forecast | Point source with server-normalized station metadata | Phase 3 | Keep separate from this static layer. Existing `TideInfoResult` and KHOA route contract must remain authoritative. |
| E. Marine-use zones | `SOURCE_SELECTION_REQUIRED` | KHOA/MOF | Multiple official SHP datasets (environmental conservation, restricted and operating zones) | Dataset-specific, often attribution or no restriction | Static / periodic | Thematic polygon layers with explicit legal/source dates | Phase 3 | “Marine-use zone” is not one product. Select exact legal datasets and review update/legal-effective dates before combining. |
| F. Navigation aids / lighthouse / buoy | `AUTHORITY_FEED_REVIEW_REQUIRED` | KHOA/MOF and navigation-aid authority | Official catalog/API candidates; access varies by object family | Dataset-specific | Static plus operational updates | Point/symbol layers with zoom thresholds | Phase 4 | Exact authoritative feed, update semantics, symbol rights, and outage/staleness behavior are not yet verified. |
| G. Bathymetry / contours | `DATUM_LICENSE_STRATEGY_REQUIRED` | KHOA | Hydrographic/chart products or approved public derivatives; access and resolution vary | Product-specific | Survey/chart release | Vector tiles or raster terrain-style source, never a large national GeoJSON | Phase 5 | Survey datum, soundings/contour license, scale-dependent generalization, and payload size need a dedicated data strategy. |
| H. Formal ENC | `SEPARATE_LICENSED_PROGRAM` | KHOA-authorized distribution | S-57/S-101 chart distribution, not a generic public GeoJSON feed | Licensed/controlled chart product | Official chart updates | Dedicated ENC renderer/authorized service, not this prototype source | Separate program | Licensing, authorized distribution, update chain, symbology, and compliance. Do not approximate ENC from public reference layers. |

## Safety Boundary

- The connected deep-water-route polygons do not participate in destination selection, snapping, bearing, ETA, waypoint, track, or simulation calculations.
- The connected harbor-zone polygons are display-only and do not determine entry permission, departure availability, or route legality.
- Feature clicks show only fields present in the official source.
- UI wording: `참고용 해양공간정보이며 공식 항법장비를 대체하지 않습니다.`
- Source attribution: `국립해양조사원(KHOA)`.
- No safety guarantee, collision/grounding avoidance, route recommendation, or official-navigation claim is made.

## Performance Direction

The deep-water-route GeoJSON is only 5 features and about 6 KB, so a single static fetch is appropriate and no simplification is applied. The 70-feature harbor layer uses a separately recorded 25 m topology-preserving display simplification, reducing 302,501 source vertices to 24,284 and the browser copy to about 0.59 MiB. If later nationwide datasets exceed a practical browser payload, preserve the original geometry and produce separate derived regional chunks or PMTiles/vector tiles. A tile server is intentionally out of scope for V1.

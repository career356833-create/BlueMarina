# Navigation basemap preview V1

Date: 2026-10-31. Baseline: `e7d6991e578ce6cf225f6d9ec99e922563d678a7`.

## Scope

Four backgrounds: existing OpenStreetMap, MapTiler Ocean, Satellite and Night Ocean. Ocean/night now use vector styles; satellite combines imagery with vector details. The previous raster-only preview omitted geographic detail from the Ocean provider style.

All three provider backgrounds include Korean-first place/island/water labels, ferry routes and route names, ferry terminals, administrative boundaries and maritime boundary lines. Blue lines represent source-provided ferry routes; purple lines represent boundaries, not navigable routes. Small islands remain eligible beyond zoom 14, subject to provider tile availability and collision placement. Labels face the viewport in 3D. Existing KHOA overlays, GPS/track, camera and terrain are retained above the background bundle.

This does not assert that every Korean island, maritime route or regulatory boundary exists in the provider dataset. No geometry is fabricated. KHOA deep-water-route coverage remains the existing five polygons; layer visibility and unavailable live sources are unchanged.

## Pinned styles and switching

`public/map-styles/navigation` contains key-free versioned Ocean, Satellite and Night style JSON and a provenance manifest. `tools/navigation/build-map-detail-styles.cjs` deterministically adapts sanitized MapTiler Ocean v4, Ocean v4 Dark, Hybrid v4 and Streets v4 styles. The manifest records upstream and output SHA-256 hashes. Upstream originals are local research inputs outside the project, not runtime dependencies. Runtime reads the pinned styles and allows resource URLs only on api.maptiler.com.

A pending bundle loads behind the current background. Tile delivery, all source readiness and map idle are required before promotion. Failed/aborted/timed-out requests retain the previous background; an active-source failure restores OpenStreetMap. One active and one pending bundle are bounded and cleaned on repeated selections. Switching does not recreate the map, replace the full style, request GPS or change navigation calculations. Selection is not persisted.

## Configuration and release boundary

The browser build reads `NEXT_PUBLIC_MAPTILER_KEY` from ignored configuration. No credential is stored in source, this document, tests or style artifacts. With prior explicit user approval, the local-preview key was restricted to `localhost:3482` and `localhost:3471`. Only the isolated candidate's ignored environment is configured; main checkout and Vercel environments are unchanged.

MapTiler Free is for testing/personal non-commercial use. Production requires a suitable commercial plan and Production-restricted key. No paid plan, deployment or external configuration change was performed here.

The official MapTiler logo is bundled unchanged; MapTiler/OSM attribution remains visible. CSP adds only api.maptiler.com to connect-src; unsafe-eval stays disabled.

Sources:
- https://docs.maptiler.com/cloud/api/maps/
- https://docs.maptiler.com/schema/planet-v4/
- https://docs.maptiler.com/schema/planet-v4/includes/island_label/
- https://maplibre.org/maplibre-style-spec/layers/
- https://docs.maptiler.com/guides/map-design/attribution/add-attribution/
- https://www.maptiler.com/cloud/pricing/

## Verification

Candidate: `D:\Projects\bm-basemap-e7d6991`, baseline archive plus this task's files. Main's unrelated ROMS timeout hunks are preserved and excluded from the candidate.

- Targeted: 14/14 pass, including actual MapLibre validation of all three styles, resource allowlist, source/layer ordering, tile readiness, failed requests, glyph failures, timeout/abort, races, repeated switch cleanup and style reload.
- Full isolated suite: 1,444 passed, 2 skipped, 0 failed.
- Typecheck and lint: pass.
- Production-mode build: pass; 1,467 static pages generated.
- Browser: Ocean, Satellite and Night show Korean names, ferry routes and maritime boundaries around Busan. Mobile 390x844 has no horizontal overflow. Zoom and 3D perspective preserve upright labels. Existing terrain reported actual terrain active during the 3D check.
- Final local production-mode smoke: HTTP 200; Ocean details rendered with enforced CSP, MapTiler allowed and unsafe-eval absent. Style regeneration produced identical hashes.
- Physical GPS/pinch: not tested. Provider data completeness is not claimed.

Screenshot evidence remains in the candidate outputs directory. No staging, commit, push, Supabase mutation or Production deployment.

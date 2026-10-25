# Blue Marina Navigation V4 — Real 3D Coastal Terrain + Cockpit UX

Decision: **NAVIGATION_V4_COMPLETE_WITH_LIMITATIONS**. Real DEM terrain is visually verified on Preview and Production. Physical-device verification is still outstanding.

## Implementation

MapLibre 6.6.0 now uses a real Terrarium raster-dem source and `setTerrain` at 1× exaggeration. The prior 55° perspective remains; a separate terrain toggle distinguishes flat 2D, pitch-only 3D, loading, actual land terrain, unsupported coverage and failed-source fallback. No fabricated elevation or underwater mesh is generated.

The same existing map instance owns DEM, navigation layers, vessel, accuracy circle, destination, dotted straight-bearing line and blue/white historical track. Style reload reinstalls layers and avoids accumulating marine click listeners. Timers/listeners are released before map removal. GPS updates do not replace the style. The observed initial-destination animation interruption was fixed by establishing the destination position before later camera updates. No speculative MapLibre version change was made.

V3 speed filtering, course reliability, follow throttling, memory-only track and 67–72% forward anchor are retained. SOG is dominant, COG and device compass are distinct, invalid/stale GPS never retains a live speed value, and no boat is invented without GPS. The redundant native compass was removed; zoom remains 44px. Terrain and safety wording identify land elevation as reference material.

## Source, licensing and operating bounds

- [AWS Open Data / Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/): publicly accessible global bare-earth tiles, no account or API key required.
- [joerd data sources](https://github.com/tilezen/joerd/blob/master/docs/data-sources.md) and [attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md): Korean land uses SRTM/GMTED. An Ulleungdo tile identified `srtm/N37E130.tif` and GMTED in upstream metadata. SRTM has nominal 30m pixels, not survey-grade precision. Generalized zooms are coarser.
- [USGS copyright guidance](https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted?qt-news_science_products=0): USGS-produced data are public domain. Mapzen/AWS, USGS and NOAA source credits remain in the map attribution. The joerd code license is not substituted for data attribution.
- [MapLibre terrain API example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/) informed the rendering mechanism; its demo tile endpoint is not used.

Commercial rendering of this attributed public dataset does not require buying a key. No published hard quota or SLA was found; this is not a claim of unlimited service. Requests are confined to Korean coverage (124–132°E, 32–39.5°N) and zooms 7–12, overscaled above 12. A bounded same-origin server reader validates fixed-host upstream PNGs, uses a 6-second timeout, limits decoded dimensions and input bytes, deduplicates in-flight work, and caches only successful data. Platform compute and bandwidth costs still apply. No CSP weakening or environment key was needed.

Terrarium negative heights become 0m while positive land heights are retained. This removes the source dataset's ocean bathymetry; it is not a bathymetric correction. Below-sea-level land is also flattened, and interpolation/shoreline mismatches remain. These heights must not be used for navigation clearance, depth, land/reef avoidance or safe routes.

## Visual and regression verification

Ulleungdo screenshots were directly reviewed at the same test view: 2D, pitch-only, and terrain active. Actual mountain ridges and land relief are visible only with terrain active. These are explicit map QA coordinates and simulator positions, not a real voyage.

Local screenshots: `D:/Projects/bm-navigation-v4-c02548e/outputs/navigation-v4/`.
Comparison: `ulleung-2d.jpg`, `ulleung-pitch-only.jpg`, `ulleung-terrain-390.jpg`, `terrain-1280-ready.jpg`.

360/390/430/1280px were reviewed. Simulated 0/8/15kn, acceleration to 15kn, deceleration to 3kn, course change, low accuracy, stale fixes, jumps and signal loss exercised the existing engine. Drag released follow; recenter restored it. Repeated 2D/3D and track toggles, style reload, controller failure injection/retry, and re-entry retained navigation behavior. Browser console errors were absent in checked states. HTTP failure and timeout behavior are separately tested; this is not physical radio/network interruption QA. The previous tile-release error was not reproduced.

Tests: targeted 53 PASS; full 1382 PASS / 1 SKIP. Typecheck and lint PASS. Clean local build and exact final Preview cloud build PASS (1467 static pages). Production READY. Diff check PASS. Existing Supabase Edge Runtime warnings are outside this change.

## Safety and remaining limitations

REAL_DEVICE_NAVIGATION_NOT_VERIFIED. Physical GPS, heading, outdoor readability, pinch gesture, battery and sustained WebGL performance remain unverified. Cold DEM/base-tile loading can briefly show gaps; failure restores the ordinary map perspective. Provider availability is not guaranteed.

No AIS, automatic route, collision avoidance, depth inference, database/auth mutation, environment change, or business-domain modification. DEV-only simulator and terrain QA controls are excluded from Preview/Production UI.

## Deployment and final evidence

- Code commit: `6502d34cf841fab7568183b8e25db758c8ff86d2` (14 exact files).
- Final Preview: `dpl_45pUCPeCbV1JLg29yyAxQAC7REU5`, https://blue-marina-o8nm0e8es-chiweon.vercel.app, READY. Actual Ulleungdo relief, initial destination, mobile attribution/control separation, zero DEV QA controls and zero horizontal overflow verified.
- Production code deployment: `dpl_8czgYA58hSBDmLG8TbjgJmQ5k5Fo`, READY, code SHA above, https://blue-marina.vercel.app/sea/navigation.
- Production DEM tile: HTTP 200, 256x256 PNG, 20,641 bytes, 550ms single probe, transformed range 0 to 961m. A malformed/unsupported route returned 404. This timing is a single probe, not a performance SLA.
- Navigation, Fishing Spot `rock-151` and Conditions returned HTTP 200. Browser flow preserved species `BM-SPECIES-000188`, the exact destination name/coordinates `36.036417,126.513083`, and the return to the same spot. No GPS permission or real-location capture was used in this smoke.
- Screenshots `production-terrain-390.jpg` and `production-spot-handoff.jpg` were directly reviewed. Preview and Production contain no developer simulator controls.
- Source probes: Ulleungdo, Geoje and Jeju all returned 256x256 source tiles; source metadata and timings are retained in the JSON report.
- Preserved 1,885 other dirty files byte-for-byte. The one mixed map component retains exactly the original three ROMS change lines in each side of its residual diff. No broad staging, database/auth/business-domain changes or environment changes.

This evidence commit records the already verified code deployment; any automatic docs-only deployment uses identical application code.

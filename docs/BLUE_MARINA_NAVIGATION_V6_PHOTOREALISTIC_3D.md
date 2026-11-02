# Blue Marina Navigation V6 — real 3D renderer preparation

Date: 2026-11-02. **NAVIGATION_V6_BLOCKED**.

CesiumJS rendering and navigation integration are implemented, but no licensed, validated Korean-coast photogrammetry source is connected. An explicitly labeled, synthetic textured mesh verifies the engine only. It does **not** verify real terrain, photorealism or Korean coverage. No COMPLETE decision is justified. Production-mode testing also found that Cesium 1.146 eagerly initializes WebAssembly, which the existing strict CSP blocks. Runtime activation is therefore explicitly restricted to development builds.

## Baseline and preservation

Main, origin/main and the READY Production deployment were all `80237a9f49ed42affc6ad4807c6961e6ba348f54` at precheck. Production deployment ID: `dpl_HinGPM8AmjLvcULx3Dv7k9wWFQWy`.

Implementation and verification use an isolated archive of that commit. Existing common-map work, ROMS edits and other unrelated worktree changes are excluded. Delivery is on `codex/navigation-v6-real3d`; main and Production are not advanced. No provider billing, credentials, Supabase or Vercel environment settings are changed.

## Architecture

`MarineNavigation` retains the single GPS subscription, speed/course filtering, navigation instruments, destination, waypoint and voyage manager. GPX, ETA, wake lock and recording logic are unchanged. `NavigationMapShell` mounts either MapLibre or the lazy Cesium renderer, never both. Switching maps does not start a GPS watcher or create a voyage.

Cesium 1.146.0 uses the pinned official Cesium.js distribution and local workers/assets/license copied reproducibly during predev/prebuild. The script loads only on renderer activation; concurrent loads are deduplicated and failures can retry. Next 15 minification corrupted an embedded Wasm byte string in the ESM distribution during production-mode QA. Serving the official prebuilt vendor file fixes that syntax error. It does not resolve the separate WebAssembly CSP blocker; no CSP relaxation was made. No default ion terrain, imagery, geocoder or paid tile provider is requested. Cesium's license/credit presentation remains visible. The source requires a same-origin path and nonempty attribution. It cannot be supplied through a URL query parameter. Production defaults to the existing MapLibre interface.

Coordinates, stale-fix labeling and track segments reuse V5 converters. A missing fix does not create a boat. Markers are drawn at an explicit reference height of zero, not inferred GPS altitude or bathymetry. SOG/COG/straight-line distance/ETA stay in the shared instrument panel. Geographic camera location, heading and approximate altitude transfer on renderer teardown; projection scale is approximate.

The new renderer has top-down, forward and free cameras, zoom, dataset extent and existing current-position controls. Movement course is not replaced by a device compass. Historical-track inspection does not follow the live vessel. Forward following uses a target ahead of the boat; real GPS visual alignment remains unverified.

## Source and Korea coverage assessment

| Area | Current integration | Actual provider city-level probe |
| --- | --- | --- |
| 부산 | UNAVAILABLE | Not performed |
| 거제도 | UNAVAILABLE | Not performed |
| 포항 | UNAVAILABLE | Not performed |
| 울릉도 | UNAVAILABLE | Not performed |

These statuses describe this integration, not a claim that no supplier has imagery. Google’s official [country coverage table](https://developers.google.com/maps/coverage) lists a single 2D marker for South Korea, unlike the combined 2D/3D marker in supported countries. It does not establish usable photorealistic coverage for these four places. No unauthorized paid API probe was made. Coastal/ island mesh detail and near-ground visual quality remain unverified.

[Google Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles) can supply textured geographic meshes where supported. Its [price list](https://developers.google.com/maps/billing-and-pricing/pricing), consulted on the audit date, lists 1,000 monthly free billable events and $6 per 1,000 at the first paid tier. [Usage/billing](https://developers.google.com/maps/documentation/tile/usage-and-billing) is based on root tileset requests; a session can permit subsequent tile requests for up to three hours, subject to quotas. A billing-enabled project/API key still requires approval. No activation, quota expansion or automatic billing change occurred.

Google logos and provider attribution must follow the [Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies). Do not download or rehost Google data under this implementation's same-origin contract without explicit rights. The current adapter does not implement Google's authenticated streaming integration.

CesiumJS itself uses [Apache-2.0](https://github.com/CesiumGS/cesium/blob/main/LICENSE.md). This is separate from data licensing. [Cesium ion's content guide](https://cesium.com/learn/ion/content-usage-and-attribution-guide/) requires appropriate account and asset rights, with third-party and sample restrictions. A publicly visible sample is not automatically commercially reusable. No suitable Korean-coast public/commercial tileset with confirmed usage rights was secured. DEM remains the existing fallback and is not counted as photorealistic 3D.

## Local reproduction

Use Node >=22 and `npm ci`. No external key is needed for the **synthetic engine test**:

1. Run `node tools/navigation/create-real3d-qa-fixture.mjs`.
2. In an ignored, local `.env.local`, set:

   ```dotenv
   NEXT_PUBLIC_NAVIGATION_REAL3D_PREVIEW=true
   NEXT_PUBLIC_NAVIGATION_3D_TILESET_PATH=/navigation-3d-data/qa/tileset.json
   NEXT_PUBLIC_NAVIGATION_3D_ATTRIBUTION=Blue Marina ENGINE TEST GEOMETRY - NOT REAL TERRAIN
   ```

3. Run `npm run dev -- --port 3483`, open `/sea/navigation`, select `실사 3D · 시험`, then `데이터 범위`.

The generated fixture, keys, vendor asset copies, screenshots and logs are excluded from Git. The generator is committed for reproducibility. It creates a colored box with a texture in a valid 3D Tiles 1.1 tileset, not a model of an actual building or coast. Licensed service data must replace it before real-data acceptance; never promote this fixture as terrain.

## Reliability and observed QA

- Lazy Cesium loading, one canvas after each switch, destroy/late-promise disposal and 2D return verified.
- Actual local tileset/glTF/binary/texture loading and visible textured mesh verified. Synthetic mesh only.
- HTTP tile failure injected by temporarily renaming the local fixture; MapLibre restored automatically. File restored afterward. Loading deadline fallback also observed.
- 360/390/430px: no horizontal overflow, one canvas, camera controls and attribution visible. Screenshots retained with the isolated local verification copy.
- Memory policy: deviceMemory below 4 GB falls back; unknown memory is not treated as proof of suitability. Tile cache target 96 MiB, overflow 48 MiB, screen-space error 24, limited rendering resolution. These are limits, not measured total memory or frame-rate claims.
- Context-loss fallback and visibility lifecycle handlers implemented. Actual GPU loss, sustained memory profiling, browser offline transition and physical touch/pinch remain untested.
- Production-mode local QA: the official script loads and parses, but Cesium initialization fails because WebAssembly compilation is blocked by CSP. MapLibre fallback was observed. This affects the runtime itself, not just compressed tiles. An explicit production-runtime gate now prevents activation before loading the engine. Final production-build browser gate check passed: limitation notice visible, MapLibre retained one canvas, Cesium script count zero. Neither `unsafe-eval` nor `wasm-unsafe-eval` was added. [CSP script-src reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).

Marine layer/HUD parity is **not implemented** in Cesium. Those controls are withheld while the trial renderer is active; the UI directs users to MapLibre for marine layers. Source-state semantics and V5 marine data are unchanged. This is a material release limitation.

## Verification and release gate

Targeted navigation/HUD/diagnostics/V6 tests: 42 PASS. Full isolated suite: 1,458 PASS / 2 SKIP. Typecheck, lint, production-mode build (1,467 static pages) and exact diff check PASS. The build retains the existing Supabase Edge-runtime dependency warning.

Independent hosted Preview real-3D QA and Production activation are deferred pending a licensed dataset and a separate WebAssembly security-policy review. Pushing the feature branch may trigger an automatic default-OFF Preview; this does not validate real-3D coverage. Local preview is not a substitute for provider performance/coverage or physical-device testing. **REAL_DEVICE_NAVIGATION_NOT_VERIFIED** remains in force.

Next required: review the runtime WebAssembly requirement without silently weakening CSP, obtain a Korean-coast photogrammetry dataset with confirmed commercial delivery rights, validate real meshes/textures at all four sites, complete marine-overlay parity and real-device navigation QA, then review Preview before any Production activation. This renderer creates no safe route, depth route, land/reef avoidance, AIS or collision avoidance, and does not replace official navigation equipment.

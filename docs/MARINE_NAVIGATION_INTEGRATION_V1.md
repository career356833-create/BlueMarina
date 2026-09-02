# Marine Navigation Integration V1

## Provenance And Ownership

- Source prototype: `ChungChiweon/BlueMarina-Marine-Navigation`
- Source commit: `a9d82e5dfd3ea83bd0a1f18e8d5296fe7e0cba0f`
- Final source of truth: this Blue Marina repository

The prototype repository is archival, read-only reference. It is not a submodule, package, or runtime dependency.

## Integration Classification

### COPY

The provider-neutral Haversine distance, conversions, bearing normalization, relative bearing, compass direction, ETA, conservative arrival check, and track sampling rules were preserved.

### ADAPT

Navigation types, sensor orchestration, localStorage persistence, simulation, waypoints, tracks, status, instrument UI, and tests were adapted to Blue Marina naming, route ownership, styling, production simulation boundary, and `node:test` conventions.

### MAP_PROVIDER_SPECIFIC

The current renderer is MapLibre GL JS. Its provider implementation lives only under `src/components/boat/navigation/adapters/`. `NavigationMapShell` dynamically loads that client-only implementation, while `navigation-map-adapter.ts` keeps the presentation and provider contracts independent from MapLibre.

### DO_NOT_COPY

The prototype app shell, root routes, global CSS, package configuration, and standalone README were not copied.

## Route And Destination Contract

`/sea/navigation` owns recreational navigation. `/sea` remains the Kakao map and passes a selected fishing spot or port through validated query parameters: `lat`, `lng`, `name`, `type`, and optional `sourceId`.

`NavigationDestination` contains a stable ID, display name, coordinates, source type, and optional source ID. The parser rejects partial coordinates, out-of-range values, unsupported types, and oversized names or identifiers. No sensitive data is transported.

## Navigation Core

- Position: `navigator.geolocation.watchPosition`
- Distance: Haversine great-circle distance
- Bearing: initial and relative bearing with 16-point compass labels
- Heading sources: native GPS, device orientation, derived movement, simulation, unavailable
- Speed sources: native geolocation, derived movement, simulation, unavailable
- Derived movement: samples 1-30 seconds apart with both accuracies at or below 50 meters
- ETA: shown from 0.5 knots
- Arrival: 75 meters by default and `distance + accuracy <= radius`
- Track: local sampling every 10 seconds or 10 meters
- Waypoints and tracks: versioned localStorage only
- Simulation: development by default; production requires `NEXT_PUBLIC_MARINE_NAVIGATION_SIMULATION=true`

## Map Provider Boundary

The previous temporary renderer was Leaflet with OpenStreetMap raster tiles. The current renderer is MapLibre GL JS and still uses OpenStreetMap raster tiles as a **TEMPORARY BASE MAP** solely to verify renderer behavior. MapLibre is the navigation renderer candidate; the base layer is not a final marine-map provider.

The current technology candidates are deliberately not final decisions:

- `/sea`: keep Kakao Map now; evaluate TMAP as a future place-discovery map candidate.
- `/sea/navigation`: MapLibre GL JS renderer with a temporary OpenStreetMap raster base. Future layer targets are properly licensed KHOA/MOF public marine-spatial layers, depth/bathymetry, navigation aids, restricted areas, and currents.

`MapLibreNavigationProvider` exposes provider-scoped add, remove, ordered stacking, and visibility operations. The connected optional reference overlays are the official KHOA deep-water-route and harbor-zone snapshots documented in `KHOA_MARINE_LAYER_CATALOG_V1.md`. No ENC, bathymetry, hazard, current, or route-engine data is connected. ENC remains unimplemented pending a license and data strategy.

MapLibre 6 worker assets are copied from the installed package by `scripts/copy-maplibre-worker.mjs` during `predev` and `prebuild`. The provider points `setWorkerUrl` to the same-origin worker under `public/maplibre`; both the worker and its shared ESM sibling are required for GeoJSON source processing in Next.js.

## Safety Boundary

The displayed line is a geometric straight-line bearing reference. The module does not calculate a safe route, avoid land, reefs, hazards, or shallow water, and does not replace official charts, navigation equipment, seamanship, or local rules.

## Persistence And Future Work

V1 stores waypoints and tracks only in the browser. It has no Supabase navigation tables or account synchronization. A future audited route engine must remain separate from the map renderer and can be introduced only with validated chart, depth, hazard, and licensing inputs.

## Do Not Couple Rules

- Do not import Kakao, Leaflet, TMAP, or MapLibre into navigation core.
- Do not merge a navigation waypoint with a Fish, fishing-spot, or MarinePlace database entity.
- Do not present simulation as live position.
- Do not call a straight line a safe route.
- Do not make `/sea/navigation` depend on Supabase, Fish, auth, KHOA APIs, or the global BottomNav.

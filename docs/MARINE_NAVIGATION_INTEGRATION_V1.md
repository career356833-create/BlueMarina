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

The Leaflet renderer and OpenStreetMap tiles live only in `LeafletPrototypeNavigationMap.tsx`. `NavigationMapShell` and `navigation-map-adapter.ts` isolate the temporary provider.

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

Leaflet/OpenStreetMap is a temporary base-map prototype, not the final navigation technology. TMAP or MapLibre plus properly licensed KHOA/ENC layers can replace the provider adapter without changing geo, bearing, speed, ETA, arrival, waypoint, track, simulation, or navigation-state modules.

The current technology candidates are deliberately not final decisions:

- `/sea`: keep Kakao Map now; evaluate TMAP as a future place-discovery map candidate.
- `/sea/navigation`: keep the temporary Leaflet/OpenStreetMap renderer now; evaluate MapLibre with properly licensed KHOA/public marine-spatial layers as a future navigation-map candidate.

This integration does not implement or select either candidate.

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

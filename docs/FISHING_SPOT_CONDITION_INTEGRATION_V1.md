# Fishing Spot Condition Integration V1

## User Flow

The V1 flow connects the existing spot catalogue to the existing evidence-led condition reader:

1. `/fishing-spots` lists the existing local fishing-spot records.
2. `/fishing-spots/[id]` presents one spot, its source data, coordinates, target species, and safety context.
3. A canonical target-species action opens `/fishing-spots/conditions?spotId=...&speciesId=...`.
4. The condition page preselects only the validated canonical species.
5. The user still selects month, source, observation station or site, and depth.
6. The spot detail and condition context link to `/sea` and `/sea/navigation` through existing contracts.

## Route Structure

| Route | Responsibility |
| --- | --- |
| `/fishing-spots` | Searchable spot list and detail entry |
| `/fishing-spots/[id]` | Spot facts, provenance, species links, map, and navigation actions |
| `/fishing-spots/conditions` | Existing Fishing Condition read model with optional trusted spot context |
| `/sea?spotId={id}#live-marine-map` | Select and focus the exact spot when the map provider is available |
| `/sea/navigation?...` | Existing navigation destination contract |

## Spot Detail

The detail page reads `src/data/fishing-spots.json` through the existing typed data module. It displays only source fields already present in that record. Missing values are hidden or labelled as missing; depth, recommended time, expected catch, difficulty, probability, and condition scores are never synthesized.

Coordinates are shown as location context. The navigation action uses `navigationDestinationFromFishingSpot` and `buildNavigationHref`, preserving the existing destination shape and straight-line safety warning.

## Canonical Species Mapping

The integration contract contains the approved Fishing Condition set of ten canonical species. Mapping is exact by Korean name, with two explicit source aliases:

- `광어` to `넙치`
- `우럭` to `조피볼락`

Aggregate and approximate labels are not inferred. Unmapped source names remain visible as provenance but do not receive a species-specific condition action. A spot with no canonical match links to the condition page without a species selection.

## Condition Deep Link

The accepted query values are `spotId` and `speciesId`. Both are resolved against local trusted data:

- Unknown `speciesId` is ignored.
- Unknown `spotId` does not create a context banner.
- Region and coordinates are not trusted from arbitrary query text.
- Only `speciesId` may be preselected.
- Month, source, station or site, and depth remain blank until the user selects them.

The condition page provides a backlink to the originating spot when a valid `spotId` is present.

## Location Boundary

A fishing-spot coordinate is not an observation station. The UI states this explicitly and does not choose a nearest station, source, month, or depth. This preserves the environmental evidence contract and prevents spatial proximity from being treated as scientific equivalence.

## Map And Navigation

The `/sea` wrapper reads an exact `spotId`, enables the existing fishing-spot layer, and selects the matching record. When the Kakao SDK is ready, it also centers the map and sets a useful zoom level. If the provider is unavailable, the selected spot and an explicit connection status remain visible instead of fabricating a map result.

Navigation reuses the existing marine-navigation adapter. No alternate destination format or route calculation was introduced.

## Limitations

- No nearest-station lookup exists in V1.
- No live condition result is loaded on the spot list or detail page.
- No score, probability, ranking, recommendation, analytics, or persistence was added.
- The local browser verification environment could not initialize the Kakao SDK; the deep-link selection and fail-closed presentation were verified, while live provider rendering remains dependent on a valid Kakao runtime configuration.

## Future Research

A future nearest-station feature must define an explicit scientific and product policy before implementation: supported source, station availability, geodesic distance, observation depth compatibility, freshness, coastal barriers, and user confirmation. Proximity alone must not silently bind a spot to a station.

# Fishing Condition Comparator V1

## Purpose

Phase A Comparator V1 compares an explicitly selected NIFS environment observation with one canonical Species Environment Profile V1. It returns source-backed field relations only. It does not produce suitability, catch probability, ranking, a fishing recommendation, or a location recommendation.

The read-only endpoint is `POST /api/fishing-condition/compare`. POST is used only because the comparison request will gain fields over time. The handler has no database write, history write, cache mutation, or other side effect.

## Supported sources

V1 accepts only:

- `nifs-risa`: observed near-real-time water temperature at an explicit `stationId` and `SURFACE`, `MIDDLE`, or `BOTTOM` depth context.
- `nifs-femo-sea`: periodic fishery-environment observations at an explicit `siteId` and `SURFACE` or `BOTTOM` depth context.

The implementation reuses `getNifsRealtimeFishingEnvironment` and `getNifsFisheryEnvironment`. It does not add a fetcher, normalizer, nearest-station lookup, or cross-source fallback. `nifs-soo`, its climatology, KMA, and KHOA ROMS are outside this comparator.

## Request

```json
{
  "speciesId": "BM-SPECIES-000417",
  "environment": {
    "sourceId": "nifs-risa",
    "stationId": "explicit-source-station-id",
    "depthContext": "SURFACE"
  }
}
```

FEMO uses `siteId` instead of `stationId`. Missing or mixed location identities are rejected. A station or site is never selected by name, distance, or coordinates.

## Comparison rules

Temperature uses a complete canonical preferred Celsius range first. If it is absent, the first complete evidence-backed observed range is used without merging ranges. Equality with either boundary is `WITHIN_RANGE`. Other numeric relations are `BELOW_RANGE` and `ABOVE_RANGE`; none imply good, bad, favorable, or unsuitable conditions.

RISA and the species temperature contract both use degrees Celsius. FEMO salinity remains `UNIT_NOT_DOCUMENTED`, so salinity returns `UNIT_UNVERIFIED` even when a value exists. Dissolved oxygen can be compared only when FEMO supplies `mg/L` and the species profile has a source-backed canonical minimum. Chlorophyll-a has no species preference contract and remains `UNSUPPORTED_PROFILE`.

RISA preserves the selected categorical depth and uses its source station depth only when a numeric layer depth exists. FEMO water depth is station context, not an exact sample depth, so numeric species depth comparison remains `DEPTH_CONTEXT_UNRESOLVED`. Habitat remains `UNSUPPORTED_ENVIRONMENT` until an official habitat or substrate source is connected.

Seasonality compares only source-backed month lists against the observation month. Each result retains `SPAWNING`, `MIGRATION`, or `FISHERY_OCCURRENCE` context. It does not infer fishing quality. Activity remains unsupported because V1 has no source-backed environmental activity category and defines no invented daylight clock bands.

## Freshness and missing data

Fresh observations produce technical usability `USABLE`. Stale observations retain the factual range relation but set `freshnessWarning=true` and usability `LIMITED`. Unavailable freshness or a missing observed value returns `MISSING_ENVIRONMENT` and `UNAVAILABLE`.

Missing profile ranges return `UNSUPPORTED_PROFILE`. Unknown units return `UNIT_UNVERIFIED`; incompatible documented units return `UNIT_MISMATCH`. These states are never collapsed into one unknown value.

## Conflict behavior

Conflicts are evaluated by field path. The current `depth.observed` conflict for 방어 blocks only depth with `CONFLICT_REVIEW_REQUIRED`. A non-conflicted temperature field may still be compared. Conflicting values are not averaged or promoted to canonical values.

## Response and lineage

Every successful response contains the canonical species identity, explicit source location, observation time, freshness, selected depth context, per-field relations, evidence IDs for the profile ranges, and:

```json
{
  "sourceLineage": {
    "speciesProfileSource": "blue-marina-species-environment-v1",
    "environmentSource": "nifs-risa",
    "quality": {
      "species": "PROFILE",
      "environment": "OBSERVED",
      "comparison": "DERIVED_COMPARISON"
    }
  },
  "interpretation": null,
  "qualityClass": "DERIVED_COMPARISON"
}
```

There is deliberately no composite result. Temperature, salinity, dissolved oxygen, depth, seasonality, habitat, activity, and chlorophyll-a remain independent.

## Boundaries and next phase

The `NO_OFFICIAL_RISA_TO_SOO_STATION_CROSSWALK` and `ANOMALY_RUNTIME_DISABLED` gates remain unchanged. Comparator V1 does not unlock anomaly calculations.

A future Phase A suitability step may consume these relations only after a separately reviewed evidence and interpretation policy exists. V1 explicitly forbids scores, weights, probabilities, top-species lists, best-spot selection, ranking, and recommendation language.

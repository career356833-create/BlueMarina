# Fishing Condition Evidence Bundle V1

## Purpose

Condition Evidence Bundle V1 presents the existing species profile, environment comparison, and deterministic explanation in one read-only response. It is an orchestration layer only. It does not fetch an additional source, change a comparison relation, or calculate an overall condition.

## Flow

The server resolves one explicit environment source through the existing comparator service, calls the existing explanation service once, and assembles the result:

`environment source -> DERIVED_COMPARISON -> DERIVED_EXPLANATION -> DERIVED_EVIDENCE_BUNDLE`

The POST route is `/api/fishing-condition/evidence-bundle`. POST is used for the structured request body; the route performs no persistence, analytics mutation, database access, Supabase write, or external AI call.

## Request Boundary

V1 accepts exactly one of these source contexts:

- `nifs-risa`: one explicit `stationId` and `SURFACE`, `MIDDLE`, or `BOTTOM`
- `nifs-femo-sea`: one explicit `siteId` and `SURFACE` or `BOTTOM`

Station and site identifiers cannot be mixed. Unsupported sources return HTTP 400, and there is no automatic fallback. V1 does not combine RISA temperature with FEMO salinity or dissolved oxygen. Cross-source alignment remains future work.

Optional request contexts are `month` and `timeOfDay`. The request month is retained for audit only and does not override the source observation timestamp used by the existing Comparator. A time-of-day value does not create a diel relation because the environment sources do not provide a compatible activity classification.

## Evidence Item Contract

The bundle exposes temperature, salinity, dissolved oxygen, seasonality, activity, and habitat independently. Each item contains its technical status, unchanged Comparator relation, source value, profile range reference when applicable, deterministic explanation, evidence references, source lineage, and freshness.

Statuses are:

- `SUPPORTED`: a Comparator relation is available and usable.
- `LIMITED`: a relation is retained but the source observation is stale.
- `UNSUPPORTED_PROFILE`: the species profile has no compatible reference.
- `UNSUPPORTED_ENVIRONMENT`: the source does not provide a comparable category.
- `MISSING_ENVIRONMENT`: the selected source context has no value.
- `MISSING_ENVIRONMENT_CONTEXT`: required request context is absent.
- `UNIT_UNVERIFIED` or `UNIT_MISMATCH`: numeric comparison is blocked by units.
- `CONFLICT_REVIEW_REQUIRED`: only the conflicted field is blocked.
- `UNKNOWN`: the existing relation cannot be mapped more specifically.

Seasonality retains separate `SPAWNING`, `MIGRATION`, and `FISHERY_OCCURRENCE` contexts, including each context's original relation and evidence references. Contexts are never merged into a new canonical season.

## Technical Summary

The summary contains only `supportedCount`, `unsupportedCount`, `blockedCount`, and `limitedCount`. These are response diagnostics, not votes or weights. A supported count does not mean favorable conditions, and no majority logic is applied.

## Freshness And Conflicts

Fresh observations retain their Comparator usability. Stale numeric observations retain their relation with status `LIMITED`. Unavailable observations remain unavailable. A field-level conflict remains `CONFLICT_REVIEW_REQUIRED` for that field only and is not propagated to unrelated evidence.

## Profile And Lineage

The bundle always uses Species Environment Profile V2 and reports `profileVersion: "v2"`. Profile evidence references remain short IDs; source text is not copied into the response. Every evidence item records the environment source followed by the comparison, explanation, and bundle quality classes.

## No-Score Boundary

The bundle contains no suitability score, fishing score, probability, ranking, recommendation, rating, grade, favorable count, percentage, or overall green/yellow/red state. It does not turn field relations into catch advice or a combined assessment.

## Future Boundary

A future source-alignment phase may define when observations from multiple official sources refer to the same place, depth, unit, and time. V1 deliberately performs no such alignment and does not add the currently disabled RISA-to-SOO climatology anomaly.

# Fishing Condition Seasonality Runtime Integration V1

## Purpose

This integration reads the frozen production artifact at
`data/fishing-condition/seasonality/v1/species-seasonality.json` and returns a
deterministic factual interpretation for one canonical species ID and one
explicit month. It does not infer the current month or caller location.

The result quality class is `DERIVED_SEASONALITY_CONTEXT`. It is not a forecast,
numeric score, probability, ranking, or recommendation.

## Context contract

The runtime keeps `SPAWNING`, `MIGRATION`, and `FISHERY_OCCURRENCE` separate.
When no context is requested, all three are returned as parallel results. No
overall seasonal grade or merged relation is produced.

Month-resolved spawning and migration evidence returns `MATCH` or `MISMATCH`
per evidence entry. Season-only or unresolved evidence returns
`MONTH_UNRESOLVED`. Multiple migration statements, including northward and
southward movement, remain independent and the context-level status is
`EVIDENCE_EVALUATED`; no evidence relation is selected as representative.
Cross-year month order is preserved.

## Fishery occurrence

Fishery occurrence uses `MONTHLY_RECORD_SERIES`. For the requested month, the
runtime returns each source year separately as `RECORDED`, `MISSING`, or
`NO_RECORD` with the original value and unit when present.

The runtime does not calculate averages, sums, extrema, trends, representative
values, or peak periods. A numeric value is only an official monthly catch
statistics record. It is not abundance, density, catchability, bite activity,
or fishing quality.

An explicit zero remains a `RECORDED` source value. A missing source row remains
`MISSING` with a null record. `NO_RECORD` and `MISSING` do not establish
biological absence.

## Limitations and lineage

Regulation, quota, fleet, effort, gear, landing-port, and closed-season
limitations are returned unchanged from the production artifact. In
particular, the webfoot octopus closed-season limitation does not describe
species absence.

Geographic and life-stage metadata is returned per evidence entry. National,
regional, adult, juvenile, and immature contexts are never generalized or
combined automatically.

Occurrence lineage remains:

`KOSIS -> research batch -> promotion review -> production seasonality artifact -> DERIVED_SEASONALITY_CONTEXT`

## API

`GET /api/fishing-condition/seasonality`

Required query parameters:

- `speciesId`: exact `BM-SPECIES-######` canonical ID
- `month`: integer from 1 through 12

Optional query parameter:

- `context`: `SPAWNING`, `MIGRATION`, or `FISHERY_OCCURRENCE`

Missing or invalid month input returns HTTP 400. Unknown canonical species
returns HTTP 404. Name lookup and fuzzy matching are not supported.

The route reads a bundled artifact only. It performs no persistence, database
or Supabase operation, analytics mutation, external request, or AI call.

# Seasonality Evidence Bundle Integration V1

## Purpose

This integration places environmental evidence and production seasonality
evidence beside each other in the existing read-only Condition Evidence Bundle.
It does not combine their relations or produce a cross-domain conclusion.

The existing route remains `POST /api/fishing-condition/evidence-bundle`. A
request without `contexts.month` returns the original bundle shape unchanged.
An integer month from 1 through 12 adds the new evidence domains. Invalid month
input returns HTTP 400 through the existing request validation contract.

## Domain separation

`environmentEvidence` contains only the existing temperature, salinity,
dissolved oxygen, activity, and habitat evidence. Its source, comparison,
explanation, status, freshness, and summary semantics are unchanged.

`seasonalityEvidence` is the unchanged result of the shared Seasonality Runtime
V1 service. It uses the quality class `DERIVED_SEASONALITY_CONTEXT` and keeps
`SPAWNING`, `MIGRATION`, and `FISHERY_OCCURRENCE` independent. The bundle keeps
its top-level `DERIVED_EVIDENCE_BUNDLE` quality class.

The legacy `evidence.seasonality` field remains in `evidence` for backward
compatibility. It compares the environment observation timestamp's month with
month-resolved Species Profile V2 facts. It is not copied into
`environmentEvidence` and must not be confused with the explicit-request-month
production artifact in `seasonalityEvidence`.

## Occurrence semantics

Fishery occurrence remains a `MONTHLY_RECORD_SERIES`. Requested-month records
are returned separately for each source year with their original values and
units. The integration calculates no average, sum, minimum, maximum, median,
trend, representative value, or peak period.

`RECORDED`, `MISSING`, `NO_RECORD`, and `UNSUPPORTED` remain technical source
states. An explicit numeric zero is a record. A missing source row remains a
null record and is not converted to zero. Neither missing nor no-record status
establishes biological absence.

## Limitations and lineage

Regulation, quota, fleet, effort, gear, closed-season, recreational omission,
regional, and life-stage limitations pass through unchanged. A closed-season
limitation does not state that the species is absent.

Environmental lineage remains:

`environment source -> DERIVED_COMPARISON -> DERIVED_EXPLANATION -> DERIVED_EVIDENCE_BUNDLE`

Seasonality lineage remains:

`KOSIS or species-profile evidence -> production seasonality artifact -> DERIVED_SEASONALITY_CONTEXT -> DERIVED_EVIDENCE_BUNDLE`

The server calls the shared `getSpeciesSeasonality` function directly. It does
not call one API route from another and does not read a research artifact.

## Technical summaries and boundaries

The original environmental summary is unchanged. `seasonalitySummary` reports
only available, unresolved, and unsupported context counts. These counts are
diagnostics, not votes, percentages, weights, or a combined assessment.

The integration performs no source fusion, majority logic, numeric scoring,
probability calculation, ordering, recommendation, database or Supabase write,
analytics mutation, external request, or AI call.

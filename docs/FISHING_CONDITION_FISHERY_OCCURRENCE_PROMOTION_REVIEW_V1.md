# Fishery Occurrence Promotion Review V1

## Purpose

This review determines whether the official monthly KOSIS records retained by Fishery Occurrence Deep Research Batch 1 can enter the production seasonality artifact as factual `FISHERY_OCCURRENCE` evidence. It does not connect the records to runtime services or infer fishing quality.

## Decision

`PROMOTE_BOTH`

고등어 and 주꾸미 satisfy the promotion criteria. Each has an exact canonical identity, an official source code, explicit monthly records, known metric and unit, reproducible source metadata, and documented effort and regulation limitations. 갈치 remains excluded because its KOSIS commercial category does not resolve the canonical taxonomy mismatch.

## Promotion Criteria

- Canonical identity must be `EXACT`.
- The source must be official and retain a stable source URL and metadata.
- Every retained value must identify its month, metric, unit, fishery, and geography.
- Missing rows and explicit numeric zero must remain different states.
- Effort, fleet, gear, landing-port, quota, and closed-season effects must remain limitations.
- Catch or landing records must never become abundance, catchability, catch probability, ranking, or advice.

## 고등어 Review

- Canonical identity: `Scomber japonicus`
- KOSIS product: 고등어, `110015`
- Identity: `EXACT`
- Records: 36 monthly rows, 2023-01 through 2025-12
- Metric: `CAPTURE_FISHERY_PRODUCTION_VOLUME`
- Unit: `METRIC_TON`
- Excluded labels: 망치고등어, 고등어류 aggregate, 해면양식업 고등어
- Decision: `PROMOTE_TO_PRODUCTION_OCCURRENCE`

The series retains `EFFORT_UNKNOWN`, fleet-composition, gear, regulation, and quota limitations. Lower monthly landings cannot be interpreted as biological absence.

## 주꾸미 Review

- Canonical identity: `Amphioctopus fangsiao`
- KOSIS product: 주꾸미, `140415`
- Identity: `EXACT`
- Records: 35 monthly rows across 2023-2025
- Missing row: `2023-08`
- Metric: `CAPTURE_FISHERY_PRODUCTION_VOLUME`
- Unit: `METRIC_TON`
- Decision: `PROMOTE_TO_PRODUCTION_OCCURRENCE`

The absent `2023-08` row remains missing and is not converted to zero. The nationwide 11 May through 31 August closed season, unknown effort, gear effects, landing-port bias, and omitted recreational catch remain explicit limitations.

## Production Semantics

Each promoted entry stores the complete year-month record series. It does not union positive months or compress the records into `startMonth` and `endMonth`. A retained row means only that the official source recorded capture-fishery production for that month. It does not mean that the species was abundant or easy to catch.

## Coverage

- Production fishery-occurrence coverage before review: 0/10
- Production fishery-occurrence coverage after review: 2/10
- Overall status: `SEASONALITY_PARTIALLY_READY`

The status does not become `READY` because runtime interpretation is not connected and other biological contexts remain unresolved or limited.

## Lineage

- Provider: KOSIS
- Table: `DT_1EW0004`
- Research artifact: `fishery-occurrence-batch1-v1`
- Promotion review: `Fishery Occurrence Promotion Review V1`

## Boundaries

No score, probability, normalization, weighting, ranking, recommendation, route, service, database write, Supabase change, or external AI call is part of this promotion.

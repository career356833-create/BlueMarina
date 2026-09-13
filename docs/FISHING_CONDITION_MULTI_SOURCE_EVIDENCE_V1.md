# Fishing Condition Multi-Source Evidence V1

## Purpose

This layer turns one explicit Source Alignment result into parallel source branches for one version 2 species profile. It preserves evidence by source and does not produce a combined environmental value or fishing decision.

## Processing order

`POST /api/fishing-condition/multi-source-evidence` validates a species ID and the complete explicit alignment request, runs Source Alignment once, and then builds one branch per returned source. It calls library services directly rather than calling application routes over HTTP.

## Branch modes

- `COMPARABLE`: RISA or FEMO data that fits the existing Comparator depth and variable contract.
- `CONTEXT_ONLY`: available KMA observation, KMA forecast, or KHOA ROMS context, and RISA/FEMO inputs whose depth contract cannot be projected safely.
- `UNAVAILABLE`: a source-level alignment failure.

## Existing evidence pipeline

Each comparable branch independently reuses Comparator, deterministic Explanation, and Condition Evidence Bundle V1. RISA supports temperature. FEMO supports temperature and documented dissolved oxygen; salinity stays blocked when its unit is unverified. No branch uses values from another branch.

## Context-only boundary

KMA waves, wind, temperature, pressure and forecast visibility remain contextual because the species Comparator has no approved contract for them. ROMS speed, raw direction, and model temperature also remain contextual. Model temperature is not silently treated as an observation.

## Spatial, temporal and depth metadata

Every branch retains the alignment distance, source timestamp semantic, timezone, signed and absolute offsets, freshness, depth context, and depth-match status. The orchestrator does not select the closest station, time, or depth and does not reconcile depth across sources.

## Lineage

Comparable lineage is source, Source Alignment, Comparison, Explanation, Evidence Bundle, and Multi-Source Evidence. Context-only lineage skips comparison products. Source limitations are copied without removal, including unverified FEMO salinity units and limited ROMS direction semantics.

## Failure isolation

An unavailable source becomes an `UNAVAILABLE` branch while other branches remain usable. Technical summary fields count branches only. They do not vote or form a conclusion.

## Hard boundaries

V1 performs no averaging, interpolation, weighting, gap filling, representative-value selection, source preference, or majority logic. It returns no score, probability, ranking, recommendation, or overall condition. It performs no database write and makes no AI call.

## Future policy phase

Any future comparison support for KMA or ROMS requires a separate approved scientific mapping policy. Source ordering, preference, and cross-source reconciliation remain outside this contract.

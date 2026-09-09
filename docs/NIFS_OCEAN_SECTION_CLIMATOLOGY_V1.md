# NIFS Ocean Section Monthly Depth Climatology V1

## Purpose

This feature turns the NIFS serial ocean observation source (`nifs-soo`) into a reproducible monthly historical water-temperature baseline. It is an environmental derived feature, not a fishing score, probability, ranking, recommendation, or species suitability model.

## Historical window

V1 uses the latest ten complete calendar years, 2016 through 2025. Ten complete years were selected to balance station continuity, bounded upstream request volume, and relevance to the current climate period. The builder requests one calendar year at a time because the NIFS source accepts a maximum one-year window.

The fetch policy is sequential with a 250 ms delay, a 30-second request timeout, an 8 MB offline response cap, a 25,000-row annual cap, and no automatic retry. A future phase may expand toward the full historical record after continuity and operating-cost review.

## Source lineage

- provider: `NIFS`
- source: `nifs-soo`
- derived source: `nifs-soo-climatology`
- source class: `HISTORICAL_OCEANOGRAPHIC_PROFILE`
- derived quality class: `DERIVED_HISTORICAL_BASELINE`

The build reuses the existing NIFS ocean-section parser, exact composite station identity, profile grouping, timestamp parsing, depth-zero handling, duplicate controls, and raw QC preservation. Raw official response bodies are not persisted by this builder.

## Cell identity

Each V1 cell is keyed by:

```text
stationId + calendarMonth + exact source depth value
```

Stations are never merged by name or geographic proximity. Ended and current stations remain separate when their exact composite IDs differ. Source depths are not converted into surface/middle/bottom bins, and depth `0` remains a valid exact source value.

The contract calls this field `depthValue`, not `depthM`, because NIFS does not document the unit in the verified source contract. Both `depthUnit` and the water-temperature `unit` remain `UNIT_NOT_DOCUMENTED`.

## Metrics and availability

The public V1 baseline includes water temperature only. Every available cell contains:

- mean
- median
- minimum and maximum
- sample standard deviation using `n - 1`
- sample count
- distinct year count
- actual first and last contributing year
- raw QC-code distribution

The minimum sample gate is three distinct observation events. Candidate cells below that threshold are excluded rather than returned with unstable metrics. Salinity and dissolved oxygen are not emitted in V1 because their units also remain undocumented.

## QC limitation

No QC-code filtering is applied. The official meaning of the observed NIFS QC codes has not been verified, so V1 does not assume that any one code means valid or invalid. Numeric source values are included after exact duplicate control, and raw QC distributions are retained in both cells and the quality report.

## Artifact and reproducibility

The generated artifact is stored at:

```text
data/nifs/fishing-condition/ocean-section/climatology/v1
```

It contains one NDJSON file per calendar month and a JSON manifest with per-file and aggregate SHA-256 checksums. Month chunking keeps runtime reads bounded. Rebuild with:

```bash
npm run build:nifs-soo-climatology
```

The builder reads `NIFS_SOO_API_KEY` from the local ignored environment only and never writes the key or authenticated URL to artifacts or reports. Build evidence is stored in `reports/nifs/ocean-section-climatology-quality-v1.json`.

## Runtime route

```text
GET /api/fishing-condition/climatology/ocean-section
```

Optional filters are `stationId`, `month`, `depth`, and `limit`. The default limit is 200 and the maximum is 500. The route reads only the checked artifact, verifies all checksums, and does not call NIFS or Supabase. Responses use a 24-hour shared cache with a seven-day stale-while-revalidate window.

## Temperature anomaly gate

The pure anomaly formula is:

```text
current temperature - climatology mean
```

Runtime anomaly is currently blocked. It may be enabled only when all three conditions are verified:

1. An official exact `nifs-risa` to `nifs-soo` station crosswalk exists.
2. The RISA surface/middle/bottom layer has an official exact-depth mapping to the SOO source depth.
3. Both temperature units are officially documented as compatible.

No official crosswalk was found, no exact depth mapping was found, and the SOO temperature unit remains undocumented. Name matching, nearest-neighbor mapping, and an assumed `surface = 0` conversion are prohibited. Therefore no anomaly route is exposed and `DERIVED_ENVIRONMENT_FEATURE` remains `ANOMALY_MAPPING_BLOCKED`.

## Boundaries and future work

V1 performs no database or Supabase writes. It does not interpret an anomaly as good or bad fishing conditions and does not combine the baseline with species preference data. Full-history expansion, verified station/depth/unit crosswalks, and any future species model require separate review.

# Fishing Condition Scoring Readiness Audit V1

## Purpose and decision

This audit asks whether the current evidence, Comparator relations, Source Policy gates, and field interpretations can support a future numeric experiment. It does not implement a numeric result, coefficients, normalization, probability, ordering, advice, or an overall fishing decision.

Decision: `READY_FOR_LIMITED_SINGLE_FIELD_EXPERIMENT`.

Only the Korean MBRIS preferred-temperature range for mackerel satisfies the strict field-candidate contract. Six other temperature profiles and one dissolved-oxygen profile are limited by evidence context or source class. Every other variable is blocked, context-only, baseline-only, categorical without an approved numeric meaning, or insufficiently supported. This decision does not authorize a production or user-facing numeric feature.

## Readiness definition

A strict candidate needs an existing Comparator relation, an interpretable Suitability Rule result, comparison-permitting Source Policy, passable mandatory gates, a documented unit, numeric source and profile values, profile evidence references, deterministic relation semantics, and no field conflict. `LIMITED_CANDIDATE` means the mechanics exist but the evidence context or source class prevents unrestricted use. The readiness labels describe data preparedness only.

## Current engine state

- Species Environment Profile V2 contains 10 canonical species.
- Temperature profile and Comparator coverage is 9/10.
- Salinity profile coverage is 5/10, but runtime comparison remains 0 because FEMO's unit is undocumented.
- Dissolved-oxygen profile coverage is 3/10, but only one profile has an mg/L Comparator threshold.
- Month-comparable seasonality is 6/10; activity profile coverage is 4/10.
- Source Policy has 25 source-variable entries across 12 variables and 8 sources.
- Suitability Rule V1 remains field-level relation interpretation only.

## Species matrix

| Species | Temperature | Salinity | Dissolved oxygen | Seasonality | Activity | Strict | Limited | Blocked | Audit status |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 참돔 | LIMITED_CANDIDATE | BLOCKED | INSUFFICIENT_EVIDENCE | NOT_READY | INSUFFICIENT_EVIDENCE | 0 | 1 | 2 | PARTIAL |
| 감성돔 | LIMITED_CANDIDATE | BLOCKED | INSUFFICIENT_EVIDENCE | NOT_READY | INSUFFICIENT_EVIDENCE | 0 | 1 | 2 | PARTIAL |
| 농어 | LIMITED_CANDIDATE | BLOCKED | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE | 0 | 1 | 2 | PARTIAL |
| 조피볼락 | LIMITED_CANDIDATE | BLOCKED | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE | NOT_READY | 0 | 1 | 2 | PARTIAL |
| 넙치 | LIMITED_CANDIDATE | BLOCKED | INSUFFICIENT_EVIDENCE | NOT_READY | INSUFFICIENT_EVIDENCE | 0 | 1 | 2 | PARTIAL |
| 갈치 | INSUFFICIENT_EVIDENCE | BLOCKED | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE | NOT_READY | 0 | 0 | 2 | NOT_READY |
| 고등어 | SCORING_CANDIDATE | BLOCKED | INSUFFICIENT_EVIDENCE | NOT_READY | NOT_READY | 1 | 0 | 2 | READY_FOR_SINGLE_FIELD_EXPERIMENT |
| 방어 | NOT_READY | BLOCKED | LIMITED_CANDIDATE | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE | 0 | 1 | 1 | PARTIAL |
| 주꾸미 | NOT_READY | BLOCKED | INSUFFICIENT_EVIDENCE | NOT_READY | NOT_READY | 0 | 0 | 2 | NOT_READY |
| 문어 | LIMITED_CANDIDATE | BLOCKED | INSUFFICIENT_EVIDENCE | NOT_READY | INSUFFICIENT_EVIDENCE | 0 | 1 | 2 | PARTIAL |

`Blocked` counts runtime-gated salinity and dissolved-oxygen fields in this audit surface; it is not a species quality label.

## Variable matrix

| Variable | Coverage | Runtime source/policy | Comparator | Readiness | Main limitation |
| --- | ---: | --- | ---: | --- | --- |
| Temperature | 9/10 | RISA allowed; FEMO limited | 9 | LIMITED_CANDIDATE | Evidence contexts are not equivalent |
| Salinity | 5/10 | FEMO blocked | 0 | BLOCKED | Source unit undocumented |
| Dissolved oxygen | 3/10 | FEMO limited | 1 | LIMITED_CANDIDATE | Sparse coverage and aquaculture threshold |
| Seasonality | 6/10 month-comparable | Profile context | 6 | NOT_READY | Context-specific categorical relations |
| Activity | 4/10 | No runtime environment comparator | 0 | NOT_READY | Explicit time context required |
| Habitat | 0 direct contract | Context only | 0 | CONTEXT_ONLY | No environment-side comparison |
| Wave | 0 species profiles | KMA context only | 0 | CONTEXT_ONLY | Operational context only |
| Wind | 0 species profiles | KMA context only | 0 | CONTEXT_ONLY | Operational context only |
| Pressure | 0 species profiles | KMA context only | 0 | CONTEXT_ONLY | Operational context only |
| Current speed | 0 species profiles | ROMS model context | 0 | CONTEXT_ONLY | Model is not observation |
| Current direction | 0 species profiles | ROMS blocked | 0 | BLOCKED | Direction convention unconfirmed |
| Tide | 0 species profiles | Prediction context only | 0 | CONTEXT_ONLY | No species-specific preference |
| Climatology anomaly | 0 approved mappings | SOO baseline only | 0 | BASELINE_ONLY | RISA-SOO anomaly mapping blocked |

## Evidence-type mismatch

Five fish profiles use FishBase AquaMaps modelled preferred-temperature ranges. They are not Korean field observations. Mackerel also has a narrower Korea-specific MBRIS preferred range, which remains canonical. Amberjack temperature and its one Comparator-ready dissolved-oxygen threshold are aquaculture conditions; the latter is a behavioural-abnormality threshold rather than a wild minimum. Webfoot octopus data are captive rearing conditions. Giant Pacific octopus has a wild observed range, but it is immature life-stage evidence from another region. These sources cannot share one unqualified interpretation.

Preferred and observed ranges also have different meanings. Distance outside a preferred range cannot be assumed equivalent to distance outside an occurrence range. AquaMaps, aquaculture, captive husbandry, and wild occurrence values require separate validation before any common transformation.

## Coverage imbalance and missing-data bias

Temperature covers nine species, dissolved oxygen has one comparable profile, and salinity has no runtime comparison. A composite using a common denominator would penalize species for missing research rather than environmental mismatch. A denominator that changes by species would instead make outputs incomparable. Neither treatment is approved.

Fresh RISA observations, periodic FEMO samples, KMA forecasts, ROMS model output, and SOO history also have incompatible source semantics. Stale and unavailable states currently carry categorical limitations; no validated numeric treatment exists. Mixing those classes would hide provenance and freshness differences.

## Weighting and normalization readiness

`WEIGHTING_NOT_READY`: reviewed evidence does not establish relative importance among temperature, dissolved oxygen, seasonality, and operational weather. No coefficients are justified.

`NORMALIZATION_NOT_READY`: profile ranges have different widths and meanings; range-distance has no approved biological interpretation; MATCH/MISMATCH is categorical; and limited or stale inputs have no approved numeric treatment. A 0-100 transformation is therefore not supported.

## Domain separation for future review

Future design should keep four domains separate: species-environment match, operational sea condition, seasonal context, and historical context. Weather safety or operational comfort must not be presented as species preference, and historical baselines must not replace current observations.

## Minimum safe experiment

The narrowest defensible research candidate is an offline, temperature-only relation-distance experiment for mackerel (`BM-SPECIES-000417`) using its Korea-specific preferred range and explicit RISA binding. It remains one-species research only, has no shared normalization, produces no composite result, and is not user-facing.

Before any numeric implementation, obtain comparable Korean wild preferred-temperature evidence for more species and approve a scientifically validated normalization contract. Salinity also requires an official FEMO unit contract; dissolved oxygen requires broader wild species thresholds; and source-class/freshness handling requires validation.

## Reproducibility

Run `node tools/fishing-condition/audit-scoring-readiness.cjs`. The tool reads the three immutable input artifacts, records their SHA-256 values, and writes `reports/fishing-condition/scoring-readiness-audit-v1.json`. It creates no production route and performs no network, AI, database, or Supabase operation.

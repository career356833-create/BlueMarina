# Fishing Condition Seasonality Evidence Interpretation V1

## Purpose

This derived index makes the existing Species Environment Profile V2 seasonality evidence queryable by an explicit month. It adds no biological claim and does not modify V2 or the inactive V3 research artifact.

## Contexts

- `SPAWNING` means a source-described spawning period. It does not imply catch availability.
- `MIGRATION` means a source-described movement period. It does not guarantee presence in an unspecified place or imply catch availability.
- `FISHERY_OCCURRENCE` means a source-described fishery landing or occurrence period. It does not mean that fishing conditions are good.

No additional context is created when the source profile has no corresponding evidence.

## Relation Semantics

`MATCH` means only that the explicit requested month is included in one evidence entry for the requested context. `MISMATCH` means only that it is outside that one entry. Neither relation is a grade, recommendation, abundance estimate, or catch probability. The evaluator returns each evidence result independently and emits no overall seasonality result.

## Precision And Year Boundaries

Month arrays retain source order. A period such as December through February is `[12, 1, 2]`, with `startMonth=12`, `endMonth=2`, and `crossesYearBoundary=true`. Season-only phrases remain `SEASON_ONLY`; they are never converted to invented months. Evidence without month or season precision remains `MONTH_UNRESOLVED`.

The mackerel source statement contains two directional periods in one V2 fact. The derived index preserves them separately as northward movement in February-March and southward movement in September-January, with the original combined month array retained in `sourceContext.originalMonths`.

## Region And Life Stage

Every entry retains `geographicContext` and `lifeStage`. Evidence outside the exact requested geography carries `REGIONAL_LIMITATION`; V1 performs no nearest-region or nationwide mapping. A specific adult, juvenile, or immature stage is retained as a life-stage limitation and is not generalized to all life stages.

## Multiple Sources And Conflicts

Multiple entries are not unioned, intersected, averaged, or collapsed. Each keeps its own months, source type, evidence references, region, life stage, and limitations. Material disagreement between equivalent sources must remain separate and be marked `CONFLICT_REVIEW_REQUIRED`; V1 creates no compromise period. No seasonality-specific conflict exists in the current ten profiles.

## Deterministic Explanations

Explanations state the source period and whether the requested month is inside it. Spawning text explicitly says that spawning timing does not imply catch availability. Migration text does not infer local presence. Fishery occurrence text uses concentration language only when a source directly supports it.

## No-Score Boundary

This artifact has quality class `DERIVED_SEASONALITY_INTERPRETATION`. It does not calculate a numeric value, normalization, weighting, probability, ranking, recommendation, or overall seasonal grade. It is factual evidence context for later product explanation only.

## Current Readiness

The decision is `SEASONALITY_PARTIALLY_READY`: six of ten species have month-resolved evidence, while fishery-occurrence coverage is absent and multiple records remain season-only, region-limited, life-stage-limited, or month-unresolved.

# Fishing Condition Temperature Relation-Distance Experiment V1

## Purpose and boundary

This is an offline, single-species, single-field research experiment. It measures only the mathematical distance between one observed water temperature and the boundary of one documented temperature range. It does not estimate fishing quality, suitability, catch probability, or advice.

Only mackerel (`BM-SPECIES-000417`) is included because Scoring Readiness Audit V1 identified its temperature field as the sole strict candidate. The environment input is limited to the explicitly bound NIFS RISA source. No nearest-station lookup, source fallback, additional species, or additional variable is used.

## Profile source and context

Species Environment Profile V2 provides a canonical preferred range of `15–16 degC` for mackerel. Its context is `PREFERRED_TEMPERATURE`, its region is Korea, and its evidence reference is `mackerel-mbris`. This is a preferred range, not an observed occurrence range, model output, physiological tolerance, aquaculture condition, or proven response curve.

The source-backed example uses the existing comparator quality artifact's explicitly bound RISA surface observation of `25.5 degC`. Synthetic boundary cases are clearly marked and are not presented as observations.

## Raw measurements

For value `v` and range `[min, max]`:

- Signed distance: `v - min` below the range, `0` inside the inclusive range, and `v - max` above it.
- Absolute distance: the absolute value of the signed distance.
- Range width: `max - min`; descriptive metadata only.
- Research normalized distance: `absolute distance / range width`; research output only.

The sign agrees with the existing comparator contract: negative is `BELOW_RANGE`, zero is `WITHIN_RANGE`, and positive is `ABOVE_RANGE`.

## Mathematical findings

The raw signed and absolute distances are mathematically well-defined. Exact boundaries and interior values have zero distance. The sign retains direction, while the absolute value retains only distance to the nearest boundary. Results are deterministic and are not clamped.

For this profile the width is only `1 degC`, so dividing by width produces the same numeric magnitude as absolute distance. A narrow evidence interval can therefore produce a large ratio without adding biological meaning.

## Scientific limitations

Range width has not been established as biological tolerance. Equal distances below and above the range do not imply equal biological effects, and twice the distance does not imply twice the effect. Preferred, observed, modelled, and captive ranges are not interchangeable. One species and one preferred range cannot establish a common scale across species.

No threshold, grade, clamp, linear penalty, sigmoid, logistic function, Gaussian curve, bell curve, or triangular membership function is introduced.

## Decisions

- Mathematically valid: raw signed distance, absolute distance, inclusive boundary relation, and descriptive range width.
- Scientifically unsupported: symmetric effect, linear penalty, cross-species comparability, and treating range width as tolerance.
- Production prohibited: user-facing numeric assessment, weighting, composite output, probability, ranking, or recommendation.
- Research normalization decision: `NORMALIZATION_NOT_JUSTIFIED`.
- Production decision: `PRODUCTION_SCORE_NOT_APPROVED`.

The next research question is whether multiple comparable Korean wild preferred-temperature datasets can support an independently validated biological distance interpretation. This experiment does not answer or implement that question.

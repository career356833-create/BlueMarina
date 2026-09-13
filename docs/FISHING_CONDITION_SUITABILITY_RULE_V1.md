# Fishing Condition Suitability Rule V1

## Purpose

Despite its public name, Suitability Rule V1 means only `FIELD_RELATION_INTERPRETATION`. It translates an existing Comparator relation plus Source Policy, gate, freshness, depth, and evidence context into machine-readable field metadata. It does not decide whether fishing conditions are suitable and does not produce a composite decision.

The canonical matrix is `data/fishing-condition/suitability-rule/v1/suitability-rules.json`; the deterministic service is `src/lib/fishing-condition/suitability-rule.ts`.

## Relation preservation

The service never recalculates Comparator output. `WITHIN_RANGE`, `BELOW_RANGE`, `ABOVE_RANGE`, `MATCH`, and `MISMATCH` map to corresponding interpretation states only after policy and mandatory gates permit interpretation. A periodic source or stale observation returns `LIMITED_INTERPRETATION` while preserving the original relation. Policy-blocked, gate-blocked, context-only, baseline-only, unsupported, missing, and unavailable outcomes return no relation because no field interpretation is authorized.

## Policy and gate priority

The handling order is: unavailable source; explicitly blocked policy; failed gate; unsupported source/profile; context-only or baseline-only use; missing activity context; limited interpretation; relation-based interpretation. This is constraint handling order, not a ranking.

A policy entry configured as `BLOCKED` becomes `BLOCKED_BY_POLICY`. A comparison-capable policy whose effective action became blocked because a required gate failed becomes `BLOCKED_BY_GATE`. Unsupported species profile or environment contracts become `UNSUPPORTED`. Interpretable relations require at least one profile evidence reference.

## Freshness, depth, and units

- `fresh` permits normal interpretation when all other requirements pass.
- `stale` preserves the Comparator relation but limits its interpretation.
- `unavailable` produces `UNAVAILABLE`.
- `EXACT` and `CATEGORY_MATCH` satisfy depth-dependent rules.
- `UNRESOLVED` blocks a rule that requires `DEPTH_COMPATIBLE`.
- Surface context is never converted to zero metres.
- A missing or unverified mandatory unit blocks the field rule.
- An unresolved timezone limits only a time-dependent rule whose contract requires it; it does not globally invalidate unrelated measurements.

## Variable behavior

Temperature supports range relation interpretation for approved RISA and FEMO inputs. FEMO dissolved oxygen remains periodic and limited. FEMO salinity remains policy-blocked because its unit is undocumented. Seasonality keeps spawning, migration, and fishery-occurrence contexts separate. Activity requires explicit time-of-day context and performs no sunrise or sunset calculation. Habitat, KMA weather, ROMS speed, and tide remain context only. SOO and climatology remain baseline only. ROMS direction remains blocked until its directional convention is confirmed.

## Hard boundaries

V1 has no favorable or unfavorable semantics, aggregate status, numeric assessment, probability, species/source/place ordering, or fishing advice. It performs no fallback, averaging, interpolation, or weighting. It calls no AI and writes no database data.

## Future decision prerequisites

Any later decision layer requires separate approval of scientific applicability, validation data, uncertainty treatment, source compatibility, and domain-specific decision semantics. This rule layer is evidence-preserving groundwork only.

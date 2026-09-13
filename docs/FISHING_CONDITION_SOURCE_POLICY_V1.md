# Fishing Condition Source Policy V1

## Purpose

Source Policy defines which source-variable pairs may enter an existing comparison and which pairs are context, baseline, blocked, or unsupported. It does not select a source, calculate a value, or make a fishing decision. The canonical machine-readable matrix is `data/fishing-condition/source-policy/v1/source-policy.json`.

## Source classes

- `OBSERVED` may provide current context and may enter comparison only where an explicit variable policy permits it.
- `OBSERVED_PERIODIC_ENVIRONMENT` retains sampling time and freshness limitations; it is not equivalent to continuous observation.
- `FORECAST` is future context only and never replaces an observation.
- `MODEL` is model context only and is never presented as observed data.
- `HISTORICAL` and `HISTORICAL_OCEANOGRAPHIC_PROFILE` are baseline or research inputs, not current conditions.
- `DERIVED_HISTORICAL_BASELINE` is baseline only and requires separate station, depth, and unit gates before anomaly use.
- `PREDICTION` is prediction context only and is not an observed water depth.

These classes are semantic labels, not numeric weights or an ordering.

## Actions

- `COMPARISON_ALLOWED`: the source-variable pair may enter the existing Comparator after every required gate passes.
- `COMPARISON_ALLOWED_WITH_LIMITS`: comparison is permitted after its gates pass, with all listed limitations retained.
- `CONTEXT_ONLY`: display or evidence context only; no species comparison.
- `BASELINE_ONLY`: historical or derived baseline use only; never substitutes for a current value.
- `BLOCKED`: runtime comparison or directional use is prohibited.
- `UNSUPPORTED`: the source-variable pair is absent from the approved V1 matrix.

## Variable matrix

| Variable | Source | Action | Core restriction |
| --- | --- | --- | --- |
| temperature | NIFS RISA | COMPARISON_ALLOWED | Explicit station, depth, time, unit, and species support |
| temperature | NIFS FEMO | COMPARISON_ALLOWED_WITH_LIMITS | Periodic sample and freshness disclosed |
| temperature | KMA observation / forecast | CONTEXT_ONLY | Weather context does not enter species comparison |
| temperature | KHOA ROMS | CONTEXT_ONLY | Model value is not an observation |
| temperature | NIFS SOO / climatology | BASELINE_ONLY | Never replaces current environment |
| salinity | NIFS FEMO | BLOCKED | Source unit remains `UNIT_UNVERIFIED` |
| salinity | NIFS SOO | BASELINE_ONLY | Historical research context only |
| dissolvedOxygen | NIFS FEMO | COMPARISON_ALLOWED_WITH_LIMITS | Requires documented unit and species profile support |
| chlorophyllA | NIFS FEMO | CONTEXT_ONLY | No species preference contract exists |
| waveHeight / windSpeed / windDirection / pressure | KMA | CONTEXT_ONLY | No species comparison contract exists |
| currentSpeed | KHOA ROMS | CONTEXT_ONLY | Routing, ETA, and drift use prohibited |
| currentDirection | KHOA ROMS | BLOCKED | TO/FROM convention is not confirmed; raw context only |
| tide | KHOA prediction | CONTEXT_ONLY | No actual-depth calculation or bathymetry auto-combination |
| historicalTemperatureBaseline | NIFS SOO / climatology | BASELINE_ONLY | Anomaly mapping remains blocked until every mapping gate passes |

## Gates

V1 reports `UNIT_CONFIRMED`, `SPECIES_PROFILE_SUPPORTED`, `DEPTH_COMPATIBLE`, `STATION_MAPPED`, `TIME_SEMANTIC_KNOWN`, `DIRECTION_CONVENTION_CONFIRMED`, `FRESHNESS_ACCEPTABLE`, and `ANOMALY_MAPPING_AVAILABLE`. A missing required gate blocks comparison-capable actions. Context and baseline actions remain context or baseline while disclosing failed gates; they are never promoted automatically.

## Runtime integration

Multi-Source Evidence evaluates every policy entry associated with each aligned branch and returns the evaluations as branch metadata. It checks the temperature policy before invoking the existing RISA/FEMO Comparator path. It does not remove branches, choose a source, or force a context-only source into Comparator. The existing FEMO salinity result remains `UNIT_UNVERIFIED`, dissolved oxygen remains profile-gated and limited, and temperature retains existing semantics.

## Hard boundaries

There is no automatic fallback when a source is unavailable. Sources never overwrite or average one another. There is no interpolation, gap filling, weighting, source ordering, representative value, score, probability, ranking, or recommendation. Tide is not combined automatically with bathymetry. Climatology does not produce an anomaly until official station mapping, exact depth mapping, and unit compatibility are verified.

## Future scoring prerequisites

Any future decision or scoring phase requires a separately approved scientific contract for variable applicability, source uncertainty, spatial and temporal validity, directional convention, and validation outcomes. V1 supplies none of those decisions.

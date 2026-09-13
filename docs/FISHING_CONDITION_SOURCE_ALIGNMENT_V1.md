# Fishing Condition Source Alignment V1

## Purpose

Source Alignment places independently normalized marine observations, forecasts, and model values beside one explicit target. It does not combine them into a representative value or make a fishing decision.

## Explicit bindings

`POST /api/fishing-condition/source-alignment` requires target latitude, longitude, requested timestamp, depth context, and at least one source binding. RISA and KMA observations require a station ID, FEMO requires a site ID, KMA forecast requires a `Lzone:Szone` zone ID plus explicit issue/valid times, and ROMS requires an exact point plus explicit valid time. The production implementation does not discover or select a nearest source or time.

## Spatial metadata

Point sources retain their source coordinates and a Haversine distance to the target. Distance is metadata only. No validity threshold or representative-area inference is applied. Zone forecasts disclose that they do not have a point coordinate.

## Temporal metadata

Each source retains its own semantic: `OBSERVED_AT`, `SAMPLED_AT`, `FORECAST_AT`, `MODEL_VALID_AT`, or `UNKNOWN`. Signed and absolute offsets are calculated only when the source timezone is documented. NIFS timestamps and ROMS model time remain unresolved where their source contract does not document timezone or semantics.

## Depth alignment

RISA categories and FEMO surface/bottom values are selected only for an explicit matching category. Exact-depth targets are not converted to a category. `SURFACE` is never represented as zero metres. Sources without a depth dimension return `NOT_APPLICABLE`.

## Units and source classes

Values stay in per-source namespaces and retain source units. V1 performs no conversion. FEMO salinity and any other undocumented units remain `UNVERIFIED`. Source classes remain `OBSERVED`, `OBSERVED_PERIODIC_ENVIRONMENT`, `FORECAST`, or `MODEL`; these labels are not weights.

## Partial failure

An upstream or explicit-binding failure becomes an `UNAVAILABLE` result for that source. Other requested sources continue and the route returns HTTP 200. Invalid request structure returns HTTP 400.

## Hard boundaries

V1 performs no averaging, interpolation, gap filling, source preference, or weighting. It does not invoke Comparator or Evidence Bundle, and it does not emit a score, probability, ranking, or recommendation.

## Future phase

Automatic source discovery may be designed separately only after scientific distance, temporal, and depth applicability policies are approved. It is intentionally outside V1.

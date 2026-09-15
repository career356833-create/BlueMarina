# Fishing Condition Read Model V1

## Purpose

Fishing Condition Read Model V1 is a deterministic UI projection over the verified Evidence Bundle. It lets a product UI render environmental observations, seasonality evidence, source provenance, limitations, and freshness without interpreting internal engine contracts. It is not a new biological inference engine.

## Service and route

- Pure transformer: `buildFishingConditionReadModel(bundle)`
- Server composition: Evidence Bundle service to read-model transformer
- Read-only route: `POST /api/fishing-condition/read-model`
- Request contract: the existing Evidence Bundle request, including optional `contexts.month`
- Quality class: `DERIVED_FISHING_CONDITION_READ_MODEL`

The service calls the Evidence Bundle function directly. It does not perform route-to-route HTTP, database access, persistence, or external AI calls. The existing Evidence Bundle route and response remain unchanged.

## Source contracts

The projection consumes only values already present in the Evidence Bundle and Seasonality Runtime result. It does not select a source, calculate a new range or relation, merge evidence across domains, or fill a missing value.

Environment and seasonality lineage remain separate:

- Environment: source to comparison to explanation to evidence bundle
- Seasonality: source evidence to production artifact to runtime context to read model

## UI projection contract

The result contains:

- `species`: canonical identity supplied by the bundle
- `requestContext`: month, source, station/site, depth, and time-of-day request fields
- `environment`: five fixed display cards
- `seasonality`: independent spawning, migration, and fishery-occurrence sections
- `sources`: display-ready source references with their original lineage
- `limitations`: exact-string deduplicated limitations
- `freshness`: original freshness state plus a short display label
- `quality`: evidence-bundle and seasonality quality classes

## Environment cards

The fixed UI order is temperature, salinity, dissolved oxygen, activity, and habitat. This is presentation order, not importance ordering.

Each card retains its raw value, status, relation, explanation, profile reference, evidence references, source lineage, freshness, and limitations. Temperature relation labels are factual: within the stated range, below the stated range, or above the stated range. They do not express suitability or an overall condition.

An unverified salinity unit exposes the safe raw value without appending a presumed unit or creating a relation. Dissolved-oxygen limited, blocked, missing, and unsupported states remain distinct.

## Seasonality sections

Spawning, migration, and fishery occurrence are independent sections. Spawning and migration relations are copied from Seasonality Runtime. Northward and southward migration entries remain separate cards, including cross-year ordering, region, life stage, and limitations.

When no month is requested, the read model marks these sections `NOT_REQUESTED`; it does not run a new month interpretation.

## Occurrence series and missing semantics

Fishery occurrence remains `MONTHLY_RECORD_SERIES`. The read model projects only the requested month's yearly source rows and keeps each year independent. It calculates no average, total, trend, representative value, or preferred month.

A `MISSING` source period is displayed as `원자료 행 없음` with a null value. It never becomes zero and does not mean no catch, no individuals, abundance, catchability, or probability.

## Source panel

The source panel exposes the supplied provider or source type, source identity, quality class, observed or retrieved timestamp, safe URL/reference when present, and original lineage. The projection does not choose between sources or assign source priority.

## Limitations panel

Limitations from all projected cards remain visible. Exact duplicate strings are removed, but different limitations are not summarized into a broader statement. Regulation, closed-season, fishing-effort, geographic, life-stage, freshness, and unit limitations therefore remain independently inspectable.

## Freshness

The source state remains `fresh`, `stale`, or `unavailable`. Korean labels are display-only. A stale source is not interpreted as a poor environmental condition.

## No-score boundary

The read model creates no numerical evaluation, probability, ranking, source preference, species/spot advice, best season, best month, or overall good/bad conclusion. It performs no cross-domain combination between environmental relations and biological or occurrence evidence.

## Error model

The route preserves upstream errors while mapping profile-not-found to `UNKNOWN_SPECIES`, environment-location-not-found to `MISSING_ENVIRONMENT`, and disabled/missing source credentials to `UNSUPPORTED_SOURCE`. Invalid requests remain HTTP 400. These mappings are transport-facing labels, not scientific interpretations.

## Future UI integration

Future UI work can render the cards and panels directly. It must continue to show source and limitation context, preserve missing values, and avoid producing a combined condition grade, probability, ranking, or recommendation from this read model.

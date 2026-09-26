# Fishing Condition live safety cleanup V1

**Decision: `CONDITIONS_LIVE_SAFETY_CLEANUP_COMPLETE_WITH_LIMITATIONS`.** Phase A readiness evidence was committed at `e4440ab1101dc5afbe1094f139eac309d88292d5`. This phase changes the Conditions read-model presentation and local cache behavior. Neither NIFS source flag nor credential was set in Preview or Production.

## Factual read-model

`/api/fishing-condition/read-model` no longer routes the older 10 species through `runConditionEvidenceBundle` and its numeric comparator. The reviewed 38 profiles use the same path. The response separates `profileContext` (reviewed reference evidence), `observationContext` (explicit source, station/site, depth, source timestamp, timezone limitation, fetch time and cache status), `seasonalityContext` (static source-backed month evidence), `sourceStatus` and limitations. Existing seasonality and original profile artifacts remain unchanged. Observed temperature, salinity and oxygen fields have no automatic relation or verdict. Salinity's undocumented unit is shown explicitly and is not compared numerically.

Nine of the older 10 IDs overlap the reviewed 38-profile registry. `BM-SPECIES-000444` (갈치) is the exception. Its historical evidence is projected conservatively by ID as a limited factual profile, without adding it to the reviewed 38 registry or changing its underlying record. The selector therefore remains **38**, while this legacy ID remains supported by the read-model. This is a coverage limitation rather than a silent ID deletion.

The static and observed paths share source statuses: `AVAILABLE`, `DISABLED`, `ERROR`, `STALE`, and `UNKNOWN`, with a reason. A disabled source or missing key does not make a valid species read-model unavailable; it returns HTTP 200 `PARTIAL` with static profile and available seasonality. Timeout and generic upstream errors do the same. Invalid location and malformed upstream contracts remain errors. The observation-only routes continue to return explicit 503 when disabled.

The Conditions UI labels current observations and species reference evidence separately, gives the selected station and depth, shows the original source timestamp without asserting a timezone, and distinguishes fetch time from observation time. It warns for stale observations. It does not display a score, probability, recommendation or suitability verdict. Historic explicit `/compare`, `/explain` and `/evidence-bundle` research routes are separate from this page and remain available; they were not converted or promoted as part of this cleanup. They must not be used as the Production live-source activation path.

## Source and cache policy

RISA remains the first *future* activation candidate. Its source-provided timestamp timezone is undocumented, so `TIMEZONE_NOT_DOCUMENTED` remains. The exact station and depth are user-selected; a Fishing Spot is not inferred to be an observation station. The source adapter retains station identity, observed temperature, original timestamp, source metadata and a 10-minute per-instance cache, with a two-hour stale fallback. Simultaneous cold calls on the **same instance** now share one in-flight load (two NIFS endpoints total). Cache responses distinguish `fresh_fetch`, `cache_hit`, and `stale_fallback`; `lastSuccessfulFetchAt` is separate from observation time. No cross-instance cache or rate quota is claimed.

FEMO stays on **HOLD** as an operational live source. Its latest bounded live sample was `2025-11-05 10:10`, roughly 325 days old at review. `STALE` is displayed where a timestamp exists and freshness is not fresh. Salinity retains `UNIT_NOT_DOCUMENTED`, and DO retains the NIFS portal's mg/L evidence. Simultaneous same-instance calls share one in-flight FEMO load; its 24-hour module cache and seven-day stale fallback remain. Before reconsidering FEMO, confirm current sampling cadence and an acceptable freshness policy, and either document its salinity unit officially or exclude that field from numeric interpretation.

Initial page load and a species change alone make zero NIFS calls. Explicit source selection on a cold instance makes two RISA or one FEMO calls. Station change alone makes zero calls; submission within a warm cache TTL normally makes zero new upstream calls. Multiple serverless cold instances can still multiply these counts. No Redis, external cache or automatic retry was introduced.

## Activation boundary

RISA-only Production activation is a separate decision. It requires server-scoped `NIFS_RISA_API_KEY` and `NIFS_REALTIME_FISHING_ENABLED=true`, confirmed quota/cost terms, and successful Preview source/API/UI and failure-isolation smoke. `NIFS_FISHERY_ENVIRONMENT_ENABLED` remains off. The current Vercel inventory has no NIFS variables in Preview or Production. A working local key does not satisfy that gate. Production live-source activation, DB/Supabase apply and new scoring features are outside this change.

# Fishing Condition UI V1

## Scope

`/fishing-spots/conditions` is the user-facing view for the existing Fishing Condition read model. The existing `/fishing-spots` route and its spot search remain unchanged; it links to this screen with `어종·환경 조건 확인`.

The UI submits only to `POST /api/fishing-condition/read-model`. It does not call comparison, explanation, or source APIs directly for the result.

## Explicit context

- Species is limited to the ten approved canonical IDs in the existing species environment profile.
- Month is explicitly selected from 1 through 12. The current month is never inferred.
- The user selects one NIFS source, one station/site, and one supported depth.
- RISA supports surface, middle, and bottom. FEMO Sea supports surface and bottom. Unsupported combinations are disabled.
- The query is submitted only by `조건 보기`, rather than on every selector change.

## Presentation boundary

The result presents environment fields, spawning, north/south migration evidence when available, official monthly occurrence records, source lineage, freshness, and limitations. It does not display scores, probabilities, ranking, or recommendations.

Missing source rows remain missing. They are rendered as `원자료 행 없음` or an explicit empty state, never as zero catch or a negative inference.

## Failure behavior

Loading is shown with skeleton blocks. Source and read-model failures are shown as user-facing messages. No fallback to a different station, source, depth, or route is performed.

# NIFS Fish Season Fallback Policy

## Goal

When NIFS does not provide a `periodList` for a fish species, Blue Marina must not invent a season, must not infer a broad "year-round" or "insufficient" label, and must preserve the missing state explicitly.

## Source rules

- `periodList` is the only official source for season mapping in this flow.
- If `periodList` is present, preserve the original month values and source levels as-is.
- If `periodList` is missing, keep `season` as `null`.
- Do not fabricate fallback months, date ranges, or seasonal labels.
- Do not backfill with AI-generated or heuristic season values.

## Read model rules

- `FishDetailViewModel.quickFacts.season` may be `null`.
- `FishDetailViewModel.quickFacts.seasonSourceStatus` must record whether the season came from the official source or is missing.
- `FishDetailViewModel.quickFacts.seasonDisplayText` should carry the display string for the missing-source state.
- `FishDetailViewModel.quickFacts.seasonFallbackText` should be used only when the source is missing.
- Recommended fallback text: `공식 제철 정보 없음`
- The season section should remain visible in the detail preview and in the detail view, but show the official-missing message instead of a guessed label.

## Readiness rules

- `season` being `source_missing` does not downgrade a candidate to `partial` or `blocked`.
- Readiness continues to depend on identity, official facts, media, and sources.
- `season` missing is a display concern and a data provenance concern, not a publish blocker.

## External enrichment

- If another official source later provides season data, store it as a separate source record.
- Do not overwrite the original NIFS record.
- Do not move AI candidate season values into the official season field.

## Current status

- 8 new NIFS fish candidates remain `ready`.
- 7 candidates have season data.
- 1 candidate currently has `season = null` because raw `periodList` is missing.

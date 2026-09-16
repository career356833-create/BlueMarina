# Fishing Condition UI V1.1

## Decision

`UI_V1_1_ACCEPTED`

This pass resolves the four HIGH acceptance findings and the actionable MEDIUM findings without changing Fishing Condition Read Model semantics or adding scoring, probability, ranking, or recommendations.

## Issue Mapping

| Acceptance issue | Resolution |
| --- | --- |
| AI Captain covers controls and results | The global assistant remains intact, but `/fishing-spots` uses a fixed safe-area mode. Desktop keeps it in the lower-right edge lane; mobile uses a 44px collapsed trigger above BottomNav with content-side compensation. |
| Temperature comparison omits its range | Environment cards now show current temperature, source profile range, range type, and factual relation. Missing profile evidence is labeled `비교 기준 없음`; no range is synthesized. |
| Migration exposes `MATCH` / `MISMATCH` | Raw relations are translated into factual Korean sentences. Northward and southward evidence remain independent and are not combined into an overall judgment. |
| Retry only resets state | Station and read-model failures now repeat the failed request with the current selection. Duplicate requests are blocked, prior errors are cleared, and AbortController cleanup remains active. |
| Station context is thin | The selector helper shows source, station/site, supported depths, and selected freshness where available. Source changes clear stale station and depth values. |
| Source and limitation panels are dense | Verified provider metadata is shown without fallback invention. Lineage and secondary limitations use native `details` disclosure. Limitations are deduplicated while TAC, fleet, gear, effort, region, and life-stage meanings remain separate. |
| Occurrence semantics are weak | Monthly records use a semantic table with caption, scoped headers, year, status, value, unit, and actual row-level source when present. Missing rows remain distinct from zero. |
| Loading and error announcements are weak | Loading uses `role="status"` and `aria-live="polite"`; failures use `role="alert"`; retry remains a native keyboard-accessible button. |
| Fishing Experience LCP warning | The intentional above-fold Next Image is marked `priority`; no image architecture was redesigned. |

## Component Behavior

`FishingConditionClient` keeps explicit species, month, source, station/site, and depth selection. It does not infer the current month, nearest station, preferred species, or best period. Selector changes clear stale result state, while a retry preserves the last valid context.

Environment output distinguishes unit-unverified, unsupported profile, missing observation, unavailable source, and absent comparison reference. Fishery occurrence copy explicitly states that official monthly records are not natural abundance or catch probability.

## Source And Limitation UX

The default source summary contains only available provider, data name, type, observation/statistics time, and freshness. A missing provider is shown as `출처 정보 미확인`. Technical identifiers and lineage are available under `데이터 계보 보기`.

The first four unique limitations remain visible. Additional limitations move under `상세 제한사항 보기`, preserving source-specific meaning without filling the primary result surface.

## Accessibility

- Native labelled selects and buttons remain in use.
- Loading and error transitions have focused live-region semantics.
- Occurrence data uses a real table with caption and scoped row/column headers.
- Mobile at 390x844 has no horizontal overflow or AI Captain collision with selectors and BottomNav.

## Verification

- Targeted UI tests: 20/20 PASS, including 16 V1.1 regression cases.
- Full repository tests: 697/697 PASS.
- TypeScript: PASS.
- ESLint: PASS.
- Production build: PASS, 49 static pages generated.
- Browser: `/fishing-spots` and `/fishing-spots/conditions` PASS at 1440x900 and 390x844.
- Live cases: 고등어 10월/2월, 주꾸미 1월/8월, 참돔 PASS.

## Deferred Data Issues

- Monthly official fishery occurrence remains available only where an approved source row exists.
- Salinity comparison remains disabled when its official unit is unverified.
- Sparse dissolved oxygen evidence, unresolved seasonality months, and unavailable freshness remain explicit limitations rather than inferred values.

No database, Supabase, schema, scoring engine, or recommendation behavior changed.

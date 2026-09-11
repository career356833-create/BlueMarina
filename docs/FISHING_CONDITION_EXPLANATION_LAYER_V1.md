# Fishing Condition Explanation Layer V1

## Purpose

Explanation Layer V1 presents an existing Phase A Comparator result as short Korean sentences. It does not alter comparison relations, calculate another environmental relationship, or combine fields into an overall conclusion.

The endpoint is `POST /api/fishing-condition/explain`. Its request is identical to `POST /api/fishing-condition/compare`: a canonical `speciesId`, an explicit RISA station or FEMO site, and an explicit depth context. The endpoint runs the existing comparator once and then applies local templates. It performs no database write, history persistence, external AI call, or independent environment fetch.

## Deterministic strategy

V1 uses only deterministic templates. The same comparator payload always produces the same explanation payload. This keeps output reproducible, cost-free, testable, and bounded by the source data.

Numbers are formatted to at most one decimal place. A trailing decimal zero is omitted. Null is never rendered as zero. Range context, life stage, region scope, and evidence IDs are retained where available.

## Relation templates

Numeric fields explain `WITHIN_RANGE`, `BELOW_RANGE`, and `ABOVE_RANGE` by restating the current value and the exact source-backed boundary. Equality remains within the range. `PREFERRED` is described as a literature preferred range. `OBSERVED` explicitly states that a preferred range was unavailable and preserves the observation context.

Missing profile evidence returns a sentence stating that V1 has no comparable range and that no value was filled in. Missing environment data, undocumented units, incompatible units, unresolved depth, and source conflicts each use distinct text. Conflicts retain evidence references and state that values were not merged or averaged.

Seasonality is emitted separately for `SPAWNING`, `MIGRATION`, and `FISHERY_OCCURRENCE`. A month match states only that the current month appears in the documented period. It does not infer catch outcomes. Activity and habitat remain unavailable when the selected environment source does not provide the corresponding category.

## Freshness

Fresh data may include `최근 관측값을 사용했습니다.` Stale data retains the comparator relation and adds a note that the observation is not classified as current and should be interpreted with that limitation. Unavailable data produces `MISSING_ENVIRONMENT`. Freshness describes observation age only.

## Evidence and lineage

Each explanation carries the comparator relation, evidence IDs, freshness note, limitation note, and `DERIVED_EXPLANATION`. The response also preserves:

- environment source such as `nifs-risa` or `nifs-femo-sea`
- species profile source `blue-marina-species-environment-v1`
- comparator quality `DERIVED_COMPARISON`
- explanation quality `DERIVED_EXPLANATION`

Evidence summaries do not return long source passages.

## Semantic boundary

V1 never converts a factual relation into a value judgment or causal claim. It does not produce condition scores, percentages, grades, stars, probabilities, rankings, species selection, location selection, trip advice, or causal statements about catch or activity.

The RISA-to-SOO anomaly gates remain unchanged. Explanation does not activate or bypass anomaly runtime.

## Response shape

```json
{
  "locale": "ko-KR",
  "comparison": {},
  "explanations": [
    {
      "field": "temperature",
      "relation": "ABOVE_RANGE",
      "title": "수온 비교",
      "summary": "현재 수온 25.5°C는 고등어의 문헌상 선호 수온 범위 상한 16°C보다 높습니다.",
      "details": ["비교 범위 유형: PREFERRED"],
      "evidenceRefs": ["mackerel-mbris"],
      "freshnessNote": "최근 관측값을 사용했습니다.",
      "limitationNote": null,
      "qualityClass": "DERIVED_EXPLANATION"
    }
  ],
  "qualityClass": "DERIVED_EXPLANATION"
}
```

No score or recommendation field is emitted.

## Future localization

Future locales should map the same relation and metadata contract to reviewed templates. Localization must not change relations, evidence, freshness, limitations, or the no-score boundary. LLM-generated wording remains outside V1.

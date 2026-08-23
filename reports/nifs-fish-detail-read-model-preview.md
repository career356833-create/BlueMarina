# NIFS FishDetailViewModel Preview

- Total candidates: 8
- Ready: 8
- Partial: 0
- Blocked: 0

| speciesCandidateId | sourceId | koreanName | readiness | missingFields | imageCount |
| --- | --- | --- | --- | --- | --- |
| fish-species-candidate-fish_1573537097812 | fish_1573537097812 | 붉은대게 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 1 |
| fish-species-candidate-fish_1575873437839 | fish_1575873437839 | 오분자기 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 1 |
| fish-species-candidate-fish_1575880014320 | fish_1575880014320 | 제주소라 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 2 |
| fish-species-candidate-fish_1575880791880 | fish_1575880791880 | 참조기 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 2 |
| fish-species-candidate-fish_1575881532404 | fish_1575881532404 | 참홍어 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 2 |
| fish-species-candidate-fish_1576639605222 | fish_1576639605222 | 대게 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 2 |
| fish-species-candidate-fish_1576639605223 | fish_1576639605223 | 기름가자미 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 1 |
| fish-species-candidate-fish_1576639605227 | fish_1576639605227 | 주꾸미 | ready | taxonomy, quickFacts.summary, feeding, regulations, generatedContents | 1 |

## Notes

- `identity`, `officialFacts`, and `media` are available for all 8 candidates.
- `taxonomy` is missing for all 8 candidates because it is not exposed in the manifest or raw payload.
- `morphology` is now exposed from raw `infoShape` with explicit source status.
- `feature` is exposed as a source-missing field because `infoFeature` is absent in these 8 raw payloads.
- `regulations` and `generatedContents` remain empty arrays because they are separate layers that are not yet connected.
- `quickFacts.summary` and `feeding` are not present as explicit source fields and are left missing in this preview.
- `season` now carries an explicit `seasonSourceStatus` and `seasonDisplayText` so raw absence is visible without fabricating a value.
- `fish_1576639605223` is the only source-missing season case in this preview, and it shows `공식 제철 정보 없음`.
- `spawning` is derived from the growth text when an explicit 산란 phrase exists.

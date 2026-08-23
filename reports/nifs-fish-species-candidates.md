# NIFS FishSpecies Candidate Dry Run

- Total candidates: 8
- Slug conflicts: 0
- Detail model mapping: identity 8, officialFacts 8, taxonomy 0, morphology 8, feature 0, media 8, sources 8

| candidateId | sourceId | koreanName | englishName | scientificName | candidateSlug | slugConflict | factReviewStatus | publishStatus | detailModelMapping |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fish-species-candidate-fish_1573537097812 | fish_1573537097812 | 붉은대게 | Red snow crab | Chionoecetes japonicus | red-snow-crab | no | pending | draft | identity, officialFacts, media, sources |
| fish-species-candidate-fish_1575873437839 | fish_1575873437839 | 오분자기 | Ear shell | Sulculus diversicolor | ear-shell | no | pending | draft | identity, officialFacts, media, sources |
| fish-species-candidate-fish_1575880014320 | fish_1575880014320 | 제주소라 | Spiny top shell | Turbo cornutus | spiny-top-shell | no | pending | draft | identity, officialFacts, media, sources |
| fish-species-candidate-fish_1575880791880 | fish_1575880791880 | 참조기 | Yellow croaker | Larimichthys polyactis | yellow-croaker | no | pending | draft | identity, officialFacts, media, sources |
| fish-species-candidate-fish_1575881532404 | fish_1575881532404 | 참홍어 | Mottled skate | Raja pulchra | mottled-skate | no | pending | draft | identity, officialFacts, media, sources |
| fish-species-candidate-fish_1576639605222 | fish_1576639605222 | 대게 | Tanner crab | Chionoecetes opilio | tanner-crab | no | pending | draft | identity, officialFacts, media, sources |
| fish-species-candidate-fish_1576639605223 | fish_1576639605223 | 기름가자미 | Blackfin flounder | Glyptocephalus stelleri | blackfin-flounder | no | pending | draft | identity, officialFacts, media, sources |
| fish-species-candidate-fish_1576639605227 | fish_1576639605227 | 주꾸미 | Webfoot octopus | Amphioctopus fangsiao | webfoot-octopus | no | pending | draft | identity, officialFacts, media, sources |

## Notes

- `candidateId` is deterministic and separate from NIFS `sourceId`.
- `candidateSlug` and `canonicalSlug` come from the approved slug report and are joined by immutable NIFS `sourceId`.
- `previousCandidateSlug` preserves the pre-approval Korean candidate value for audit lineage.
- `taxonomy` remains null because the source manifest and raw payload used for this dry-run did not expose a taxonomy block.
- `morphology` preserves the raw `infoShape` text when present and keeps an explicit source status.
- `feature` remains `source_missing` because the raw payload used for this dry-run did not expose `infoFeature`.
- `season` is preserved from `manifest.periodList` into a structured candidate field.
- `spawning` is derived from the first explicit `산란` phrase found in `infoGrowth`, when present.
- `factReviewStatus` is forced to `pending` and `publishStatus` to `draft` for all candidates.
- `officialFacts` are derived only from manifest and raw `retMap` fields; no inferred facts were added.

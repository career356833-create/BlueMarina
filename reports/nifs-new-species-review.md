# NIFS New Species Review

- Total candidates: 8
- Confirmed new species: 8
- Legacy missing: 0
- Renamed species: 0
- Taxonomy updates: 0
- Manual review: 0

| sourceId | Korean name | English name | Scientific name | Decision | Confidence | Legacy match | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fish_1573537097812 | 붉은대게 | Red snow crab | Chionoecetes japonicus | new_species_confirmed | high | none | create_species_draft |
| fish_1575873437839 | 오분자기 | Ear shell | Sulculus diversicolor | new_species_confirmed | high | none | create_species_draft |
| fish_1575880014320 | 제주소라 | Spiny top shell | Turbo cornutus, Batillus cornutus | new_species_confirmed | high | none | create_species_draft |
| fish_1575880791880 | 참조기 | Yellow croaker | Larimichthys polyactis | new_species_confirmed | high | none | create_species_draft |
| fish_1575881532404 | 참홍어 | Mottled skate | Raja pulchra | new_species_confirmed | high | none | create_species_draft |
| fish_1576639605222 | 대게 | Tanner crab | Chionoecetes opilio | new_species_confirmed | high | none | create_species_draft |
| fish_1576639605223 | 기름가자미 | Blackfin flounder | Glyptocephalus stelleri | new_species_confirmed | high | none | create_species_draft |
| fish_1576639605227 | 주꾸미 | Webfoot octopus | Amphioctopus fangsiao | new_species_confirmed | high | none | create_species_draft |

## Review Notes

- All 8 candidates have no exact name, alias, relatedFish, or scientificName overlap with `src/data/fish-data.ts`.
- No match was found in `src/data/fish/*`.
- `taxonomy` was not exposed in the staging manifest or raw detail payload used for this review, so it is recorded as null rather than inferred.

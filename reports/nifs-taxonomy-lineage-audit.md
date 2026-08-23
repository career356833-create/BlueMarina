# NIFS Taxonomy Lineage Audit

- generatedAt: 2026-08-01T14:32:02.360582+00:00
- totalCandidates: 8
- raw taxonomy present: 0
- raw taxonomy source_missing: 8
- manifest taxonomy field present: 0
- candidate taxonomy present: 0
- preview taxonomy present: 0
- mapping_loss: 0
- schema_not_supported: 0

## Conclusion

No taxonomy-related raw field was found in any of the 8 NIFS raw detail payloads. The parsed source metadata only preserves `rawApiKeys` for the detail payload, and those keys do not include `class`, `order`, `family`, `genus`, `species`, or any other taxonomy-like field. As a result, taxonomy remains `source_missing` through manifest, candidate, and preview stages for all 8 candidates.

## Candidate Table

| sourceId | koreanName | scientificName | raw taxonomy keys | parsed taxonomy-like keys | manifest taxonomy field | candidate taxonomy | preview taxonomy | readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fish_1573537097812 | 붉은대게 | Chionoecetes japonicus | none | none | no | null | null | ready |
| fish_1575873437839 | 오분자기 | Sulculus diversicolor | none | none | no | null | null | ready |
| fish_1575880014320 | 제주소라 | Turbo cornutus, Batillus cornutus | none | none | no | null | null | ready |
| fish_1575880791880 | 참조기 | Larimichthys polyactis | none | none | no | null | null | ready |
| fish_1575881532404 | 참홍어 | Raja pulchra | none | none | no | null | null | ready |
| fish_1576639605222 | 대게 | Chionoecetes opilio | none | none | no | null | null | ready |
| fish_1576639605223 | 기름가자미 | Glyptocephalus stelleri | none | none | no | null | null | ready |
| fish_1576639605227 | 주꾸미 | Amphioctopus fangsiao | none | none | no | null | null | ready |

## Files to review if taxonomy support is added later

- `tools/nifs-importer/build-manifest.cjs`
- `tools/nifs-importer/build-species-candidates.cjs`
- `tools/nifs-importer/build-detail-read-model-preview.cjs`
- `src/lib/types/drafts/nifs-fish-contract.ts`
- `src/lib/types/drafts/fish-detail-view-model.ts`

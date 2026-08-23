# NIFS Manifest Build Summary

- Input root: `data/nifs/raw`
- Output dir: `data-import/nifs/manifest`
- Report dir: `data-import/nifs/reports`
- Database touched: false
- Supabase called: false

## Summary

| Item | Count |
| --- | ---: |
| totalSourceDirs | 25 |
| manifestCount | 25 |
| successCount | 25 |
| partialCount | 0 |
| failedCount | 0 |
| sourceMetadataCount | 25 |
| detailApiResponseCount | 5 |
| sourceCheckedAtFromMetadataCount | 25 |
| sourceCheckedAtFromMtimeCount | 0 |
| imageUrlTotal | 41 |
| imageMediaPathTotal | 147 |
| periodListTotal | 114 |
| morphologyTextCount | 25 |
| featureTextCount | 0 |
| growthTextCount | 25 |
| spawningTextCount | 24 |
| metadataHashMismatchCount | 5 |
| parseErrorCount | 0 |
| missingSourceIdCount | 0 |
| missingSourceUrlCount | 0 |
| missingRawPayloadCount | 0 |

## Raw structure notes

- Source directories discovered: 25
- Detail API responses present: 5
- Image URLs collected: 41
- Local media paths collected: 147
- periodList entries collected: 114
- morphology text present: 25
- feature text present: 0
- growth text present: 25
- spawning text extracted: 24
- Hash mismatches against source-metadata: 5

## Errors

- Recoverable or blocking errors: 5
- fish_1571803943319: METADATA_HASH_MISMATCH (recoverable)
- fish_1571806850754: METADATA_HASH_MISMATCH (recoverable)
- fish_1575596889118: METADATA_HASH_MISMATCH (recoverable)
- fish_1575613737728: METADATA_HASH_MISMATCH (recoverable)
- fish_1576045793538: METADATA_HASH_MISMATCH (recoverable)

## Idempotency

The converter sorts source directories by sourceId, sorts manifest keys by insertion order, deduplicates image URLs and media paths, and uses SHA-256 of the chosen primary payload bytes. Re-running the same input produces the same manifest files.

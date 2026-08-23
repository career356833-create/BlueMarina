# NIFS Staging Schema Diff

- Input dir: `data-import/nifs/manifest`
- Legacy fish-data source: `src/data/fish-data.ts`

## Summary

| Item | Count |
| --- | ---: |
| totalRecords | 25 |
| matchedCount | 17 |
| unmatchedCount | 8 |
| ambiguousCount | 0 |
| newSpeciesCandidateCount | 8 |
| existingSpeciesCandidateCount | 17 |
| possibleDuplicateCount | 0 |
| scientificNameConflictCount | 0 |
| koreanNameConflictCount | 0 |
| slugCollisionCount | 17 |
| reviewQueueCount | 0 |

## Review queue

_No manual review items were generated from the current manifest set._

## Candidate notes

- Legacy name matches: 17
- New species candidates: 8
- Slug collisions against legacy fish-data: 17

## Determinism

Records are sorted by sourceId. Candidate slugs and conflict lists are derived from normalized text only.

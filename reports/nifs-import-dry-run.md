# NIFS Import Dry Run

- Mode: dry-run
- Database touched: false
- Supabase called: false

## Summary

| Item | Count |
| --- | ---: |
| stagingRecords | 4 |
| validRecords | 3 |
| newSourceRecords | 1 |
| sameHashSkips | 1 |
| changedHashVersions | 1 |
| sourceMissingCandidates | 1 |
| schemaErrors | 1 |
| duplicateSourceKeys | 0 |
| scientificNameDuplicateCandidates | 1 |
| slugCollisionCandidates | 1 |
| normalizationCandidateDiffs | 2 |
| manualReviewOverwriteRisks | 1 |

## Transaction safety

A changed source hash would run: insert_source_version -> unset_previous_current_version -> set_new_current_version -> create_change_log -> queue_normalization_review. Any failure rolls the transaction back; the previous current version and published data remain unchanged.

## Review queues

- Schema errors: 1
- Duplicate source keys: 0
- Scientific-name duplicate candidates: 1
- Slug collision candidates: 1
- Manual overwrite risks: 1

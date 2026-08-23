# NIFS Import Dry Run

- Mode: dry-run
- Database touched: false
- Supabase called: false

## Summary

| Item | Count |
| --- | ---: |
| stagingRecords | 25 |
| validRecords | 25 |
| newSourceRecords | 25 |
| sameHashSkips | 0 |
| changedHashVersions | 0 |
| sourceMissingCandidates | 0 |
| schemaErrors | 0 |
| duplicateSourceKeys | 0 |
| scientificNameDuplicateCandidates | 0 |
| slugCollisionCandidates | 0 |
| normalizationCandidateDiffs | 0 |
| manualReviewOverwriteRisks | 0 |

## Transaction safety

A changed source hash would run: insert_source_version -> unset_previous_current_version -> set_new_current_version -> create_change_log -> queue_normalization_review. Any failure rolls the transaction back; the previous current version and published data remain unchanged.

## Review queues

- Schema errors: 0
- Duplicate source keys: 0
- Scientific-name duplicate candidates: 0
- Slug collision candidates: 0
- Manual overwrite risks: 0

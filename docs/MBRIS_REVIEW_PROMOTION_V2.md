# MBRIS Review Promotion V2

Generated: 2026-08-30T14:41:36.993Z

This is a read-only staging review. No import, migration, schema change, or canonical mutation was performed. No external taxonomy lookup was performed.

## Base

- Staging canonical: 1122
- Review input: 137
- Malformed scientific separate track: 5
- Auditor: blue_marina_readonly_auditor
- Transaction read-only: on

## Classification

| Class | Count |
| --- | ---: |
| PROMOTE_NEW_READY | 0 |
| LINK_LEGACY_AND_PROMOTE_NEW | 136 |
| EXISTING_CANONICAL_EXACT | 0 |
| EXISTING_CANONICAL_ALIAS_REVIEW | 0 |
| KOREAN_NAME_REVIEW | 1 |
| SCIENTIFIC_NAME_REVIEW | 0 |
| TAXONOMY_REVIEW | 0 |
| IDENTITY_CONFLICT | 0 |
| OUT_OF_SCOPE_RECLASSIFY | 0 |
| HOLD | 0 |
| total | 137 |

Legacy/local linkage is not a canonical merge signal. The 136 legacy-linked records with complete scientific identity and no staging collision are promoted as new canonical candidates while retaining a separate mapping. The one record without a Korean name remains blocked.

## Ready

- READY_NEW_TOTAL: 136
- Manifest rows: 136
- Initial state: draft / pending
- Projected after ready import: 1258
- Potential after manual review: 1259

## Remote Collision Preflight

- Status: PASS
- ID: 0
- MBRIS source ID: 0
- Scientific: 0
- Normalized scientific: 0
- Slug: 0
- Relation: 0

## Malformed Scientific 5

These records are outside the 137 review input and remain isolated. Their source strings are preserved without automatic correction.

| Korean name | Original scientific string | Reason | Action |
| --- | --- | --- | --- |
| 열목어 | Brachymystax lenok tsinlingensis | INFRASPECIFIC_TRINOMIAL_REQUIRES_RANK_AND_ACCEPTED_NAME_REVIEW | EXTERNAL_TAXONOMY_REVIEW_REQUIRED; do not auto-correct or admit to the Fish review import. |
| 끄리 | Opsariichthys uncirostris amurensis | INFRASPECIFIC_TRINOMIAL_REQUIRES_RANK_AND_ACCEPTED_NAME_REVIEW | EXTERNAL_TAXONOMY_REVIEW_REQUIRED; do not auto-correct or admit to the Fish review import. |
| 참몰개 | Squalidus chankaensis tsuchigae | INFRASPECIFIC_TRINOMIAL_REQUIRES_RANK_AND_ACCEPTED_NAME_REVIEW | EXTERNAL_TAXONOMY_REVIEW_REQUIRED; do not auto-correct or admit to the Fish review import. |
| 몰개 | Squalidus japonicus coreanus | INFRASPECIFIC_TRINOMIAL_REQUIRES_RANK_AND_ACCEPTED_NAME_REVIEW | EXTERNAL_TAXONOMY_REVIEW_REQUIRED; do not auto-correct or admit to the Fish review import. |
| 긴몰개 | Squalidus gracilis majimae | INFRASPECIFIC_TRINOMIAL_REQUIRES_RANK_AND_ACCEPTED_NAME_REVIEW | EXTERNAL_TAXONOMY_REVIEW_REQUIRED; do not auto-correct or admit to the Fish review import. |

## Exclusions

- Cham-hong-eo conflict: excluded; separate Raja pulchra / Beringraja pulchra taxonomy track.
- Non-fish 145: excluded; future Marine Organism track.
- External taxonomy lookup: not performed.

## Verification

- Classified: 137/137
- Unclassified: 0
- Duplicate primary class: 0
- Malformed admitted: 0
- Cham-hong-eo admitted: 0
- Non-fish admitted: 0
- DB write: 0

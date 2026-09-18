# Fish Canonical Exception Resolution Program V1

Generated: 2026-09-18

## Decision

`EXCEPTION_RESOLUTION_COMPLETE_WITH_REMAINDERS`

The program reviewed the 43 entries preserved by Fish Canonical Bulk Normalization V1 as three category batches. It resolved 41 entries as policy decisions and retained two entries that still lack authoritative one-to-one identity evidence. This is a review layer only. The frozen 1,258-species inventory, production data, runtime mappings, condition profiles, and database state are unchanged.

## Batch A — Aggregate alias

All 34 aggregate-alias queue entries were handled together.

| Decision | Count | Meaning |
|---|---:|---|
| `AGGREGATED_TAXON` | 24 | The name is a group or broader common-name bucket and cannot represent one species. |
| `SAFE_ALIAS` | 0 | No candidate met the one-to-one evidence gate. |
| `DO_NOT_MAP` | 10 | The queued target is not supported as a one-to-one identity. |
| `RESEARCH_REQUIRED` | 0 | Every entry received a terminal safety classification. |

Aggregate terms are retained as audit history. They are not promoted, fuzzy-matched, merged, or rewritten into canonical aliases.

## Batch B — Alias ambiguity

The four ambiguity entries produced no safe aliases.

| Decision | Count | Entries |
|---|---:|---|
| `SAFE_ALIAS` | 0 | — |
| `AMBIGUOUS_ALIAS` | 1 | `BM-SPECIES-000279` (`점벵에돔`, `흑벵에돔`) |
| `REJECT_ALIAS` | 3 | `쏨뱅이 독가시`, `쥐치포용 쥐치`, `대삼치` |

The rejected labels contain warning or descriptive text, malformed source text, or a size/market term. The two 벵에돔 labels remain one queue entry because the checked public and institutional sources do not establish that either label is a one-to-one synonym of *Girella punctata*.

## Batch C — Structural exceptions

| Decision | Count | Treatment |
|---|---:|---|
| `RESOLVED` | 0 | — |
| `RESOLVED_WITH_LIMITATION` | 4 | 제주 소라 accepted-name lineage, the 우럭 cross-domain homonym, and two protected condition IDs |
| `KEEP_EXCEPTION` | 1 | 오분자기 taxonomy conflict |

The 제주 소라 crosswalk establishes the accepted-name lineage to *Turbo sazae*, but the frozen canonical row is not rewritten in this research phase. The 우럭 mapping remains domain-scoped and cannot merge with the non-fish homonym. `BM-SPECIES-003107` and `BM-SPECIES-003111` remain protected condition identifiers outside the enumerated Fish baseline.

The 오분자기 conflict remains open. Authoritative sources distinguish *Haliotis diversicolor* and *Haliotis supertexta*, while the NIFS Korean/scientific pairing does not identify which accepted taxon should own the record. No inferred repair is allowed.

## Global reconciliation

| Check | Result |
|---|---:|
| Canonical total | 1,258 |
| Unique IDs | 1,258 |
| Verified / partial / conflict / unresolved | 1,256 / 1 / 1 / 0 |
| Source coverage | 1,258 / 1,258 |
| Scientific-name collision groups | 0 |
| Korean-name collision groups | 0 |
| Synonym collision groups | 0 |
| Exception queue before | 43 |
| Resolved by policy | 41 |
| Remaining | 2 |

The remaining queue identities are `07e1852e-0675-4090-8675-cd216fb90ba9` (오분자기 taxonomy conflict) and `BM-SPECIES-000279` (점벵에돔/흑벵에돔 ambiguity). Resolution metadata is stored in the new reports; the original exception evidence and history are preserved unchanged.

## Artifacts

- `reports/fish-canonical/exception-resolution-aggregate-alias-v1.json`
- `reports/fish-canonical/exception-resolution-alias-ambiguity-v1.json`
- `reports/fish-canonical/exception-resolution-structural-v1.json`
- `reports/fish-canonical/exception-resolution-summary-v1.json`
- `tools/fish-canonical/resolve-bulk-exceptions.mjs`
- `tests/fish-canonical/exception-resolution-program-v1.test.cjs`

Run `node tools/fish-canonical/resolve-bulk-exceptions.mjs --check` to verify that the four report artifacts match a deterministic rebuild from the preserved inputs.

## Boundaries

- Production canonical mutation: 0
- Runtime species mapping mutation: 0
- Database and Supabase writes: 0
- Automatic merge or delete: 0
- One-species-at-a-time workflow: 0
- Condition profile research: 0

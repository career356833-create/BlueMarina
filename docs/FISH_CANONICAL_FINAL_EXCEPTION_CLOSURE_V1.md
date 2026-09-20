# Fish Canonical Final Exception Closure V1

## Decision

`EXCEPTION_CLOSURE_COMPLETE_WITH_REMAINDERS`

The two remaining exceptions from Fish Canonical Exception Resolution Program V1 were reviewed against current authoritative records. One taxonomy conflict is resolved at the research-metadata level with an apply limitation. One alias ambiguity remains open because the safe-alias requirements are not met.

| Exception | Decision | Result |
| --- | --- | --- |
| `07e1852e-0675-4090-8675-cd216fb90ba9` / 오분자기 | `RESOLVED_WITH_LIMITATION` | Current evidence supports 오분자기 = *Haliotis supertexta*. The canonical row is unchanged. |
| `BM-SPECIES-000279` / 점벵에돔·흑벵에돔 | `KEEP_EXCEPTION` | Neither label has authoritative one-to-one support as an alias of *Girella punctata*. |

Exception counts are therefore **2 before, 1 resolved, 1 remaining**. The remaining exception is `BM-SPECIES-000279`.

## 오분자기 taxonomy conflict

The frozen canonical record combines the Korean name 오분자기 with `Sulculus diversicolor`. The source comparison establishes that this is a mismatched name/scientific-name pair:

- The preserved NIFS record contains 오분자기 / `Sulculus diversicolor`; this is the source of the conflict.
- MBRIS records 오분자기 as the accepted name `Haliotis supertexta Lischke, 1870`.
- NIBR's current K-BON guide identifies 오분자기 as *Haliotis supertexta* and distinguishes 마대오분자기.
- WoRMS/MolluscaBase accepts *Haliotis diversicolor* and *Haliotis supertexta* as separate species. `Sulculus diversicolor` is a superseded combination of *Haliotis diversicolor*, not a synonym of *Haliotis supertexta*.
- GBIF independently returns the two names as separate accepted species.

The conflict is classified `RESOLVED_WITH_LIMITATION`. Resolution metadata records 오분자기 / *Haliotis supertexta* as the research conclusion and identifies *Haliotis diversicolor* / 마대오분자기 as the displaced identity. No canonical name, scientific name, status, or ID is changed in this work. A separate, explicitly authorized production apply review would be required to alter the frozen row.

Authoritative references:

- [WoRMS: Haliotis diversicolor](https://www.marinespecies.org/aphia.php?p=taxdetails&id=445319)
- [WoRMS: Haliotis supertexta](https://www.marinespecies.org/aphia.php?p=taxdetails&id=445364)
- [NIBR K-BON guide](https://species.nibr.go.kr/nibr/assets/K-BON_GUIDE.pdf)
- MBRIS public-data record preserved in `data/mbris/normalized/detail/BM-SPECIES-002418.json`

## BM-SPECIES-000279 alias ambiguity

The canonical identity remains 벵에돔 / *Girella punctata*. The candidate labels 점벵에돔 and 흑벵에돔 fail every required safe-alias gate:

- no authoritative one-to-one identity with *Girella punctata*;
- no authoritative synonym or common-name support for either exact label;
- no proof that the labels cannot refer to another species, regional usage, or a commercial/common-name grouping.

FishBase's checked Korean common-name list does not establish either candidate for *Girella punctata*. NIFS and MBRIS separately identify 긴꼬리벵에돔 as *Girella leonina*, demonstrating that superficially related Korean names in this group can identify different species. That does not prove what 점벵에돔 or 흑벵에돔 means; it prevents a safe automatic alias assignment.

This exception remains `KEEP_EXCEPTION`, with `aliasSafety: NOT_SAFE`. The two candidates are retained in audit history and are not promoted, rewritten, or mapped.

Authoritative references:

- [FishBase: Girella punctata common names](https://www.fishbase.se/ComNames/CommonNamesList.php?GenusName=Girella&ID=6537&SpeciesName=punctata&StockCode=6858)
- [NIFS: 긴꼬리벵에돔 / Girella leonina](https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10405)
- [MBRIS: 긴꼬리벵에돔 / Girella leonina](https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000007130)
- MBRIS public-data record preserved in `data/mbris/normalized/detail/BM-SPECIES-000279.json`

## Full reconciliation

The frozen inventory remains unchanged:

| Check | Result |
| --- | ---: |
| Canonical records | 1,258 |
| Unique IDs | 1,258 |
| Verified / partial / conflict / unresolved | 1,256 / 1 / 1 / 0 |
| Source coverage | 1,258 / 1,258 |
| Scientific-name collisions | 0 |
| Korean-name collisions | 0 |
| Synonym collisions | 0 |

The research resolution for 오분자기 does not alter these inventory counts because production application is outside this task.

## Invariants

- canonical ID mutation, creation, merge, and deletion: 0
- production canonical mutation: 0
- runtime mapping mutation: 0
- database and Supabase writes: 0
- prior exception history deletion: 0

## Reproduction

Run:

```text
node tools/fish-canonical/close-final-exceptions.mjs
node tools/fish-canonical/close-final-exceptions.mjs --check
node --test tests/fish-canonical/final-exception-closure-v1.test.cjs
```

The builder reads the frozen canonical inventory, prior exception summary, normalized NIFS/MBRIS records, taxonomy crosswalk, and prior alias review. Current external taxonomy conclusions are frozen in the report with their source URLs and access date so regeneration is offline and deterministic.

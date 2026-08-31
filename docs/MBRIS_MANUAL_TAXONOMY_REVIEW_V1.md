# MBRIS Manual Taxonomy Review V1

- Review date: 2026-08-31
- Environment: staging (`mlfvpaikfpjrgrhwlrjn`)
- Input: 7 records
- Reviewed: 7 records
- Database writes: 0
- Git changes: artifacts only; no add, commit, or push

## Decision Summary

| Korean name | Source scientific name | Recommended accepted name | Habitat | Classification | Action |
| --- | --- | --- | --- | --- | --- |
| Not supplied | *Chaeturichthys jeoni* | *Chaeturichthys jeoni* | MARINE | `KOREAN_NAME_REVIEW_REQUIRED` | `KEEP_BLOCKED` |
| 참홍어 | *Beringraja pulchra* (MBRIS); *Raja pulchra* (NIFS) | *Beringraja pulchra* | MARINE | `READY_CANONICAL_NAME_UPDATE_REVIEW` | `UPDATE_CANONICAL_AFTER_APPROVAL` |
| 열목어 | *Brachymystax lenok tsinlingensis* | *Brachymystax tsinlingensis* (nomenclatural candidate) | FRESHWATER | `TAXONOMY_REVIEW_REQUIRED` | `MANUAL_REVIEW` |
| 끄리 | *Opsariichthys uncirostris amurensis* | *Opsariichthys amurensis* (nomenclatural candidate) | FRESHWATER | `TAXONOMY_REVIEW_REQUIRED` | `MANUAL_REVIEW` |
| 참몰개 | *Squalidus chankaensis tsuchigae* | *Squalidus gracilis* (international species-level treatment) | FRESHWATER | `PRODUCT_SCOPE_REVIEW_REQUIRED` | `MOVE_TO_FUTURE_FRESHWATER_DOMAIN` |
| 몰개 | *Squalidus japonicus coreanus* | *Squalidus japonicus* (international species-level treatment) | FRESHWATER | `PRODUCT_SCOPE_REVIEW_REQUIRED` | `MOVE_TO_FUTURE_FRESHWATER_DOMAIN` |
| 긴몰개 | *Squalidus gracilis majimae* | *Squalidus gracilis* (international species-level treatment) | FRESHWATER | `PRODUCT_SCOPE_REVIEW_REQUIRED` | `MOVE_TO_FUTURE_FRESHWATER_DOMAIN` |

The ready import manifest intentionally contains zero rows. The 참홍어 decision is ready for a separately approved canonical-name update, not a new-species insert. The other six records still require Korean-name, taxonomy, or product-scope decisions.

## Review Method

Original MBRIS/NIFS strings were retained separately from every recommendation. International nomenclature was checked primarily against Eschmeyer's Catalog of Fishes, WoRMS, and FishBase. Korean names were checked against the National Institute of Biological Resources (NIBR) national species list and, where relevant, the National Institute of Fisheries Science (NIFS). Search snippets, blogs, commerce pages, and community sites were not accepted as canonical evidence.

The staging collision check used the existing metadata/read-only auditor surface. The connected role was `blue_marina_readonly_auditor`, `transaction_read_only` was `on`, and `rolbypassrls` was false. No write statement or application-row mutation was executed.

## 1. Chaeturichthys jeoni

### Korean name

MBRIS supplies no Korean name. The local legacy `fish-data.ts` corpus also has no record for this scientific name. A secondary Korean string, `비늘쉬쉬망둑`, appears in derivative web lists, but no NIBR, NIFS, or other authoritative Korean record was found that was adequate to establish it as the official standard name. It is therefore retained only as an unapproved secondary candidate and is not promoted.

Special Korean-name result: `INSUFFICIENT_EVIDENCE`.

### Original scientific name

`Chaeturichthys jeoni`

### Current accepted name

*Chaeturichthys jeoni* Shibukawa & Iwata, 2013. Eschmeyer's Catalog of Fishes treats it as valid in *Chaeturichthys*; FishBase also treats it as an accepted marine species. The original description establishes the species and gives the Japanese name Yakiin-haze, which is not evidence for a Korean standard name.

### Synonym/history

No accepted-name genus transfer or synonym requiring normalization was found. The genus remains *Chaeturichthys* in the consulted international records.

### Korean official source

The 2017 NIBR national species list contains *Chaeturichthys stigmatias* but did not provide a matching *C. jeoni* Korean-name record in the reviewed list. This is absence of confirmation, not proof that a Korean name can never exist.

### International source

- [Eschmeyer's Catalog of Fishes: Chaeturichthys jeoni](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=72703), accessed 2026-08-31.
- [FishBase species summary 66970](https://www.fishbase.se/summary/66970), accessed 2026-08-31.
- [WoRMS Chaeturichthys taxon list](https://www.marinespecies.org/aphia.php?p=taxlist&tName=Chaeturichthys), accessed 2026-08-31.
- [Original description, National Museum of Nature and Science](https://www.kahaku.go.jp/research/publication/zoology_s/download/s07/7-05.pdf), accessed 2026-08-31.
- [NIBR National Species List 2017, Vertebrates](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf), accessed 2026-08-31.

### Product scope

MARINE and taxonomically suitable for the Fish Domain, but the required Korean product identity is unresolved.

### Final classification

`KOREAN_NAME_REVIEW_REQUIRED`

### Recommended action

`KEEP_BLOCKED`

### Confidence

High for scientific identity; low for an official Korean name; overall 0.82.

## 2. 참홍어

### Korean name

참홍어 is consistently used by NIFS, NIBR, and MBRIS for the biological species represented by the two genus combinations.

### Original scientific name

- NIFS canonical source: `Raja pulchra`
- MBRIS source: `Beringraja pulchra`

### Current accepted name

*Beringraja pulchra* (Liu, 1932).

### Synonym/history

WoRMS identifies *Raja pulchra* Liu, 1932 as a junior objective synonym of accepted *Beringraja pulchra*. This is a genus transfer/recombination, not evidence of two distinct species. The special-case result is `SAME_SPECIES_ACCEPTED_NAME_UPDATED`; the source difference is also a confirmed version difference.

### Korean official source

NIBR's 2017 national list and the current NIFS regulatory page use *Raja pulchra* with 참홍어. MBRIS uses the newer accepted combination *Beringraja pulchra*. This is `SOURCE_DISAGREEMENT` at the nomenclatural version level, not a disagreement over Korean biological identity.

### International source

- [WoRMS: Beringraja pulchra, AphiaID 1015739](https://www.marinespecies.org/aphia.php?p=taxdetails&id=1015739), accessed 2026-08-31.
- [WoRMS: Raja pulchra, AphiaID 271580](https://www.marinespecies.org/aphia.php?p=taxdetails&id=271580), accessed 2026-08-31.
- [NIBR National Species List 2017, Vertebrates](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf), accessed 2026-08-31.
- [NIFS aquatic biosecurity species record](https://biosafety.nifs.go.kr/portal/pcon0000298/systA/actionConts.do), accessed 2026-08-31.

### Product scope

MARINE and in scope. Staging already contains 참홍어 as UUID `1f158822-5672-4174-b44a-2237496b9504`, scientific name `Raja pulchra`, slug `mottled-skate`.

### Final classification

`READY_CANONICAL_NAME_UPDATE_REVIEW`

### Recommended action

`UPDATE_CANONICAL_AFTER_APPROVAL`

Recommended taxonomy-specific choice: `PROMOTE_ACCEPTED_AND_KEEP_OLD_ALIAS`.

Dry-run impact after explicit approval:

- species update: 1 (`Raja pulchra` -> `Beringraja pulchra`)
- alias insert: 1 (`Raja pulchra`)
- MBRIS source relation insert: 1 if absent
- lineage insert: 1
- Korean name change: 0
- slug change: 0

### Confidence

High, 0.98.

## 3. 열목어

### Korean name

열목어 is confirmed in the NIBR national species list for the source trinomial.

### Original scientific name

`Brachymystax lenok tsinlingensis`

### Current accepted name

Eschmeyer's current nomenclatural treatment accepts *Brachymystax tsinlingensis* Li, 1966 as a species. FishBase has treated the source trinomial as a synonym of *Brachymystax lenok*. A recent phylogeographic study notes that Korean specimens assigned to *B. tsinlingensis* are morphologically congruent with *B. lenok*, leaving the Korean population-level application unresolved.

### Synonym/history

The source is a formally constructed subspecies name, not malformed text. Its rank and accepted parent have changed across authorities. `Brachymystax tsinlingensis` is the recommended nomenclatural candidate, but it must not be applied automatically to the Korean record.

### Korean official source

NIBR uses `Brachymystax lenok tsinlingensis` / 열목어.

### International source

- [Eschmeyer's Catalog of Fishes: Brachymystax tsinlingensis](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=13182), accessed 2026-08-31.
- [GBIF taxon record](https://www.gbif.org/species/119615627), accessed 2026-08-31.
- [Recent Brachymystax phylogeographic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12547837/), accessed 2026-08-31.
- [NIBR National Species List 2017, Vertebrates](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf), accessed 2026-08-31.

### Product scope

FRESHWATER. Independent of the taxonomy issue, automatic admission to the current marine-oriented product is not appropriate.

### Final classification

`TAXONOMY_REVIEW_REQUIRED`

### Recommended action

`MANUAL_REVIEW`

### Confidence

High that the source taxon is freshwater and the trinomial is legitimate historical taxonomy; medium for the correct canonical name of the Korean population; overall 0.78.

## 4. 끄리

### Korean name

끄리 is confirmed in the NIBR national species list for the source trinomial.

### Original scientific name

`Opsariichthys uncirostris amurensis`

### Current accepted name

Eschmeyer's Catalog treats *Opsariichthys amurensis* Berg, 1932 as valid. FishBase has treated the trinomial under *O. uncirostris*. Korean mitochondrial work found the Korean taxon closer to *O. bidens*, so replacing the domestic record with *O. amurensis* solely from nomenclatural databases would overstate the evidence.

### Synonym/history

The source is a legitimate subspecies construction with conflicting species-level treatments. Both rank change and Korean population identity require expert review.

### Korean official source

NIBR uses `Opsariichthys uncirostris amurensis` / 끄리.

### International source

- [Eschmeyer's Catalog of Fishes: Opsariichthys amurensis](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=53498), accessed 2026-08-31.
- [Korean Opsariichthys mitochondrial study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8820798/), accessed 2026-08-31.
- [NIBR National Species List 2017, Vertebrates](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf), accessed 2026-08-31.

### Product scope

FRESHWATER.

### Final classification

`TAXONOMY_REVIEW_REQUIRED`

### Recommended action

`MANUAL_REVIEW`

### Confidence

Overall 0.76.

## 5. 참몰개

### Korean name

참몰개 is confirmed by NIBR for the source trinomial.

### Original scientific name

`Squalidus chankaensis tsuchigae`

### Current accepted name

Eschmeyer's Catalog places the name in the synonymy of *Squalidus gracilis* (Temminck & Schlegel, 1846), while its remarks acknowledge Korean literature that has recognized it under *S. chankaensis* or as a subspecies. The source trinomial should therefore remain preserved for a future subspecies-aware freshwater model.

### Synonym/history

International species-level synonymization and continuing Korean infraspecific usage disagree. This is `SOURCE_DISAGREEMENT`, not malformed input.

### Korean official source

NIBR uses `Squalidus chankaensis tsuchigae` / 참몰개.

### International source

- [Eschmeyer's Catalog of Fishes: Squalidus chankaensis tsuchigae](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=29466), accessed 2026-08-31.
- [NIBR National Species List 2017, Vertebrates](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf), accessed 2026-08-31.

### Product scope

FRESHWATER; category B, taxonomy meaningful but product-scope review required.

### Final classification

`PRODUCT_SCOPE_REVIEW_REQUIRED`

### Recommended action

`MOVE_TO_FUTURE_FRESHWATER_DOMAIN`

### Confidence

Overall 0.84.

## 6. 몰개

### Korean name

몰개 is confirmed by NIBR for the source trinomial.

### Original scientific name

`Squalidus japonicus coreanus`

### Current accepted name

FishBase treats the trinomial as a synonym of *Squalidus japonicus* (Sauvage, 1883). Korean official and scholarly sources continue to use the infraspecific name for the Korean taxon.

### Synonym/history

The source is a recognized historical subspecies combination. International species-level treatment and domestic subspecies usage differ.

### Korean official source

NIBR uses `Squalidus japonicus coreanus` / 몰개.

### International source

- [FishBase synonym record: Squalidus japonicus coreanus](https://www.fishbase.se/Nomenclature/SynonymSummary.php?Author=%28Berg%2C+1906%29&Combination=new+combination&GSID=29440&GenusName=Squalidus&ID=146535&Misspelling=0&SpecCode=22921&SpeciesName=japonicus+coreanus&Status=synonym&SynonymsRef=559&Synonymy=junior+synonym), accessed 2026-08-31.
- [Korean mitochondrial genome record](https://pubmed.ncbi.nlm.nih.gov/26329666/), accessed 2026-08-31.
- [NIBR National Species List 2017, Vertebrates](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf), accessed 2026-08-31.

### Product scope

FRESHWATER; category B.

### Final classification

`PRODUCT_SCOPE_REVIEW_REQUIRED`

### Recommended action

`MOVE_TO_FUTURE_FRESHWATER_DOMAIN`

### Confidence

Overall 0.86.

## 7. 긴몰개

### Korean name

긴몰개 is confirmed by NIBR for the source trinomial.

### Original scientific name

`Squalidus gracilis majimae`

### Current accepted name

Eschmeyer's Catalog places this name in the synonymy of *Squalidus gracilis* (Temminck & Schlegel, 1846), while recording Korean usage of the endemic subspecies.

### Synonym/history

The source is a legitimate subspecies combination. International species-level synonymization and Korean infraspecific use coexist.

### Korean official source

NIBR uses `Squalidus gracilis majimae` / 긴몰개.

### International source

- [Eschmeyer's Catalog of Fishes: Squalidus gracilis majimae](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=54974), accessed 2026-08-31.
- [NIBR National Species List 2017, Vertebrates](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf), accessed 2026-08-31.
- [Recent Korean Squalidus review context](https://www.mdpi.com/2079-7737/15/14/1140), accessed 2026-08-31.

### Product scope

FRESHWATER; category B.

### Final classification

`PRODUCT_SCOPE_REVIEW_REQUIRED`

### Recommended action

`MOVE_TO_FUTURE_FRESHWATER_DOMAIN`

### Confidence

Overall 0.86.

## Staging Collision Audit

| Record | Scientific exact | Accepted-name | Alias | Korean | Internal ID | Slug |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| *Chaeturichthys jeoni* | 0 | 0 | 0 | 0 | 0 | 0 |
| 참홍어 | 0 for *Beringraja* | 0 for *Beringraja* | 0 | 1 existing canonical | 0 | 1 existing canonical |
| 열목어 | 0 | 0 | 0 | 0 | 0 | 0 |
| 끄리 | 0 | 0 | 0 | 0 | 0 | 0 |
| 참몰개 | 0 | 0 | 0 | 0 | 0 | 0 |
| 몰개 | 0 | 0 | 0 | 0 | 0 | 0 |
| 긴몰개 | 0 | 0 | 0 | 0 | 0 | 0 |

For 참홍어, the Korean-name and slug matches are the intended existing NIFS canonical, not an unrelated collision. No alias for either scientific combination was found in the audited surface.

## Import and Scale Impact

- Current staging species: 1,258
- Ready new-species import rows: 0
- Immediate post-review scale: 1,258
- Conditional maximum if all six non-existing source taxa are later approved without species-level collapse: 1,264
- 참홍어 changes species count by 0 because it is an update/alias plan for an existing row.

The conditional maximum is not an import authorization. Species-level synonym decisions for the freshwater taxa may reduce that number.

## Final Safety Statement

- species insert: 0
- species update: 0
- alias insert: 0
- source relation insert: 0
- lineage insert: 0
- DB write: 0
- Git add/commit/push: 0

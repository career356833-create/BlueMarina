# Yellowtail Temperature Source Lineage Review V1

## Decision

`LINEAGE_UNRESOLVED`. The 1958 paper prints an exact 10-20 degC statement using the English word "selecting," but it does not cite a source, report a selection method, derive either endpoint, or establish adult applicability. This review does not promote or normalize the range.

## Purpose

This review asks one narrow question: does direct original research show that wild adult *Seriola quinqueradiata* selected or preferred 10-20 degC? Background prose, catch distribution, encountered temperatures, cold-water avoidance, laboratory preference, and aquaculture ranges are not treated as interchangeable evidence.

## Starting claim

[Hatanaka and Murakawa (1958)](https://tohoku.repo.nii.ac.jp/record/64656/files/KJ00000713873.pdf), *Growth and Food Consumption in Young Amber-Fish, Seriola quinqueradiata*, states on page 69 that the species migrates in schools while "selecting coastal waters" of 10 to 20 degC.

The wording is exact: it does not say "around," "approximately," or "mainly." Numerical exactness in print is not the same as evidential precision, however. Neither endpoint has data, uncertainty, a calculation, or a citation.

## Source lineage map

```text
Hatanaka & Murakawa 1958
  source type: UNCITED_STATEMENT
  location: opening background paragraph
  wording: selecting coastal waters, 10-20 degC
  citation marker: none
  upstream source: unresolved
```

The paper lists seven references. None is cited at the temperature sentence. Reference `(4)`, *The Japan Fisheries Statistics Bulletin 32-32 (1956)*, appears in the following sentence and supports the listed 1952-1956 catch totals. Assigning it to the temperature statement would be a grammatical and evidential overreach. The remaining references cannot be attached to the claim merely because they occur in the bibliography.

## Originality and method

The paper's own work concerns seasonal growth, stomach contents, feeding rate, and food consumption:

- 62 field samples containing 1,371 specimens, mainly from coastal Miyagi Prefecture in 1956-1957
- feeding experiments on young fish weighing 28-1,530 g
- aquarium temperatures spanning 10.8-24.1 degC

That 10.8-24.1 degC span is the set of temperatures under which feeding experiments occurred. It is not the 10-20 degC claim and is not a choice, preference, telemetry, tagging, catch-temperature-bound, or resource-selection result. No analysis in the paper estimates thermal habitat selection.

## Semantics and Japanese terminology

The operative English word is `selecting`, so the literal prose suggests selected habitat rather than merely "found" or "caught." The validated class is nevertheless `UNCITED_SELECTED_WORDING`: the behavioral meaning is not supported by a stated method.

No Japanese source is cited for the sentence. Therefore this review cannot responsibly back-translate it into `選好`, `選択`, `好適`, `適水温`, `分布水温`, `生息水温`, `漁獲水温`, or `回遊水温`. The original Japanese semantic category, if one existed, remains unknown.

## Adult and wild applicability

The sentence itself does not identify age, size, maturity, year class, or season. Although it uses a general species-level construction, the paper and its summary focus on young and zero-year fish. The empirical field collection and captive feeding experiment do not establish that wild adults selected the stated range.

The introduction broadly describes both sides of Japan from Hokkaido to Formosa; actual samples were mainly from Miyagi Prefecture. Neither scope justifies direct generalization to Korean waters.

## Range origin

| Question | Finding |
| --- | --- |
| Origin of 10 degC | Undocumented |
| Origin of 20 degC | Undocumented |
| Observed min/max | No evidence in the paper |
| Selection range | No selection analysis |
| Seasonal range | Season not stated |
| Fishery catch range | Not stated |
| Literature synthesis | Possible, but untraceable |

## Modern corroboration

[Furukawa et al. (2020)](https://doi.org/10.3354/meps13226) implanted archival tags in 26 wild adults 61-90 cm fork length and analyzed eight recaptures. The fish used the mixed layer, crossed the thermocline, and appeared to avoid cold offshore water during southward movement. This is strong adult field evidence for temperature-related movement, but it does not estimate a selected 10-20 degC range.

[Ino et al. (2008)](https://doi.org/10.34423/jsfo.72.2_92) analyzed archival-tag migration in 26 recaptured fish aged four years or older. It establishes adult migration patterns, not thermal preference bounds.

[Park et al. (2024)](https://doi.org/10.47853/FAS.2024.e9) observed mean ambient temperatures of 20.65 +/- 0.36 degC and 16.52 +/- 1.86 degC in two adult-sized, PSAT-tagged fish. These are individual exposure means from a small, pre-held sample, not selected min/max values.

[Tian et al. (2012)](https://doi.org/10.1016/j.jmarsys.2011.09.002) found long-term associations among sea temperature, catch, migration, and distribution. Fishery-dependent association and modeled distribution do not validate a direct behavioral preference range.

Modern evidence therefore corroborates thermal association, seasonal migration, and cold-water avoidance only. It does not supply the missing lineage for the 1958 endpoints.

## Strict eligibility assessment

Strict eligibility is `NO`.

- No traceable primary source is attached to the 1958 claim.
- Wild adult/general applicability is not established.
- The word "selecting" is present, but no method supports selection semantics.
- The numeric endpoints and unit are explicit, but their origins are undocumented.
- Geography and season are too broad or absent.
- Modern adult evidence does not reproduce a selected 10-20 degC range.

The decision is `LINEAGE_UNRESOLVED`, rather than `CLAIM_DOWNGRADED_TO_OBSERVED_OR_DISTRIBUTION`, because the source literally uses selection wording while providing too little evidence to validate or reinterpret it.

## Preserved boundaries

- Promotion remains deferred even if a future source resolves the lineage.
- V2 and V3 remain byte-for-byte unchanged.
- No runtime, canonical, database, Supabase, comparator, or scoring behavior changes.
- The existing depth conflict remains separate: MBRIS <=200 m, FishBase <=100 m, canonical depth `null`.
- Normalization remains `NORMALIZATION_NOT_JUSTIFIED`; no score, weight, probability, ranking, or recommendation is produced.

# Preferred Wild Temperature Deep Research Batch 1 V1

## Decision

`NO_STRICT_EXPANSION`. No reviewed species met every strict criterion. This document is a research record, not a canonical promotion or product scoring input.

## Purpose and method

The review asked whether adult or generally applicable wild fish select a numeric temperature range. Korean, English, and Japanese official records, peer-reviewed field studies, telemetry/tagging papers, laboratory preference work, models, and aquaculture references were checked. Exposure, occurrence, modelled suitability, spawning, juvenile-only, captive, and culture ranges were kept semantically separate. Duplicate copies of the same paper were treated as one source.

## Source hierarchy

1. NIFS and Korean public fisheries institutions
2. Peer-reviewed wild field ecology and telemetry
3. J-STAGE and institutional full-text reports
4. FAO and FishBase reference trails

## 참돔 (Pagrus major)

- Decision: `PROMISING_BUT_LIMITED`
- Sources checked: 10 (3 official/public; 6 peer-reviewed candidates)
- Best evidence: Estimation of the Metabolic Rate of Wild Red Sea Bream Pagrus major in Different Water Temperatures
- Semantic class: `WILD_OBSERVED`; life stage: `adult`; geography: Japan, open sea shoal
- Strict eligible: no. Encountered temperature is not a selected or preferred range; n=1.
- Remaining gap: Adult wild telemetry provides an encountered range, but the study reports little behavioral response to temperature and does not estimate selection or preference.

## 조피볼락 (Sebastes schlegelii)

- Decision: `PROMISING_BUT_LIMITED`
- Sources checked: 10 (3 official/public; 7 peer-reviewed candidates)
- Best evidence: Short-Term Movement of MiniPAT-Tagged Coastal Fishes in the Yellow Sea: Case Studies on Korean Rockfish and Spotted Sea Bass
- Semantic class: `WILD_OBSERVED`; life stage: `adult_sized_unknown_maturity`; geography: Southwestern Korean coast, Yellow Sea
- Strict eligible: no. Individual means are observed exposure, not a selected population min/max range.
- Remaining gap: Korean field tags recorded adult-sized fish temperatures, but only individual means and variability were reported; no population min/max selection function was estimated.

## 방어 (Seriola quinqueradiata)

- Decision: `PROMISING_BUT_LIMITED`
- Sources checked: 11 (3 official/public; 6 peer-reviewed candidates)
- Best evidence: Growth and Food Consumption in Young Amber-Fish, Seriola quinqueradiata
- Semantic class: `WILD_SELECTED_HABITAT`; life stage: `general_statement; study focuses young fish`; geography: Coastal Japan
- Strict eligible: no. The range is a background assertion without a documented selection analysis or clear adult/general derivation in the paper.
- Remaining gap: A peer-reviewed paper states that schools select 10-20 degC coastal water, but the statement is background context rather than a documented adult selection analysis; modern adult tags report exposure and cold avoidance without a selected min/max range.

## Accepted and rejected evidence

All 22 evidence records are retained in the research dataset with source metadata and limitations. None is strict-eligible. “Accepted” therefore means retained as research context; every record also carries the exact reason it was rejected for strict promotion.

## Conflicts

No like-for-like adult wild preferred-temperature conflict was found because no strict range was found. The existing yellowtail depth conflict (MBRIS <=200 m versus FishBase <=100 m) remains untouched and separate from temperature.

## Boundaries

- V2 and V3 are immutable and unchanged.
- No runtime import, route, comparator, explanation, evidence bundle, alignment, source policy, suitability rule, database, or Supabase change is made.
- Normalization remains `NORMALIZATION_NOT_JUSTIFIED`. No score, weight, probability, ranking, or recommendation is produced.

## Next evidence need

A future promotion requires a source that directly estimates an adult/general wild selected or preferred temperature min/max range. Yellowtail’s 1958 10-20 degC statement should first be traced to its underlying empirical source; it must not be promoted from the background sentence alone.

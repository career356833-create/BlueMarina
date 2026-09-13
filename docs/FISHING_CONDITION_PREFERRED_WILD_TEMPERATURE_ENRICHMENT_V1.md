# Preferred Wild Temperature Evidence Enrichment V1

## Purpose

This audit revisits temperature evidence for the ten canonical Fishing Condition species. It prioritizes explicit wild preferred-temperature evidence while preserving source meaning, life stage, geography, and experimental context. Species identity and the frozen V2 artifact remain unchanged.

## Preferred Definition

`PREFERRED` requires an authoritative source to describe temperature preference, selection, a final preferendum, or an optimal habitat temperature. Mere occurrence is `OBSERVED`; AquaMaps remains `MODELLED`; culture growth optima remain `AQUACULTURE`; husbandry and laboratory development ranges remain `CAPTIVE`; spawning-only values remain `SPAWNING`.

Experimental preference results are retained as evidence, but they are not general wild ranges when restricted to juveniles, laboratory-reared fish, or acclimation treatments.

## Source Hierarchy

The audit searched Korean public sources and MBRIS first, then FishBase/AquaMaps, fisheries institutions, and peer-reviewed literature. The principal new source is Shuji Tsuchida's 2002 Marine Ecology Research Institute report, *Experimental study on temperature preference of Japanese marine fish*. The young black rockfish result comes from a 1997 peer-reviewed Japanese Society of Fisheries Science paper.

## Species Results

| Species | Preferred evidence result | Range (degC) | Context | V3 status |
| --- | --- | ---: | --- | --- |
| 참돔 | Added, limited | 18.4-25.4 | Wild-origin juvenile, laboratory acclimation experiment | PREFERRED_EVIDENCE_ENRICHED |
| 감성돔 | Added, limited | approx. 29-30 | Laboratory-reared juvenile final preferendum | PREFERRED_EVIDENCE_ENRICHED |
| 농어 | Added, limited | approx. 29-30 | Laboratory-reared juvenile final preferendum | PREFERRED_EVIDENCE_ENRICHED |
| 조피볼락 | Added, limited | 17.8-22.8 | Young fish, laboratory preference experiment | PREFERRED_EVIDENCE_ENRICHED |
| 넙치 | No new preferred range | 20-25 evidence remains aquaculture growth optimum | Not wild preference | PARTIAL |
| 갈치 | Not found | - | Nursery occurrence and habitat models are not preference | PREFERRED_NOT_FOUND |
| 고등어 | Existing strict evidence retained | 15-16 | Korean MBRIS preferred-temperature evidence | PREFERRED_EVIDENCE_ENRICHED |
| 방어 | Added, limited | 20.8-27.2 | Wild-origin juvenile, laboratory acclimation experiment | CONFLICT_REVIEW_REQUIRED |
| 주꾸미 | Not found | - | Available 18-24 evidence is captive embryo development | PREFERRED_NOT_FOUND |
| 문어 | No new general preferred range | - | Wild immature exposure and captive husbandry remain separate | PARTIAL |

The five additions enrich preference evidence but do not replace any canonical V2 temperature range. They do not produce a new strict candidate.

## Conflict Handling

Ranges are never averaged, intersected, or unioned automatically. The existing 방어 `depth.observed` conflict between MBRIS and FishBase remains `CONFLICT_REVIEW_REQUIRED`; temperature enrichment does not conceal or resolve it. The existing 고등어 15-16 degC canonical range is retained without automatic replacement.

## Strict Candidate Criteria

A strict temperature candidate requires numeric min/max values, confirmed degrees Celsius, explicit `PREFERRED` meaning, general wild and non-aquaculture context, evidence references, no unresolved field conflict, and compatibility with current comparator policy and gates.

Before this audit: strict 1, limited 6, not ready 3.

After this audit: strict 1, limited 7, not ready 2. 방어 moves only from not ready to limited because the new evidence is juvenile and laboratory-acclimated.

## Remaining Gaps

- No qualifying general wild preferred-temperature range was found for 갈치 or 주꾸미.
- 참돔, 감성돔, 농어, 조피볼락, and 방어 need field evidence or broader life-stage validation before strict promotion.
- 넙치 culture-growth evidence and 문어 captive/immature observations cannot be promoted.
- Geographic transfer from Japanese experiments to Korean field conditions is not assumed.

## Runtime Boundary

V3 is an inactive research candidate. Runtime routes continue to use V2. Numeric score, probability, ranking, weighting, recommendation, database writes, Supabase changes, and external LLM calls are prohibited. The normalization decision remains `NORMALIZATION_NOT_JUSTIFIED`; further scoring requires a separate readiness audit.

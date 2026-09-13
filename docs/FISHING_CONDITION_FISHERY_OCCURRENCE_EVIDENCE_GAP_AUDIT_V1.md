# Fishing Condition Fishery Occurrence Evidence Gap Audit V1

## Purpose

This offline audit identifies where source-backed monthly catch or field-occurrence research may be feasible for the ten Species Environment Profile V2 identities. It adds no `FISHERY_OCCURRENCE` evidence and does not alter the seasonality index or runtime.

## Definition And Biological Boundaries

`FISHERY_OCCURRENCE` means that a source records a canonical species as caught or observed during an explicit month or period. Spawning and migration describe different biological contexts and cannot be reused as occurrence. Habitat models, general distributions, aquaculture production, consumer calendars, blogs, and operator promotions are also ineligible.

## Landing Is Not Abundance

Monthly production or market landing can establish a fishery-dependent record, but a higher landing does not establish greater natural abundance or better fishing. Landings can change with vessel and trip effort, gear, quota, closed seasons, weather, market price, reporting coverage, and whether catches enter a market. Capture and aquaculture must remain separate.

## CPUE Caveat

Effort-normalized catch per unit effort can be more informative than raw landings, but remains specific to fleet, gear, region, time, and reporting method. CPUE is not a catch probability and is not interchangeable with a fishery-independent survey.

## Fishery-Independent Surveys

Scientific survey occurrence can reduce commercial-effort bias, while still being limited by stations, survey gear, sampling frequency, season, detection, and life stage. Survey occurrence and commercial catch stay as separate evidence subtypes.

## Official Candidate Inventory

- KOSIS table `DT_1EW0004`, `어업별 품종별 통계`, exposes official monthly files. Product-code identity, capture/aquaculture scope, and region dimensions require a dedicated contract audit.
- MOF public dataset `15012417` describes dated cooperative and market records with fish standard code, quantity, weight, price, and fishery. It is market landing, not CPUE or total natural occurrence.
- NIFS marine-fisheries forecast bulletins contain useful species, fishery, area, and period narratives, but observed and forecast statements must be separated and publication continuity must be audited.
- NIFS environment APIs measure ocean conditions, not species occurrence. The local NIFS fish-resource snapshot has annual catch histories for exact canonical matches 고등어, 주꾸미, and 문어/대문어. Its `periodList` is consumer guidance, not monthly occurrence.

## Regulation And Identity Risks

Closed seasons, minimum sizes, quota, and local management can suppress or redirect recorded catch without biological absence. Statistics labeled 농어류, 넙치류, 방어류, 문어류, or another group cannot be attached to one canonical species. 갈치 also requires resolution of the local NIFS `Trichiurus lepturus` label against canonical `Trichiurus japonicus` before use.

## Species Gaps

| Species | Monthly potential | Main blocking issue | Cost | Research priority |
| --- | --- | --- | --- | --- |
| 참돔 | High | capture/aquaculture and effort separation | Medium | Medium |
| 감성돔 | Medium | recreational omission and closed-season bias | High | Low |
| 농어 | Medium | 농어류 identity and gear scope | High | Low |
| 조피볼락 | Medium | aquaculture dominance versus wild occurrence | High | Low |
| 넙치 | High | flatfish grouping and aquaculture dominance | Very high | Low |
| 갈치 | High | canonical taxonomy and fishery mix | Medium | High |
| 고등어 | High | product code, fleet effort, and closure | Low | High |
| 방어 | High | wild/aquaculture/import and group labels | High | Medium |
| 주꾸미 | High | gear and local management effects | Medium | High |
| 문어 | Medium | 문어류 versus 대문어 identity | Very high | Low |

## Next Research Batch

The bounded first batch is 고등어, 갈치, and 주꾸미. These have the strongest official monthly or dated-landing discovery path and practical service value. This priority orders research work only; it is not a species grade. Each candidate remains blocked from conversion until source codes, capture scope, geography, effort, and regulation effects are verified.

## No-Probability Boundary

The decision `CLEAR_OCCURRENCE_RESEARCH_TARGETS_IDENTIFIED` authorizes only a later evidence-discovery task. This audit creates no score, normalization, weighting, probability, product ordering, advice, or runtime behavior.

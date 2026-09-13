# Wild Preferred Temperature Source Gap Audit V1

## Purpose

This audit explains why nine Fishing Condition species remain non-strict after Preferred Wild Temperature Evidence Enrichment V1. It adds no evidence, changes no preferred range, and does not activate V3. 고등어 remains the single strict control.

## Strict Definition

A strict temperature candidate needs numeric minimum and maximum values in confirmed degrees Celsius, explicit preferred-temperature meaning, wild and generally applicable context, non-aquaculture and non-captive evidence, traceable evidence references, sufficient source authority, no unresolved temperature conflict, and compatibility with the Comparator, Source Policy, and gates.

## Gap Dimensions

- **Source gap:** no document currently supplies all strict requirements.
- **Semantic gap:** available material describes observation, modelling, culture, husbandry, or spawning rather than wild preference.
- **Applicability gap:** explicit preference exists but is restricted by life stage, laboratory treatment, captivity, or geography.
- **Conflict gap:** two preferred-temperature sources conflict. No temperature conflict is currently recorded among the nine species.

The audit finds 9 source gaps, 4 semantic gaps, 8 applicability gaps, and 0 temperature conflict gaps.

## Species Matrix

| Species | Current state | Primary gap | Strict conversion requirement | Cost | Priority | Outlook |
| --- | --- | --- | --- | --- | --- | --- |
| 참돔 | 18.4-25.4 degC wild-origin juvenile lab experiment; modelled range also present | Juvenile, acclimation, Japan | Korean/Northwest Pacific adult field selection or telemetry range | MEDIUM | HIGH | STRICT_LIKELY_WITH_FIELD_SOURCE |
| 감성돔 | Approx. 29-30°C lab-reared juvenile final preferendum | Captive juvenile, approximate, Japan | Explicit adult wild numeric preference evidence | HIGH | MEDIUM | STRICT_LIKELY_WITH_ADULT_PREFERENCE_STUDY |
| 농어 | Approx. 29-30°C lab-reared juvenile final preferendum | Captive juvenile, approximate, Japan | Adult wild field, telemetry, or wild-origin preference evidence | HIGH | MEDIUM | STRICT_LIKELY_WITH_ADULT_PREFERENCE_STUDY |
| 조피볼락 | 17.8-22.8°C young-fish preference experiment | Young life stage, laboratory, Japan | Adult or life-stage-general Korean field range | MEDIUM | HIGH | STRICT_LIKELY_WITH_FIELD_SOURCE |
| 넙치 | Modelled range, spawning range, culture growth optimum | Semantic and context mismatch | Wild adult selection outside spawning context | HIGH | MEDIUM | STRICT_LIKELY_WITH_FIELD_SOURCE |
| 갈치 | Habitat, occurrence, and distribution material only | No explicit preferred semantics | Wild tagging, field selection, or behavioral preference range | VERY_HIGH | MEDIUM | STRICT_UNCERTAIN |
| 방어 | 20.8-27.2°C wild-origin juvenile lab experiment; aquaculture optima | Juvenile, acclimation, Japan | General wild adult or multi-stage field/telemetry range | MEDIUM | HIGH | STRICT_LIKELY_WITH_FIELD_SOURCE |
| 주꾸미 | Captive broodstock/hatchling condition only | Captive and life-stage semantic mismatch | Adult wild selection or wild-origin adult experiment | HIGH | MEDIUM | STRICT_UNCERTAIN |
| 문어 | Wild immature occurrence plus captive husbandry | Observation, captivity, immature regional scope | Adult wild telemetry or explicit field selection range | VERY_HIGH | LOW | STRICT_UNLIKELY_WITH_CURRENT_EVIDENCE |

## Context Boundaries

Juvenile and young-fish experiments remain life-stage restricted. Captive and aquaculture ranges remain separate from wild evidence. AquaMaps remains modelled distribution evidence. Spawning ranges remain spawning-only. None is promoted to general wild preference.

방어 retains its unrelated `depth.observed` conflict: MBRIS reports <=200m while FishBase reports <=100m, and canonical depth remains null. This is not a temperature conflict and does not silently resolve or merge during this audit.

## Source Order

Future research should inspect NIFS, MBRIS, peer-reviewed field ecology and fisheries studies, telemetry or tagging studies, behavioral preference experiments on wild-origin adults, FAO/ICES/NOAA/J-STAGE authorities, and FishBase primary-source trails. AquaMaps is excluded as a strict source target.

## Next Research Batch

The bounded next batch is 참돔, 조피볼락, and 방어. Each already has explicit experimental preference evidence, a clearly identified adult/field applicability gap, commercial relevance, and plausible Korean or Japanese field-literature targets. This is a categorical research priority, not a score or numeric ranking.

Suggested query intents are stored species-by-species in the JSON report. The next task may search for adult wild field selection, telemetry, seasonal habitat selection, and wild-origin adult preference studies; this audit does not collect or add those sources.

## Scoring Boundary

V2 and V3 remain immutable, V3 stays `INACTIVE_RESEARCH_CANDIDATE`, and runtime continues to use V2. Numeric scoring, normalization, weighting, probability, ordering, product advice, database writes, Supabase changes, and AI calls remain prohibited. The normalization decision remains `NORMALIZATION_NOT_JUSTIFIED`.

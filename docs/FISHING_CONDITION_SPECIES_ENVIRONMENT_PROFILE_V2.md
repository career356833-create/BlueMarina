# Fishing Condition Species Environment Profile V2

## Purpose

V2 enriches the same ten canonical species used by V1 with source-backed environmental evidence. It remains an evidence profile, not a fishing score or recommendation system.

## V1 protection and identity

- V1 remains unchanged at `data/fishing-condition/species-environment/v1/species-environment-profiles.json`.
- V1 SHA-256: `095f481cad0f7350b75d6264231443cca576ff161edaf9290418a2610184d99f`.
- V2 preserves every V1 `speciesId`, `slug`, `scientificName`, and `koreanName`.
- New evidence is joined by canonical `speciesId`; no name-only identity is created.

## Enrichment method

The source order is NIFS, MBRIS, FAO, FishBase, WoRMS, official research institutions, peer-reviewed papers, and public research reports. Korea-specific evidence takes precedence when its context matches the field. Global or other regional evidence remains separately labelled rather than being merged into a Korean range.

The main V2 temperature additions use FishBase's explicitly labelled AquaMaps modelled preferred-temperature ranges. These are stored as `MODELLED_PREFERRED_TEMPERATURE_AQUAMAPS`, not as field-observed Korean temperatures. The Japanese amberjack additions come from the FAO cultured-species programme and remain explicitly aquaculture and life-stage specific. Giant Pacific octopus field observations remain `OTHER_REGIONAL` and `IMMATURE`.

## Temperature evidence taxonomy

- `preferred`: only a source that explicitly describes preferred, optimum, or modelled preferred temperature.
- `observed`: occurrence, habitat, or fishery observations with both bounds present.
- `spawning`: spawning-only temperature; never promoted to general preference.
- aquaculture and husbandry ranges retain `NOT_WILD_PREFERENCE` in their context.
- tolerance, survival, lethal, and behavioural thresholds are not merged with preferred or observed ranges.
- a missing bound remains missing; no interpolation is allowed.

V2 raises temperature field coverage from 3/10 to 9/10 and complete Comparator range coverage from 2/10 to 9/10. `Trichiurus japonicus` remains unsupported because the reviewed authority sources did not provide a complete source-backed range suitable for this contract.

## Salinity and dissolved oxygen

Source units are preserved. `ppt`, `% saturation`, and undocumented practical salinity are not silently converted. NIFS FEMO salinity remains runtime-blocked because its source contract still reports `UNIT_NOT_DOCUMENTED`.

For `Seriola quinqueradiata`, FAO's aquaculture optimum salinity is stored in its source unit as 30-36 `permille`; it is not silently relabelled as PSU. The 4.3 mg/L value is stored specifically as an aquaculture behavioural-abnormality threshold, not a mortality threshold or wild minimum. Giant Pacific octopus husbandry DO remains 85-95% saturation and is not converted to mg/L, so it is not a canonical Comparator minimum.

## Life stage and regional scope

Adult and juvenile amberjack temperature ranges remain separate. Immature giant Pacific octopus field temperatures and seasonal movements remain separate from captive husbandry ranges. V2 uses `KOREA`, `NORTHWEST_PACIFIC`, `GLOBAL`, and `OTHER_REGIONAL`; it does not generalize an `OTHER_REGIONAL` value to Korea.

## Seasonality and activity

`SPAWNING`, `MIGRATION`, and `FISHERY_OCCURRENCE` remain separate Comparator contexts. FAO's 200 m contour spawning description and southward spawning migration for Japanese amberjack are stored separately without changing its conflicted general depth range. Giant Pacific octopus month-based shallow/deep movement is added as migration evidence. A season name is never converted automatically into months. Activity remains unchanged unless a species-specific diel classification is explicitly supported; broad reef or fisheries behaviour is not enough.

## Conflict policy

The `Seriola quinqueradiata` depth conflict remains `CONFLICT_REVIEW_REQUIRED`: MBRIS reports up to 200 m while FishBase reports up to 100 m. The values remain source-specific, canonical depth remains null, and no average or expanded range is manufactured. New temperature, salinity, and DO evidence does not resolve an unrelated depth conflict.

## Source set

- FishBase species summaries and AquaMaps preferred-temperature model, Ref. 123201:
  - https://www.fishbase.se/summary/Pagrus-major.html
  - https://www.fishbase.se/summary/6531
  - https://www.fishbase.se/summary/Lateolabrax-japonicus.html
  - https://www.fishbase.se/summary/6534
  - https://www.fishbase.se/summary/Paralichthys_olivaceus.html
  - https://www.fishbase.se/summary/Scomber-japonicus.html
- FAO cultured-species profile for Japanese amberjack:
  - https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_japaneseamberjack.htm
- Hokkaido University giant Pacific octopus field ecology:
  - https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/52601/3/PatriciaRRigby_2004.pdf
- Hokkaido Research Organization seasonal migration study:
  - https://doi.org/10.2331/suisan.25-00036
- Peer-reviewed giant Pacific octopus husbandry survey:
  - https://doi.org/10.3390/vetsci10070448

Only short structured ranges and summaries are retained. Long source text is not copied into runtime artifacts.

## Runtime and Comparator impact

`GET /api/fishing-condition/species-environment` now reads V2 and returns `version: "v2"`. Comparator relation logic is unchanged. It consumes the newly complete ranges and preserves evidence IDs, range context, life stage, and regional scope. Explanation Layer V1 continues to describe the resulting relation and evidence without changing it.

Salinity runtime comparability remains 0 because the NIFS salinity unit is undocumented. DO comparability becomes 1 species through a documented mg/L threshold. The anomaly boundary remains unchanged.

## No-score boundary

V2 does not add suitability scores, fishing scores, catch probabilities, rankings, recommendations, best-species output, database writes, or Supabase mutations.

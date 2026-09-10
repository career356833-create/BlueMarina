# Fishing Condition Species Environment Profile V1

## Scope

V1 is a source-backed registry for ten canonical Blue Marina species. It stores ecological facts for later engine use, but it does not compare observations with profiles and does not emit suitability scores, fishing probabilities, rankings, or point recommendations.

The profile identity is joined to the frozen Fish canonical baseline through the stable MBRIS internal ID. Korean or scientific names are verification fields, never the join key. The profile domain remains separate from FishSpecies and does not change Supabase.

## Source hierarchy

1. NIFS or another Korean public authority
2. MBRIS, operated by the National Marine Biodiversity Institute of Korea
3. FAO and FishBase
4. WoRMS for taxonomic identity
5. Peer-reviewed papers and public research institutes

Blogs, fishing communities, shops, videos, and undocumented angling heuristics are excluded. V1 uses MBRIS as the primary Korean ecological source where detail records exist. FishBase and papers provide scoped corroboration or additional regional facts. NIFS contributed no species-environment fact to this first profile set.

## Canonical identity

| Korean name | Species ID | Scientific name | Slug |
| --- | --- | --- | --- |
| 참돔 | BM-SPECIES-000755 | Pagrus major | pagrus-major |
| 감성돔 | BM-SPECIES-000751 | Acanthopagrus schlegelii | acanthopagrus-schlegelii |
| 농어 | BM-SPECIES-000188 | Lateolabrax japonicus | lateolabrax-japonicus |
| 조피볼락 | BM-SPECIES-000012 | Sebastes schlegelii | sebastes-schlegelii |
| 넙치 | BM-SPECIES-000465 | Paralichthys olivaceus | paralichthys-olivaceus |
| 갈치 | BM-SPECIES-000444 | Trichiurus japonicus | trichiurus-japonicus |
| 고등어 | BM-SPECIES-000417 | Scomber japonicus | scomber-japonicus |
| 방어 | BM-SPECIES-000501 | Seriola quinqueradiata | seriola-quinqueradiata |
| 주꾸미 | BM-SPECIES-003107 | Amphioctopus fangsiao | webfoot-octopus |
| 문어 | BM-SPECIES-003111 | Enteroctopus dofleini | enteroctopus-dofleini |

Approved aliases are copied only when useful for lookup: 광어, 은갈치, 쭈꾸미. Rejected or aggregate aliases are not promoted.

## Contract rules

- Temperature facts are separated into observed, preferred, and spawning contexts.
- Depth facts are separated into observed habitat, fishing depth, spawning depth, juvenile depth, and adult depth.
- Every numeric range carries life-stage, regional scope, context, and evidence references.
- Month values are stored only when a source gives months. Seasonal words remain seasons and are not converted to months.
- Captive rearing conditions are explicitly labeled and never treated as wild preference or physiological thresholds.
- Salinity and dissolved oxygen remain null unless a source supplies values and context.
- Activity is one of `DIURNAL`, `NOCTURNAL`, `CREPUSCULAR`, `MIXED`, or `UNKNOWN`.
- Missing values remain null, empty, or listed in `unsupportedFields`. Genus, family, or neighboring-species averages are forbidden.

## Habitat mapping

Source descriptions map conservatively to these V1 categories:

| Source wording | Category |
| --- | --- |
| 암초, 바위틈, rocky reef | ROCKY_REEF |
| 연안, 내만 | COASTAL |
| 하구, 기수역 | ESTUARY |
| 원양·근해 또는 대륙붕 외측 맥락 | OFFSHORE |
| 표층·중표층 회유 | PELAGIC |
| 저층·저서 생활 | DEMERSAL |
| 해조류 서식 또는 켈프 연계 | SEAGRASS |
| 모래 바닥 | SANDY_BOTTOM |
| 진흙 바닥 | MUDDY_BOTTOM |

Substrate categories are `ROCK`, `SAND`, `MUD`, `GRAVEL`, `MIXED`, and `UNKNOWN`. A category is emitted only when the evidence summary supports it.

## Confidence

- `HIGH`: multiple authoritative sources agree, or a detailed Korean authority source is corroborated.
- `MEDIUM`: one authoritative source, limited regional evidence, or substantial unknown fields.
- `LOW`: sparse or indirect evidence. No V1 profile currently relies on low-confidence facts.
- `UNKNOWN`: unsupported profile-level evidence.

Confidence is categorical provenance metadata, not an environmental suitability score.

## Conflict policy

Source ranges are never averaged. The Korean MBRIS record places 방어 within 200 m, while FishBase lists a 100 m maximum. Both scoped facts are preserved; canonical observed depth is null and the profile is `CONFLICT_REVIEW_REQUIRED`.

Different regional or life-stage ranges are retained without declaring a conflict when their scopes explain the difference. For example, Korean 문어 depth and Alaskan survey depth remain separate regional observations.

## Evidence and missing data

Every structured fact references one or more evidence IDs. Evidence stores source type, title, URL, publication year where known, regional scope, fact type, and a short summary. It does not copy long source text or raw documents.

The audit report lists unsupported fields per species and coverage for temperature, depth, salinity, dissolved oxygen, habitat, spawning, migration, and activity.

## Runtime boundary

`GET /api/fishing-condition/species-environment` accepts exactly one filter:

- `speciesId=BM-SPECIES-000755`
- `slug=pagrus-major`

The route reads the local canonical artifact only. It has no mutation method, database access, remote fetch, observation comparison, or recommendation logic.

## Engine registry

The registry exposes four profile-only features:

- `speciesEnvironment.temperature`
- `speciesEnvironment.depth`
- `speciesEnvironment.habitat`
- `speciesEnvironment.seasonality`

All are marked `PROFILE_ONLY_NO_COMPARISON`. Connecting observation matching, station crosswalk, anomaly use, scoring, probability, and recommendations remain out of scope.

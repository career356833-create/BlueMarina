# Fishing Condition Official Data Sources V2

## Decision

`NIFS_RISA_FEMO_SOO_AND_SOO_CLIMATOLOGY_CONNECTED`

The NIFS real-time fishing-ground observation service, periodic fishery-environment observations, historical serial-ocean vertical profiles, and a derived 2016-2025 monthly exact-depth water-temperature climatology are connected runtime inputs. Environmental time series remain outside canonical Fish and Marine Organism records.

## Source status

| Source | Class | Status | Runtime use | Limitation |
| --- | --- | --- | --- | --- |
| NIFS `risaCode` + `risaList` | OBSERVED | CONNECTED | Surface/middle/bottom water temperature | Source timezone not documented; 2 current station snapshots unavailable by age |
| NIFS coastal stationary observations | OBSERVED | LIVE_VALIDATED | Candidate later-phase source | Not connected in this phase |
| NIFS `sooCode` + `sooList` serial ocean observations | HISTORICAL_OCEANOGRAPHIC_PROFILE | CONNECTED_HISTORICAL_PROFILE_SOURCE | Historical vertical profiles and derived monthly exact-depth temperature baseline | Units, timezone, and QC meanings are not documented; anomaly and score remain blocked |
| NIFS `femoSeaList` seawater | OBSERVED_PERIODIC_ENVIRONMENT | CONNECTED_RUNTIME_SOURCE_PERIODIC | Surface/bottom environmental samples | 2-3 month cadence; source timezone and salinity unit are not documented |
| NIFS red tide | EVENT | LIVE_VALIDATED_CONTRACT_DRIFT | Candidate hazard input | Current detail uses `cod_news`, not legacy `srcode` |
| NIFS jellyfish | EVENT | LIVE_PARTIAL | Candidate hazard input | Current weekly list/detail join is limited |
| NIFS satellite ocean imagery metadata | REMOTE_SENSING | LIVE_VALIDATED_CURRENT_WINDOW_EMPTY | Candidate signal input | Image assets were not downloaded |
| NIFS species information | REFERENCE | LIVE_VALIDATED_CODE_DRIFT | Identity/reference only | Current fish classification uses `LV/FS` |

## Connected source facts

- station metadata: 41 active, 41 valid coordinates
- latest observations: 65 depth rows across 41 exact station IDs
- depth rows: 41 surface, 17 middle, 7 bottom
- temperature: 65 present, 0 missing in the inspected snapshot
- source state: 63 normal rows, 2 maintenance rows
- freshness: 39 fresh stations, 0 stale, 2 unavailable
- browser response: normalized JSON only

## Boundary

The route is `/api/fishing-condition/environment/realtime`, not `/api/sea-info/**`. The source is identified as provider `NIFS`, source ID `nifs-risa`, quality class `OBSERVED`. No score, probability, ranking, recommendation, database write, or Supabase change is part of V2.

See `NIFS_REALTIME_FISHING_ENVIRONMENT_V1.md` and `reports/nifs/realtime-fishing-environment-quality-v1.json` for the contract and live evidence.

## Periodic fishery environment source

- live response: 255 rows, 253 unique samples after removing two exact duplicates
- identity: exact `FISHERY + LOCATION_POINT + sampledAt`; no fuzzy matching
- coordinates: 253/253 normalized
- depth: paired source surface/bottom measurements with source water depth 1-126 m
- period: 2025-09-25 through 2025-11-05 in the bounded one-year request
- variables: temperature, salinity, pH, DO, COD, nutrients, chlorophyll-a, and suspended solids
- route: `/api/fishing-condition/environment/fishery`
- source metadata: `NIFS`, `nifs-femo-sea`, `OBSERVED_PERIODIC_ENVIRONMENT`
- cache: 24 hours; stale-delivery fallback: seven days

This source does not share RISA freshness rules and does not add a score or recommendation. See `NIFS_FISHERY_ENVIRONMENT_V1.md` and `reports/nifs/fishery-environment-quality-v1.json`.

## Historical ocean-section source

- metadata: 358 exact station pairs across 33 historical line codes; 212 end-date-unset and 146 ended records
- modern bounded profile window: 207 stations, 8,912 rows grouped into 1,417 vertical profiles
- depths: 14 source values from 0 through 500; 947 valid zero-depth rows
- identity: exact `sln_cde + sta_cde`; no name or coordinate matching
- QC: `qc_wtr`, `qc_sal`, and `qc_dox` retained raw; no undocumented interpretation
- route: `/api/fishing-condition/environment/ocean-section`
- source metadata: `NIFS`, `nifs-soo`, `HISTORICAL_OCEANOGRAPHIC_PROFILE`
- cache: 12 hours for profile windows, 24 hours for metadata, bounded seven-day stale fallback

All 11 numerical field units and the source timezone remain explicitly undocumented. See `NIFS_OCEAN_SECTION_V1.md` and `reports/nifs/ocean-section-quality-v1.json`.

## Derived monthly depth climatology

- history window: ten complete calendar years, 2016-2025
- key: exact `stationId + calendarMonth + source depth value`
- public variable: water temperature
- metrics: mean, median, min, max, sample standard deviation (`n - 1`), sample count, and year count
- availability gate: at least three distinct observation events
- QC: raw code distributions retained; no undocumented QC interpretation or filtering
- artifact: month-chunked NDJSON with a checksum manifest
- route: `/api/fishing-condition/climatology/ocean-section`
- source metadata: `NIFS`, `nifs-soo-climatology`, `DERIVED_HISTORICAL_BASELINE`, derived from `nifs-soo`

The derived contract uses `depthValue` rather than claiming meters because the official unit remains undocumented. RISA-to-SOO station mapping, RISA layer-to-exact-depth mapping, and unit compatibility are all unverified, so temperature anomaly remains `ANOMALY_MAPPING_BLOCKED` and no anomaly route exists. No suitability, score, probability, ranking, recommendation, database write, or Supabase change is part of this feature. See `NIFS_OCEAN_SECTION_CLIMATOLOGY_V1.md` and `reports/nifs/ocean-section-climatology-quality-v1.json`.

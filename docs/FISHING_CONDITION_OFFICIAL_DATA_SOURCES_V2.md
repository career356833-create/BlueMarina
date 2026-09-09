# Fishing Condition Official Data Sources V2

## Decision

`NIFS_RISA_AND_FEMO_RUNTIME_CONNECTED`

The NIFS real-time fishing-ground observation service and periodic fishery-environment seawater observations are connected runtime inputs. Environmental time series remain outside canonical Fish and Marine Organism records.

## Source status

| Source | Class | Status | Runtime use | Limitation |
| --- | --- | --- | --- | --- |
| NIFS `risaCode` + `risaList` | OBSERVED | CONNECTED | Surface/middle/bottom water temperature | Source timezone not documented; 2 current station snapshots unavailable by age |
| NIFS coastal stationary observations | OBSERVED | LIVE_VALIDATED | Candidate later-phase source | Not connected in this phase |
| NIFS serial ocean observations | OBSERVED | LIVE_VALIDATED | Candidate later-phase source | Not connected in this phase |
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

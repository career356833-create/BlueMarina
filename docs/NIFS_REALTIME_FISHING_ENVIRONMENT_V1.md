# NIFS Realtime Fishing Environment V1

## Status

`NIFS_RISA_RUNTIME_CONNECTED`

Blue Marina uses the NIFS `실시간어장정보` service as the first observed runtime input for the Fishing Condition Engine. It is not part of Marine Navigation and does not calculate fishing scores, probabilities, rankings, or species recommendations.

## Official contract

| Purpose | Operation | Required parameters | Cadence |
| --- | --- | --- | --- |
| Active station metadata | `risaCode` | `key`; optional `gru_nam`, `use_yn` | On change |
| Latest observations | `risaList` | `key` | 30 minutes |

The server uses the NIFS JSON endpoints. The credential remains server-only as `NIFS_RISA_API_KEY`; it is never returned to the browser and does not fall back to KMA, KHOA, or another NIFS service key.

## Live contract

The 2026-09-09 live snapshot returned 41 station metadata rows and 65 observation rows for 41 distinct station IDs. All 41 observation IDs joined exactly to metadata and all 41 metadata rows had valid coordinates. The earlier count of 82 active stations could not be reproduced by a single current metadata response and is superseded by the verified count of 41.

The 65 observation rows are not 65 stations. They are depth rows:

- surface (`obs_lay=1`): 41
- middle (`obs_lay=2`): 17
- bottom (`obs_lay=3`): 7

Rows are grouped only by exact `sta_cde` plus `obs_dat` and `obs_tim`. Names are not used for fuzzy matching. The current snapshot had zero duplicate station/time/layer rows and zero unknown layers.

## Normalization

Station metadata preserves `sta_cde`, official Korean name, region, coordinates, and source-provided surface/middle/bottom depth metres. Observation rows preserve the raw date/time pair, layer, temperature, maintenance state, and undocumented `rpr_yn` flag when present.

The public response groups the latest depth rows into:

```ts
type FishingConditionRealtimeEnvironment = {
  stationId: string;
  stationName: string;
  latitude: number | null;
  longitude: number | null;
  observedAt: string;
  sourceTimezone: "UNSPECIFIED_BY_NIFS";
  waterTemperature: {
    surfaceC: number | null;
    middleC: number | null;
    bottomC: number | null;
    unknownDepthC: number[];
    unit: "degC";
  };
  qualityClass: "OBSERVED";
  provider: "NIFS";
  sourceId: "nifs-risa";
};
```

The OpenAPI table identifies `wtr_tmp` as water temperature but does not print a unit. `degC` is retained from the NIFS RISA observation UI evidence already recorded in the source audit. This limitation must remain visible in provenance.

## Time and freshness

`obs_dat` and `obs_tim` are combined without adding a UTC offset. The OpenAPI guide does not document timezone, so the canonical value remains source-local and is labelled `UNSPECIFIED_BY_NIFS`.

For runtime stale protection only, source-local timestamps are compared with the Asia/Seoul operational wall clock. This is an explicit operational assumption, not a claim that the API contract documents KST.

- server cache: 10 minutes
- fresh: no older than 45 minutes
- stale: older than 45 minutes and no older than 2 hours
- unavailable: older than 2 hours or invalid/missing timestamp
- stale cache fallback: at most 2 hours after the last successful fetch

At the live snapshot, 39 stations were fresh and 2 were unavailable. The newest source-local timestamp was `2026-09-09T00:00:00`; the oldest returned timestamp was `2026-04-16T10:30:00`.

## Missing values and quality

Blank and null values normalize to null. Zero is preserved. No numeric sentinel was observed in the inspected live response, so values such as `-9`, `-99`, or `-999` are not silently treated as null. Sixty-three rows were normal and two were marked maintenance.

## Runtime boundary

The endpoint is `GET /api/fishing-condition/environment/realtime`. It returns normalized stations, source metadata, freshness, and quality counts. It never returns the raw NIFS payload or authenticated upstream URL.

An upstream failure affects only this route. `/api/sea-info/**`, KMA weather, KHOA ROMS, tide, Fish pages, and Fishing Spots remain independent. No Supabase schema or data is used.

## Engine input registry

The registered inputs are `waterTemperature.surfaceC`, `waterTemperature.middleC`, and `waterTemperature.bottomC`, each labelled `OBSERVED`, `NIFS`, and `nifs-risa`. Prediction logic remains deliberately absent.

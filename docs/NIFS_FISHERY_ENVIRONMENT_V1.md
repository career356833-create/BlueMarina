# NIFS Fishery Environment Runtime Source V1

## Status

`CONNECTED_RUNTIME_SOURCE_PERIODIC`

Blue Marina uses the NIFS fishery-environment seawater observations as a periodic, source-backed input to the Fishing Condition Engine. It remains separate from Marine Navigation, canonical Fish data, and the 30-minute NIFS RISA feed. It does not calculate scores, probabilities, rankings, or recommendations.

## Official source and request

- Service: NIFS `어장환경관측자료` seawater observations
- Operation: `femoSeaList`
- JSON endpoint: `https://www.nifs.go.kr/OpenAPI_json?id=femoSeaList`
- Required parameters: `key`, `sdate`, `edate`
- Date format: `yyyyMMdd`
- Maximum request window: one year
- Documented publication cadence: every 2-3 months
- Runtime credential: server-only `NIFS_FEMO_API_KEY`

The bounded live request covered 2025-09-09 through 2026-09-09. It returned HTTP 200, result code `00`, 255 rows, and a 180,193-byte JSON response in 293 ms. The freshwater operation `femoRivList` was not called.

## Identity and duplicate policy

The source has no standalone immutable site ID. Blue Marina therefore uses the documented composite identity `FISHERY + LOCATION_POINT`; a source record adds the source-local sampling timestamp. No fuzzy name or coordinate matching is used.

The live response contained 253 unique composite source records and two byte-equivalent duplicate rows. Exact duplicates are disclosed and collapsed. A duplicate identity with different values is separately counted as a conflict and the first source row is retained.

## Depth semantics

Each source row contains paired surface (`*_S`) and bottom (`*_B`) measurements plus one `DEPTH` value. `DEPTH` is the site's measured water depth in metres; it is not assigned as the exact sampling depth of either measurement. The normalized depth context is therefore `SURFACE_BOTTOM_PAIR` with a source-backed `waterDepthM`. No missing sampling depth is invented.

## Variables and units

Units follow the official NIFS observation search table. A missing official unit remains explicit.

| Normalized feature | Source fields | Unit |
| --- | --- | --- |
| Water temperature | `TEMP_S`, `TEMP_B` | `degC` |
| Salinity | `SAL_S`, `SAL_B` | `UNIT_NOT_DOCUMENTED` |
| pH | `PH_S`, `PH_B` | `pH` |
| Dissolved oxygen | `DO_S`, `DO_B` | `mg/L` |
| Chemical oxygen demand | `COD_S`, `COD_B` | `mg/L` |
| NH4-N, NO3-N, NO2-N, DIN, TN | paired fields | `mg/L` |
| DIP, TP, silicate silicon | paired fields | `mg/L` |
| Chlorophyll-a | `CHL_S`, `CHL_B` | `ug/L` |
| Suspended solids | `SS_S`, `SS_B` | `mg/L` |
| Transparency | `M` | `UNIT_NOT_DOCUMENTED` |

The seawater contract does not include BOD. All listed paired variables were present in all 255 live rows. Numeric zero is preserved. No `-`, `-9`, `-99`, or `-999` sentinel appeared, so none is treated as missing.

## Time and freshness

`DATE_Y`, `DATE_M`, `DATE_D`, `TIME_H`, and `TIME_I` form the source-local timestamp. NIFS does not document a timezone in this API contract, so normalized timestamps do not receive an invented offset and carry `UNSPECIFIED_BY_NIFS`.

- Earliest bounded sample: `2025-09-25T14:10:00`
- Latest bounded sample: `2025-11-05T10:10:00`
- Source class: `OBSERVED_PERIODIC_ENVIRONMENT`
- Fresh: at most 120 days old
- Stale: more than 120 and at most 365 days old
- Unavailable: more than 365 days old or invalid

This policy is independent from the RISA 45-minute/2-hour policy. The server caches a successful upstream response for 24 hours and permits a seven-day stale-delivery fallback during an upstream failure.

## Normalized response

`GET /api/fishing-condition/environment/fishery` returns source metadata, the bounded query window, latest sample time, normalized samples, and quality counts. Each sample retains provider `NIFS`, source ID `nifs-femo-sea`, quality class `OBSERVED_PERIODIC_ENVIRONMENT`, source record/site identity, coordinates, paired measurements, units, and source-local time provenance.

The browser never receives the NIFS credential, authenticated URL, or raw upstream payload. Failure affects only this route; RISA realtime, Navigation, KMA, KHOA, Tide, Fish, and Fishing Spots remain independent.

## Engine boundary

The feature registry records water temperature, salinity, pH, dissolved oxygen, COD, chlorophyll-a, suspended solids, and source nutrients with their units, timestamp field, paired depth context, and lineage. Chlorophyll-a and dissolved oxygen are raw observed features only. Thresholds and fishing-condition scores are deliberately absent.

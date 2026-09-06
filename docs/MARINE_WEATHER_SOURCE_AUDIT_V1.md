# Marine Weather Source Audit V1

Updated: 2026-09-07

## Decision

Weather Overlay V1 uses the Korea Meteorological Administration (KMA) API Hub `marine_small_zone.php` source. It is a numerical-model **forecast**, not an observation. The existing Blue Marina server route and normalizer are reused; no browser credential is introduced.

Final status: `CONNECTED_FORECAST_MODEL`

## Candidate Matrix

| Candidate | Provider | Kind | Access and format | Fields and units | Time / coverage | License | MapLibre fit | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Small-zone marine forecast | KMA API Hub | MODEL / FORECAST | `marine_small_zone.php`, authenticated text/CSV | significant wave height m, maximum wave period sec, wave/wind direction degree, wind m/s, visibility m, precipitation mm, water temperature C | 00/12 UTC issue, 3-hour steps to +75h; up to 40 large zones and 9 small zones | KMA public data, attribution required | Representative grid-center vector points with lazy detail fetch | **Selected; HTTP 200 and one live row verified** |
| Large-zone marine forecast | KMA API Hub | MODEL / FORECAST | `marine_large_zone.php`, authenticated text/CSV | significant wave height m, maximum wave period sec, wave/wind direction degree, wind m/s | 00/12 UTC issue, 3-hour steps to +75h; 1,330 large zones | KMA public data, attribution required | Simple polygon/point grid but lower spatial resolution | Rejected for V1 because small-zone source is more precise and already implemented |
| Marine comprehensive observation | KMA API Hub | OBSERVATION | `sea_obs.php`, authenticated text | station, KST timestamp, significant wave height m, wind degree and m/s, sea-surface temperature C, air temperature C, sea-level pressure hPa, humidity % | nearest production time; buoy/wave-buoy network | KMA public data, attribution required | Excellent point-marker fit | `BLOCKED_CREDENTIAL`; live request returned HTTP 403 |
| BUOY station metadata | KMA API Hub | STATION METADATA | `stn_inf.php?inf=BUOY`, authenticated text | station ID/name, longitude/latitude degree, station code | current or requested KST time | KMA public data, attribution required | Required companion for observation markers | `BLOCKED_CREDENTIAL`; live request returned HTTP 403 |
| Marine buoy period observation | KMA API Hub | OBSERVATION | `kma_buoy2.php`, authenticated text | buoy weather and wave observations | requested KST interval | KMA public data, attribution required | Point history, not a lightweight first overlay | Not selected; observation permission and bounded history UX are unresolved |
| Lighthouse weather observation | KMA API Hub | OBSERVATION | `kma_lhaws.php`, authenticated text | air, wind, pressure, humidity; historical equipment may include other fields | hourly/daily; nine sites including ended stations | KMA public data, attribution required | Sparse point layer | Not selected; sparse/heterogeneous coverage and observation permission unresolved |
| Legacy ocean observation APIs | KHOA / data.go.kr | OBSERVATION | retired KHOA-linked APIs | wave, wind, temperature, pressure families | formerly near-current station data | replacement-specific | Point layer | `REPLACEMENT_REQUIRED`; 35 legacy APIs were retired in favor of new national-focus datasets |
| Shared-system real-time water temperature snapshot | MOF / data.go.kr | OBSERVATION SNAPSHOT | odcloud JSON/XML snapshot | water temperature and source-specific metadata | file snapshot marked one-time/as-needed | dataset-specific | Point layer if coordinates are complete | Rejected: not a dependable multi-variable weather feed |

Official references:

- KMA marine forecast contract: https://apihub.kma.go.kr/apiList.do?seqApi=9&seqApiSub=278
- KMA marine observation and buoy contract: https://apihub.kma.go.kr/apiList.do?seqApi=3
- KMA buoy station metadata: https://apihub.kma.go.kr/apiList.do?apiMov=%ED%95%B4%EC%96%91%EA%B4%80%EC%B8%A1+%EC%A7%80%EC%A0%90%EC%A0%95%EB%B3%B4+%EC%A1%B0%ED%9A%8C&seqApi=3&seqApiSub=318
- KHOA legacy API retirement notice: https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004473
- KMA marine-observation public-data catalog: https://www.data.go.kr/dataset/15000145/openapi.do

## Selected Contract

Source fields remain distinct:

- `tma_fc`: issued time, UTC, `yyyyMMddHH`
- `tma_ef`: forecast valid time, UTC, `yyyyMMddHH`
- `Lzone` / `Szone`: large/small marine grid identifiers
- `wh_sig`: significant wave height, m
- `wvprd_max`: maximum wave period, sec
- `wvdr`: wave direction, degree
- `ws`: wind speed, m/s
- `wd`: wind direction, degree
- `vs`: visibility, m
- `rain`: expected precipitation, mm
- `tw`: water temperature, C; the source does not document an observation depth
- `swell`: source risk field; raw numeric/text value only, with no Blue Marina severity inference

The API currently returns an uppercase, whitespace-delimited form even when `disp=0`; the parser accepts that observed form and the documented comma CSV form. `-999` and `-999.0` remain missing values, while numeric zero is preserved.

## MapLibre Strategy

- Logical layer: `kma-marine-weather-forecast-zones`
- Source: the existing official 1,330-large-zone coordinate table
- Geometry: one representative point for small-zone 5 at each unambiguous large-zone center
- Quality: 1,329 valid, unique representative points; duplicated large-zone ID `7432` is excluded
- Default: OFF
- Data fetch: only after selecting a point, through `/api/sea-info/marine-forecast`
- Detail panel: clearly labelled `KMA FORECAST MODEL`

This representative layer does not claim to render all 11,970 small-zone cells. A future tiled polygon/grid phase may add full spatial coverage after payload and interaction review.

## Cache And Stale Policy

- Grid metadata: bundled official snapshot; long-lived build asset
- Forecast response: 30-minute in-process fresh cache
- Stale fallback: last successful response for up to 18 hours
- UI states: `fresh`, `stale`, `unavailable`
- Observation candidates: no cache policy is activated because their credential boundary is blocked

The forecast is issued twice daily, so cache behavior follows the forecast publication model rather than pretending to be real-time.

## Safety Boundary

Weather is separate from tide and navigation warnings. V1 performs no severity score, departure judgement, safe routing, weather reroute, collision avoidance, capsize-risk score, or navigability judgement.

UI notice:

`해양기상 정보는 공식 관측·예측 자료의 참고 표시이며 실제 출항·운항 가능 여부 또는 공식 항법·기상정보를 대체하지 않습니다.`

## Future Phases

1. Obtain explicit KMA marine-observation API permission and re-run a bounded observation contract audit.
2. Connect BUOY station metadata and observation values as a separate `OBSERVATION` layer.
3. Replace representative points with bounded vector tiles if full small-zone visualization is needed.
4. Keep official warnings as a separate layer; do not derive warnings from model values.

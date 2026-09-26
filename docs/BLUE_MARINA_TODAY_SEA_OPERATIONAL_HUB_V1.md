# Blue Marina Today Sea Operational Hub V1

`/today-sea` keeps the existing marine video introduction and adds a compact public-data hub below it. Its role is to let a visitor inspect the current availability of official marine observations, forecasts, tide predictions, and notices. It does not decide whether a departure, fishing trip, or route is safe.

| Section | Source | Data type | Selection |
| --- | --- | --- | --- |
| Marine forecast | Korea Meteorological Administration (KMA) | `MODEL/FORECAST` | Explicit numeric `Lzone` and `Szone` |
| Marine observations | KMA | `OBSERVED` | Explicit observation station |
| Marine weather warnings | KMA | Official reference notice | None; preserve source lifecycle |
| High/low tide | Korea Hydrographic and Oceanographic Agency (KHOA) | `PREDICTION` | Explicit station from audited catalog and date (defaults to the Seoul calendar date) |
| Water temperature | National Institute of Fisheries Science (NIFS) RISA | `OBSERVED` | Explicit RISA station |
| Navigation warnings | KHOA | Official reference notice | None; preserve `UNKNOWN` lifecycle |

Each card uses the existing API and its cache/freshness policy. Cards load independently. `AVAILABLE`, `STALE`, `DISABLED`, `ERROR`, and `UNKNOWN` communicate source state, and a disabled or failed API does not make the page unavailable. The original observation/forecast time and fetch time are shown where supplied. No new freshness threshold or upstream adapter is added. No default, nearest, or fishing-spot-derived observation station is chosen. There is no duplicate tide request from the old hero interest card.

RISA preserves surface/middle/bottom depth layers, source freshness, and its undocumented source timezone. Tide levels retain `DATUM_NOT_DOCUMENTED`; predicted tide and depth never become an inferred safe water depth. A zero warning count is not a safety verdict. KHOA navigation warning `UNKNOWN` lifecycle is not presented as a confirmed current hazard. FEMO is unused.

The hub links to `/sea`, `/sea/navigation`, and `/fishing-spots/conditions`. It passes no invented coordinate, navigation destination, species judgement, or station mapping. The video and premium visual language remain, while expandable detailed sections avoid a crowded dashboard. On narrow mobile screens, the existing decorative AI Captain launcher is hidden on this route so it cannot cover source data; the BottomNav remains available. Desktop content is capped at a readable width.

Deployment limitation: live KMA and KHOA cards require the existing API keys and source flags in the target environment. A missing key is presented as `DISABLED`; it is not silently replaced with sample data. This implementation makes no database or Supabase change.

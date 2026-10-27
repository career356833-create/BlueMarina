# Blue Marina Navigation V5 — Voyage Management + Waypoint + ETA

## Decision

`NAVIGATION_V5_COMPLETE_WITH_LIMITATIONS`

Verified on 2026-10-27. `REAL_DEVICE_NAVIGATION_NOT_VERIFIED` remains. This release adds working voyage management to V4; it does not certify a safe route or replace official navigation equipment.

## Release provenance

- Baseline main/origin/Production: `1512ef9864b72f776ca16e9b479cd0a5ac18f118`.
- Isolated candidate: a clean Git archive of that baseline plus the exact V5 changes. Existing dirty-worktree files were not copied wholesale.
- Preview: https://blue-marina-6v6o31z24-chiweon.vercel.app — `dpl_9yPP29YswTmhMmL7uzNcEY5ga1SB`, READY before code commit/push. This CLI preview has no Git SHA metadata; it was uploaded from the isolated candidate. The subsequent test-only assertion correction did not change its runtime code.
- Code commit: `db1a78d63a7fbc73124bab0390f49215d0edd688`, `feat(navigation): add voyage sessions and waypoints`, exactly 16 files.
- Production code deployment: `dpl_4JNQSqAFFKatwwutkn2X3i3LZ8wr`, READY, deployed SHA equals the code commit. Public route: https://blue-marina.vercel.app/sea/navigation.
- This document and the JSON report are subsequent evidence-only files; their commit does not change the verified runtime code.

## Voyage sessions and local records

IDLE is represented by no session. A fresh, accurate position and an explicit user action start RECORDING. Pause, resume and completion are explicit. Completion cannot resume; a saved unfinished session reopens PAUSED and requires a fresh GPS fix plus an explicit resume.

The cockpit/panel shows elapsed active time, accumulated measured distance, current SOG, average moving speed, maximum confirmed speed and valid point count. User pause time and movement are excluded. GPS loss is distinct from a user pause: the recording clock continues, but invalid locations and the gap do not add distance. A new segment starts after a pause, outage over 15 seconds, invalid fix or source change. Low-speed coherent movement accumulates beyond the accuracy jitter envelope; stationary jitter is not counted as travel. Distance is a filtered measurement estimate, not the distance to the destination.

IndexedDB `blue-marina-navigation-v5`, version 1, stores records only on explicit Save. Limits: 20 voyages, 10,000 points per voyage, 100 waypoints and 12 MiB combined. Reaching the point cap pauses recording without deleting prior points. Writes check capacity in a read/write transaction; errors are shown instead of claiming success. No automatic eviction. Saved records can be viewed, recovered paused, exported or deleted individually/all by type. A historical map trace is labelled as past and does not masquerade as the current GPS position. Opening history focuses its extent without restarting recording.

Existing V4 temporary points can be explicitly imported; their original storage is left intact. Unsaved new changes are memory-only and are lost on refresh. A saved draft is a snapshot, not background autosave. Shared-device visibility, browser clearing/private mode and storage capacity limitations are explained in the UI.

## GPX and waypoints

GPX export is a user-triggered local download with GPX 1.1 namespace, WGS84 latitude/longitude, actual measurement timestamps, XML escaping, safe filenames and separate track segments across discontinuities. Empty tracks do not export. Simulation files and tracks are explicitly labelled. A browser-downloaded simulation file was parsed successfully: 110 points, 4 segments, timestamp present on every point. Import compatibility with every third-party charting application is not claimed.

Waypoints accept a fresh current position, an explicit map selection, or manual coordinates. Map selection fills a draft; it does not silently replace the destination. Latitude/longitude are separately labelled and validated. Name/memo bounds are 80/500 characters. Save, reopen, rename, delete, map marker and explicit destination selection are implemented. Changing destination updates marker, bearing, straight-line distance and ETA without erasing the voyage. The original Fishing Spot return link is retained. User points are not classified as safe anchorages.

## ETA and proximity

Closing speed is `SOG × cos(normalized(COG - bearing))`. ETA requires a fresh accurate fix, reliable movement COG, SOG at least 1 m/s and positive closing speed above 0.5 kn. Device compass alone is insufficient. Stationary, away/transverse, stale and invalid cases clear ETA immediately. Up to five measured closing-speed samples within ten seconds reduce jitter. Destination changes reset smoothing. Sub-minute results display “1분 미만”.

The UI states “현재 직선 접근속도 기준 참고값”. Currents, restrictions, obstacles and a navigable route are not modelled.

Proximity defaults OFF with 300/100/50 m choices. Three distinct consecutive accurate samples are required; accuracy must be no worse than half the selected radius and the uncertainty envelope must fit within it. Duplicate timestamps do not advance the count. A notification latches once and resets on destination/radius changes. Wording is “설정한 목적지 반경에 접근했습니다.”, not a safe-arrival assurance. No sound, vibration or background push is added.

## Wake Lock, GPS and V4 preservation

Screen Wake Lock is explicitly enabled, deduplicates pending requests, releases on OFF/hidden/unmount/end and re-requests on visibility restoration only when still enabled. Unsupported, denied and suspended states are visible. A delayed request completing after OFF is immediately released. Actual browser acquisition/release passed locally, on Preview and on Production; a dev-only forced denial and mocked lifecycle cases were also tested. Browser/OS power policies may release or deny locks; this does not guarantee background GPS. API references: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API), [W3C](https://www.w3.org/TR/screen-wake-lock/).

The existing single GPS watcher is reused. Fifteen-second staleness, duplicate/reversed timestamp handling, accuracy limits, jump filtering, error/retry and permission states remain. Invalid updates clear trusted calculations, and session segments do not bridge them. Native permission revoke/re-allow on a physical phone remains unverified.

V4 MapLibre, Mapzen/AWS raster DEM, 2D/3D, follow, north/course-up, boat/destination/waypoint markers and segmented tracks remain. Historical viewing temporarily focuses the history instead of applying live camera follow. DEM provider/configuration is unchanged; terrain is land elevation, not bathymetry. The cockpit has SOG / destination distance / ETA, secondary course/bearing/accuracy/time and collapsed management sections. Proximity notice is above the map so it does not cover map attribution.

## Verification and evidence levels

| Check | Result / scope |
| --- | --- |
| V5 tests | 35/35 PASS, NAV-V5-01 through NAV-V5-35 |
| Combined Navigation/UI regressions | 94/94 PASS |
| Full isolated candidate suite | 1410 PASS / 2 SKIP / 0 FAIL (1412 total) |
| Clean baseline comparison | 1375 PASS / 2 SKIP; 35 V5 tests added |
| Typecheck / lint | PASS / PASS, zero lint warnings |
| Production build | PASS, 1467/1467 static generation |
| Preview build | READY; same runtime candidate |
| Git diff whitespace | PASS |
| Browser widths | 360, 390, 430 and 1280 px inspected with screenshots |
| Local simulator | Start, 8 kn / 15 kn movement, stop, approach, away, invalid accuracy, jump, signal loss/stale, pause/resume/end, save/reload/history/recover, waypoint selection, proximity latch, Wake Lock success/denial |
| Unit-only or partial browser cases | Transverse ETA, reversed timestamp, capacity and Wake Lock races have deterministic tests; not every scenario was separately rerun at every viewport |
| Preview browser | Production build hides dev simulator; manual waypoint save/reopen/select/delete, real Wake Lock, actual 3D terrain, no-GPS gating |
| Production browser | rock-151 → Conditions (BM-SPECIES-000188) → Navigation → original detail; exact label/36.036417,126.513083; actual terrain; V5 panel; alert default OFF; real Wake Lock ON/OFF; GPS-off start/ETA gated |
| HTTP smoke | Navigation, valid rock-151 detail and Conditions: 200 |
| Production console | No new Production error observed in the tested flow; an old local HMR dependency-array log remained in the reused tab and is not a Production error |

The two skips are existing environment-dependent PostgreSQL retention and fresh Supabase Auth/RLS/cascade checks. No database environment was activated. The user-supplied historical 1382/1 count was superseded by the actual isolated checkout result.

Screenshots are local QA artifacts (not runtime files), under `D:/Projects/bm-navigation-v5-1512ef9/outputs/navigation-v5/`: `cockpit-360.jpg`, `cockpit-390.jpg`, `management-430.jpg`, `cockpit-1280.jpg`, `history-reopened-390.jpg`, `preview-terrain-390.jpg`, `production-management-390.jpg`, `production-cockpit-390.jpg`. Some local development screenshots contain a development error badge from hot replacement during implementation; the clean Preview/Production screenshots do not.

## Privacy, exact scope and remaining limitations

- New voyage/waypoint modules do not upload GPS records, use account sync, analytics, Supabase or a second GPS watcher. GPX remains local until the user independently shares it. Existing map/tile network requests are not disabled.
- No Auth/DB/Operations/Funnel/feature-flag/provider changes; no AIS, collision avoidance, seabed/land/reef avoidance or safe-route inference.
- Existing unrelated worktree files were preserved: 1,876 pre-existing files remained byte-identical, and the pre-existing `oceanCurrentModelState` `timeout` hunk in `MarineNavigation.tsx` remains unstaged and outside the V5 commit.
- Desktop browser simulation and responsive viewports are not real-device navigation certification. Real smartphone GPS, physical gestures, permission re-enable, device heading, screen lock/background return and battery behaviour still require field verification.
- Preview and Production were not supplied synthetic GPS through hidden browser overrides. Movement-dependent browser E2E used the development-only, visibly labelled simulator locally.

Next primary priority: real-device Navigation V5 field QA with explicit local saving, GPX inspection, GPS loss/recovery and screen-lock/visibility checks. Continue using official charts and navigation equipment; this UI provides reference measurements only.

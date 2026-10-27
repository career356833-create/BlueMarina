# Navigation V5 — Real Device Acceptance + Field Diagnostics V1

## Decision and scope

`FIELD_DIAGNOSTICS_READY`. Physical-phone acceptance remains `MANUAL_TEST_REQUIRED` / `REAL_DEVICE_NAVIGATION_NOT_VERIFIED`. No real-phone result has been manufactured from a viewport, simulator, API capability or successful desktop Wake Lock.

Baseline main/origin/Production was `653dd0f057bafa31b7c45a155b38bc041d985d42`. Implementation commit: `61a84d9188d4abf1bb7bd136017c222787cdbdaa` (10 exact files). Verification date: 2026-10-27. Work used an isolated Git archive of main plus the selected changes, not the dirty worktree. Existing unrelated work is preserved, including the unstaged ocean-current `timeout` type member in MarineNavigation.

## Use on a smartphone — no ADB or login required

1. Open https://blue-marina.vercel.app/sea/navigation on the phone. Stop somewhere safe before operating controls.
2. Open the bottom **항해 기록 · 웨이포인트** panel, expand **기기 진단 · 현장 테스트**, and press **진단 시작**. Opening the section alone does not collect events.
3. Start GPS using the existing upper GPS button and personally respond to its location permission request. Diagnostics itself never requests a position or permission.
4. Open **스마트폰 수동 체크리스트** and follow NAV-R01–R15. Mark only what was actually tested. Use NOT_TESTED or NOT_SUPPORTED where appropriate.
5. Perform the additional NAV-F01–F04 checks for real terrain, voyage records, waypoint/GPX and Wake Lock. These are distinct from the automated observations.
6. Press **진단 종료**, then **진단 결과 복사** or **진단 결과 JSON 다운로드**. Share that diagnostic JSON when reporting a problem; a GPX track is not required. Download is a local action and does not automatically send anything to Blue Marina.

Export before refreshing, leaving Navigation or starting a new diagnosis. Diagnostic history is intentionally memory-only. Repeat-entry tests require separate exports as needed; three re-entries are not inferred from one run. An unfinished voyage must be explicitly saved using the existing voyage Save control, independently of diagnostics. Browser/site-data clearing can delete saved voyages and waypoints.

## What the browser observes

| Area | Observable evidence | Boundary |
| --- | --- | --- |
| Device/browser | Coarse inferred category only | No raw user-agent or device identifier; category can be imperfect |
| GPS | API support, queried permission state, quality/staleness, accuracy, last measurement time, interval, time to first measurement | First-fix latency is available only when GPS was requested during this diagnosis; it includes permission waiting |
| Native readings | Whether the most recent accepted GPS callback supplied speed/COG; current SOG display availability | Missing speed is not an implementation failure; raw COG availability is not proof of reliable movement course |
| Compass | API availability and actual recent compass reception | An API being present does not prove a physical sensor works |
| Map/DEM | Map style loaded, V4 terrain controller state, camera mode, follow mode | Pitch/3D camera alone is not DEM ACTIVE; ACTIVE comes from the existing actual source-loaded/terrain controller |
| Errors | Fixed MapLibre resource/DEM source/WebGL lost/restored categories | No raw error message, request URL or inferred memory/network cause |
| Wake Lock | API supported plus requested/acquired/off/suspended/failed state | Browser/OS may deny or release; no background GPS guarantee |
| Environment | Online/offline, document visibility, standalone/browser display mode | Online is not upstream reachability; standalone is not proof of a completed physical installation test |
| Voyage | State transitions, local save/reopen, point count and track visibility | No session ID, names, coordinates or track points in diagnostics |

The last accepted measurement time is retained during signal loss, and its age is measured through diagnostic stop. UNKNOWN means unobserved/unavailable evidence. OS location-service switches, exact failure root causes, physical gestures, device memory constraints and screen-lock operation require manual evidence. Events before diagnosis starts are not reconstructed. A map that fails before observation may remain UNKNOWN/LOADING and needs manual investigation.

## Collection and export contract

- Explicit start; explicit stop freezes observations and removes diagnostic permission/network/visibility/timer listeners. Closing the disclosure does not stop an active diagnosis; use **진단 종료**.
- Existing GPS watcher only. Diagnostic collection does not create another watcher, request GPS/compass permission, acquire Wake Lock, change camera/follow, alter track recording or save a voyage.
- Optional MapLibre error/context listeners exist only while diagnostics is active; they are removed on stop and provider destruction. Terrain is read from the existing controller without changing its provider or camera logic.
- At most 300 events are kept. Oldest events are removed and `droppedEvents` reports loss. Error summaries are bounded to the retained event window.
- Allowed scalar fields and fixed event codes only; no free-text notes, raw error objects, URLs, query strings, account information, IP, token, raw user-agent, GPS coordinates, route/GPX points or precise destination data.
- `automatedObservations`, `manualTests`, `events` and `errors` are separate. All 19 manual items start NOT_TESTED. Even manually marking every item PASS does not automatically certify real-device readiness.
- Clipboard copying and JSON Blob download happen only on their buttons. If clipboard access fails, a selectable JSON textarea and download remain available. No diagnostic server endpoint, storage persistence, analytics or account sync is added.
- New diagnosis explicitly clears prior in-memory results. Route reload/remount starts inactive; users must export first.

## Manual acceptance checklist

Results: PASS / FAIL / NOT_TESTED / NOT_SUPPORTED. A desktop mouse is not a physical-touch pass.

| ID | Phone action |
| --- | --- |
| NAV-R01 | Install/open the PWA from the home screen; distinguish browser tab mode |
| NAV-R02 | Allow location and inspect first measurement, accuracy and freshness |
| NAV-R03 | Deny permission, verify honest error, re-allow and restart GPS |
| NAV-R04 | Switch OS location services off/on and check loss/retry |
| NAV-R05 | Move in a safe setting, inspect update intervals/SOG; also inspect stationary jitter |
| NAV-R06 | Distinguish movement COG from actual device compass; explicitly enable compass |
| NAV-R07 | Real finger pinch/drag, recenter, drawer/panel, portrait/landscape |
| NAV-R08 | Change apps and return; inspect map/GPS/session |
| NAV-R09 | Turn Wake Lock OFF, lock screen for at least 30 seconds, return and inspect stale/recovery/map/session |
| NAV-R10 | Disconnect/reconnect the network; distinguish browser online from tile/API health |
| NAV-R11 | Open an installed external map app and return; NOT_SUPPORTED if absent |
| NAV-R12 | Export and leave/re-enter Navigation three times, checking GPS start/stop on each entry |
| NAV-R13 | Fishing Spot → Conditions → Navigation destination handoff |
| NAV-R14 | Return to the original spot detail |
| NAV-R15 | Check blank/black map, WebGL errors and missing markers |
| NAV-F01 | Repeat 2D/3D, confirm actual DEM-loaded state, coastal relief, boat marker and zoom. Distinguish GPS location from terrain test area |
| NAV-F02 | Start → updates → pause → resume → complete → save → reopen. Inspect measured distance/time, never invent distance during poor GPS |
| NAV-F03 | Current-position/map/manual waypoint, save, destination change and GPX download |
| NAV-F04 | Wake Lock ON acquisition / OFF release and app-return state |

## Verification

- New diagnostic tests: 20 PASS. Combined diagnostic/V5/V4 regressions: 69 PASS.
- Full clean candidate: **1430 PASS / 2 SKIP / 0 FAIL**, 1432 total. Baseline was 1410 PASS / 2 SKIP. The existing two environment-dependent database tests remain skipped; no DB environment was activated.
- `npm run typecheck`, `npm run lint`, `npm run build`: PASS; 1467/1467 static generation. Existing Supabase Edge-runtime build warning remains unrelated. `git diff --check`: PASS.
- Local actual browser at 360/390/430/1280 widths: panel/buttons fit, no document horizontal overflow. Existing cockpit remains when the management panel is closed.
- Local dev simulator: clearly SIMULATION; GPS good/stale/unavailable, native speed/COG availability, voyage start/pause/resume/end/save/reopen, real Wake Lock success and dev-only denial, terrain ACTIVE and dev-only unavailable state observed. Local QA created one synthetic voyage and deleted that same record afterwards. No production voyage/waypoint was created.
- A local exported JSON contained the deliberately selected manual FAIL used to test the input control; this was UI-test evidence, not a physical-device failure. New diagnosis reset all manual items to NOT_TESTED.
- Preview: https://blue-marina-rgejafrpx-chiweon.vercel.app, `dpl_4UHReyVppNQzUp1zmZhmz5qokGBH`, READY. Actual DEM ACTIVE, real Wake Lock ACTIVE→OFF, GPS remains OFF / permission PROMPT without any location request, 19 manual NOT_TESTED items, no dev simulator exposed, zero console errors observed.
- Preview JSON download parsed: STOPPED, 29 events, no coordinate/identity/token keys. A second export after a post-stop camera change had the identical SHA256 digest, proving frozen collection. Three browser reload/re-entries each showed Start and no active Stop control.
- Local last-fix-loss display defect was reproduced and minimally fixed: last timestamp survives loss; age is frozen at stop. No speculative GPS or map engine changes were made.

Local screenshots: `D:/Projects/bm-navigation-field-653dd0f/outputs/field-diagnostics/` (`local-360.jpg`, `local-390.jpg`, `local-430.jpg`, `local-1280.jpg`, `preview-390.jpg`). They are QA artifacts outside the application commit.

## Production

Code commit `61a84d9188d4abf1bb7bd136017c222787cdbdaa` was pushed only after the final Preview and clean verification passed. Production deployment `dpl_CC7gDj6p3Bnw3KXdjNiuxeFt9dHj` is READY with that SHA. At https://blue-marina.vercel.app/sea/navigation, 390px smoke confirmed opt-in default OFF, explicit start/stop, GPS OFF and permission PROMPT without a location request, map LOADED and actual DEM ACTIVE. JSON download parsed as STOPPED with 24 events and all 19 manual items NOT_TESTED; no console errors or horizontal overflow were observed. No Production voyage/waypoint was created. Screenshot: `D:/Projects/bm-navigation-field-653dd0f/outputs/field-diagnostics/production-390.jpg`.

Diagnostics is accessible without login. No DB/Auth/Operations/Analytics, Vercel environment or feature-flag changes. Evidence-only commits may advance main beyond the verified code SHA without changing runtime code.

## Real-device gate and next action

No physical-phone GPS, permission revoke/re-allow, finger gesture, installed PWA, screen lock, background return or battery behaviour has been certified by this implementation task. The diagnostic UI and procedures are ready for the user's phone; lack of ADB is not a blocker to that process. The next action is the smartphone checklist and sanitized JSON export. Only actual field evidence can support `REAL_DEVICE_NAVIGATION_READY` or `REAL_DEVICE_NAVIGATION_READY_WITH_LIMITATIONS`.

References used for API boundaries: [Permissions query](https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query), [MapLibre event types](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapEventType/). These provide browser observations, not physical-device acceptance evidence.

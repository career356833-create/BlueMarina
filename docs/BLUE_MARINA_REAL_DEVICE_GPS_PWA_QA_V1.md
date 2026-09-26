# Blue Marina Real Device GPS + PWA QA V1

## Decision

`REAL_DEVICE_GPS_PWA_QA_BLOCKED`. On 2026-09-25, no Android or iPhone was available to this workstation; ADB showed no attached device, and the user confirmed that a real device was unavailable. No location, heading, speed, installed-PWA, lock/unlock, or background behavior was observed on a phone. The Production application was not changed.

The supporting browser check used desktop Chromium at 360, 390, and 430 px with touch emulation. This is **not** real-device evidence. A browser-controlled denial is likewise not a test of Android or iOS permission settings. The attached JSON report keeps these evidence classes separate; all real-device release gates remain `BLOCKED`.

## Supporting Production checks

| Area | Browser or source evidence | Real-device result |
| --- | --- | --- |
| Navigation layout | MapLibre canvas loaded at 360/390/430 px; HUD, layer, zoom buttons did not overlap; no horizontal overflow | Blocked |
| Denied location | Controlled browser denial displayed `위치 권한이 거부되었습니다.` with no page crash | Blocked |
| Service worker | Active, controlling page, `blue-marina-v6` cache; no private path in inspected cache keys | Blocked |
| Offline | Previously visited home returned 200 offline; API failed without network; online Conditions recovered to 200 `PARTIAL` with profile context | Blocked |
| PWA | Manifest declares Blue Marina, `BluePass`, standalone display, `/` start, 192/512 icons, `#0F2D52` theme | Install and standalone blocked |
| Kakao and Conditions | Prior Production release/CSP evidence confirms functioning `/sea` and Conditions profile. Conditions was rechecked after online restoration | Device map/gesture checks blocked |

Source review shows `watchPosition` requests high accuracy and clears its watch on stop, retry, and unmount. Native geolocation heading and speed take precedence. The current implementation attempts movement derivation only when native speed is absent; it requires accuracy at most 50 m and a 1–30 second interval, with at least 5 m movement for derived heading. The compass button requests iOS orientation permission when available. HUD displays `--` for unavailable readings. ETA uses straight-line distance and requires at least 0.5 knots. Tracks start on user action and are saved in device `localStorage`, including precise points. No navigation coordinate/track server write was found in the inspected component and storage adapter. This code review does not prove runtime privacy behavior on a phone.

The service worker bypasses `/api/` and private account/admin/onboarding/compose/reservation paths. Cache inspection found no such private paths in the controlled browser. Navigation retains its warning that a straight-line aid does not infer a safe route or avoid land, reef, or shallow water.

## Required device run

When a phone is available, record only model, OS, browser and version, and whether launched standalone. Do not record raw coordinates, location history, contact details, or device identifiers in the report.

1. On Android Chrome, open Production Navigation. Test first permission prompt, allow, accuracy and reading sources, deny, then re-allow through browser or OS settings. Repeat on iPhone Safari if available, including the compass permission path.
2. While safely stationary or walking, observe position updates, nullable heading/speed behavior, HUD toggle persistence, destination bearing and straight-line distance, and track start/pause/resume/stop/delete. Never manipulate it while driving.
3. Background for up to a minute and return; lock/unlock; rotate portrait–landscape–portrait. Check map rendering, stale data, watcher duplication, safe-area, and touch drag/pinch/rotate/tap.
4. Add to Home Screen, launch standalone, inspect SW active/control/cache, then test offline shell and API unavailable state, online recovery, and private path exclusion. Verify an update only when an actual new deployment exists.
5. Check `/sea` Kakao map/layers and `/fishing-spots/conditions` selector, static profile, `200 PARTIAL`, source and limitations. Confirm no false live data or server location submission.

The first confirmed device test can resolve the P1 **QA gate** `REAL_DEVICE_UNAVAILABLE`; it is not currently a confirmed product defect. No P0 product defect was established. Any device finding should be graded P0–P3 and fixed only within the requested light-fix policy, with Preview verification before Production.

## Verification and Git

Verification: targeted 3/3, total 1168/1168, typecheck, lint, build (1463/1463), and diff checks passed. See the companion JSON report for gate statuses. This QA created report, documentation, and a report-integrity test only. Existing unrelated worktree changes were preserved; no files were staged, committed, or pushed.

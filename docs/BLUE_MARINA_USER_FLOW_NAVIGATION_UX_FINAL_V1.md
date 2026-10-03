# Blue Marina User Flow + Navigation UX Final Integration V1

Decision: `USER_FLOW_NAVIGATION_UX_READY_WITH_LIMITATIONS`. This is a local navigation presentation change, not a production release.

## Core journeys

| Journey | Finding |
| --- | --- |
| Home → Fishing Spots → rock-151 → Conditions → Navigation | Source-backed spot ID, name and canonical coordinates reach Navigation. The dedicated back control returns to the spot detail. Coordinate safety holds remain enforced by the existing destination adapter. |
| Home → Charter → Partner → Onboarding → login | Routes and registration CTAs exist; login entry preserves an internal `/charters/onboarding` return. No authenticated submission was made in this audit. |
| Home → Market → New → login | Routes and listing CTA exist; login entry preserves `/market/new`. No authenticated submission was made. |
| Home → Community → New → login | Routes and posting CTA exist; login entry preserves `/community/new`. No authenticated submission was made. |
| Login → Account → Saved → original item | Saved cards use their stored internal content href. This browser session had no signed-in saved item, so the full authenticated round trip remains unverified. |

No login, submission, or production data mutation was attempted. The audit found no dead CTA in the checked public route chain. Return after a Conditions-originated Navigation visit goes to the spot detail, preserving the spot context while not restoring in-progress Conditions form choices.

The Charter partner page adds one intentional information step before onboarding. Its “제휴 문의 준비” link scrolls to preparation guidance; that section explicitly says it does not transmit an inquiry. This is an existing service limitation, not a submission success state.

## Navigation hierarchy

The map occupies the viewport beneath a 56px dedicated bar. The bar shows a safe back path, current destination and GPS control/status. A compact readout shows heading, destination bearing and **straight-line** distance. Layer and HUD controls remain reachable, while the marine layer list and source provenance appear only when the layer drawer opens. The bottom detail sheet starts collapsed and holds destination editing, query/GPS detail, waypoint/track controls, simulation, compass permission and the full limitation statement. A short always-visible notice says that straight bearing is not a safe route.

The global site header, mobile BottomNav and floating chatbot are hidden on `/sea/navigation` only. Their functionality remains available on other routes. The drawer is non-modal; map interaction remains possible outside it, so no modal focus trap applies. Buttons expose labels and expansion state; sheet content is hidden from focus when collapsed.

Existing source uncertainty remains visible inside the drawer, including partial navigation-aid snapshots and unavailable current navigation-warning status. ROMS stays identified as a model. No layer availability is inferred from map visibility.

## QA and limits

At 390×844 the local map, HUD, controls, collapsed/expanded sheet and layer drawer rendered with no horizontal overflow. Drag, zoom button and map tap-to-select worked. The offshore rock-151 destination originally focused too tightly on a nearly uniform open-water tile; a presentation-only zoom change now shows surrounding coastline and the destination marker. At 1280×900 and 1440×900 the map occupied the viewport, with no horizontal overflow or permanent side panel. Physical pinch, GPS position, heading and speed require a real device and were not granted or tested in this browser.

Straight bearing and distance do not calculate a safe route. There is no land, reef or depth avoidance, AIS collision avoidance, automatic route generation, or claim to replace official navigation equipment. API, Supabase and marine data contracts are unchanged. Existing unrelated worktree changes remain untouched.

Verification: navigation-related targeted tests 43/43, full suite 1347 PASS / 1 existing SKIP, typecheck, lint, isolated production build (1467/1467 static pages) and `git diff --check` passed. The build used a copy of the current working tree to keep the running local development server intact; it is not an independent clean-main Preview deployment.

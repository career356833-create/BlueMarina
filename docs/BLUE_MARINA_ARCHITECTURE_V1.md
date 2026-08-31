# Blue Marina Architecture V1

## 1. Product Identity

Blue Marina is a premium marine platform for sea conditions, fishing, fish knowledge, coastal places, boat/license guidance, and future marine navigation.

It is not a single long-scroll feature showcase. The home page is a brand entry point; each feature owns its own route and interaction surface.

## 2. Route Map

| Area | Route | Owner | Status |
| --- | --- | --- | --- |
| Home | `/` | Home / Brand Entry | Active Core |
| Sea | `/today-sea` | Today Sea | Active Core |
| Sea | `/sea` | Sea Map / Explore | Active Core |
| Fishing | `/fishing-spots` | Fishing Spots | Active Core |
| Fish | `/fish` | Fish Encyclopedia | Active Core |
| Boat / License | `/license-guide` | Boat / License Guide | Active Secondary |
| Boat / License | `/exam-guide` | License Exam Guide | Active Secondary |
| Boat / License | `/safety-guide` | Safety Education Guide | Active Secondary |
| Boat / License | `/license-issue` | License Issue Guide | Active Secondary |
| Boat / License | `/leisure-report` | Leisure Report Guide | Active Secondary |
| Boat / License | `/official-links` | Official Links | Active Secondary |
| Boat / Knowledge | `/boatpedia` | Boatpedia | Active Secondary |
| Boat / Knowledge | `/marine-knowledge` | Marine Knowledge | Active Secondary |
| Boat / Knowledge | `/dictionary` | Marine Dictionary | Active Secondary |
| Boat / Knowledge | `/centers` | License Centers | Active Secondary |
| Boat / Knowledge | `/fishing-safety` | Fishing Safety | Active Secondary |
| Legacy Learning | `/study` | Legacy License Learning | Legacy |
| Legacy Learning | `/theory` | Legacy License Learning | Legacy |
| Legacy Learning | `/theory/[tag]` | Legacy License Learning | Legacy |
| Legacy Learning | `/exam` | Legacy License Learning | Legacy |
| Legacy Learning | `/random` | Legacy License Learning | Legacy |
| Legacy Learning | `/wrong` | Legacy License Learning | Legacy |
| Legacy Learning | `/progress` | Legacy License Learning | Legacy |
| Legacy Learning | `/analysis` | Legacy License Learning | Legacy |
| Legacy Learning | `/practice` | Legacy License Learning | Legacy |
| Legacy Learning | `/practice/course` | Legacy License Learning | Legacy |
| Legacy Learning | `/practice/fail-items` | Legacy License Learning | Legacy |
| Legacy Learning | `/practice/checklist` | Legacy License Learning | Legacy |
| Legacy Learning | `/practice/videos` | Legacy License Learning | Legacy |
| Legacy Learning | `/past` | Legacy License Learning | Legacy |
| Utility | `/coming-soon` | Placeholder | Future Reserved |
| Utility | `/contact` | Contact | Active Secondary |
| Utility | `/privacy` | Privacy | Active Secondary |
| Utility | `/terms` | Terms | Active Secondary |
| Utility | `/dev-audit` | Development Audit | Development Only |

## 3. Page Ownership

`/` is owned by Home / Brand Entry. It may render `MarineVideoHero`, short service entry links, and footer only.

`/today-sea` is owned by Today Sea. It renders tide, marine weather, wind, wave, water temperature, sunrise/sunset, station context, and trip briefing surfaces.

`/sea` is owned by Sea Map / Explore. It keeps the Kakao Map, MarinePlace, harbor/fishing spot layers, current location, and Explore Sea intro.

`/fishing-spots` is owned by Fishing Spots. It keeps fishing spot search/filter and may use Fishing Experience as the route intro.

`/fish` is owned by Fish Encyclopedia. It keeps fish search/filter and may use Fish Encyclopedia as the route intro.

`/license-guide` and related guide routes are owned by Boat / License / Knowledge. They must not be labeled as a user account `MY` surface.

Legacy learning routes remain available but are not part of the core platform navigation.

## 4. Main Navigation

Desktop navigation:

- `HOME` -> `/`
- `SEA` -> `/sea`
- `FISHING` -> `/fishing-spots`
- `FISH` -> `/fish`
- `MARKET` -> `/coming-soon?section=마켓&feature=마켓`
- `GUIDE` -> `/license-guide`

Mobile bottom navigation:

- `홈` -> `/`
- `바다` -> `/sea`
- `출조` -> `/fishing-spots`
- `어종` -> `/fish`
- `가이드` -> `/license-guide`

`MY` must not point to `/license-guide`. Add a real account route before restoring a `MY` item.

## 5. Existing Features

Active core features:

- Premium cinematic home hero.
- Today's Sea intelligence page.
- Kakao marine map page.
- Fishing spot search/filter page.
- Fish encyclopedia search/filter page.
- Global AI Captain floating assistant prototype.

Active secondary features:

- Boatpedia.
- Marine dictionary.
- Marine knowledge.
- License guide pages.
- Center directory.
- Fishing safety.
- Official links.
- Terms, privacy, contact.

## 6. Legacy Features

The following routes are classified as Legacy License Learning:

- `/study`
- `/theory`
- `/theory/[tag]`
- `/exam`
- `/random`
- `/wrong`
- `/progress`
- `/analysis`
- `/practice`
- `/practice/course`
- `/practice/fail-items`
- `/practice/checklist`
- `/practice/videos`
- `/past`

These routes must remain functional until a deliberate retirement or migration plan exists.

## 7. Reserved Future Features

Reserved routes are architectural intent only. Do not create fake live functionality.

- Charter: `/charters`, `/charters/[id]`
- Reservation: `/reservations`
- Market: `/market`, `/market/[id]`
- Community: `/community`
- Catch reports: `/reports`

## 8. Marine Navigation

Marine Navigation is an active, standalone module under `/sea/navigation`. `/sea` remains the Kakao-based place discovery map and owns the selected-place handoff into navigation.

Current scope:

- GPS current position.
- Destination.
- Distance.
- Bearing.
- Heading.
- Speed.
- Waypoints.
- Track.
- ETA.
- Local waypoints and tracks.
- A provider-neutral map boundary with a temporary Leaflet/OpenStreetMap renderer.

It does not provide safe routing, land/reef avoidance, depth routing, or an official navigation-equipment replacement. A future route engine requires validated chart and hazard data and must not be implemented like a generic car shortest-route feature.

## 9. AI Captain

AI Captain is a global assistant, not a page-owned feature.

Future action contract examples:

- `OPEN_TODAY_SEA`
- `OPEN_SEA`
- `OPEN_NAVIGATION`
- `OPEN_FISHING_SPOTS`
- `OPEN_FISH`
- `OPEN_CHARTERS`
- `OPEN_MARKET`
- `OPEN_LICENSE_GUIDE`

Do not embed feature business logic directly into the AI Captain widget. The widget should route or delegate to owned feature modules.

## 10. Charter / Reservation

Charter and Reservation are future Fishing domain extensions.

Initial UX direction:

- Charter operator / vessel.
- Departure place.
- Target species.
- Departure schedule.
- Remaining seats.
- Inquiry, phone, or external booking link first.

Do not assume first-party payment in the initial boundary.

## 11. Market

Blue Marina Market is reserved as a local marine/fishing marketplace, not just a generic shop.

Long-term item categories:

- Rods.
- Reels.
- Lures.
- Fish finders.
- Boat gear.
- Outboard motors.
- Trailers.

The intended product direction is local, region-aware secondhand trading.

## 12. Fish Domain Boundary

Fish Domain, Supabase schema, RLS, RPC, Media Gateway, NIFS, and MBRIS pipelines are backend/domain foundations.

UI changes must not alter Fish schema or database contracts for convenience.

`/fish` is currently an encyclopedia UI. MyFishDex and observation flows require explicit page and API work before they become live user features.

## 13. Sea Data Boundary

Sea data surfaces rely on existing KHOA/KMA API boundaries, Kakao Map integration, MarineObservatory, MarinePlace, and related contracts.

Home or cinematic intro design must not rewrite `SeaMapView`, tide contracts, or location permission logic.

## 14. Do Not Mix Rules

Do not:

- Put every feature page into Home as long stacked sections.
- Treat cinematic intro as the feature itself.
- Label Guide as MY.
- Mix Legacy License Learning into the core platform navigation.
- Change Fish Domain schema for UI convenience.
- Modify `SeaMapView` because of Home design.
- Put feature business logic directly in AI Captain.
- Implement Marine Navigation as a generic land-route feature.
- Present missing Charter, Reservation, Market, or Community features as live.

## 15. Current Dead Candidates

Classify but do not delete:

- `src/components/auth/login-form.tsx`: references `/dashboard`, but no current `/dashboard` route exists.
- `src/components/layout/app-shell.tsx`: dashboard-style shell not used by current Blue Marina page ownership.
- `src/components/layout/sidebar.tsx`: dashboard-style sidebar not used by current Blue Marina page ownership.
- `src/components/layout/mobile-nav.tsx`: dashboard-style mobile nav not used by current Blue Marina page ownership.

These are candidates for a later cleanup or separate SaaS/admin boundary decision.

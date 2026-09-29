# Blue Marina Design System V2 — Detail, Learning, Form

V2 extends the V1 tokens and shared header/BottomNav without changing APIs, data, authentication, navigation safety, or publishing rules. `PageFamilies.tsx` supplies structural wrappers. Semantic colors and spacing come from `globals.css`; route clients keep their existing submission and answer logic.

## Detail family

`DetailFrame`, `DetailBackLink`, `DetailSection`, and `DetailUnavailable` set reading width, section rhythm, a visible return route, and a consistent missing-record view. Fishing Spot, Charter, Market, and Community detail templates use the frame. Fishing Spot retains the coordinate hold, Conditions link, map/navigation restrictions, and source metadata. Charter, Market, and Community still have zero public production records; no demo offer, listing, post, price, schedule, or booking result is invented. Missing IDs call `notFound()` and display a family-specific unavailable view with a route back to the collection. Fish has no public `/fish/[id]` template, so no new route was created.

## Learning family

`LearningFrame` gives fourteen study, theory, exam, random, wrong-answer, progress, analysis, practice, and past-question templates one paper canvas and reading width. `LearningNav` supplies the same four internal waypoints there and in the six `PortalShell` guide routes. Existing question state, progress storage, scoring, result distinctions, and links remain in each client. `QuestionCard` and `StatCard` retain their correct/incorrect colors and accessible controls. The map and marine navigation screens remain immersive exceptions.

## Form and utility family

`FormFrame` sets shared width, bottom clearance, focus outlines, and touch behavior for Charter onboarding/partner guide, Market and Community compose, and Account profile/saved/activity. The Account login route retains its V1 utility shell and receives the same focus rule. Existing label-wrapped fields, server submission boundaries, local staging, OAuth flow, and disabled/limited states remain unchanged. The private/admin classification is about access exposure; a family wrapper does not make a private route public.

## Empty and notice states

`DetailUnavailable` is used only after a real `notFound()` and never turns an absent record into a successful listing. The existing shared `EmptyState` remains for zero-result collections. `StatusNotice` provides `info`, `success`, `warning`, `danger`, `blocked`, and `limited` tones. A notice must state what was verified or blocked, without implying a completed reservation, transaction, moderation, or safety judgment.

## Floating captain and accessibility

On normal content routes the captain pauses its roaming animation and moves into document flow after the page. Desktop uses a compact 92px launcher at the lower-right end of the document; mobile uses 44px with clearance for the 64px BottomNav and device safe area. This keeps the button accessible at the end of the page without covering titles, form actions, or cards while scrolling. Closed captain stacking stays below modal content; the open preview rises for interaction. Map and navigation routes retain their roaming behavior. The companion lure is not drawn on content routes. The launcher keeps `pointer-events` limited to its own button/panel.

All family controls retain visible keyboard focus, at least 44px primary targets, readable mobile wrapping, semantic headings, and existing field labels. Fishing Spot invalid IDs still return HTTP 404. In local Next streaming, invalid Charter and Market IDs rendered the unavailable boundary with `noindex` but returned HTTP 200; V2 does not alter that routing behavior. CSS family rules do not change business state.

## Scope and limitations

See `BLUE_MARINA_UI_MIGRATION_MAP_V2.md` for all 63 route templates. V2 migrates nineteen additional public page templates; eleven remain for later visual work. Authenticated Account appearance, independent Preview QA, and real-device QA require separate verification. This document does not claim those checks passed.

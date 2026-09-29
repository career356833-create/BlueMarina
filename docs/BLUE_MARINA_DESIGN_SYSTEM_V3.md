# Blue Marina Design System V3 — public operating contract

V3 completes the public page pass without changing routes, APIs, authentication, Supabase, source data, or navigation safety. The [V3 migration map](BLUE_MARINA_UI_MIGRATION_MAP_V3.md) reconciles all 63 page templates; `REMAINING` is zero. Visual migration does not imply that a backend is active or a record exists.

## Public visual contract

Use the V1 semantic tokens in `globals.css`: marine navy for the page and elevated surfaces, warm gold for emphasis and focus, and the existing serif heading scale. `AppFrame` owns page width, header clearance, footer, and BottomNav. Use `PageHero`, semantic surface classes, and V2 `PageFamilies` for content. Do not add a route-specific palette, arbitrary white dashboard cards on navy, or a second page shell.

## Page families

- Discovery pages use `AppFrame family="discovery"`, a constrained content width, a semantic hero, labelled filters, and surface cards. Search, category, and pagination state remain in their existing clients.
- Detail and legal pages use `DetailFrame`, a visible back path, and `bm-detail-section`. Missing records use the existing `notFound()` boundary and `DetailUnavailable`; no placeholder record is created.
- Learning pages use `LearningFrame` or `PortalShell` and keep their answer state and study navigation. Conditions uses the content family while retaining its evidence and coordinate-hold rules.
- Form and utility pages use `FormFrame` or the existing utility shell. Styling never implies server submission, approval, a booking, or publication.

## Responsive and accessible behavior

At 390px, controls must wrap without horizontal overflow, important touch targets are at least 44px, and content clears BottomNav and device safe area. At desktop widths, use the shared reading/wide width tokens. Keep one visible `h1`, labelled fields, `aria-pressed` on active filters, `aria-expanded` on disclosures, visible keyboard focus, readable contrast, and reduced-motion behavior. Warning and limited states retain semantic wording; an unknown value is never rendered as a success.

## Account, zero-data, and immersive boundaries

The login page keeps Kakao as its primary action, Google as another social option, and email as fallback. It links to Terms and Privacy and preserves the existing internal `returnTo` logic. Authenticated Account screens must show actual account state; development preview or an unauthenticated page is not evidence of a production login. When Account backend is off, keep its real limitation state.

Charter, Market, and Community list/detail/form screens remain honest about zero public records and staged submissions. No demo offer, listing, post, price, availability, or moderation result is invented. `/today-sea`, `/sea`, and `/sea/navigation` remain immersive exceptions: the common header and BottomNav relationship is checked, but the map/HUD structure and navigation meaning are not rewritten.

The captain is in document flow at the end of ordinary pages and floats only on map/navigation routes. It must not cover titles, actions, the BottomNav, or a dialog. The separate size and tail artwork adjustments in the worktree are outside V3.

## Future page rule

Choose an existing page family first; use the V1 tokens and the corresponding V2 frame. Add a new visual primitive only when those contracts cannot express the page. Verify 390px and desktop widths, keyboard focus, empty and error states, and the backend truth boundary before classifying a page as migrated.

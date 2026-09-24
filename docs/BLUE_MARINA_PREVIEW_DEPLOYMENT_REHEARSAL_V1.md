# Blue Marina Preview Deployment Rehearsal V1

## Decision

`PREVIEW_DEPLOYMENT_READY_WITH_LIMITATIONS`. The Vercel preview is healthy for deployment, public-route, metadata, header, private-boundary, PWA asset, and backend-disabled checks. `PUBLIC_INFORMATIONAL_RELEASE_HOLD` remains in effect until Kakao Maps allows the intended public domain.

## Deployment

- Provider: Vercel preview; no production promotion.
- Deployment: `dpl_GZQ91QuGHSWCLcF58Bhtqz8jXxCB`.
- URL: `https://blue-marina-btoin4yw9-chiweon.vercel.app`.
- Runtime: Next.js 15.5.19, Node.js 24.x, `iad1`.
- The final preview included two light, uncommitted fixes: immediate metadata-stage `notFound()` for invalid Fishing Spot IDs and no-store headers for reservations.

## Environment and indexing

The preview has `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`; values were not read or recorded. `NEXT_PUBLIC_SITE_URL` is absent, so sitemap output is intentionally valid but empty and no canonical is emitted. Vercel supplies `X-Robots-Tag: noindex` for preview responses, preventing preview indexing. Backend-sensitive flags are not configured and remain fail-closed.

## Route, SEO, and private-boundary checks

The requested public routes all returned 200 without browser console errors. `/robots.txt`, `/sitemap.xml`, `/manifest.json`, and `/sw.js` returned 200. Root HTML has title, description, Open Graph, Twitter, manifest, and icon metadata. Account, admin, onboarding, compose, and reservation pages returned noindex and private no-store response headers. API responses returned `X-Robots-Tag: noindex, nofollow`; Account API returned `503 ACCOUNT_BACKEND_DISABLED`, and Market API returned an empty list without fake data.

## Map, navigation, and PWA

MapLibre navigation renders its canvas and HUD at desktop and 390×844. Navigation remains presentation-only: no safe-route, land, reef, or depth avoidance inference was introduced. Safety-hold samples `boat-60`, `boat-128`, and `boat-321` rendered their existing review/safety content.

Kakao Maps SDK was requested but `/sea` displayed its safe SDK/domain configuration error state on preview. The likely prerequisite is registering the preview/final public origin in Kakao Maps allowed domains; no key or provider setting was changed in this rehearsal.

The manifest and service worker are served, and source/deployment review confirms private, admin, compose, onboarding, reservation, and API cache bypasses. The browser runner did not expose `navigator`, so installation and Cache Storage inspection remain unverified.

## Remaining issues and production prerequisites

1. **P1:** Register the intended public domain with Kakao Maps, then recheck map load and markers.
2. **P2:** Set `NEXT_PUBLIC_SITE_URL` only to the final HTTPS production URL before canonical and populated sitemap activation.
3. **P2:** Resolve or formally accept the streaming unknown-detail response that contains a Next 404 fallback while returning HTTP 200.
4. **P2:** Profile the 2.75 MB Fishing Spot listing response before broad traffic.
5. **P3:** Run PWA install/cache storage verification in a browser environment exposing service workers.

No production deployment, database apply, backend activation, or feature-flag enablement occurred.

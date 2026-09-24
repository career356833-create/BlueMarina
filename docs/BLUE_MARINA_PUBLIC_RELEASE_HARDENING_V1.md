# Blue Marina Public Release Hardening V1

## Decision

`PUBLIC_RELEASE_HARDENING_READY_WITH_LIMITATIONS`. Blue Marina can expose its informational routes with explicit indexing and private-route policies. This work does not activate Charter, Market, Community, Account, or any Supabase backend.

## Public indexing policy

`robots.ts` allows the informational platform routes and excludes API, account, administration, onboarding, compose, reservation, and internal audit routes. Robots policy is an indexing directive only; authentication and RLS remain the access boundary.

`sitemap.ts` contains 19 public static routes and the 1,405 source-backed Fishing Spot detail routes. Charter, Market, and Community dynamic details are excluded because production datasets are empty or backend-gated. The sitemap deliberately returns no URLs unless `NEXT_PUBLIC_SITE_URL` is a non-local HTTP(S) origin, avoiding localhost or invented production URLs.

## Canonical and metadata policy

Root metadata supplies a title template, description, Open Graph, Twitter, icons, and manifest. `metadataBase` and the root canonical activate only when `NEXT_PUBLIC_SITE_URL` is valid. Public service metadata is concise and source-backed. Fishing Spot detail metadata uses its source-backed name and region; unavailable Charter, Market, and Community details are noindex and do not generate fake metadata.

## Private and operational policy

Account, Charter/Market administration, onboarding, compose, reservations, unavailable detail routes, and not-found are noindex/nofollow. Account and admin route layouts force dynamic rendering with `revalidate = 0`; private and compose paths return `Cache-Control: private, no-store`.

## Security headers

The application now supplies `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and a minimal Permissions Policy that disables camera, microphone, payment, and USB without disabling navigation geolocation. API routes send `X-Robots-Tag: noindex, nofollow`.

CSP is intentionally not enforced in this release because the MapLibre, Kakao, media, and API origin set requires deployment verification. HSTS remains a production-host responsibility after HTTPS and redirect validation.

## PWA and cache safety

The existing manifest, icons, and production service worker remain intact. The worker now bypasses Account, admin, onboarding, compose, and reservation paths so authenticated or operational HTML is not written to its offline cache. API requests were already bypassed.

## Production checklist

1. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS public origin.
2. Confirm `/robots.txt` and `/sitemap.xml` from that origin.
3. Verify private routes return noindex and no-store headers in production.
4. Run a CSP report-only inventory with deployed MapLibre, Kakao, media, and API origins.
5. Enable HSTS only after HTTPS and redirect behavior are verified.

## Verification

Targeted hardening contracts passed 4/4 and the full suite passed 1,089/1,089. Typecheck, lint, `git diff --check`, and the production build passed. The build generated 58 static pages; Account and administration paths are intentionally force-dynamic.

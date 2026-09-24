# Blue Marina Kakao Map Preview Fix + Release Recheck V1

## Decision

`PREVIEW_DEPLOYMENT_READY_WITH_LIMITATIONS` and `PUBLIC_INFORMATIONAL_RELEASE_HOLD` remain in effect. There are no P0 issues. The public informational release remains blocked because the primary Sea Map cannot load on the Preview origin.

## Phase A

The prior Preview rehearsal artifact was committed and pushed as `5da56b7749c94cf2bfdf778e05f4ba0c8441a436` (`docs(release): record preview deployment rehearsal`). Only its report, documentation, and test were included.

## Kakao Maps finding

`NEXT_PUBLIC_KAKAO_MAP_APP_KEY` is present in the Vercel Preview environment, and the application correctly loads the Kakao JavaScript SDK from `dapi.kakao.com` using that public JavaScript-key contract. The value was never read or recorded. On `/sea`, the SDK fails and the existing safe fallback states that the environment variable or registered domain must be checked; the page does not crash or render a fabricated map.

Kakao's JavaScript SDK policy requires each caller origin to be registered in the application's **JavaScript SDK Domains**. The required console action is:

1. Sign in to the owning Kakao Developers account.
2. Open **My Application → App → Platform Key → JavaScript Key → JavaScript SDK Domains**.
3. Add `https://blue-marina-btoin4yw9-chiweon.vercel.app`, save, and wait for the setting to take effect.
4. Redeploy Preview and recheck map tiles, markers, layers, and browser errors.

No Kakao setting was changed because the current session has no authenticated owner session. The Vercel `blue-marina-git-main-chiweon.vercel.app` alias was inspected and resolves to production, so it must not be used for Preview allowlisting. Random Vercel deployment hostnames also are not durable allowlist targets. An owned, non-production preview or staging domain assigned to a Preview deployment is the required stable solution; no production-domain change was made.

## P2: missing Fishing Spot response

The missing-spot implementation now calls `notFound()` in both metadata and page rendering. Preview still returns HTTP 200 with a Next fallback/noindex response for `/fishing-spots/not-a-real-spot`. This is documented as an unresolved P2 response-status limitation; indexing stays protected.

## Retained checks

- Preview pages retain `X-Robots-Tag: noindex`; robots, sitemap policy, and no-canonical-without-site-URL behavior remain safe.
- nosniff, strict origin referrer policy, permissions policy, SAMEORIGIN, and API noindex remain present.
- MapLibre navigation, HUD, controls, and safety warning were previously confirmed at 390×844 and 1280×900. No safe-route or hazard inference exists.
- Manifest and worker assets remain served. The automation runner does not expose `navigator.serviceWorker`, so registration and Cache Storage remain unverified.

No production deployment, database/Supabase apply, backend activation, feature-flag change, key replacement, or domain restriction bypass occurred.

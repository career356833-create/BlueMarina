# Blue Marina Kakao Map SDK Failure Root-Cause Audit V1

## Decision

`KAKAO_ROOT_CAUSE_IDENTIFIED_EXTERNAL_ACTION_REQUIRED`. The release remains `PUBLIC_INFORMATIONAL_RELEASE_HOLD`.

## Confirmed cause

The deployed Preview SDK request was reproduced with the Preview origin as Referer, without logging the app key. Kakao returned **HTTP 401**, `application/json; charset=utf-8`, classified as **DOMAIN_MISMATCHED**. The deployed page has the expected `https://dapi.kakao.com/v2/maps/sdk.js` script, an appkey query, and `autoload=false`; after the response, `window.kakao.maps` is absent and the existing safe fallback appears.

This is direct evidence of Kakao domain authorization failure, not a missing Vercel environment variable or client load-timing bug. Kakao documents that Maps JavaScript SDK use requires a JavaScript key and a registered SDK domain, and identifies `domain mismatched` as the response when the caller domain is absent or incorrect. [Kakao Maps Web guide](https://apis.map.kakao.com/web/guide/) and [Kakao platform notice](https://devtalk.kakao.com/t/javascript-sdk-notice-platform-information-is-mandatory-to-use-javascript-sdk/133077).

## Code and environment trace

`src/components/sea/MapView.tsx` is a client component. It reads the build-time public `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`, calls `loadKakaoMaps`, and enters its safe error state only after that promise rejects. `src/lib/sea/kakao-maps.ts` injects exactly one HTTPS script with `autoload=false`; `onload` first verifies `window.kakao.maps`, then calls `maps.load`. It has an existing-script branch, a shared promise, failure reset, and mounted guards. The failure occurs before namespace creation, so there is no evidence that hydration, route remounting, duplicate insertion, or `maps.load` timing causes it.

The Vercel CLI shows this environment variable is present in both Preview and Production. Local `.env.local` also contains the name. Values were not read, logged, or written. There is no CSP, mixed-content, or security-header block implicated by the response.

## Required external action

An owner of the Kakao app that backs the deployed Vercel key must open:

`Kakao Developers → My Application → App → Platform Key → JavaScript Key → JavaScript SDK Domains`

and save this exact value without a path:

`https://blue-marina-btoin4yw9-chiweon.vercel.app`

Then confirm the setting is attached to the same app/key used by Vercel Preview and allow configuration propagation. Registering the URL in Product Link Management does not authorize Maps SDK use. No code change or redeploy is required for this configuration-only correction; rerun the Preview SDK/map check after it becomes effective.

## Stable Preview policy

The random Vercel Preview hostname is not suitable as a lasting SDK allowlist target. Assign an owned non-production staging or Preview domain to the Vercel Preview environment and register that stable HTTPS origin in Kakao. The existing `blue-marina-git-main-chiweon.vercel.app` alias resolves to production, so it is not a Preview-domain solution.

## Boundaries

The missing Fishing Spot HTTP 200 noindex fallback remains P2 and was not changed. No Kakao console setting, code, key, Vercel environment value, production deployment, database/Supabase resource, backend activation, Git staging, commit, or push was changed in this audit.

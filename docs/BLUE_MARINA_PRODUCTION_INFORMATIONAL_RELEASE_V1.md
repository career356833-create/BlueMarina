# Blue Marina Production Informational Release V1

Decision: **PRODUCTION_INFORMATIONAL_RELEASE_SUCCESS_WITH_LIMITATIONS**.
Rollback: **ROLLBACK_NOT_REQUIRED**. This is an informational release, not transactional or live-navigation certification.

## Exact release

- Production: https://blue-marina.vercel.app
- Vercel deployment: `dpl_HcRHZvpabQsFj9ibCwsqQPTcX1JP`, READY.
- Immutable deployment: https://blue-marina-ayz9pa7hp-chiweon.vercel.app
- Deployed/pushed SHA: `0625b2f13d161ea134a89451d54dd046ff79dd1c`.
- Commit: `fix(release): correct production canonical metadata`.
- Canonical scope: 17 files. Spot detail was partially staged; the existing unrelated `notFound()` change remains in the working tree. No unrelated file entered the commit.
- Vercel GitHub integration built pushed `main`. No dirty local source/build was uploaded.
- Previous production rollback target: `dpl_2eWCYfYEbaFrkvj28XHW1hwXXPRx`. No rollback executed.

## Environment and boundaries

Production site URL is `https://blue-marina.vercel.app`. The Production Kakao key remains present, and the registered production domain worked in the browser. No secret values are recorded here. No environment values changed during this release task.

Charter, Market, Market image upload and Account remain default OFF/fail-closed. Community is local-only. Account API returned 503 `ACCOUNT_BACKEND_DISABLED`; Charter intake returned 401 `AUTH_REQUIRED`; public Market API returned an empty list. No DB/migration/storage apply, backend activation, payment, escrow or chat work occurred.

## Production smoke results

| Surface | Observed result |
| --- | --- |
| Home | HTTP 200, video hero, primary six/secondary two, desktop/mobile navigation |
| Sea | SDK HTTP 200 `text/javascript`, `window.kakao.maps`, tiles and markers/layers; no fallback or DOMAIN_MISMATCHED |
| Navigation | MapLibre canvas, HUD scale/reticle, layer controls; GPS OFF means numeric bearing/distance remain placeholders |
| Fishing Spots | 1,405 listed; boat-1/128/60 render with own canonical and Conditions links; warning/blocked policy messages retained |
| Conditions | 38 non-placeholder selector options; both NIFS location sources return 503 `SOURCE_DISABLED`; live result/profileContext could not be exercised |
| Fish | Renders 336-item local guide. The 1,258 canonical data baseline is separate; do not claim all are displayed |
| Guide/legacy | Guide renders; study/exam HTTP 200 |
| Charter/Market/Community | Honest empty states; no fake inventory; local/backend limitations visible |
| Account | Authentication configuration limitation shown; no fake saved success |

390×844 and 1280×900 Chromium viewport checks covered Home, Sea, Navigation, Spots, Fish, Charter, Market, Community, Account and Guide. All 20 route/viewport combinations had no horizontal overflow or uncaught page errors. This is browser viewport emulation, not a physical touch-device test. Initial smoke console scan was empty; explicitly probing disabled Conditions sources later produced expected failed HTTP requests.

HUD toggle persisted across reload. Mobile layers opened/closed, HUD overlay had `pointer-events: none`, and drag/wheel input executed. **Zoom-in button interaction failed because the HUD button covers it at 390px.** Some navigation buttons are smaller than 44px. Existing fish-assistant artwork overlaps part of the map/HUD. These presentation issues predate the canonical-only commit; they are follow-ups, not claimed passing checks. Physical pinch and real GPS/compass behavior were not tested. No safe-route, land/reef/depth avoidance, or official-equipment replacement claim was introduced.

## SEO, security and PWA

Actual production HTML has correct self-canonicals for all 11 requested service routes and all three Spot samples. Sitemap: 19 static + 1,405 dynamic = 1,424 unique production-origin URLs; no Preview/localhost host. Robots allows public routes and excludes private/admin/API/write routes. Seven private/write routes retain noindex and no canonical.

Invalid Spot remains HTTP 200 + noindex with no canonical (P2). No large rewrite attempted.

Production responses include nosniff, strict-origin-when-cross-origin, Permissions-Policy, SAMEORIGIN and Vercel HSTS. API responses include `X-Robots-Tag: noindex, nofollow`. CSP remains unapplied. An initial exact-deployment error-log scan returned no logs; this is not a continuous monitoring guarantee.

Manifest, both icons and service worker asset returned 200. Manifest start/scope are `/`; browser registration was `activated`, scope `https://blue-marina.vercel.app/`, script `/sw.js`. Private/API cache bypass contract remains. P3 now specifically covers physical-device install/update/offline behavior, not browser registration.

## Verification and Git

Pre-commit: targeted 20/20, total 1,133/1,133; typecheck/lint/build/diff PASS. A separate test run against the staged Spot blob also passed 20/20, proving no dependency on the unrelated `notFound()` change.

Post-deploy: targeted **7/7**, total **1,140/1,140**, typecheck/lint/build (58/58)/diff **PASS**. Results are recorded in `reports/release/production-informational-release-v1.json`; the seven release tests validate the captured exact-SHA, HTTP/SEO, safety, responsive and PWA evidence without contacting production on routine test runs.

Report, this document and `tests/release/production-informational-release-v1.test.cjs` are intentionally uncommitted and unstaged. Existing unrelated tracked/untracked work remains preserved. No further push is part of this task.

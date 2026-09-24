# Blue Marina CSP Hardening V1

## Baseline and inventory

Baseline main/origin: `6a45cd998db51965cdd2b9b7e5467d9697b32213`.
Production was inventoried in a fresh Chromium context across `/`, `/sea`, `/sea/navigation`, `/fishing-spots`, `/fishing-spots/conditions`, `/fish`, `/license-guide`, plus `/account/login`. Only resource origins and paths were recorded; query strings/keys/tokens were not recorded.

| Destination | Observed/required sources |
| --- | --- |
| script | self; dapi.kakao.com SDK; t1.daumcdn.net Kakao runtime |
| style | self; inline React/Next/Kakao styles |
| img | self; t1.daumcdn.net UI images; mts.daumcdn.net tiles; observed data images; blob previews in existing Market/Community forms |
| font | self (Next-hosted fonts) |
| connect | self API; tile.openstreetmap.org raster fetch |
| media | self `/media/blue-marina-marina-hero.mp4`, video readyState 4 |
| worker | self `/maplibre/maplibre-gl-worker.mjs` and `/sw.js` |
| manifest | self |
| frame | no embedded frame requirement observed |

MapLibre explicitly uses setWorkerUrl with the copied local worker. No blob worker exception is necessary. Browser NIFS/KHOA/KMA requests use own API routes; upstream server fetch origins do not belong in browser connect-src. Production/Preview environment inventory has no Supabase public URL/key, and no Supabase browser request was observed. No speculative Supabase wildcard/origin is allowed. Enabling that existing contract in future requires an exact origin review.

Existing X-Content-Type-Options, Referrer-Policy, Permissions-Policy and SAMEORIGIN remain intact. HSTS `max-age=63072000; includeSubDomains; preload` is already provided by Vercel and is not reconfigured. No middleware or vercel.json header layer was found.

## Candidate enforcement policy

```text
default-src 'self';
script-src 'self' 'unsafe-inline' https://dapi.kakao.com https://t1.daumcdn.net;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://t1.daumcdn.net https://mts.daumcdn.net;
font-src 'self';
connect-src 'self' https://tile.openstreetmap.org;
media-src 'self';
worker-src 'self';
frame-src 'none';
manifest-src 'self';
frame-ancestors 'self';
base-uri 'self';
form-action 'self';
object-src 'none'
```

The header is enabled in production builds (including Preview). Development is unchanged, so development tooling does not force an unsafe-eval exception into the production policy. Static rendering and all 1,405 spot pages are preserved.

## Relaxations and known blocking issue

- unsafe-inline scripts preserve Next hydration/Flight scripts without a nonce rendering rewrite. This is not a strict XSS-resistant nonce/hash CSP.
- unsafe-inline styles preserve React and map positioning styles.
- img data is observed in Kakao; img blob is required by existing file-preview implementations. These are not allowed for scripts/workers.
- Only the four measured external hosts appear, in their required destinations. No `*`, global `https:`, unsafe-eval or wasm-unsafe-eval.

Controlled browser-only Report-Only and enforcement responses were tested against Production content without modifying the deployed server. All seven pages rendered, video remained ready, MapLibre worker/canvas loaded and Conditions static profile loaded. `/sea` reports one script-src eval violation at Kakao runtime 4.5.26, line 59. Source inspection identifies `try { eval("document.namespaces") } catch {}`. It is a caught legacy capability probe: enforced blocking still leaves kakao.maps.Map and loaded tiles available, with no uncaught page exception. It is nevertheless a real CSP violation and must not be reported as zero. No unsafe-eval relaxation or third-party SDK rewrite was made.

The user's gate requires resolving Preview violations before Production enforcement. This known denied probe requires an explicit acceptance decision if it remains in Preview; functioning maps alone do not satisfy a zero-violation claim. Production must remain unchanged while that gate is unresolved.

## Verification/deployment record

See the companion JSON report for actual Preview results, commit/deployment IDs, test totals and the final decision. Browser header injection is identified separately from native deployment enforcement. No collector/report endpoint was invented. Service-worker activation is verified separately under native headers, because the controlled injection phase disables worker caching for repeatability.

Future strict policy work would inventory deterministic Next script hashes or evaluate nonce rendering/cache costs and a CSP-compatible Kakao SDK before removing unsafe-inline. That rewrite, auth changes, DB/backend activation and live Conditions source activation are outside this task.

## Earlier checkpoint: CSP_HARDENING_BLOCKED (superseded)

Code/test commit `76fa62a6cdbd731d9094930ba6b855dec025a728` is pushed only to `codex/csp-hardening-v1`. Production and origin/main remain at baseline `6a45cd998db51965cdd2b9b7e5467d9697b32213`. Report/docs remain unstaged evidence.

Native enforced Preview deployment `dpl_CkJ9LzjNzWh9h4zj7bgsga4o4Y68` is READY at https://blue-marina-lwkhdvco6-chiweon.vercel.app with stable alias https://blue-marina-git-codex-csp-hardening-v1-chiweon.vercel.app. Seven routes returned 200, MapLibre canvas/local worker and Conditions profile rendered, and there were no uncaught page exceptions. The Preview Kakao map did not initialize. Original Preview SDK investigation returned 401 DOMAIN_MISMATCHED, while the same key with Production referrer returned 200. No Kakao console setting was changed.

Preview toolbar script initially caused vercel.live CSP violations. A request skip header was ineffective for the injected bundle. Branch-only Preview variable VERCEL_PREVIEW_FEEDBACK_ENABLED=0 and rebuilding removed these violations without widening CSP. No Production environment variable changed. The rebuilt seven-route check recorded zero violations, but this is not a Kakao pass: its SDK was not authorized/initialized.

Production enforcement is withheld under the requested Preview gate. Continuing requires authorized Preview domain registration and a decision on the separately proven denied Kakao legacy eval probe. The map functions despite that caught probe in controlled Production-content enforcement, but this cannot be labeled zero violations. Required decision was requested at this checkpoint; the subsequent user approval below supersedes it.

Validation: targeted 6/6, full 1165/1165, typecheck, lint, build (1463 pages), and diff checks passed. Unrelated worktree changes are preserved; no DB, backend, auth, live Conditions activation or device QA performed.


## Approved continuation and Preview gate

The user explicitly accepted the single caught Kakao probe as **known blocked legacy behavior**, retaining the unsafe-eval prohibition. The exact stable Preview alias was added to Kakao JavaScript SDK Domains; existing domains and redirect settings were preserved.

Native Preview enforcement then returned Kakao SDK 200, initialized kakao.maps.Map and loaded 31 map images. The seven-route audit found only the one known eval violation; no other CSP violations or uncaught page exceptions. At 390x844, HUD and marine layer toggles worked, zoom and drag changed the rendered map, Home video reached readyState 4, Conditions read-model returned 200 and the profile UI rendered.

Preview protection initially redirected native Service Worker requests because browser request interception did not cover those requests. Using the existing scoped automation bypass cookie resolved this test authentication issue without changing deployment protection. Native SW activated and created blue-marina-v6 cache. This was not a CSP failure.

The same tested code SHA was pushed to main only after these checks. Production recheck is recorded in the companion report. Existing optional marine source 503 responses are not CSP blocks; live source activation remains outside scope.

## Final result: CSP_HARDENING_COMPLETE_WITH_LIMITATIONS

Production deployment `dpl_D12eDqE8Z5yu9uPteLhcxrVhj3H8` is READY at https://blue-marina.vercel.app with exactly the Preview-tested SHA `76fa62a6cdbd731d9094930ba6b855dec025a728`. Native responses now carry the enforcement policy above. HSTS and existing security headers remain unchanged.

Production seven-route recheck: Kakao SDK/runtime 200, kakao.maps.Map initialized and 31 loaded map images; MapLibre canvas/local worker rendered; Home video readyState 4; Conditions profile UI rendered and API returned 200/PARTIAL with profileContext. Mobile 390x844 HUD/layer toggles, zoom and drag passed. Native SW activated, cache blue-marina-v6 created, manifest and SW endpoints returned 200. Sitemap remains 1,424 entries and an invalid fishing spot returns 404/noindex.

There is exactly one **known blocked legacy behavior**: Kakao's caught eval capability probe. It remains blocked, unsafe-eval remains absent, and no other CSP violations or observed CSP functional blocks occurred. Physical-device GPS/PWA and true multi-touch pinch testing were not performed. Existing optional marine data-source 503 responses remain availability limitations, outside CSP scope.

Code/tests commit is pushed to main and matches origin/main. Report/docs remain unstaged evidence for selective archival. Staged files: 0; unrelated changes preserved. The earlier blocked checkpoint above is historical and superseded by the explicit approval and final validation.

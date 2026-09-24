# Blue Marina Production Canonical Fix V1

Decision: **PRODUCTION_DEPLOYMENT_CANDIDATE_READY_WITH_LIMITATIONS**.

Baseline: `main`, HEAD/origin/main `fabbb8d7801baf2841d9644bef592686ca49c636`.

## Two blockers addressed

Root layout declared a home canonical inherited by pages without their own `alternates`. It now retains only `metadataBase`; home and each requested service route declare their own canonical through `canonicalMetadata`. Dynamic Fishing Spot metadata uses the validated source-backed spot ID. The helper rejects invalid/non-HTTPS/local/Preview origins, credentials, ports, path/query/fragment origins and unsafe route paths. Preview builds omit canonicals.

Vercel Production `NEXT_PUBLIC_SITE_URL` was set to `https://blue-marina.vercel.app` and its scope verified. Preview environment was unchanged. This setting applies to future builds: **no deployment was performed and the existing live deployment is not claimed fixed**.

## Build evidence

Production-like build passed, 58/58 static pages. Built HTML has correct canonicals for `/`, `/today-sea`, `/sea`, `/fishing-spots`, `/fish`, `/charters`, `/license-guide`. Next.js renders the root URL without the equivalent trailing slash.

Compiled build page metadata was executed for `/sea/navigation`, `/fishing-spots/conditions`, `/market`, `/community`; each returned its own canonical. Compiled `generateMetadata` returned exact detail URLs for normal `boat-1`, warning `boat-128` and blocked `boat-60`. Invalid ID throws NOT_FOUND; noindex regression checks pass. Dynamic HTTP status was not re-tested.

Built sitemap contains 19 static + 1,405 spot URLs = **1,424 unique URLs**, all with the production origin. No Preview/localhost URL occurs. Built robots allows public routes and retains private/admin/API/write exclusions. Existing private/noindex policy is unchanged.

## Candidate gates

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| A Static | PASS | Tests, typecheck, lint, build |
| B Domain | PASS | Previously verified alias; Production env now set |
| C Kakao | PASS WITH LIMITATIONS | Registered production domain and Production/Preview key retained; prior map evidence reused |
| D SEO | PASS WITH LIMITATIONS | Built canonicals, sitemap, robots pass; historical invalid-detail HTTP status not re-tested |
| E Security | PASS WITH LIMITATIONS | Headers retained, prior Vercel HSTS observed; CSP deferred |
| F PWA | PASS WITH LIMITATIONS | Cache boundaries unchanged; real-device registration remains unverified |
| G Map/navigation | PASS WITH LIMITATIONS | Prior evidence reused; navigation semantics unchanged |
| H Data truth | PASS | Regression suite; production data unchanged |
| I Backend flags | PASS | Charter/Market/image/Account fail-closed; no activation |
| J Mobile/desktop | PASS WITH LIMITATIONS | Prior evidence reused; no new browser matrix |

P2 invalid-detail HTTP 200/noindex history and P3 real-device PWA verification remain follow-ups, not blockers to an informational deployment candidate. CSP is not applied. HSTS was previously observed at Vercel; no HSTS configuration was changed. Backend/Auth environment limitations remain: this is an informational candidate, not backend activation readiness.

## Verification and boundaries

- Targeted: **20/20 PASS**; full suite: **1,133/1,133 PASS**.
- Typecheck, lint, production-like build and diff check: PASS.
- No deploy, DB apply, backend activation, staging, commit or push.
- Pre-existing worktree changes preserved, including the separate `notFound()` change in Fishing Spot metadata. The only added detail-page scope here is canonical helper import/spread.
- Build reflects the current worktree. A future release must use a separately reviewed exact commit; existing audit reports are preserved as historical evidence.

Artifacts: `reports/release/production-canonical-fix-v1.json`, this document, `tests/release/production-canonical-fix-v1.test.cjs`.

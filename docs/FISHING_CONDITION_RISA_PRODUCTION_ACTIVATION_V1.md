# Fishing Condition RISA Production Activation V1

**Decision: `RISA_PRODUCTION_ACTIVATION_BLOCKED`.** RISA was enabled and verified on a clean Preview deployment from `fbc71e53737202eb426ba40c0e70b8ac04ecfdad`. The Production gate was not fully observable, so Production environment variables and deployment were left unchanged. FEMO stayed disabled throughout.

## Preview evidence

The [Preview deployment](https://blue-marina-mnx0ki61c-chiweon.vercel.app/fishing-spots/conditions) (`dpl_EnBboMeBP6Mo89hxzgcGbBennCFF`) reached `READY`. Only the Preview scope received the server-side `NIFS_RISA_API_KEY`, `NIFS_REALTIME_FISHING_ENABLED=true`, and `NIFS_FISHERY_ENVIRONMENT_ENABLED=false`. The key value was never included in this report.

The RISA observation API returned HTTP 200 with 41 stations and 65 observations. At the check, 39 stations were fresh and two unavailable. The latest source-local timestamp was `2026-09-26T13:30:00`. NIFS does not document that timestamp's timezone in this contract; the API and UI retained `UNSPECIFIED_BY_NIFS` / “시간대 미확인”. The explicitly chosen `bgj8a` surface station reported 24.2 °C. Its observed temperature remained separate from the species reference profile. Salinity and dissolved oxygen, which this RISA observation does not provide, remained missing rather than inferred.

The read-model returned HTTP 200 with RISA `AVAILABLE`, FEMO `DISABLED`, profile and seasonality contexts, and an observation context tied to the explicit station and surface depth. The Conditions selector held 38 unique species. In the authenticated browser, choosing 감성돔, September, RISA, 기장 and 표층 displayed the station, timestamp, temperature, sources and limitations. Switching to 농어 kept the station and returned `cache_hit`; the species reference changed while the observed temperature remained 24.2 °C. The UI displayed “비교 기준 없음” rather than an automatic suitability result. The FEMO observation-only API returned 503 `SOURCE_DISABLED`.

The server-side key was absent from the page HTML and all 70 linked client scripts examined. The RISA adapter imports `server-only`; the browser UI calls the application's API and never needs the NIFS key. Preview runtime error logs were empty. The single Preview 5xx log was the intentional FEMO-disabled 503 check.

## Gate still open

Two required checks remain unverified. The authenticated in-app browser exposed the working Preview UI but not a browser-console log interface. A separate headless Chromium session was redirected to Vercel Login and could not inspect the protected page's console. Also, the exact number of NIFS upstream calls during concurrent **Preview** requests could not be observed without upstream telemetry. The existing injected same-instance test proves that a cold pair coalesces into two NIFS endpoint calls, but it does not establish Preview-wide or cross-instance call volume. Failure isolation is likewise covered by an injected route test, not by deliberately failing the live Preview source. NIFS quota and cost remain `QUOTA_UNKNOWN`.

The request requires every Preview gate to pass before Production activation. These observations are enough to demonstrate a working Preview flow, but not enough to claim the full console and upstream-call gates. The Production RISA key and flag therefore remain absent and fail closed. Production RISA and FEMO observation endpoints both still return 503 `SOURCE_DISABLED`. No Production deployment, rollback, database operation, comparator, score, rank, probability or nearest-station inference was performed.

## Next gate evidence

Before enabling Production, capture authenticated Preview console errors and browser network requests, then measure concurrent cold-instance NIFS call counts with safe upstream or application telemetry. Confirm the key never appears in browser requests or logs and that errors remain zero. Keep FEMO off. Production activation, if later authorized by the verified gate, requires a Production-scoped key and flag followed by a clean deployment; flag-off plus redeploy is the rollback path.

# Fishing Spot HTTP 404 Semantics Fix V1

## Cause and baseline

Baseline commit: `4dc04c199fb3233fdb08e237e95c23fc703f80f7`. Next.js 15.5.19.

Production returned HTTP 200 for `not-a-real-spot`, `boat-999999`, encoded percent, encoded whitespace and encoded extra slash. HTML contained noindex and the streamed `NEXT_HTTP_ERROR_FALLBACK;404` marker, with no canonical. Normal boat-1, warning boat-128 and blocked boat-60 returned 200 and self canonicals. The root loading boundary can flush the response before the asynchronous detail resolves. The 404 UI/metadata does not change an already-started stream's status.

The baseline build marked `/fishing-spots/[id]` as dynamic (`ƒ`); its prerender manifest contained zero spot detail routes. The prior 58 static pages did not include 1,405 detail pages. No generateStaticParams/dynamicParams policy or static export was present. The local uncommitted metadata notFound change was not yet in Production; merely repeating notFound in metadata does not establish an early routing boundary.

References: [Next not-found streaming status](https://nextjs.org/docs/app/api-reference/file-conventions/not-found), [generateStaticParams and dynamicParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params). Actual installed-version build and HTTP results, rather than documentation alone, validate this fix.

## Change

- Generate all 1,405 IDs directly from the checked-in canonical spot catalog.
- Set dynamicParams=false so unknown IDs are rejected before rendering the streamed page.
- Use one exact-ID lookup/notFound helper for metadata and page. Keep source-backed canonical metadata for valid IDs. Adopt the existing related metadata guard into this fix.
- Remove redundant decodeURIComponent on already-decoded Next params, avoiding double decoding and URIError.
- No middleware, routing rewrite, forced dynamic rendering, global loading change, data mutation or HUD modification.

## Performance and coverage

The new build marks this route SSG (`●`), produces 1,405 detail routes, and records fallback=false. Total static generation is 1,463 (58 + 1,405). This increases build work/storage and allows static cache hits instead of per-request detail rendering. Catalog additions require a new build; there is deliberately no unknown-ID runtime fallback. Client account/save/recent behavior remains client-side.

Six new tests execute real exports/helpers, all metadata identities, invalid lookup errors, normal/warning/blocked journey CTA trees, not-found metadata and the 1,424-entry sitemap. Targeted 6/6 and full 1,159/1,159 pass; typecheck/lint/build/diff pass. Local production-server HTTP requests return 404 for invalid variants and 200 for the three valid cases. Local canonical/sitemap are intentionally absent without NEXT_PUBLIC_SITE_URL; Production checks must validate the configured domain. Preview intentionally suppresses production canonicals by existing policy.

## Deployment evidence

Code/test commit: `0a5e7bffc4d950e39821902e25c745fec66e6702`.
Preview branch: `codex/fishing-spot-http-404-v1`. Push the same commit to main only after actual Preview 404 success. Final deployment IDs, Production status/canonical/sitemap and mobile HUD smoke are recorded in the companion report.

Raw HTML contains serialized not-found boundary content even on valid pages, so string presence alone is not treated as a visible error UI. HTTP status, metadata, actual browser headings and CTA behavior are checked separately.

Unrelated changes, Conditions evidence, next.config.ts and release tests remain excluded. DB/backend activation and Conditions/CSP/GPS/PWA work: zero.

## Final Production result

FISHING_SPOT_HTTP_404_FIXED. Preview dpl_6cFqgEJKWXBkTFFh8xdZrt8wo7Xd returned real 404 for all five invalid probes before main push. Production dpl_9yZgDJkMsiUPA45RrELFVd4n6kV1 is READY at https://blue-marina.vercel.app on the same 0a5e7bffc4d950e39821902e25c745fec66e6702 commit. All five invalid probes return 404/noindex/no canonical; normal/warning/blocked cases return 200, correct visible headings, self canonical, Conditions links and preserved holds. Sitemap remains 1,424 with no invalid entry. Local HTTP coverage was 1,405/1,405 successful detail responses.

Production 390x844 HUD smoke: HUD/zoom and layer/zoom overlap zero; HUD and layer toggles, map drag and zoom pass; no uncaught page exceptions. The additional map-click assertion did not observe destination selection, so that assertion is not reported as passing. HUD source and Navigation Core were not edited. Report/docs are unstaged final evidence; the two-file code/test commit is pushed and HEAD matches origin/main.

Local next start logged Internal: NoFallbackError for rejected paths. These requests returned 404; the server continued serving all 1,405 valid pages with 200 and was stopped explicitly after verification. No HTTP 500 or process crash was observed. Production invalid requests matched /404.

# Blue Marina V1 — Master Status

**Decision: `V1_PRODUCTION_CORE_READY_WITH_LIMITATIONS`. Next primary priority: verified Charter supply and inquiry launch.** Blue Marina is a live informational fishing/sea product. It is not yet a working charter booking marketplace, durable resale marketplace, social network, or certified marine navigator. This document uses the [machine-readable baseline](../reports/platform/blue-marina-v1-master-status.json) and a bounded Production check on 2026-09-27 KST. `PRODUCTION_ACTIVE` means users can use the stated function now; an HTTP 200 or implemented form alone does not prove backend activation.

## Production architecture and evidence

`main` and `origin/main` were `51a86755d1f6bcc36b3ecfe1775de486266f5a50`. Vercel Production alias `https://blue-marina.vercel.app` pointed to Ready deployment `dpl_TX7XwU1fM5JKTLdxpMXFPuAoC4t4`, created 2026-09-27 06:15 KST. Vercel inspection did not expose that deployment's Git SHA, so a deployment-SHA match is **unverified**. The deployment uses public Next.js informational routes, server-side source adapters and fail-closed flags. Only four Production environment *names* were listed: RISA enabled/key, site URL and Kakao public map key; no secret values were read into this report. Supabase Auth runtime variables were absent. No remote database contents were inspected.

Evidence is labeled as current HTTP/API, committed code/data, or dated browser audit. Current HTTP 200 proves a route responded, not that a map canvas, GPS, login or transaction worked. Current RISA counts are a changing sample. The earlier informational release, RISA activation, KMA Preview, real-device QA, CSP and Operations audits remain historical evidence; their pre-fix limitations are not silently treated as current defects.

## Feature matrix

| Surface | V1 classification | What is available and the limiting boundary |
| --- | --- | --- |
| Home | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | MarineVideoHero, six primary and two secondary entries; recent items are device-local, account-backed highlights unavailable without Auth. |
| Today Sea | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | HTTP 200 operational hub, partial-source cards and live RISA; KMA/KHOA/FEMO not activated in Production. |
| Sea Map | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | Kakao authorization/tiles/layers passed prior Production browser QA; current route 200, no fresh canvas rerender in this audit. Spot restore and Navigation links exist. |
| Navigation | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | MapLibre/HUD, heading/bearing presentation, device-local track and straight-line distance; four held spot destinations blocked. No safe-route, land, reef or depth avoidance claim. Real GPS, compass, gestures and installed PWA remain unverified on a phone. |
| Fishing Spots | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | 1,405 spots, detail, coordinate lineage and cross-links; invalid ID now HTTP 404. `boat-60/321` map blocked, `boat-128/129` map warning; all four navigation blocked. |
| Conditions | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | 38 factual profiles, profileContext, seasonality and RISA selected-station context; FEMO disabled. No automatic comparator, score, rank or probability. |
| Fish | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | `/fish` public local guide historically 336 items; normalized canonical inventory 1,258 is a separate data program. One alias exception remains. |
| Charter | `CODE_READY_NOT_ACTIVATED` | Discovery, detail, onboarding and inquiry routes exist, but zero public offers; migration/Auth E2E and supply promotion absent. |
| Market | `CODE_READY_NOT_ACTIVATED` | Listing/moderation/image-staging contracts exist; public API returns zero listings, backend and upload flags off. |
| Community | `CODE_READY_NOT_ACTIVATED` | Feed, compose and linked-entity UI exist; drafts/interactions are local-only, public posts zero, no durable backend. |
| Guide | `PRODUCTION_ACTIVE` | `/license-guide` and legacy `/study` and `/exam` learning routes are available. |
| Account | `CODE_READY_NOT_ACTIVATED` | Profile, saved, activity, login and local recent routes exist; Production Auth/flag and remote migration E2E unavailable. |
| Operations | `BLOCKED_OR_BACKLOG` | Read-only dashboard code is deployed, but missing Auth and `operations_admin` keep `/admin/operations` at HTTP 404. Health API without a token returns 401; no public fallback. |

KMA observation and warning are `PREVIEW_READY` subfeatures, **not Production-active**. Their Preview responses passed with limitations; stale/cold-timeout and zero-warning coverage blocked Production promotion.

## Production data and external sources

| Data | Count | Interpretation |
| --- | ---: | --- |
| Fishing Spot records | 1,405 | Committed public dataset |
| Normalized Fish canonical inventory | 1,258 | Separate from the public `/fish` guide |
| Public Fish guide | 336 | Dated Production audit; not freshly browser-counted here |
| Condition profiles | 38 | Two 19-species batches in the runtime registry |
| RISA stations / observation rows | 41 / 65 | One current Production API response; changes over time |
| Public Charter offers / Market listings / Community posts | 0 / 0 / 0 | Public runtime exposure; remote DB rows unverified |

| Source | Production state | Evidence and gate |
| --- | --- | --- |
| Kakao Maps | `ACTIVE` with limits | Prior Production SDK/domain/tiles/layers browser pass; current Sea HTTP 200 is not new canvas proof. |
| MapLibre/base map | `ACTIVE` with limits | Prior canvas/HUD pass; Navigation HTTP 200 now, real-device check pending. |
| NIFS RISA | `ACTIVE` | Current HTTP 200, 41 stations, 65 rows and fresh response sample. Source timezone, quota and cross-instance dedupe unknown. |
| NIFS FEMO | `DISABLED`, program `HOLD` | Current 503 `SOURCE_DISABLED`; historical sample only, salinity unit undocumented. |
| KMA observation / warning | `DISABLED`, program `HOLD` | Current 503 `SOURCE_DISABLED`; Preview-ready with unresolved freshness/cold latency and warning-event coverage. |
| KMA forecast | `DISABLED`, program `HOLD` | Explicit zone request returned 503 `API_KEY_MISSING`. |
| KHOA tide | `DISABLED`, program `HOLD` | Explicit station/date request returned 503 `API_KEY_MISSING`; prediction datum/timezone unverified. |
| KHOA navigation warning | `DISABLED`, program `HOLD` | Current 503 `SOURCE_DISABLED`; lifecycle inference prohibited. |

## Backend matrix

| Domain | Migration | Apply and Auth | Flag/runtime E2E | Production outcome |
| --- | --- | --- | --- | --- |
| Charter | Yes, four-table intake contract | Remote apply not independently verified; no Auth runtime | Flag off; rehearsal blocked | No live supply or activation |
| Market | Yes, five-table supply contract | Remote apply/storage not independently verified; no Auth runtime | Backend/upload flags off; no authenticated E2E | Public listings 0 |
| Account | Yes, profile/saved contract | Remote apply not independently verified; no Auth runtime | Flag off; no authenticated E2E | Server-backed saved/profile unavailable |
| Operations | No migration | Existing Auth role required, not configured | Negative Auth checks only | Private UI unavailable, read-only boundary preserved |
| Community | No backend migration | No server persistence/Auth | Local preview only | Public posts 0 |

Code artifacts and old reports show no recorded application; this audit did **not** connect to a remote Supabase database, so it does not claim to prove that a migration is absent there. No migration, role, flag or source setting was changed.

## Release, security and QA

Production sample: Home, Today Sea, Sea, Navigation, Fishing Spots, Conditions, Fish, Charter, Market, Community and Guide routes returned HTTP 200; a nonexistent Fishing Spot returned 404. Sitemap contained 1,424 URLs. Home, Today Sea and a valid Spot emitted expected Production canonicals. Robots disallowed private/admin paths. CSP and HSTS were present; `unsafe-eval` remained disallowed. Kakao's one known legacy eval violation is blocked, with no reported functional break in the dated CSP audit. `nosniff`, Referrer-Policy, Permissions-Policy and frame policy were present. Service Worker asset responded 200 with cache `blue-marina-v6`. Rollback is available through Vercel and historical deployment records, but no rollback was rehearsed here.

The committed Operations baseline passed 1,230/1,230 tests, typecheck, lint and build. This master audit adds its own deterministic tests and reruns the full checks. Historical Chromium mobile/desktop checks passed selected routes; the current audit made bounded HTTP checks, **not** a new browser journey. Real-device GPS/heading/speed/background/PWA-install QA remains blocked. Authenticated Account/Operations and remote database E2E remain blocked. Public HTTP success must not be relabeled as physical-device or transactional success.

## Product value, V1 scope and backlog

Today a user can research a fishing spot, read source-backed condition profiles and a selected RISA observation, view the sea map, use straight-line navigation as a reference, and read Fish/Guide content. The strongest path is Fishing Spot → Conditions → Sea/Navigation. The weakest path is commercial and social: Charter, Market and Community expose honest empty states but provide no durable supply or conversion. Trustworthy Charter offers and operator inquiry are the nearest revenue path; saved content and participation could support retention only after Auth/persistence are real.

The official **Production Core** is Home brand entry, Today Sea reference, Sea Map reference, Fishing Spots, factual Conditions with RISA, public Fish guide and Guide. **Beta** covers straight-line Navigation/HUD, device-local personalization and local drafts/empty discovery shells. **Experimental** covers KMA observation/warning Preview. Durable Charter/Market/Community, server-backed Account, usable Operations and real-device Navigation gate remain **Backlog**.

Priority totals: **P0 0, P1 3, P2 6, P3 3, INFO 2**. P1 is verified Charter supply, physical-device Navigation/PWA QA, and an Auth/trust/backend E2E foundation. P2 is the Today Sea source package, Market supply, Community persistence, Operations admin access, RISA operational limits and Fish public-guide coverage. P3 is long-term observability, funnel measurement and rollback rehearsal. INFO preserves the blocked Kakao legacy eval and the unresolved `BM-SPECIES-000279` alias without inventing a release blocker. The exact titles and owners-to-be are in the machine report and [next roadmap](BLUE_MARINA_V1_NEXT_ROADMAP.md). No micro-audit or new feature was started here.

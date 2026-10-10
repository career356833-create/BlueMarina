# Blue Marina First-party Funnel Observability V1

Date: 2026-10-10. Code baseline: `d3df4a63dc0826de457f972f823be3d73ac7122c`.

Decision: `FIRST_PARTY_FUNNEL_OBSERVABILITY_READY_WITH_LIMITATIONS`.
Production smoke: pending the release of this exact changeset; see the report for the final result.

## Scope and architecture

Extends the existing acquisition contract and Operations QA/admin classification. No external analytics SDK, business-table migration, new identity, synthetic submission, historical backfill or Navigation/Acquisition parked-gate retest.

`FunnelObserver` records only eight entry surfaces and first meaningful input focus on the three compose routes. The existing Kakao button emits a start without waiting for telemetry. The server callback emits completion only after a successful session exchange, current Kakao identity confirmation, valid signed login-attempt cookie and session cookie. Missing/expired cookies or provider evidence means no completion event; it is never inferred from a callback visit. Google/email login are outside this V1 contract.

Submission hooks run after successful authorized database writes. Charter and Market idempotent replays produce no new events. Saved upsert uses `DO NOTHING ... RETURNING id` to distinguish an actual insert, preserving existing label/link refresh for repeated saves. Deletes do not create save events; delete/re-save creates a new saved-row event. Existing submitted-content edits are not counted as new submissions.

Next `after()` schedules server telemetry outside the response path. Per-network-call timeout is 1.5 seconds. Both scheduling and storage failures are swallowed without payload/error logging. Browser requests are serialized, bounded, deduplicated and keepalive; no navigation or submission waits for them. This is best-effort observability, **not** a transactional audit log or a complete census.

## Storage and security

One migration: `20261010123757_first_party_funnel_observability_v1.sql`. The CLI generated the migration; its filename was aligned to the version assigned by the remote migration tool.

- `operational_funnel_events`: explicit scalar columns with checks; no arbitrary JSON.
- `operational_funnel_baselines`: one immutable first-write timestamp per environment.
- Both have RLS enabled, no end-user policies and no anon/authenticated privileges. `service_role` has SELECT/INSERT only, no UPDATE/DELETE/TRUNCATE.
- Application timestamps cannot be supplied by the browser. `occurred_at` uses database time.
- Auth user deletion cascades that user's event rows. Anonymous rows carry no user identity.
- Environment partitions are server-selected: production, preview, development.
- Event POST checks exact origin, content type, strict event/route combinations, unknown fields, a streaming 1,024-byte body cap, verified bearer identity and per-instance admission limits.
- Limits: 20 events/minute per session (new-cookie requests share a bucket), 120/minute per process; bounded map. This is not a distributed bot-proof quota.
- Unsupported client completion/moderation/publication events are rejected. Client actor, identity, entity, timestamp and secret fields are rejected.
- Operations GET authenticates through existing `auth.getUser` / `operations_admin`, returns aggregates only, private/no-store and noindex/nofollow.
- Bounded history scan: 90 days, maximum 10,000 rows. Exceeding capacity returns unavailable, not misleading partial/zero counts. The scan is not a transactional snapshot; concurrent new events can appear on the next refresh.

Remote precheck: fish 1,258; marine 3,016; auth users/profiles 21/21; saved 0. Existing business data and auth configuration are outside this migration.

Security Advisor: existing WARNs remain (two existing authenticated SECURITY DEFINER functions and leaked-password protection); no new WARN/ERROR. The two new RLS/no-user-policy INFO notices are intentional server-only access.

## Session and attribution

Signed HttpOnly, SameSite=Lax, first-party session cookie; Secure over HTTPS; random UUID; absolute 30-minute expiry. No sliding permanent visitor identifier, fingerprint, cross-site graph, raw IP/UA/GPS, email, phone, token, auth code, full referrer or form content.

Attribution reuses `sanitizeAttribution` and persists only finite source/medium/campaign/referrer categories. Unknown values become UNKNOWN or fail ingest validation. Raw query and referrer are reduced in the browser before transmission. Attribution belongs to each event; V1 does not invent cross-session last-click attribution.

Login completion and authenticated actions may share this short session ID. Anonymous rows are not rewritten with the user's identity. A session containing observed QA/admin/unknown authenticated activity is excluded from the default anonymous-to-Real conversion set. Truly anonymous sessions cannot be proven Real or QA and are explicitly labelled anonymous, not verified users.

## Operations semantics

New **OBSERVED SINCE** section is separate from existing retained-record **CURRENT STATE** metrics. Before the first stored baseline: `NO_EVENT_DATA`. No older rows are synthesized.

Filters: Today (KST midnight), rolling 7 days, rolling 30 days; ALL/GENERAL/CHARTER/MARKET/COMMUNITY; REAL default or QA. Shows events, distinct sessions, distinct users separately. Anonymous events have zero known users, not zero visitors.

- First actions: distinct classified users with a successful save/submission in the selected window; not lifetime first-ever activation.
- First observed saved users: earliest retained save observation in the scanned 90-day history falls in the window; not lifetime first save, and older/current saved rows are not backfilled.
- Login completion: matched session with start and later completion in the selected window. Unmatched completions never inflate the ratio.
- Login → action: same classified user, completion preceding successful action inside the window.
- Submission completion: same classified user and same domain, compose preceding submission inside the window. Does not infer a particular form attempt or entity from pageviews.
- Denominator zero: N/A. Counts are not mechanically divided across unrelated populations. Interrupted telemetry, auth cookies, browser closures, multi-tab or cross-device use can undercount conversions.
- QA identity uses trusted app metadata; content QA markers use existing classification. Titles/marker text are inspected in memory and never stored in event payloads. Unknown owner lookup stays UNKNOWN. Client metadata cannot assert REAL.
- Moderation actor must have a trusted admin role. Approval/rejection grouped by subject classification does not become user activation. Charter approval never emits publication.
- Market/Community publication requires the returned ACTIVE + APPROVED state. `content_published` is the first observed publication per entity; re-publication is deduplicated. It is not current stock or lifetime publication history. QA/admin-owned publications are excluded from Real publication metrics.

## Privacy and retention review

The public privacy page adds only implemented facts about the limited operational events, account/content identifiers, first-party cookie and existing Supabase storage. It does not announce a new legal basis, consent exemption or a false deletion guarantee.

Recommended raw retention: 90 days. Automatic purge is **not implemented**, and the 90-day aggregate scan is not deletion. Before day 90, the operator should approve a retention schedule, rights/deletion handling (including anonymous cookie deletion requests), policy effective-date update and a scheduled privileged purge. No long-term aggregate store is introduced by V1. Legal basis/consent requirements remain a policy review item rather than an invented legal conclusion.

## Verification and limitations

- Focused tests: 17/17; full clean baseline plus this patch: 1,319 PASS / 1 SKIP.
- Typecheck, lint, isolated build pass; 1,467 prerendered pages.
- Isolated PGlite rehearsal: migration, RLS/grants, anonymous read denial, service insert and duplicate suppression pass.
- Remote migration applied once; RLS and all public/direct role grants checked before/after.
- Preview READY: `https://blue-marina-71riws314-chiweon.vercel.app`. Home and privacy render; bad origin 403, unsupported event 400, anonymous Operations 401. Ingest is fail-closed 503 because Preview has no Supabase variables. No Preview secret access was added.
- Authenticated event end-to-end and Operations authenticated visual QA: `AUTHENTICATED_EVENT_E2E_PENDING`; no fresh Kakao account or Real business mutation is fabricated.
- Production anonymous ingestion/dedupe and private API boundaries are checked after release; final evidence lives in the report.
- Navigation physical-device and fresh-Kakao Acquisition gates remain PARKED.

Next primary priority: approved retention operations and authenticated event E2E once a separate QA identity is available, then observe real acquisition experiments without synthetic business activity.

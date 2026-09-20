# Blue Marina Charter Supply Intake Backend V1

## Decision

`SUPPLY_INTAKE_BACKEND_V1_READY_WITH_AUTH_LIMITATIONS`

The server persistence, validation, review, audit, and promotion-candidate boundaries are implemented. The migration is not applied remotely. Production use requires explicit Charter administrator role provisioning, migration review, backup, and a distributed abuse-control service.

## Architecture

The existing seven-state onboarding contract remains canonical. Browser input enters a Next.js Route Handler, is authenticated again through Supabase Auth, normalized and validated on the server, and is then written through a server-only service-role client. The browser never receives the service-role key and has no direct table grant.

The application layers are:

1. `src/lib/charters/onboarding`: shared data shapes and validation primitives.
2. `src/lib/charters/intake`: state machine, server normalization, application service, repository ports, and Supabase adapter.
3. `src/app/api/charters/supply/submissions`: authenticated HTTP boundary.
4. `/charters/onboarding`: operator and bulk submission entry.
5. `/charters/admin/submissions`: guarded review interface.

## Database schema

Migration: `supabase/migrations/20260920103020_charter_supply_intake_backend_v1.sql`

- `charter_supply_submissions` stores immutable raw input, normalized payload, validation result, MOF crosswalk, idempotency identity, and current status.
- `charter_supply_reviews` is append-only review history.
- `charter_supply_promotion_candidates` stores one deterministic candidate per approved submission and forces `production_activated = false`.
- `charter_supply_audit_logs` records creation, validation, review, approval/rejection, change request, and candidate generation.

The source guard rejects changes to raw payload, submitter, idempotency key, and content hash. All four tables have RLS enabled. `anon` and `authenticated` receive no table grants; only the server-side `service_role` receives the minimum operations needed by the repository.

## Lifecycle

Allowed transitions are:

- `DRAFT → SUBMITTED`
- `SUBMITTED → VALIDATION_FAILED | REVIEW_REQUIRED`
- `VALIDATION_FAILED → SUBMITTED | REVIEW_REQUIRED`
- `REVIEW_REQUIRED → APPROVED | REJECTED | VALIDATION_FAILED`
- `APPROVED → PROMOTED`

`REQUEST_CHANGES` is a review action recorded in history and represented by the canonical `VALIDATION_FAILED` state. V1 never invokes the `APPROVED → PROMOTED` transition. Approval only creates a promotion candidate.

## APIs

- `POST /api/charters/supply/submissions`: authenticated operator or bulk submission; requires `Idempotency-Key`.
- `GET /api/charters/supply/submissions/[id]`: owner or Charter administrator fetch.
- `GET /api/charters/supply/submissions`: administrator list.
- `POST /api/charters/supply/submissions/[id]/validate`: administrator revalidation.
- `POST /api/charters/supply/submissions/[id]/review`: `APPROVE`, `REJECT`, or `REQUEST_CHANGES`.

Errors use `VALIDATION_ERROR`, `INVALID_STATE_TRANSITION`, `SUBMISSION_NOT_FOUND`, `AUTH_REQUIRED`, `DUPLICATE_SUBMISSION`, or `INTERNAL_ERROR`. Responses do not expose stack traces.

## Server validation

The server reconstructs the payload instead of trusting client state. It sanitizes text, normalizes phone values, restricts URLs to HTTP(S), checks coordinates and numeric ranges, preserves null values, rejects CSV formula content, resolves species against the 1,258-entry canonical inventory plus explicitly approved safe aliases, and preserves unresolved raw names. Fuzzy mapping is absent.

MOF Batch 001 crosswalk results are stored as `EXACT_MATCH`, `HIGH_CONFIDENCE`, `CANDIDATE`, or `NO_MATCH`. `autoApproved` remains false. User coordinates remain `USER_SUBMITTED`; this workflow cannot issue `VERIFIED`.

## Operator and bulk flow

The onboarding review step can submit an operator payload and displays the returned submission ID and current state. “제출 완료” means the server accepted a review submission; it does not mean registration, approval, verification, or booking confirmation.

CSV remains dry-run first. Rows are locally reported as valid, warning, or invalid. Any invalid row disables explicit submission. Submitted rows become one `BULK_IMPORT` snapshot. The server validates the combined payload again. Actor-scoped idempotency keys and content hashes prevent replay from silently creating a second candidate.

## Review UI and promotion

The list and detail pages identify themselves as a development/admin review boundary. They request data only after a Supabase session is available, while the API additionally requires `app_metadata.charter_role = charter_admin`. No fake administrator is created. Approved records are passed to the existing deterministic promotion builder and stored as candidates with `productionActivated: false`; the production Charter registry remains unchanged.

## Authentication and abuse boundary

`CHARTER_SUPPLY_INTAKE_ENABLED=true` is required before any endpoint authenticates or persists. Submissions require a server-validated Supabase user. List, revalidation, and review also require the server-controlled app-metadata role `charter_admin`. This is marked `BACKEND_AUTH_REQUIRED` until role assignment operations are formally provisioned.

Requests are capped at 256 KiB. Bulk input remains capped at 1 MiB before parsing and 1,000 rows. The server applies a conservative ten-request/ten-minute per-actor memory limit. A shared rate limiter is required before horizontally scaled production rollout. Unsafe file uploads are absent from V1.

## Production rollout checklist

- Review the migration and run local database/RLS tests.
- Back up the target environment and confirm rollback ownership.
- Provision `charter_admin` using server-controlled app metadata and document revocation.
- Apply the migration to staging, run schema advisors, then verify grants and RLS.
- Configure `CHARTER_SUPPLY_INTAKE_ENABLED` only in the approved environment.
- Replace the in-memory limiter with shared infrastructure and monitoring.
- Exercise create, replay, validation, review, audit, and candidate generation in staging.
- Confirm the production registry remains unchanged before any separate activation program.

No remote database command was run for this V1. The local Supabase database was not running at `127.0.0.1:54322`, so the migration was not locally applied; its schema, RLS, grants, and immutable-source guard are covered by repository tests pending a later local database verification.

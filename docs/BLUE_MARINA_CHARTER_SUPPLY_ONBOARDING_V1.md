# Blue Marina Charter Supply Onboarding V1

## Decision

`SUPPLY_ONBOARDING_READY_WITH_BACKEND_LIMITATIONS`

V1 defines a review-first supply intake flow for operator input and CSV bulk import. It also defines an official connector interface, but ships no connector implementation, credentials, authentication assumption, persistence, or production activation.

## Truth boundary

All submitted values remain research/staging claims until an administrator reviews their evidence. The lifecycle is `DRAFT` → `SUBMITTED` → `REVIEW_REQUIRED` or `VALIDATION_FAILED` → `APPROVED` or `REJECTED` → `PROMOTED`. Only an `APPROVED` submission can produce a deterministic `PROMOTION_CANDIDATE`; that artifact does not activate the production registry.

The operator screen at `/charters/onboarding` builds a local review preview. It does not send or save data, authenticate an operator, verify a business, confirm a booking, or change `/reservations`.

## Operator onboarding

The form separates operator, boat, port, charter product, schedule/price, and review. Empty fields remain empty. Coordinates supplied by a user carry `USER_SUBMITTED`, never `VERIFIED`. Target species resolve only through an exact canonical name or an explicitly safe alias supplied to the validator. Fuzzy matching is absent.

Required values are operator name, charter title, and an `http` or `https` source URL. Missing boat or port names and unresolved species create review warnings rather than invented values.

## Bulk import

The template is `data/charters/templates/charter-import-template.csv`. Its three rows use conspicuous `DEMO_PLACEHOLDER_*` values and reserved `example.invalid` URLs. They are examples and are ineligible for production.

The browser dry-run limit is 1 MiB and 1,000 data rows. It checks the exact header contract and reports `VALID`, `VALID_WITH_WARNINGS`, or `INVALID`. Cells beginning with `=`, `+`, `-`, or `@` after whitespace are rejected as spreadsheet-formula injection. URL fields accept only `http` and `https`. Text is stripped of angle brackets and control characters before review.

`VALID` means the row passed structural validation. It is not approval and cannot bypass administrator review.

## MOF Batch 001 crosswalk

The crosswalk emits `EXACT_MATCH`, `HIGH_CONFIDENCE`, `CANDIDATE`, or `NO_MATCH`. An exact result requires registration, port, and capacity agreement. Registration-only evidence is high confidence. Port and capacity without registration identity is only a candidate. No result is auto-approved, and especially a candidate cannot become production data.

## Administrator review and promotion

An administrator decision records reviewer reference, review time, evidence references, and notes. The promotion builder accepts only `APPROVED` plus an `APPROVE` decision and a structurally ready submission. It sorts evidence references for deterministic output and emits `PROMOTION_CANDIDATE` with `productionActivated: false`.

## Official connector

`CharterSourceAdapter` is an interface for a later official-data integration. V1 contains no endpoint, API key, fetch implementation, polling, or network call. Any future adapter must normalize into the same staging contract and pass the same review boundary.

## Security and limitations

- No database or Supabase reads/writes are added.
- No authentication or authorization claim is made.
- No production charter, availability, price, seat, species mapping, or coordinate is created.
- No user-submitted coordinate is treated as authoritative.
- No booking confirmation or reservation behavior changes.
- HTML-like delimiters and control characters are removed from plain text; unsafe URL schemes and spreadsheet formulas fail validation.

The machine-readable decision is in `reports/charters/supply-onboarding-v1.json`. The offline builder validates the template and regenerates the report deterministically.

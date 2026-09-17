# Fishing Spot Boat Departure & Access Enrichment V1

## Decision

`DEPARTURE_ACCESS_PARTIALLY_READY`

The 329 boat fishing spots now have a deterministic audit-only departure and access artifact. The official source does not contain an actual departure field, so no named departure is confirmed and no runtime data is changed.

## Methodology

The builder joins every canonical `boat-fishing-point` to the official raw row by `sourceType` and `originalId`. It decodes the source CSV as EUC-KR/CP949, requires all 329 rows, verifies the preserved raw `공간정보` lineage, and reads only `포인트명1` and `포인트명2` for departure candidates.

The earlier detail audit found 119 free-text port mentions across all 1,405 fishing spots. Revalidation splits them into 31 boat rows and 88 nonboat rows. The 31 boat rows contain:

- 20 explicit named waterfront features
- 3 generic harbor or landing mentions
- 8 ambiguous locality expressions

The 88 rock-spot mentions are recorded as `NO_NAMED_DEPARTURE` and excluded from boat enrichment.

## Source hierarchy

1. The Ministry of Oceans and Fisheries raw boat fishing-point row is the primary official evidence.
2. Existing FIPA national, local, and fixed-port records are exact-name and same-region corroboration for named feature identity only.
3. No blog, cafe, operator listing, general geocoding result, or inferred coordinate is accepted.

Eight boat records have exact FIPA identity corroboration, covering seven unique port names. This establishes that the named feature exists in the matching region. It does not establish that a vessel serving the fishing spot departs there.

## Departure definition

`departure` follows the V1 contract with `name`, `type`, `region`, `evidenceSource`, `sourceRef`, and `status`.

- `CONFIRMED` requires an authoritative source that directly relates the fishing spot or its service to a named departure point.
- `CANDIDATE` means an official fishing-point name contains a named port, harbor, marina, landing, or boarding feature, but the departure relationship is absent.
- `UNRESOLVED` preserves generic, ambiguous, or missing named-departure evidence.

V1 has 0 confirmed, 20 candidate, and 309 unresolved departures. Candidate values are never promoted by suffix matching or by a FIPA feature-identity match.

## Access definition

The official dataset scope directly identifies all 329 records as boat fishing points, so `access.mode` is `BOAT_REQUIRED`. Access status is `PARTIAL` because the official source does not provide parking, a boarding procedure, permit requirements, or spot-specific access controls.

All 329 records therefore retain:

- `parking: null`
- `boardingInfo: null`
- `restriction: null`
- `permitRequired: null`

These nulls mean unknown, not unrestricted or unnecessary.

## Restrictions and controls

The raw source has no dedicated entry-control, prohibited-area, time-window, permit, or harbor-control field. Generic runtime cautions are not treated as spot-specific official evidence. Restriction coverage and permit coverage are both zero, and no restriction is inferred.

## Coordinate separation

Fishing-spot coordinates describe the fishing-point record. They are not departure coordinates. The enrichment artifact intentionally contains no latitude, longitude, or inferred departure coordinate.

The coordinate safety holds for `boat-60`, `boat-128`, `boat-129`, and `boat-321` remain unchanged. Departure and access evidence cannot release a navigation hold or repair a coordinate.

## Artifacts and runtime boundary

- Enrichment dataset: `data/fishing-spots/enrichment/v1/boat-departure-access.json`
- Audit report: `reports/fishing-spots/boat-departure-access-enrichment-v1.json`
- Deterministic builder: `tools/fishing-spots/build-boat-departure-access-enrichment.mjs`
- Tests: `tests/fishing-spots/boat-departure-access-enrichment-v1.test.cjs`

The dataset is not wired into runtime screens. There are no canonical coordinate changes, duplicate merges or deletions, database writes, migrations, or Supabase changes.

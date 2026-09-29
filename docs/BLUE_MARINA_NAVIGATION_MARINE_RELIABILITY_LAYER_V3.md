# Blue Marina Navigation Marine Source Reliability Layer V3

## Decision

`NAVIGATION_MARINE_RELIABILITY_LAYER_COMPLETE_WITH_PROVIDER_LIMITATION` for the local, uncommitted implementation. Production is not activated. The initial nine-category aid snapshot is incomplete (4/9), warning detail collection is partial (6/7), and no scheduled collection or deployment has been configured. This is not an all-source-ready or navigational-safety claim.

## Runtime and storage

`/sea/navigation` reads versioned JSON artifacts through `/api/sea-info/navigation-aids/snapshot` and `/api/sea-info/navigation-warnings/snapshot`. Those routes never call KHOA. The former request-time routes remain diagnostic and are no longer the map's data URLs. The artifacts under `src/data/marine-navigation/v3/` are build inputs: the collector writes them locally before a build, and a deployment would package that validated version. No serverless filesystem writes, in-memory durability claims, Supabase writes, or Production deployment are involved.

`node tools/marine-navigation/collect-reliability-v3.cjs --aids --probe-all --max-minutes=6` probes the nine categories sequentially, then collects small categories first. `--aids` resumes only missing/failed categories; `--force-refresh` explicitly revisits valid ones. `--warnings` independently collects a fresh list and each document detail. Requests are sequential, paced, have one bounded retry and jitter, and stop at the run deadline. Each complete category or document is written atomically. A failed refresh leaves a prior validated snapshot intact. API keys and raw responses are never logged. This is a manual collector, not a scheduler.

## Validation and provenance

An aid category is committed only after every page has closed XML, matching pagination and count metadata, valid identity/name/coordinate fields, no duplicate IDs, and a full category count. Its record includes category, KHOA source, fetch time, source observation time if provided, item count, validation status, SHA-256 payload checksum, last attempt/success, and failure class. KHOA provided no source observation timestamp for these records; `sourceObservedAt` remains null. A local fetch time must not be described as the source observation time.

The aids aggregate is `AVAILABLE` only when all nine validated snapshots are inside the review interval; missing categories yield `PARTIAL`, nine old snapshots yield `STALE`, and none yields `UNAVAILABLE`. The 24-hour aid interval is an operational review limit inherited from the earlier adapter, not a KHOA update guarantee or safety certification. The UI labels the data `SNAPSHOT`, gives the last successful fetch time, and identifies partial/stale states.

For warnings, an explicit complete zero-item list is `AVAILABLE_EMPTY`; a fresh list with missing details is `PARTIAL`; a failed list refresh or expired snapshot is `CURRENT_STATUS_UNAVAILABLE`. Historical warning records may remain in the artifact but are not shown as current warnings. The 10-minute limit reuses the earlier cache window as a conservative operational cutoff; KHOA's update cadence is unverified and the threshold requires source review. The browser rechecks the local snapshot route every 60 seconds and removes warning markers when current status is unavailable. None of these states means an area is safe.

`/api/sea-info/navigation-source-health` is read-only and reports source, category states, counts, fetch/attempt times, warning state, and failure classes. It exposes no credentials and is noindexed.

## Local collection evidence (2026-09-29 KST)

Two bounded, sequential aid windows were run. Complete validated categories are A04 (139), A07 (13), A08 (40), and A09 (9), totaling 201 records. A01 failed with HTTP 503, A02/A05/A06 timed out, and A03 returned an incomplete or invalid response. All nine were attempted. The second window skipped already valid A07/A08 and retained their original checksum and success time. A valid snapshot is not overwritten by the failed categories. The collector records individual checksums and timestamps in the versioned JSON artifact and report.

The first fresh warning-list attempt timed out. The second returned seven documents without a cache hit. Details for 26-272, 26-323, 26-327, 26-328, 26-330 and 26-331 validated; 26-329 timed out. The UI/API state is therefore `PARTIAL` while the list is within its operational window, then `CURRENT_STATUS_UNAVAILABLE`. An expired warning snapshot cannot be promoted back to current merely because it exists on disk.

Local regression calls returned KMA forecast HTTP 200 three times and ROMS HTTP 200 five times; ROMS retained `ROMS_MODEL_FORECAST` and eight points in the representative bounding box. Local KMA returned 76 stations and 194 latest observations; 36 configured stations still have no matching observation. At 390×844 and 1280×900 the map, toggle panel, snapshot provenance, partial warning state, and the later unavailable state were checked without horizontal overflow. The layer panel needed an explicit dark background because its former arbitrary opacity class rendered transparent; the corrected panel remains legible over the map. Device GPS and Production were not tested.

## Boundaries and next work

Forecast remains KMA model output, ROMS remains a model forecast, and KMA marine observations remain local-only and source-backed; none is converted to a safe-route, depth/reef avoidance, or suitability verdict. The default-off layer policy remains. The five missing aid categories and the one missing warning detail need separate bounded retries when the provider responds. A production-ready operating plan would also need an approved refresh/deploy mechanism and a source-backed warning currency policy. This V3 task does not commit, push, deploy, change Production environment variables, or mutate Supabase.

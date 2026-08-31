# Blue Marina Canonical Data Baseline V1

## Frozen staging baseline

- Fish canonical species: 1,258
- Marine Organism canonical organisms: 3,016
- Total canonical marine biological assets: 4,274
- Environment: staging (`mlfvpaikfpjrgrhwlrjn`)
- Production database writes: 0
- Initial state: draft/pending
- Public visibility: 0

## Provenance

- Fish combines the approved NIFS baseline and reviewed MBRIS Fish promotions.
- Marine Organism contains the MBRIS READY invertebrate baseline across crustaceans, cephalopods, gastropods, bivalves, and echinoderms.
- Deterministic identifiers, source relations, and change-log lineage are preserved by the import manifests and execution reports.
- Both import tracks passed post-import inventory checks and zero-insert idempotency reruns.

## Cross-domain transition

Three historical Fish records also have canonical Marine Organism records:

- `Amphioctopus fangsiao`
- `Chionoecetes japonicus`
- `Chionoecetes opilio`

They are recorded as `CROSS_DOMAIN_TRANSITIONAL_DUPLICATE`. No Fish row was removed or changed during the Marine Organism import. Any future domain cleanup requires a separate reviewed migration.

## Held and future work

- Marine Organism REVIEW: 93, not imported
- Marine Organism OUT_OF_SCOPE: 58, not imported
- Freshwater and other future-domain records remain outside this baseline.
- Publication approval, product enrichment, images, seasonality, toxicity, market data, and recommendation ranking are not part of this freeze.

This baseline freezes canonical identity and provenance only. It does not publish records or authorize production rollout.

# NIFS staging import final dry-run

- Environment: `staging`
- Project ref: `mlfvpaikfpjrgrhwlrjn`
- Result: `NIFS_8_IMPORT_READY`
- Database writes: none

## Summary

- Approved canonical slugs: 8/8
- Regex valid: 8/8
- Internal duplicate: 0
- Existing staging slug conflict: 0
- Existing NIFS source identity conflict: 0
- Existing scientific-name match: 0
- Dry-run: INSERT 8, SKIP 0, CONFLICT 0, BLOCKED 0

## Scientific-name normalization

`fish_1575880014320` (제주소라) keeps the NIFS raw `scName` value `Turbo cornutus, Batillus cornutus`. The canonical value is separately normalized to `Turbo cornutus`, with `Batillus cornutus` retained as an alternate name. The approval lineage cites WoRMS AphiaID 413379 and records `normalizationType=taxonomy_verified`.

## Source-missing preservation

`fish_1576639605223` (기름가자미) remains `season=null` with `seasonSourceStatus=source_missing`. No value was inferred.

## Transaction plan

1. `BEGIN`
2. Assert all eight approved sourceId-to-slug bindings and zero staging conflicts.
3. Insert immutable `fish_source_records` versions.
4. Insert draft `fish_species` rows with pending fact review.
5. Insert primary `fish_species_sources` links using `linked_by=import_review`.
6. Insert only separately reviewed aliases, categories, or relations. None are approved in this batch.
7. Verify eight source records, eight species, and eight links.
8. `COMMIT`; any failure causes complete `ROLLBACK`.

All eight records now pass the final dry-run. The transaction plan was reviewed but not executed.

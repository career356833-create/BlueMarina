# NIFS Fish Importer Policy

## Scope

`tools/nifs-importer/dry-run.cjs` is a local planner. It performs no Supabase
call, does not read credentials, and never writes canonical species data.

The importer accepts future manifests from:

```text
data-import/nifs/manifest/**
data-import/nifs/raw/**
data-import/nifs/media/**
```

The current crawler instead writes under `data/nifs/raw/**`. Its existing
`source-metadata.json` uses `collectedAt`, and does not consistently include
the future `sourceCheckedAt`, raw-path manifest fields, or `imageUrls`. The
dry-run reports those gaps as contract errors rather than modifying crawler
output.

## Required staging record

Each manifest record must include:

- `sourceProvider`, `sourceId`, `sourceUrl`
- `fetchedAt`, `sourceCheckedAt`
- `contentHash`, `parserVersion`, `crawlStatus`
- `rawHtmlPath` or `rawPayloadPath`
- `imageUrls`

Claude must not set internal `id`, canonical `slug`, `factReviewStatus`, or
`publishStatus`. The dry-run rejects those fields even when nested in a
normalized candidate.

## Dry-run output

The importer compares staging records with a supplied local current-version
snapshot. It reports:

- new source records, same-hash skips, and changed-hash versions
- missing-source candidates, schema errors, and duplicate external keys
- scientific-name duplicate candidates and display-name slug collision warnings
- normalisation candidate diffs and manual-field overwrite risks

Run the included fixture scenario:

```powershell
npm run dry-run:nifs-import
npm run test:nifs-importer
```

The fixture deliberately covers one same-hash skip, one changed hash, one new
missing-source candidate, one protected-field overwrite risk, and one schema
error. It is not NIFS production data.

## Future real importer transaction

For a new source hash, one transaction must perform this logical sequence:

1. Insert the new `fish_source_records` version.
2. Unset the old current version.
3. Mark the new version current.
4. Append `fish_change_logs`.
5. Queue a normalization/review request only.

It must not approve facts, overwrite reviewer-protected fields, or change
`publish_status`. Any failure rolls back all five operations, leaving the old
current source version and any published species unchanged. A crawl failure is
recorded separately and does not delete data.

## Integration boundary

The dry-run only generates `reports/nifs-import-dry-run.json` and
`reports/nifs-import-dry-run.md`. A later importer needs explicit approval for
Storage upload, database transaction code, reviewer workflow, and RLS claim
issuance.

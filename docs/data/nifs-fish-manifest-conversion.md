# NIFS Manifest Conversion

This document records how the current `data/nifs/raw/**` artifacts are converted into the staging manifest contract used by `tools/nifs-importer`.

## Current raw structure

The checked raw fish corpus currently has:

- 25 fish source directories under `data/nifs/raw/fish/**`
- 25 `source-metadata.json` files
- 25 `parsed-source.json` files
- 25 `detail-response.json` files
- 5 `detail-api-response.json` files
- 25 `images/image-metadata.json` files
- 71 image files under `images/original/**`
- 0 HTML files

The current raw metadata consistently provides:

- `sourceProvider`
- `sourceId`
- `sourceUrl`
- `collectedAt`
- `contentHash`
- `parserVersion`

The raw image metadata also provides original remote image URLs and local storage paths, so the converter can fill `imageUrls` and `rawMediaPaths` without mutating the crawler output.

## Conversion order

The local converter chooses source artifacts in this order:

1. `detail-api-response.json`
2. `detail-response.json`
3. `parsed-source.json`
4. `parsed-preview.json`

The first available file becomes `rawPayloadPath`.

## Manifest fields

Each generated manifest includes:

- `sourceProvider: "NIFS"`
- `sourceId`
- `sourceUrl`
- `fetchedAt`
- `sourceCheckedAt`
- `contentHash`
- `parserVersion`
- `crawlStatus`
- `rawPayloadPath` or `rawHtmlPath`
- `imageUrls`

Optional fields are included when they can be derived safely from the raw files:

- `sourceCheckedAtSource`
- `rawMediaPaths`
- `title`
- `koreanName`
- `scientificName`
- `byteSize`
- `mimeType`

## Timestamp rules

- If the source metadata has `collectedAt`, the converter reuses it for both `fetchedAt` and `sourceCheckedAt`.
- If `collectedAt` is absent, the converter falls back to the primary raw file `mtime` and records `sourceCheckedAtSource: "filesystem_mtime"`.
- No current-time placeholder is generated.

## Hash rules

- `contentHash` is computed from the bytes of the chosen primary raw payload file.
- The converter compares that payload hash against `source-metadata.json.contentHash` and records a warning when they differ.
- A hash mismatch does not mutate the raw input and does not stop other manifests from being produced.

## Crawl status

- `success` means the source has metadata, a primary raw payload, parseable JSON, and collected image URLs.
- `partial` means the source is still usable but image URLs are missing.
- `failed` means a blocking contract field is missing or the primary payload cannot be parsed.

## Output locations

- Manifests: `data-import/nifs/manifest/*.json`
- Build errors: `data-import/nifs/reports/manifest-build-errors.json`
- Build summary: `data-import/nifs/reports/manifest-build-summary.md`

The converter is deterministic: the same raw input produces the same manifest content and file ordering.

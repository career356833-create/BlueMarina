# NIFS Fish Raw Storage Policy

## Final storage split

Raw HTML, original response bodies, downloaded source media, and attachments
belong in a private Supabase Storage bucket. PostgreSQL stores durable metadata,
small parsed summaries, and hashes only.

| Content | Storage | PostgreSQL |
| --- | --- | --- |
| HTML / raw JSON response | private object | `raw_file_path`, optional small parsed summary |
| Original image / attachment | private object | source URL, object path, hash, MIME type, byte size |
| Parsed source facts | not duplicated as raw | approved canonical fields and optional JSONB summary |
| Crawling metadata | n/a | hash, parser version, status, timestamps, source URL |

Full raw response JSONB is rejected as the default because it inflates backups,
increases table and WAL size, makes retention expensive, and mixes retrieval
storage with query storage. JSONB is reserved for bounded parsed summaries.

## Storage path contract

Paths are content-addressed and immutable:

```text
nifs/raw/{sourceId}/{contentHash}/page.html
nifs/raw/{sourceId}/{contentHash}/payload.json
nifs/media/{sourceId}/{contentHash}/{mediaHash}-{originalFileName}
```

`sourceId` and all filenames must be path-safe; the content hash provides the
collision boundary. A repeated hash reuses the existing object and only updates
`last_seen_at`. A new hash creates a new version directory.

## Integrity and retention

- Upload the object first, verify byte size/hash, then insert the DB source row
  in the importer transaction boundary.
- Database rows point only to verified object paths.
- Failed object uploads create no DB source version.
- Never overwrite or delete raw source objects during routine refreshes.
- Source removal is represented by `crawl_status='missing'`, later review, and
  optional archive state; it is not physical deletion.
- Storage lifecycle deletion, if ever needed, requires a separate retention
  policy and a DB reference audit.

## Required metadata additions before real migration

The draft SQL records `raw_file_path`, bounded `raw_payload_summary`,
`raw_byte_size`, and `raw_mime_type` for the primary raw object. It deliberately
does not contain an unbounded raw response body column.

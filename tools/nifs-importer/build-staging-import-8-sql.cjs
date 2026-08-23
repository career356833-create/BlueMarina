"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const CANDIDATE_PATH = path.join(ROOT, "reports/nifs-fish-species-candidates.json");
const DRY_RUN_PATH = path.join(ROOT, "reports/nifs-staging-import-8-final-dry-run.json");
const OUT_PATH = path.join(ROOT, "data-import/nifs/reports/staging-import-8.sql");
const EXPECTED_SOURCE_IDS = [
  "fish_1573537097812",
  "fish_1575873437839",
  "fish_1575880014320",
  "fish_1575880791880",
  "fish_1575881532404",
  "fish_1576639605222",
  "fish_1576639605223",
  "fish_1576639605227",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function main() {
  const candidates = readJson(CANDIDATE_PATH).candidates;
  const dryRun = readJson(DRY_RUN_PATH);
  const bySourceId = new Map(candidates.map((candidate) => [candidate.sourceId, candidate]));

  if (dryRun.status !== "NIFS_8_IMPORT_READY") throw new Error("final dry-run is not ready");
  if (candidates.length !== 8 || bySourceId.size !== 8) throw new Error("expected exactly eight candidates");
  if (EXPECTED_SOURCE_IDS.some((sourceId) => !bySourceId.has(sourceId))) throw new Error("approved sourceId set mismatch");

  const rows = EXPECTED_SOURCE_IDS.map((sourceId) => {
    const candidate = bySourceId.get(sourceId);
    const source = candidate.sourceReferences?.[0];
    if (!source || candidate.sourceProvider !== "NIFS") throw new Error(`invalid source reference: ${sourceId}`);
    if (candidate.slugApprovalStatus !== "approved" || candidate.scientificNameReviewStatus !== "approved") {
      throw new Error(`candidate approval incomplete: ${sourceId}`);
    }
    return {
      source_provider: candidate.sourceProvider,
      source_id: sourceId,
      source_url: source.sourceUrl,
      raw_storage_path: source.rawPayloadPath || source.rawHtmlPath,
      content_hash: source.contentHash,
      parser_version: source.parserVersion,
      fetched_at: source.sourceCheckedAt,
      slug: candidate.canonicalSlug,
      korean_name: candidate.koreanName,
      english_name: candidate.englishName,
      scientific_name: candidate.scientificName,
      raw_scientific_name: candidate.rawScientificName,
      scientific_name_aliases: candidate.scientificNameAliases || [],
      taxonomy: candidate.taxonomy || {},
      official_facts: {
        ...candidate.officialFacts,
        morphology: candidate.morphologySummary,
        distinguishingFeatures: candidate.featureSummary,
        season: candidate.season,
        seasonSourceStatus: candidate.seasonSourceStatus,
        spawning: candidate.spawning,
        scientificNameNormalization: candidate.scientificNameLineage,
        sourceProvider: candidate.sourceProvider,
        sourceId,
      },
      raw_payload_summary: {
        sourceProvider: candidate.sourceProvider,
        sourceId,
        rawScientificName: candidate.rawScientificName,
        officialFacts: candidate.officialFacts,
        sourceReference: source,
      },
      fact_review_status: candidate.factReviewStatus,
      publish_status: candidate.publishStatus,
    };
  });

  const sql = `-- Generated from the approved eight-record NIFS candidate set. No credentials included.
\\set ON_ERROR_STOP on
begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

create temporary table import_nifs_8 on commit drop as
select * from jsonb_to_recordset(${sqlJson(rows)}) as x(
  source_provider text, source_id text, source_url text, raw_storage_path text,
  content_hash text, parser_version text, fetched_at timestamptz,
  slug text, korean_name text, english_name text, scientific_name text,
  raw_scientific_name text, scientific_name_aliases jsonb, taxonomy jsonb,
  official_facts jsonb, raw_payload_summary jsonb,
  fact_review_status text, publish_status text
);

do $import_guard$
begin
  if (select count(*) from import_nifs_8) <> 8 then raise exception 'NIFS_IMPORT_TARGET_COUNT_MISMATCH'; end if;
  if exists (select 1 from import_nifs_8 where source_provider <> 'NIFS') then raise exception 'NIFS_IMPORT_PROVIDER_MISMATCH'; end if;
  if exists (select 1 from import_nifs_8 where slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') then raise exception 'NIFS_IMPORT_INVALID_SLUG'; end if;
  if (select count(distinct source_id) from import_nifs_8) <> 8 then raise exception 'NIFS_IMPORT_DUPLICATE_SOURCE_ID'; end if;
  if (select count(distinct slug) from import_nifs_8) <> 8 then raise exception 'NIFS_IMPORT_DUPLICATE_SLUG'; end if;
  if exists (
    select 1 from public.fish_source_records s join import_nifs_8 i
      on s.source_provider=i.source_provider and s.source_id=i.source_id
  ) then raise exception 'NIFS_IMPORT_SOURCE_IDENTITY_NOT_EMPTY'; end if;
  if exists (select 1 from public.fish_species s join import_nifs_8 i on s.slug=i.slug) then raise exception 'NIFS_IMPORT_SLUG_NOT_EMPTY'; end if;
  if exists (select 1 from public.fish_species s join import_nifs_8 i on s.scientific_name=i.scientific_name) then raise exception 'NIFS_IMPORT_SCIENTIFIC_NAME_NOT_EMPTY'; end if;
end
$import_guard$;

insert into public.fish_source_records (
  source_provider, source_id, source_url, raw_storage_path, raw_payload_summary,
  content_hash, parser_version, crawl_status, fetched_at, last_seen_at, is_current
)
select source_provider, source_id, source_url, raw_storage_path, raw_payload_summary,
       content_hash, parser_version, 'complete', fetched_at, fetched_at, true
from import_nifs_8;

insert into public.fish_species (
  slug, korean_name, english_name, scientific_name, taxonomy, official_facts,
  fact_review_status, publish_status
)
select slug, korean_name, english_name, scientific_name, taxonomy, official_facts,
       fact_review_status, publish_status
from import_nifs_8;

insert into public.fish_species_sources (
  fish_species_id, source_record_id, is_primary, field_precedence, linked_by
)
select sp.id, sr.id, true,
       jsonb_build_object('identity','canonical','officialFacts','NIFS','taxonomy','reviewed_normalization'),
       'import_review'
from import_nifs_8 i
join public.fish_species sp on sp.slug=i.slug
join public.fish_source_records sr on sr.source_provider=i.source_provider and sr.source_id=i.source_id and sr.content_hash=i.content_hash;

insert into public.fish_aliases (
  fish_species_id, alias_name, normalized_alias, alias_type, source_type, review_status
)
select sp.id, alias_name, lower(alias_name), 'scientific', 'official', 'approved'
from import_nifs_8 i
join public.fish_species sp on sp.slug=i.slug
cross join lateral jsonb_array_elements_text(i.scientific_name_aliases) alias(alias_name);

insert into public.fish_change_logs (
  entity_type, entity_id, change_type, before_payload, after_payload, source_record_id, actor_type
)
select 'fish_species', sp.id, 'nifs_import_created', null,
       jsonb_build_object(
         'sourceId', i.source_id,
         'canonicalSlug', i.slug,
         'canonicalScientificName', i.scientific_name,
         'rawScientificName', i.raw_scientific_name,
         'normalization', i.official_facts->'scientificNameNormalization'
       ), sr.id, 'importer'
from import_nifs_8 i
join public.fish_species sp on sp.slug=i.slug
join public.fish_source_records sr on sr.source_provider=i.source_provider and sr.source_id=i.source_id and sr.content_hash=i.content_hash;

do $import_verify$
begin
  if (select count(*) from public.fish_source_records s join import_nifs_8 i on s.source_provider=i.source_provider and s.source_id=i.source_id and s.content_hash=i.content_hash) <> 8 then raise exception 'NIFS_IMPORT_SOURCE_VERIFY_FAILED'; end if;
  if (select count(*) from public.fish_species s join import_nifs_8 i on s.slug=i.slug and s.scientific_name=i.scientific_name) <> 8 then raise exception 'NIFS_IMPORT_SPECIES_VERIFY_FAILED'; end if;
  if (select count(*) from public.fish_species_sources l join public.fish_species s on s.id=l.fish_species_id join import_nifs_8 i on i.slug=s.slug) <> 8 then raise exception 'NIFS_IMPORT_LINK_VERIFY_FAILED'; end if;
  if (select count(*) from public.fish_aliases a join public.fish_species s on s.id=a.fish_species_id join import_nifs_8 i on i.slug=s.slug) <> 1 then raise exception 'NIFS_IMPORT_ALIAS_VERIFY_FAILED'; end if;
end
$import_verify$;

commit;
`;

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, sql, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)}`);
}

main();

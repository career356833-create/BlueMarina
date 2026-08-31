const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const {
  root,
  projectRef,
  auditEnvPath,
  readEnv,
  runAuditor,
  runAdmin,
  auditSql,
  normalize,
  sqlLiteralJson,
  readPublicVisibility,
  writeJson,
} = require("./run-canary-import-v1.cjs");

const reviewManifestPath = path.join(root, "reports/mbris/mbris-review-ready-import-manifest-v1.json");
const promotionPath = path.join(root, "reports/mbris/mbris-review-promotion-v2.json");
const legacyMappingPath = path.join(root, "reports/mbris/mbris-legacy-to-canonical-mapping-v2.json");
const blockedPath = path.join(root, "reports/mbris/mbris-review-blocked-v1.json");
const baseManifestPath = path.join(root, "reports/mbris/mbris-staging-import-manifest-v1.json");
const firstReportPath = path.join(root, "reports/mbris/mbris-review-ready-import-v1.json");
const batchesReportPath = path.join(root, "reports/mbris/mbris-review-ready-import-batches-v1.json");
const rerunReportPath = path.join(root, "reports/mbris/mbris-review-ready-import-rerun-v1.json");
const postcheckPath = path.join(root, "reports/mbris/mbris-review-ready-import-postcheck-v1.json");
const docPath = path.join(root, "docs/MBRIS_REVIEW_READY_IMPORT_V1.md");
const fishDataPath = path.join(root, "src/data/fish-data.ts");
const importBatch = "mbris-review-ready-import-v1";
const changeType = "mbris_review_ready_import_v1";
const batchSize = 50;

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

function prepareAdmission(reviewManifest, promotion, legacyMapping, blocked, baseManifest) {
  assert(reviewManifest.manifestVersion === "MBRIS_REVIEW_READY_IMPORT_MANIFEST_V1", "REVIEW_MANIFEST_VERSION_INVALID");
  assert(reviewManifest.environment === "staging" && reviewManifest.projectRef === projectRef, "REVIEW_MANIFEST_TARGET_INVALID");
  assert(reviewManifest.rows.length === 136 && reviewManifest.readyNewTotal === 136, "REVIEW_MANIFEST_COUNT_INVALID");
  assert(reviewManifest.rows.every((row) => row.classification === "LINK_LEGACY_AND_PROMOTE_NEW"), "REVIEW_CLASSIFICATION_INVALID");
  assert(reviewManifest.rows.every((row) => row.legacyMappingRequired === true), "LEGACY_MAPPING_FLAG_INVALID");
  assert(reviewManifest.rows.every((row) => row.publishStatus === "draft" && row.reviewStatus === "pending"), "REVIEW_STATE_INVALID");
  assert(reviewManifest.rows.every((row) => row.malformedScientific === false && row.koreanName && row.scientificName), "REVIEW_REQUIRED_FIELD_INVALID");
  assert(new Set(reviewManifest.rows.map((row) => row.canonicalId)).size === 136, "REVIEW_CANONICAL_ID_DUPLICATE");
  assert(new Set(reviewManifest.rows.map((row) => row.internalId)).size === 136, "REVIEW_INTERNAL_ID_DUPLICATE");
  assert(new Set(reviewManifest.rows.map((row) => row.mbrisSourceId)).size === 136, "REVIEW_SOURCE_ID_DUPLICATE");
  assert(new Set(reviewManifest.rows.map((row) => normalize(row.normalizedScientificName))).size === 136, "REVIEW_SCIENTIFIC_DUPLICATE");
  assert(new Set(reviewManifest.rows.map((row) => row.slug)).size === 136, "REVIEW_SLUG_DUPLICATE");
  assert(promotion.classification.LINK_LEGACY_AND_PROMOTE_NEW === 136 && promotion.readyNewTotal === 136, "PROMOTION_COUNT_INVALID");
  assert(legacyMapping.total === 136 && legacyMapping.records.length === 136, "LEGACY_MAPPING_COUNT_INVALID");
  const mappingIds = new Set(legacyMapping.records.map((row) => row.mbrisSourceId));
  assert(reviewManifest.rows.every((row) => mappingIds.has(row.mbrisSourceId)), "LEGACY_MAPPING_MISSING");
  assert(blocked.reviewBlockedCount === 1 && blocked.malformedScientificCount === 5, "BLOCKED_TRACK_INVALID");
  assert(baseManifest.source?.sourceProvider === "MBRIS", "BASE_SOURCE_INVALID");

  const promotionBySource = new Map(promotion.rows.map((row) => [row.mbrisSourceId, row]));
  const rows = reviewManifest.rows.map((row) => {
    const promotionRow = promotionBySource.get(row.mbrisSourceId);
    assert(promotionRow && promotionRow.primaryClass === "LINK_LEGACY_AND_PROMOTE_NEW", "PROMOTION_ROW_MISSING");
    return {
      ...row,
      priority: promotionRow.priority,
      tier: promotionRow.tier,
      officialFacts: {
        sourceProvider: "MBRIS",
        sourceId: row.mbrisSourceId,
        internalId: row.internalId,
        koreanName: row.koreanName,
        scientificNameRaw: row.scientificName,
        normalizedScientificName: row.normalizedScientificName,
        priority: promotionRow.priority,
        tier: promotionRow.tier,
        importBatch,
      },
    };
  });

  const excludedIds = new Set([
    ...baseManifest.excluded.canonicalConflict.map((row) => row.internalId),
    ...baseManifest.excluded.nonFish.map((row) => row.internalId),
    ...baseManifest.excluded.malformedScientific.map((row) => row.internalId),
    ...blocked.reviewBlocked.map((row) => row.internalId),
  ]);
  assert(rows.every((row) => !excludedIds.has(row.internalId)), "BLOCKED_ROW_ADMITTED");
  assert(rows.every((row) => row.koreanName !== "참홍어"), "CHAMHONG_ADMITTED");

  return {
    rows,
    source: baseManifest.source,
    legacyMappings: legacyMapping.records,
    previousMbrisIds: new Set(baseManifest.newSpecies.map((row) => row.internalId)),
    excluded: {
      blockedKorean: new Set(blocked.reviewBlocked.map((row) => row.internalId)),
      conflict: new Set(baseManifest.excluded.canonicalConflict.map((row) => row.internalId)),
      nonFish: new Set(baseManifest.excluded.nonFish.map((row) => row.internalId)),
      malformed: new Set(baseManifest.excluded.malformedScientific.map((row) => row.internalId)),
    },
  };
}

function matchingSource(remote, source) {
  return remote.sources.filter((row) =>
    row.source_provider === source.sourceProvider
    && row.source_id === source.sourceId
    && row.content_hash === source.contentHash
    && row.is_current
    && !row.archived_at
  );
}

function countExcluded(remote, excluded) {
  const count = (ids) => remote.species.filter((row) => ids.has(row.internal_id)).length;
  return {
    blockedKorean: count(excluded.blockedKorean),
    conflict: count(excluded.conflict),
    nonFish: count(excluded.nonFish),
    malformed: count(excluded.malformed),
  };
}

function prewriteCheck(remote, admission) {
  assert(remote.identity.currentUser === "blue_marina_readonly_auditor", "AUDITOR_IDENTITY_INVALID");
  assert(remote.identity.readOnly === "on" && remote.identity.bypassRls === false, "AUDITOR_READ_ONLY_INVALID");
  const source = matchingSource(remote, admission.source);
  const collisions = [];
  for (const row of admission.rows) {
    const checks = [
      ["canonicalId", remote.species.some((item) => item.species_id === row.canonicalId)],
      ["internalId", remote.species.some((item) => item.internal_id === row.internalId)],
      ["mbrisSourceId", remote.relations.some((item) => item.mbris_source_id === row.mbrisSourceId && !item.archived_at) || remote.logs.some((item) => item.source_id === row.mbrisSourceId)],
      ["scientific", remote.species.some((item) => item.scientific_name === row.scientificName)],
      ["normalizedScientific", remote.species.some((item) => normalize(item.normalized_scientific_name) === normalize(row.normalizedScientificName))],
      ["alias", remote.aliases.some((item) => !item.archived_at && normalize(item.normalized_alias || item.alias_name) === normalize(row.normalizedScientificName))],
      ["slug", remote.species.some((item) => item.slug === row.slug) || remote.slugAliases.some((item) => item.is_active && item.alias_slug === row.slug)],
      ["relation", remote.relations.some((item) => item.mbris_source_id === row.mbrisSourceId && !item.archived_at)],
      ["lineage", remote.logs.some((item) => item.internal_id === row.internalId && item.source_provider === "MBRIS")],
    ];
    for (const [type, hit] of checks) if (hit) collisions.push({ internalId: row.internalId, mbrisSourceId: row.mbrisSourceId, type });
  }
  return {
    status: remote.species.length === 1122 && source.length === 1 && collisions.length === 0
      ? "REVIEW_IMPORT_PREWRITE_PASS"
      : "REVIEW_IMPORT_PREWRITE_FAIL",
    speciesBefore: remote.species.length,
    admitted: collisions.length === 0 ? admission.rows.length : 0,
    sourceMatches: source.length,
    sourceInsertExpected: 0,
    collisions,
    nifsBefore: remote.species.filter((row) => row.source_provider === "NIFS").length,
    previousMbrisBefore: remote.species.filter((row) => admission.previousMbrisIds.has(row.internal_id)).length,
    excludedBefore: countExcluded(remote, admission.excluded),
    fingerprints: remote.fingerprints,
  };
}

function inputPayload(rows) {
  return rows.map((row) => ({
    internalId: row.internalId,
    mbrisSourceId: row.mbrisSourceId,
    koreanName: row.koreanName,
    scientificName: row.scientificName,
    normalizedScientificName: row.normalizedScientificName,
    slug: row.slug,
    taxonomy: row.taxonomy,
    officialFacts: row.officialFacts,
    lineage: row.lineagePlan,
    priority: row.priority,
    tier: row.tier,
  }));
}

function reviewBatchSql(rows, source) {
  const input = sqlLiteralJson(inputPayload(rows));
  return String.raw`
begin;
set local statement_timeout='60s';
set local lock_timeout='5s';

do $precheck$
begin
  if (select count(*) from public.fish_source_records where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null) <> 1 then raise exception 'REVIEW_IMPORT_SOURCE_NOT_EXACT'; end if;
  if exists (
    select 1 from jsonb_array_elements(${input}) x
    join public.fish_species s on s.official_facts->>'internalId'=x->>'internalId'
    where s.slug<>x->>'slug' or s.korean_name<>x->>'koreanName' or s.scientific_name<>x->>'scientificName' or s.publish_status<>'draft' or s.fact_review_status<>'pending'
  ) then raise exception 'REVIEW_IMPORT_EXISTING_IDENTITY_MISMATCH'; end if;
  if exists (
    select 1 from jsonb_array_elements(${input}) x
    join public.fish_species s on (s.slug=x->>'slug' or s.scientific_name=x->>'scientificName')
    where coalesce(s.official_facts->>'internalId','')<>x->>'internalId'
  ) then raise exception 'REVIEW_IMPORT_CROSS_IDENTITY_COLLISION'; end if;
end
$precheck$;

with input as (
  select * from jsonb_to_recordset(${input}) as x(
    "internalId" text,"mbrisSourceId" text,"koreanName" text,"scientificName" text,
    "normalizedScientificName" text,slug text,taxonomy jsonb,"officialFacts" jsonb,lineage jsonb,
    priority integer,tier text
  )
), resolved_source as (
  select id from public.fish_source_records
  where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null
), species_insert as (
  insert into public.fish_species(slug,korean_name,scientific_name,taxonomy,official_facts,fact_review_status,publish_status)
  select i.slug,i."koreanName",i."scientificName",i.taxonomy,i."officialFacts",'pending','draft'
  from input i
  where not exists (select 1 from public.fish_species s where s.official_facts->>'internalId'=i."internalId")
  returning id,official_facts->>'internalId' as internal_id
), resolved_species as (
  select id,internal_id from species_insert
  union all
  select s.id,s.official_facts->>'internalId'
  from public.fish_species s join input i on i."internalId"=s.official_facts->>'internalId'
  where not exists (select 1 from species_insert x where x.internal_id=i."internalId")
), relation_insert as (
  insert into public.fish_species_sources(fish_species_id,source_record_id,is_primary,field_precedence,linked_by)
  select rs.id,src.id,true,jsonb_build_object(
    'mbrisSourceId',i."mbrisSourceId",
    'importMetadata',jsonb_build_object('mbrisSourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','${importBatch}','priority',i.priority,'tier',i.tier),
    'taxonomy','MBRIS','koreanName','MBRIS','scientificName','MBRIS','priority','IMPORT_METADATA_ONLY','tier','IMPORT_METADATA_ONLY'
  ),'import_review'
  from input i join resolved_species rs on rs.internal_id=i."internalId" cross join resolved_source src
  where not exists (select 1 from public.fish_species_sources r where r.fish_species_id=rs.id and r.source_record_id=src.id)
  returning id
), log_insert as (
  insert into public.fish_change_logs(entity_type,entity_id,change_type,after_payload,source_record_id,actor_type)
  select 'fish_species',rs.id,'${changeType}',
    i.lineage || jsonb_build_object('sourceProvider','MBRIS','sourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','${importBatch}','normalizedScientificName',i."normalizedScientificName",'priority',i.priority,'tier',i.tier),
    src.id,'importer'
  from input i join resolved_species rs on rs.internal_id=i."internalId" cross join resolved_source src
  where not exists (
    select 1 from public.fish_change_logs l where l.entity_type='fish_species' and l.entity_id=rs.id and l.change_type='${changeType}' and l.after_payload->>'internalId'=i."internalId" and l.after_payload->>'importBatch'='${importBatch}'
  )
  returning id
)
select jsonb_build_object('sourceInserted',0,'speciesInserted',(select count(*) from species_insert),'relationsInserted',(select count(*) from relation_insert),'lineageInserted',(select count(*) from log_insert))::text;

do $verify$
declare v_requested integer; v_species integer; v_relations integer; v_logs integer;
begin
  select jsonb_array_length(${input}) into v_requested;
  select count(*) into v_species from public.fish_species s where s.official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${input}) x) and s.archived_at is null;
  select count(*) into v_relations from public.fish_species_sources r join public.fish_species s on s.id=r.fish_species_id join public.fish_source_records src on src.id=r.source_record_id where s.official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${input}) x) and src.source_provider='MBRIS' and src.source_id='${source.sourceId}' and r.archived_at is null;
  select count(*) into v_logs from public.fish_change_logs l where l.change_type='${changeType}' and l.after_payload->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${input}) x) and l.after_payload->>'importBatch'='${importBatch}';
  if v_species<>v_requested or v_relations<>v_requested or v_logs<>v_requested then raise exception 'REVIEW_IMPORT_BATCH_TOTAL_VERIFY_FAILED'; end if;
  if exists (select 1 from public.fish_species s where s.official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${input}) x) and (s.publish_status<>'draft' or s.fact_review_status<>'pending')) then raise exception 'REVIEW_IMPORT_BATCH_STATE_VERIFY_FAILED'; end if;
end
$verify$;
commit;`;
}

function runBatches(batches, source, mode, expectInsert) {
  const reports = [];
  for (let index = 0; index < batches.length; index += 1) {
    const rows = batches[index];
    try {
      const [counts] = runAdmin(reviewBatchSql(rows, source));
      const expected = expectInsert ? rows.length : 0;
      assert(counts.sourceInserted === 0, `BATCH_${index + 1}_SOURCE_INSERTED`);
      assert(counts.speciesInserted === expected, `BATCH_${index + 1}_SPECIES_COUNT_MISMATCH`);
      assert(counts.relationsInserted === expected, `BATCH_${index + 1}_RELATION_COUNT_MISMATCH`);
      assert(counts.lineageInserted === expected, `BATCH_${index + 1}_LINEAGE_COUNT_MISMATCH`);
      reports.push({
        index: index + 1,
        mode,
        requested: rows.length,
        firstInternalId: rows[0].internalId,
        lastInternalId: rows.at(-1).internalId,
        ...counts,
        status: "COMMITTED",
      });
    } catch (error) {
      reports.push({
        index: index + 1,
        mode,
        requested: rows.length,
        firstInternalId: rows[0].internalId,
        lastInternalId: rows.at(-1).internalId,
        status: "ROLLED_BACK",
        errorCode: String(error.message).split(":")[0],
      });
      const failure = new Error(`REVIEW_IMPORT_BATCH_FAIL:${index + 1}`);
      failure.batchReports = reports;
      throw failure;
    }
  }
  return reports;
}

function postcheck(remote, admission, before, publicResult, fishDataHash) {
  const reviewIds = new Set(admission.rows.map((row) => row.internalId));
  const reviewSpecies = remote.species.filter((row) => reviewIds.has(row.internal_id));
  const reviewSpeciesIds = new Set(reviewSpecies.map((row) => row.species_id));
  const source = matchingSource(remote, admission.source);
  const sourceIds = new Set(source.map((row) => row.source_record_id));
  const reviewRelations = remote.relations.filter((row) => reviewSpeciesIds.has(row.species_id) && sourceIds.has(row.source_record_id) && !row.archived_at);
  const reviewLineage = remote.logs.filter((row) => reviewIds.has(row.internal_id) && row.import_batch === importBatch && row.change_type === changeType);
  const allMbrisRelations = remote.relations.filter((row) => sourceIds.has(row.source_record_id) && row.mbris_source_id && !row.archived_at);
  const allMbrisLineage = remote.logs.filter((row) => row.source_provider === "MBRIS" && row.internal_id);
  const nifs = remote.species.filter((row) => row.source_provider === "NIFS");
  const previousMbris = remote.species.filter((row) => admission.previousMbrisIds.has(row.internal_id));
  const duplicates = {
    speciesInternalId: admission.rows.filter((row) => remote.species.filter((item) => item.internal_id === row.internalId).length !== 1).length,
    speciesSlug: admission.rows.filter((row) => remote.species.filter((item) => item.slug === row.slug).length !== 1).length,
    relations: admission.rows.filter((row) => reviewRelations.filter((item) => item.mbris_source_id === row.mbrisSourceId).length !== 1).length,
    lineage: admission.rows.filter((row) => reviewLineage.filter((item) => item.internal_id === row.internalId).length !== 1).length,
  };
  const excludedAfter = countExcluded(remote, admission.excluded);
  const excludedWrites = Object.fromEntries(Object.keys(excludedAfter).map((key) => [key, excludedAfter[key] - before.excludedBefore[key]]));
  return {
    totalSpecies: remote.species.length,
    nifsSpecies: nifs.length,
    previousMbrisSpecies: previousMbris.length,
    reviewSpecies: reviewSpecies.length,
    mbrisSourceRecords: source.length,
    reviewRelations: reviewRelations.length,
    reviewLineage: reviewLineage.length,
    totalMbrisRelations: allMbrisRelations.length,
    totalMbrisLineage: allMbrisLineage.length,
    publicVisibility: publicResult.publicVisible,
    publicAccessDenied: publicResult.accessDenied,
    publicAccessReason: publicResult.reason || null,
    auditVisibility: reviewSpecies.length,
    allReviewDraftPending: reviewSpecies.every((row) => row.publish_status === "draft" && row.fact_review_status === "pending"),
    duplicates,
    unexpectedSpecies: remote.species.length - 1258,
    excludedWrites,
    schemaChanged: JSON.stringify(before.fingerprints) !== JSON.stringify(remote.fingerprints),
    rlsChanged: before.fingerprints.policies !== remote.fingerprints.policies,
    fishDataModified: hashFile(fishDataPath) !== fishDataHash,
    fingerprints: remote.fingerprints,
  };
}

function sumCounts(batchReports) {
  return batchReports.reduce((sum, row) => ({
    sourceInserted: sum.sourceInserted + row.sourceInserted,
    speciesInserted: sum.speciesInserted + row.speciesInserted,
    relationsInserted: sum.relationsInserted + row.relationsInserted,
    lineageInserted: sum.lineageInserted + row.lineageInserted,
  }), { sourceInserted: 0, speciesInserted: 0, relationsInserted: 0, lineageInserted: 0 });
}

function safeError(error) {
  return String(error?.message || error)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/password\s*=\s*\S+/gi, "password=[REDACTED]")
    .slice(0, 500);
}

function writeReports({ generatedAt, before, firstBatches, rerunBatches, post, legacyCount, status }) {
  const firstCounts = sumCounts(firstBatches);
  const rerunCounts = sumCounts(rerunBatches);
  writeJson(firstReportPath, {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status,
    prewrite: before,
    firstImport: firstCounts,
    committedBatches: firstBatches.filter((row) => row.status === "COMMITTED").length,
    failedBatches: firstBatches.filter((row) => row.status !== "COMMITTED").length,
    unexpectedWrites: 0,
    productionImportExecuted: false,
  });
  writeJson(batchesReportPath, {
    reportVersion: "1",
    generatedAt,
    status: firstBatches.every((row) => row.status === "COMMITTED") ? "REVIEW_IMPORT_BATCHES_PASS" : "REVIEW_IMPORT_BATCHES_FAIL",
    batchShape: firstBatches.map((row) => row.requested),
    batches: firstBatches,
  });
  writeJson(rerunReportPath, {
    reportVersion: "1",
    generatedAt,
    status: Object.values(rerunCounts).every((count) => count === 0) ? "REVIEW_IMPORT_IDEMPOTENCY_PASS" : "REVIEW_IMPORT_IDEMPOTENCY_FAIL",
    inserted: rerunCounts,
    existingSkipped: { source: 1, species: 136, relations: 136, lineage: 136 },
    batches: rerunBatches,
  });
  writeJson(postcheckPath, {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status: status === "MBRIS_REVIEW_READY_IMPORT_PASS" ? "REVIEW_IMPORT_POSTCHECK_PASS" : "REVIEW_IMPORT_POSTCHECK_FAIL",
    ...post,
    legacyMappings: legacyCount,
  });
  const batchTable = firstBatches.map((row) => `| ${row.index} | ${row.requested} | ${row.speciesInserted ?? 0} | ${row.relationsInserted ?? 0} | ${row.lineageInserted ?? 0} | ${row.status} |`).join("\n");
  fs.writeFileSync(docPath, `# MBRIS Review Ready Import V1\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Gate: ${status}\n- Environment: staging (${projectRef})\n- Manifest admission: 136/136\n- Source insert: 0\n- DB scale: ${before.speciesBefore} -> ${post.totalSpecies}\n- Production import: 0\n\n## Batches\n\n| Batch | Requested | Species | Relations | Lineage | Status |\n| ---: | ---: | ---: | ---: | ---: | --- |\n${batchTable}\n\n## First Import\n\n- Source inserted: ${firstCounts.sourceInserted}\n- Species inserted: ${firstCounts.speciesInserted}\n- Relations inserted: ${firstCounts.relationsInserted}\n- Lineage inserted: ${firstCounts.lineageInserted}\n\n## Postcheck\n\n- Total species: ${post.totalSpecies}\n- NIFS: ${post.nifsSpecies}/8\n- Previous MBRIS: ${post.previousMbrisSpecies}/1114\n- Review V2: ${post.reviewSpecies}/136\n- Review relations: ${post.reviewRelations}/136\n- Review lineage: ${post.reviewLineage}/136\n- Total MBRIS relations: ${post.totalMbrisRelations}\n- Total MBRIS lineage: ${post.totalMbrisLineage}\n- Public visibility: ${post.publicVisibility}\n- Audit visibility: ${post.auditVisibility}\n- Schema changed: ${post.schemaChanged}\n- RLS changed: ${post.rlsChanged}\n- fish-data.ts modified: ${post.fishDataModified}\n\n## Idempotency\n\n- Source inserted: ${rerunCounts.sourceInserted}\n- Species inserted: ${rerunCounts.speciesInserted}\n- Relations inserted: ${rerunCounts.relationsInserted}\n- Lineage inserted: ${rerunCounts.lineageInserted}\n\nNo DSN, password, token, or credential is stored in these artifacts.\n`, "utf8");
}

function loadAuditRemote() {
  const env = readEnv(auditEnvPath);
  const auditUrl = env.FISH_SUPABASE_AUDIT_DATABASE_URL;
  if (!auditUrl) throw new Error("AUDIT_URL_MISSING");
  const parsed = new URL(auditUrl);
  const username = decodeURIComponent(parsed.username);
  assert(["blue_marina_readonly_auditor", `blue_marina_readonly_auditor.${projectRef}`].includes(username), "AUDITOR_ROLE_INVALID");
  return runAuditor(auditSql(), auditUrl)[0];
}

function loadInputs() {
  return prepareAdmission(
    readJson(reviewManifestPath),
    readJson(promotionPath),
    readJson(legacyMappingPath),
    readJson(blockedPath),
    readJson(baseManifestPath),
  );
}

function main() {
  const admission = loadInputs();
  const beforeRemote = loadAuditRemote();
  const before = prewriteCheck(beforeRemote, admission);
  if (process.argv.includes("--prewrite-only")) {
    console.log(JSON.stringify({ ...before, collisions: before.collisions.length, dbWrite: 0 }));
    return;
  }
  assert(before.status === "REVIEW_IMPORT_PREWRITE_PASS", "REVIEW_IMPORT_PREWRITE_FAIL");
  assert(process.env.MBRIS_REVIEW_IMPORT_APPROVED === "true", "REVIEW_IMPORT_APPROVAL_MISSING");
  assert(process.env.PGPASSWORD, "ADMIN_PASSWORD_MISSING");
  const fishDataHash = hashFile(fishDataPath);
  const batches = chunk(admission.rows, batchSize);
  assert(JSON.stringify(batches.map((batch) => batch.length)) === JSON.stringify([50, 50, 36]), "BATCH_SHAPE_INVALID");
  let firstBatches = [];
  let rerunBatches = [];
  try {
    firstBatches = runBatches(batches, admission.source, "FIRST_IMPORT", true);
    rerunBatches = runBatches(batches, admission.source, "IDEMPOTENCY_RERUN", false);
    const afterRemote = loadAuditRemote();
    const publicResult = readPublicVisibility(admission.rows);
    const post = postcheck(afterRemote, admission, before, publicResult, fishDataHash);
    const firstCounts = sumCounts(firstBatches);
    const rerunCounts = sumCounts(rerunBatches);
    const pass = firstCounts.sourceInserted === 0
      && firstCounts.speciesInserted === 136
      && firstCounts.relationsInserted === 136
      && firstCounts.lineageInserted === 136
      && Object.values(rerunCounts).every((count) => count === 0)
      && post.totalSpecies === 1258
      && post.nifsSpecies === 8
      && post.previousMbrisSpecies === 1114
      && post.reviewSpecies === 136
      && post.reviewRelations === 136
      && post.reviewLineage === 136
      && post.totalMbrisRelations === 1252
      && post.totalMbrisLineage === 1252
      && post.publicVisibility === 0
      && post.auditVisibility === 136
      && post.allReviewDraftPending
      && Object.values(post.duplicates).every((count) => count === 0)
      && Object.values(post.excludedWrites).every((count) => count === 0)
      && post.unexpectedSpecies === 0
      && !post.schemaChanged
      && !post.rlsChanged
      && !post.fishDataModified;
    const status = pass ? "MBRIS_REVIEW_READY_IMPORT_PASS" : "MBRIS_REVIEW_READY_IMPORT_FAIL";
    writeReports({ generatedAt: new Date().toISOString(), before, firstBatches, rerunBatches, post, legacyCount: admission.legacyMappings.length, status });
    console.log(JSON.stringify({ status, firstImport: firstCounts, rerun: rerunCounts, postcheck: post }));
    if (!pass) process.exitCode = 1;
  } catch (error) {
    if (error.batchReports) firstBatches = error.batchReports;
    writeJson(batchesReportPath, {
      reportVersion: "1",
      generatedAt: new Date().toISOString(),
      status: "REVIEW_IMPORT_BATCHES_FAIL",
      batches: firstBatches,
      errorCode: safeError(error),
    });
    throw error;
  } finally {
    delete process.env.PGPASSWORD;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ status: "MBRIS_REVIEW_READY_IMPORT_FAIL", reason: safeError(error) }));
    process.exitCode = 1;
  }
}

module.exports = {
  batchSize,
  changeType,
  chunk,
  importBatch,
  postcheck,
  prepareAdmission,
  prewriteCheck,
  reviewBatchSql,
  sumCounts,
};

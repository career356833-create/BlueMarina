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

const manifestPath = path.join(root, "reports", "mbris", "mbris-staging-import-manifest-v1.json");
const canaryPlanPath = path.join(root, "reports", "mbris", "mbris-canary-import-plan-v1_6.json");
const canaryPostcheckPath = path.join(root, "reports", "mbris", "mbris-canary-postcheck-v1.json");
const firstReportPath = path.join(root, "reports", "mbris", "mbris-full-import-v1.json");
const batchesReportPath = path.join(root, "reports", "mbris", "mbris-full-import-batches-v1.json");
const rerunReportPath = path.join(root, "reports", "mbris", "mbris-full-import-rerun-v1.json");
const postcheckPath = path.join(root, "reports", "mbris", "mbris-full-import-postcheck-v1.json");
const docPath = path.join(root, "docs", "MBRIS_FULL_STAGING_IMPORT_V1.md");
const batchSize = 100;
const fullImportBatch = "mbris-full-import-v1";
const existingLinkBatch = "mbris-full-existing-links-v1";

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function prepareAdmission(manifest, canaryPlan, canaryPostcheck) {
  assert(manifest.newSpecies.length === 1114, "MANIFEST_NEW_SPECIES_COUNT_INVALID");
  assert(canaryPlan.selectedCount === 10 && canaryPlan.species.length === 10, "CANARY_PLAN_INVALID");
  assert(canaryPostcheck.status === "CANARY_POSTCHECK_PASS" && canaryPostcheck.readyForFullImport, "CANARY_GATE_NOT_READY");
  assert(manifest.existingSpeciesLinks.length === 2, "EXISTING_EXACT_COUNT_INVALID");

  const canaryIds = new Set(canaryPlan.species.map((item) => item.internalId));
  const remaining = manifest.newSpecies.filter((item) => !canaryIds.has(item.internalId));
  assert(remaining.length === 1104, "REMAINING_ADMISSION_COUNT_INVALID");
  assert(new Set(remaining.map((item) => item.internalId)).size === 1104, "REMAINING_INTERNAL_ID_DUPLICATE");
  assert(new Set(remaining.map((item) => item.canonicalSlug)).size === 1104, "REMAINING_SLUG_DUPLICATE");
  assert(new Set(remaining.map((item) => normalize(item.normalizedScientificName))).size === 1104, "REMAINING_SCIENTIFIC_DUPLICATE");
  assert(remaining.every((item) => item.initialPublishStatus === "draft" && item.initialFactReviewStatus === "pending"), "REMAINING_STATE_INVALID");
  assert(remaining.every((item) => item.dryRun?.action === "INSERT" && !item.dryRun.slugConflict && !item.dryRun.scientificNameConflict), "REMAINING_DRY_RUN_INVALID");

  const blockedIds = new Set([
    ...(manifest.excluded.review || []).map((item) => item.internalId),
    ...(manifest.excluded.canonicalConflict || []).map((item) => item.internalId),
    ...(manifest.excluded.nonFish || []).map((item) => item.internalId),
    ...(manifest.excluded.malformedScientific || []).map((item) => item.internalId),
  ]);
  assert(remaining.every((item) => !blockedIds.has(item.internalId)), "EXCLUDED_ROW_ADMITTED");
  assert((manifest.excluded.review || []).length === 137, "REVIEW_EXCLUSION_COUNT_INVALID");
  assert((manifest.excluded.canonicalConflict || []).length === 1, "CONFLICT_EXCLUSION_COUNT_INVALID");
  assert((manifest.excluded.nonFish || []).length === 145, "NONFISH_EXCLUSION_COUNT_INVALID");
  assert((manifest.excluded.malformedScientific || []).length === 5, "MALFORMED_EXCLUSION_COUNT_INVALID");

  return {
    canaryIds,
    remaining,
    existingLinks: manifest.existingSpeciesLinks,
    exclusions: { review: 137, conflict: 1, nonfish: 145, malformed: 5 },
  };
}

function prewriteCheck(remote, admission, manifest) {
  assert(remote.identity.currentUser === "blue_marina_readonly_auditor", "AUDITOR_IDENTITY_INVALID");
  assert(remote.identity.readOnly === "on" && remote.identity.bypassRls === false, "AUDITOR_READ_ONLY_INVALID");
  const nifs = remote.species.filter((item) => item.source_provider === "NIFS");
  const canary = remote.species.filter((item) => admission.canaryIds.has(item.internal_id));
  const source = remote.sources.filter((item) =>
    item.source_provider === manifest.source.sourceProvider &&
    item.source_id === manifest.source.sourceId &&
    item.content_hash === manifest.source.contentHash &&
    item.is_current && !item.archived_at,
  );
  const sourceIds = new Set(source.map((item) => item.source_record_id));
  const collisions = [];
  for (const row of admission.remaining) {
    const checks = [
      ["internalId", remote.species.some((item) => item.internal_id === row.internalId)],
      ["slug", remote.species.some((item) => item.slug === row.canonicalSlug) || remote.slugAliases.some((item) => item.is_active && item.alias_slug === row.canonicalSlug)],
      ["scientific", remote.species.some((item) => item.scientific_name === row.scientificName)],
      ["normalizedScientific", remote.species.some((item) => normalize(item.normalized_scientific_name) === normalize(row.normalizedScientificName))],
      ["alias", remote.aliases.some((item) => !item.archived_at && normalize(item.normalized_alias || item.alias_name) === normalize(row.normalizedScientificName))],
      ["relation", remote.relations.some((item) => item.mbris_source_id === row.mbrisSourceId && !item.archived_at)],
      ["lineage", remote.logs.some((item) => item.internal_id === row.internalId && item.source_provider === "MBRIS")],
    ];
    for (const [type, hit] of checks) if (hit) collisions.push({ internalId: row.internalId, type });
  }

  const existing2 = admission.existingLinks.map((item) => {
    const species = remote.species.find((candidate) => candidate.species_id === item.existingSpeciesId);
    const relations = remote.relations.filter((relation) => relation.species_id === item.existingSpeciesId && sourceIds.has(relation.source_record_id) && relation.mbris_source_id === item.mbrisSourceId && !relation.archived_at);
    const logs = remote.logs.filter((log) => log.entity_id === item.existingSpeciesId && log.internal_id === item.internalId && log.source_provider === "MBRIS");
    return {
      internalId: item.internalId,
      koreanName: item.koreanName,
      speciesId: item.existingSpeciesId,
      identityMatches: Boolean(species && species.korean_name === item.koreanName && species.scientific_name === item.scientificName),
      relationExisting: relations.length,
      lineageExisting: logs.length,
    };
  });

  return {
    speciesBefore: remote.species.length,
    nifs: nifs.length,
    canary: canary.length,
    source: source.length,
    remainingAdmission: admission.remaining.length,
    collisions,
    existing2,
    expectedExisting2RelationInserts: existing2.filter((item) => item.relationExisting === 0).length,
    expectedExisting2LineageInserts: existing2.filter((item) => item.lineageExisting === 0).length,
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
    slug: row.canonicalSlug,
    taxonomy: row.taxonomy,
    officialFacts: row.officialFactsPlan,
    lineage: row.lineagePlan,
    priority: row.priority,
    tier: row.tier,
  }));
}

function speciesBatchSql(rows, source) {
  const input = sqlLiteralJson(inputPayload(rows));
  return String.raw`
begin;
set local statement_timeout='60s';
set local lock_timeout='5s';

do $precheck$
begin
  if (select count(*) from public.fish_source_records where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null) <> 1 then raise exception 'FULL_IMPORT_SOURCE_NOT_EXACT'; end if;
  if exists (
    select 1 from jsonb_array_elements(${input}) x
    join public.fish_species s on s.official_facts->>'internalId'=x->>'internalId'
    where s.slug<>x->>'slug' or s.korean_name<>x->>'koreanName' or s.scientific_name<>x->>'scientificName' or s.publish_status<>'draft' or s.fact_review_status<>'pending'
  ) then raise exception 'FULL_IMPORT_EXISTING_IDENTITY_MISMATCH'; end if;
  if exists (
    select 1 from jsonb_array_elements(${input}) x
    join public.fish_species s on (s.slug=x->>'slug' or s.scientific_name=x->>'scientificName')
    where coalesce(s.official_facts->>'internalId','')<>x->>'internalId'
  ) then raise exception 'FULL_IMPORT_CROSS_IDENTITY_COLLISION'; end if;
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
    'importMetadata',jsonb_build_object('mbrisSourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','${fullImportBatch}','priority',i.priority,'tier',i.tier),
    'taxonomy','MBRIS','koreanName','MBRIS','scientificName','MBRIS','priority','IMPORT_METADATA_ONLY','tier','IMPORT_METADATA_ONLY'
  ),'import_review'
  from input i join resolved_species rs on rs.internal_id=i."internalId" cross join resolved_source src
  where not exists (select 1 from public.fish_species_sources r where r.fish_species_id=rs.id and r.source_record_id=src.id)
  returning id
), log_insert as (
  insert into public.fish_change_logs(entity_type,entity_id,change_type,after_payload,source_record_id,actor_type)
  select 'fish_species',rs.id,'mbris_full_import_v1',
    i.lineage || jsonb_build_object('sourceProvider','MBRIS','sourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','${fullImportBatch}','normalizedScientificName',i."normalizedScientificName"),
    src.id,'importer'
  from input i join resolved_species rs on rs.internal_id=i."internalId" cross join resolved_source src
  where not exists (
    select 1 from public.fish_change_logs l where l.entity_type='fish_species' and l.entity_id=rs.id and l.change_type='mbris_full_import_v1' and l.after_payload->>'internalId'=i."internalId" and l.after_payload->>'importBatch'='${fullImportBatch}'
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
  select count(*) into v_logs from public.fish_change_logs l where l.change_type='mbris_full_import_v1' and l.after_payload->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${input}) x) and l.after_payload->>'importBatch'='${fullImportBatch}';
  if v_species<>v_requested or v_relations<>v_requested or v_logs<>v_requested then raise exception 'FULL_IMPORT_BATCH_TOTAL_VERIFY_FAILED'; end if;
  if exists (select 1 from public.fish_species s where s.official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${input}) x) and (s.publish_status<>'draft' or s.fact_review_status<>'pending')) then raise exception 'FULL_IMPORT_BATCH_STATE_VERIFY_FAILED'; end if;
end
$verify$;
commit;`;
}

function existingLinksSql(items, source) {
  const input = sqlLiteralJson(items.map((item) => ({
    speciesId: item.existingSpeciesId,
    internalId: item.internalId,
    mbrisSourceId: item.mbrisSourceId,
    koreanName: item.koreanName,
    scientificName: item.scientificName,
    lineage: item.lineagePlan,
    priority: item.lineagePlan.priority,
    tier: item.lineagePlan.tier,
  })));
  return String.raw`
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $precheck$
begin
  if (select count(*) from public.fish_source_records where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null) <> 1 then raise exception 'FULL_IMPORT_SOURCE_NOT_EXACT'; end if;
  if exists (select 1 from jsonb_array_elements(${input}) x left join public.fish_species s on s.id=(x->>'speciesId')::uuid where s.id is null or s.korean_name<>x->>'koreanName' or s.scientific_name<>x->>'scientificName') then raise exception 'EXISTING_LINK_SPECIES_MISMATCH'; end if;
end
$precheck$;
with input as (
  select * from jsonb_to_recordset(${input}) as x("speciesId" uuid,"internalId" text,"mbrisSourceId" text,"koreanName" text,"scientificName" text,lineage jsonb,priority integer,tier text)
), resolved_source as (
  select id from public.fish_source_records where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null
), relation_insert as (
  insert into public.fish_species_sources(fish_species_id,source_record_id,is_primary,field_precedence,linked_by)
  select i."speciesId",src.id,false,jsonb_build_object(
    'mbrisSourceId',i."mbrisSourceId",
    'importMetadata',jsonb_build_object('mbrisSourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','${existingLinkBatch}','priority',i.priority,'tier',i.tier),
    'taxonomy','MBRIS_METADATA_ONLY','priority','IMPORT_METADATA_ONLY','tier','IMPORT_METADATA_ONLY'
  ),'import_review'
  from input i cross join resolved_source src
  where not exists (select 1 from public.fish_species_sources r where r.fish_species_id=i."speciesId" and r.source_record_id=src.id)
  returning id
), log_insert as (
  insert into public.fish_change_logs(entity_type,entity_id,change_type,after_payload,source_record_id,actor_type)
  select 'fish_species',i."speciesId",'mbris_full_existing_link_v1',
    i.lineage || jsonb_build_object('sourceProvider','MBRIS','sourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','${existingLinkBatch}','normalizedScientificName',i."scientificName"),
    src.id,'importer'
  from input i cross join resolved_source src
  where not exists (select 1 from public.fish_change_logs l where l.entity_type='fish_species' and l.entity_id=i."speciesId" and l.change_type='mbris_full_existing_link_v1' and l.after_payload->>'internalId'=i."internalId")
  returning id
)
select jsonb_build_object('sourceInserted',0,'speciesInserted',0,'relationsInserted',(select count(*) from relation_insert),'lineageInserted',(select count(*) from log_insert))::text;
do $verify$
declare v_relations integer; v_logs integer;
begin
  select count(*) into v_relations from public.fish_species_sources r join public.fish_source_records src on src.id=r.source_record_id where r.fish_species_id in (select (x->>'speciesId')::uuid from jsonb_array_elements(${input}) x) and src.source_provider='MBRIS' and src.source_id='${source.sourceId}' and r.archived_at is null;
  select count(*) into v_logs from public.fish_change_logs l where l.change_type='mbris_full_existing_link_v1' and l.after_payload->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${input}) x);
  if v_relations<>2 or v_logs<>2 then raise exception 'EXISTING_LINK_TOTAL_VERIFY_FAILED'; end if;
end
$verify$;
commit;`;
}

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

function runSpeciesBatches(batches, source, mode, expectedInsert) {
  const reports = [];
  for (let index = 0; index < batches.length; index += 1) {
    const rows = batches[index];
    try {
      const [counts] = runAdmin(speciesBatchSql(rows, source));
      const expected = expectedInsert ? rows.length : 0;
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
        candidates: rows.map((row) => ({ internalId: row.internalId, mbrisSourceId: row.mbrisSourceId, koreanName: row.koreanName })),
      });
      const failure = new Error(`FULL_IMPORT_BATCH_FAIL:${index + 1}`);
      failure.batchReports = reports;
      throw failure;
    }
  }
  return reports;
}

function postcheck(remote, admission, manifest, before, publicResult) {
  const newIds = new Set(manifest.newSpecies.map((item) => item.internalId));
  const allMbrisIds = new Set([...newIds, ...admission.existingLinks.map((item) => item.internalId)]);
  const mbrisNewSpecies = remote.species.filter((item) => newIds.has(item.internal_id));
  const nifsSpecies = remote.species.filter((item) => item.source_provider === "NIFS");
  const source = remote.sources.filter((item) => item.source_provider === manifest.source.sourceProvider && item.source_id === manifest.source.sourceId && item.content_hash === manifest.source.contentHash && item.is_current && !item.archived_at);
  const sourceIds = new Set(source.map((item) => item.source_record_id));
  const relations = remote.relations.filter((item) => sourceIds.has(item.source_record_id) && allMbrisIds.has(item.mbris_source_id === null ? "" : item.mbris_source_id.replace(/^MBRIS:/, "__never__")));
  const allMbrisRelations = remote.relations.filter((item) => sourceIds.has(item.source_record_id) && !item.archived_at);
  const allMbrisLogs = remote.logs.filter((item) => item.source_provider === "MBRIS" && allMbrisIds.has(item.internal_id));
  const expectedSpeciesIds = new Set([...nifsSpecies.map((item) => item.species_id), ...mbrisNewSpecies.map((item) => item.species_id)]);
  const duplicates = {
    speciesInternalId: [...newIds].filter((id) => remote.species.filter((item) => item.internal_id === id).length !== 1).length,
    speciesSlug: manifest.newSpecies.filter((row) => remote.species.filter((item) => item.slug === row.canonicalSlug).length !== 1).length,
    relations: [...allMbrisIds].filter((id) => allMbrisRelations.filter((item) => item.mbris_source_id === manifest.newSpecies.find((row) => row.internalId === id)?.mbrisSourceId || item.mbris_source_id === admission.existingLinks.find((row) => row.internalId === id)?.mbrisSourceId).length !== 1).length,
    lineage: [...allMbrisIds].filter((id) => allMbrisLogs.filter((item) => item.internal_id === id).length !== 1).length,
  };
  const existing2 = admission.existingLinks.map((item) => ({
    internalId: item.internalId,
    koreanName: item.koreanName,
    speciesId: item.existingSpeciesId,
    speciesExists: remote.species.filter((species) => species.species_id === item.existingSpeciesId).length === 1,
    relationCount: allMbrisRelations.filter((relation) => relation.species_id === item.existingSpeciesId && relation.mbris_source_id === item.mbrisSourceId).length,
    lineageCount: allMbrisLogs.filter((log) => log.entity_id === item.existingSpeciesId && log.internal_id === item.internalId).length,
  }));
  return {
    totalSpecies: remote.species.length,
    nifsSpecies: nifsSpecies.length,
    mbrisNewSpecies: mbrisNewSpecies.length,
    mbrisSourceRecords: source.length,
    mbrisRelations: allMbrisRelations.length,
    mbrisLineage: allMbrisLogs.length,
    publicVisibility: publicResult.publicVisible,
    publicAccessDenied: publicResult.accessDenied,
    publicAccessReason: publicResult.reason || null,
    auditVisibility: mbrisNewSpecies.length,
    allMbrisNewDraftPending: mbrisNewSpecies.every((item) => item.publish_status === "draft" && item.fact_review_status === "pending"),
    duplicates,
    unexpectedSpecies: remote.species.filter((item) => !expectedSpeciesIds.has(item.species_id)).length,
    existing2,
    schemaChanged: JSON.stringify(before.fingerprints) !== JSON.stringify(remote.fingerprints),
    rlsChanged: before.fingerprints.policies !== remote.fingerprints.policies,
    fingerprints: remote.fingerprints,
  };
}

function sumCounts(reports) {
  return reports.reduce((total, report) => ({
    sourceInserted: total.sourceInserted + (report.sourceInserted || 0),
    speciesInserted: total.speciesInserted + (report.speciesInserted || 0),
    relationsInserted: total.relationsInserted + (report.relationsInserted || 0),
    lineageInserted: total.lineageInserted + (report.lineageInserted || 0),
  }), { sourceInserted: 0, speciesInserted: 0, relationsInserted: 0, lineageInserted: 0 });
}

function safeError(error) {
  return String(error.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]").slice(0, 500);
}

function writeFailureArtifacts(prewrite, batchReports, error) {
  const generatedAt = new Date().toISOString();
  writeJson(batchesReportPath, { reportVersion: "1", generatedAt, environment: "staging", projectRef, status: "FULL_IMPORT_BATCH_FAIL", batches: batchReports });
  writeJson(firstReportPath, { reportVersion: "1", generatedAt, environment: "staging", projectRef, status: "FULL_MBRIS_IMPORT_FAIL", prewrite, errorCode: safeError(error), committedBatches: batchReports.filter((item) => item.status === "COMMITTED").length, failedBatches: batchReports.filter((item) => item.status === "ROLLED_BACK").length });
}

function main() {
  let stage = "LOAD_INPUT";
  let prewrite = null;
  let batchReports = [];
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const canaryPlan = JSON.parse(fs.readFileSync(canaryPlanPath, "utf8"));
    const canaryPostcheck = JSON.parse(fs.readFileSync(canaryPostcheckPath, "utf8"));
    const admission = prepareAdmission(manifest, canaryPlan, canaryPostcheck);
    const auditEnv = readEnv(auditEnvPath);
    const auditUrl = auditEnv.FISH_SUPABASE_AUDIT_DATABASE_URL;
    assert(auditUrl, "AUDIT_URL_MISSING");
    const auditUsername = decodeURIComponent(new URL(auditUrl).username);
    assert(["blue_marina_readonly_auditor", `blue_marina_readonly_auditor.${projectRef}`].includes(auditUsername), "AUDITOR_URL_INVALID");

    stage = "PREWRITE";
    const [beforeRemote] = runAuditor(auditSql(), auditUrl);
    prewrite = prewriteCheck(beforeRemote, admission, manifest);
    assert(prewrite.speciesBefore === 18, "PREWRITE_SPECIES_COUNT_INVALID");
    assert(prewrite.nifs === 8 && prewrite.canary === 10 && prewrite.source === 1, "PREWRITE_BASELINE_INVALID");
    assert(prewrite.remainingAdmission === 1104 && prewrite.collisions.length === 0, "PREWRITE_COLLISION");
    assert(prewrite.existing2.every((item) => item.identityMatches && item.relationExisting <= 1 && item.lineageExisting <= 1), "EXISTING_2_PREWRITE_INVALID");

    stage = "EXISTING_2";
    const [existing2Counts] = runAdmin(existingLinksSql(admission.existingLinks, manifest.source));
    assert(existing2Counts.sourceInserted === 0 && existing2Counts.speciesInserted === 0, "EXISTING_2_UNEXPECTED_SPECIES_OR_SOURCE");
    assert(existing2Counts.relationsInserted === prewrite.expectedExisting2RelationInserts, "EXISTING_2_RELATION_COUNT_MISMATCH");
    assert(existing2Counts.lineageInserted === prewrite.expectedExisting2LineageInserts, "EXISTING_2_LINEAGE_COUNT_MISMATCH");

    const batches = chunk(admission.remaining, batchSize);
    assert(batches.length === 12 && batches.slice(0, 11).every((batch) => batch.length === 100) && batches[11].length === 4, "BATCH_SHAPE_INVALID");
    stage = "FIRST_BATCHES";
    try {
      batchReports = runSpeciesBatches(batches, manifest.source, "FIRST_IMPORT", true);
    } catch (error) {
      batchReports = error.batchReports || batchReports;
      writeFailureArtifacts(prewrite, batchReports, error);
      throw error;
    }
    const firstBatchCounts = sumCounts(batchReports);
    assert(firstBatchCounts.speciesInserted === 1104 && firstBatchCounts.relationsInserted === 1104 && firstBatchCounts.lineageInserted === 1104, "FIRST_IMPORT_TOTAL_MISMATCH");

    stage = "FIRST_POSTCHECK";
    const [afterFirst] = runAuditor(auditSql(), auditUrl);
    const publicFirst = readPublicVisibility(manifest.newSpecies);
    const firstPost = postcheck(afterFirst, admission, manifest, beforeRemote, publicFirst);
    const duplicateCount = Object.values(firstPost.duplicates).reduce((sum, value) => sum + value, 0);
    assert(firstPost.totalSpecies === 1122 && firstPost.nifsSpecies === 8 && firstPost.mbrisNewSpecies === 1114, "FIRST_POSTCHECK_SPECIES_INVALID");
    assert(firstPost.mbrisSourceRecords === 1 && firstPost.mbrisRelations === 1116 && firstPost.mbrisLineage === 1116, "FIRST_POSTCHECK_RELATION_LINEAGE_INVALID");
    assert(firstPost.publicVisibility === 0 && firstPost.auditVisibility === 1114 && firstPost.allMbrisNewDraftPending, "FIRST_POSTCHECK_SECURITY_STATE_INVALID");
    assert(duplicateCount === 0 && firstPost.unexpectedSpecies === 0 && !firstPost.schemaChanged, "FIRST_POSTCHECK_DUPLICATE_OR_SCHEMA_INVALID");
    assert(firstPost.existing2.every((item) => item.speciesExists && item.relationCount === 1 && item.lineageCount === 1), "FIRST_POSTCHECK_EXISTING_2_INVALID");

    stage = "IDEMPOTENCY_EXISTING_2";
    const [existing2Rerun] = runAdmin(existingLinksSql(admission.existingLinks, manifest.source));
    assert(existing2Rerun.sourceInserted === 0 && existing2Rerun.speciesInserted === 0 && existing2Rerun.relationsInserted === 0 && existing2Rerun.lineageInserted === 0, "IDEMPOTENCY_EXISTING_2_FAIL");
    stage = "IDEMPOTENCY_BATCHES";
    const rerunBatches = runSpeciesBatches(batches, manifest.source, "IDEMPOTENCY_RERUN", false);
    const rerunCounts = sumCounts(rerunBatches);
    assert(Object.values(rerunCounts).every((value) => value === 0), "IDEMPOTENCY_INSERT_DETECTED");

    stage = "FINAL_POSTCHECK";
    const [finalRemote] = runAuditor(auditSql(), auditUrl);
    const publicFinal = readPublicVisibility(manifest.newSpecies);
    const finalPost = postcheck(finalRemote, admission, manifest, beforeRemote, publicFinal);
    const finalDuplicateCount = Object.values(finalPost.duplicates).reduce((sum, value) => sum + value, 0);
    const pass = finalPost.totalSpecies === 1122 && finalPost.nifsSpecies === 8 && finalPost.mbrisNewSpecies === 1114 && finalPost.mbrisSourceRecords === 1 && finalPost.mbrisRelations === 1116 && finalPost.mbrisLineage === 1116 && finalPost.publicVisibility === 0 && finalPost.auditVisibility === 1114 && finalPost.allMbrisNewDraftPending && finalDuplicateCount === 0 && finalPost.unexpectedSpecies === 0 && !finalPost.schemaChanged && finalPost.existing2.every((item) => item.speciesExists && item.relationCount === 1 && item.lineageCount === 1);
    assert(pass, "FINAL_POSTCHECK_FAIL");

    const generatedAt = new Date().toISOString();
    const firstCounts = {
      sourceInserted: 0,
      speciesInserted: firstBatchCounts.speciesInserted,
      relationsInserted: firstBatchCounts.relationsInserted + existing2Counts.relationsInserted,
      lineageInserted: firstBatchCounts.lineageInserted + existing2Counts.lineageInserted,
    };
    writeJson(firstReportPath, {
      reportVersion: "1", generatedAt, environment: "staging", projectRef,
      status: "FULL_MBRIS_IMPORT_PASS", prewrite,
      existing2: { inserted: existing2Counts, duplicateSpecies: 0 },
      firstImport: firstCounts,
      committedBatches: batchReports.length,
      failedBatches: 0,
      priorityDiversityWarning: "PRIORITY_DIVERSITY_NOT_TESTED",
      exclusions: admission.exclusions,
    });
    writeJson(batchesReportPath, {
      reportVersion: "1", generatedAt, environment: "staging", projectRef,
      status: "FULL_IMPORT_BATCHES_PASS", batchSize, totalBatches: batchReports.length,
      batches: batchReports,
    });
    writeJson(rerunReportPath, {
      reportVersion: "1", generatedAt, environment: "staging", projectRef,
      status: "FULL_IMPORT_IDEMPOTENCY_PASS",
      inserted: rerunCounts,
      existing2Inserted: existing2Rerun,
      existingSkipped: { source: 1, mbrisNewSpecies: 1114, existingCanonicalLinks: 2, relations: 1116, lineage: 1116 },
      batches: rerunBatches,
    });
    writeJson(postcheckPath, {
      reportVersion: "1", generatedAt, environment: "staging", projectRef,
      status: "FULL_IMPORT_POSTCHECK_PASS",
      ...finalPost,
      exclusions: admission.exclusions,
      readyForNextReviewTrack: true,
      productionImportExecuted: false,
    });

    const batchTable = batchReports.map((item) => `| ${item.index} | ${item.requested} | ${item.speciesInserted} | ${item.relationsInserted} | ${item.lineageInserted} | ${item.status} |`).join("\n");
    const doc = `# MBRIS Full Staging Import V1\n\nGenerated: ${generatedAt}\n\n## Gate\n\n- FULL_MBRIS_IMPORT_PASS\n- READY_FOR_NEXT_REVIEW_TRACK: YES\n- Production import: no\n- Warning: PRIORITY_DIVERSITY_NOT_TESTED\n\n## Prewrite\n\n- Species before: ${prewrite.speciesBefore}\n- NIFS: ${prewrite.nifs}/8\n- Canary: ${prewrite.canary}/10\n- MBRIS source: ${prewrite.source}\n- Remaining admission: ${prewrite.remainingAdmission}\n- Collisions: ${prewrite.collisions.length}\n\n## First Import\n\n- Source inserts: 0\n- Species inserts: ${firstCounts.speciesInserted}\n- Relation inserts: ${firstCounts.relationsInserted}\n- Lineage inserts: ${firstCounts.lineageInserted}\n- Committed batches: ${batchReports.length}\n- Failed batches: 0\n\n## Batches\n\n| Batch | Requested | Species | Relations | Lineage | Result |\n|---:|---:|---:|---:|---:|---|\n${batchTable}\n\n## Postcheck\n\n- Total species: ${finalPost.totalSpecies}\n- NIFS: ${finalPost.nifsSpecies}\n- MBRIS new: ${finalPost.mbrisNewSpecies}\n- MBRIS relations: ${finalPost.mbrisRelations}\n- MBRIS lineage: ${finalPost.mbrisLineage}\n- Public visibility: ${finalPost.publicVisibility}\n- Audit visibility: ${finalPost.auditVisibility}\n- Schema changed: ${finalPost.schemaChanged}\n- RLS changed: ${finalPost.rlsChanged}\n- Duplicate rows: ${finalDuplicateCount}\n- Idempotency rerun inserts: 0\n\n## Excluded\n\n- Review: 137\n- Conflict: 1\n- Non-fish: 145\n- Malformed scientific: 5\n\nNo DSN, password, token, or credential is stored in these artifacts.\n`;
    fs.writeFileSync(docPath, doc, "utf8");

    console.log(JSON.stringify({
      status: "FULL_MBRIS_IMPORT_PASS",
      speciesBefore: prewrite.speciesBefore,
      speciesInserted: firstCounts.speciesInserted,
      relationInserted: firstCounts.relationsInserted,
      lineageInserted: firstCounts.lineageInserted,
      totalSpecies: finalPost.totalSpecies,
      nifs: finalPost.nifsSpecies,
      mbrisNew: finalPost.mbrisNewSpecies,
      relations: finalPost.mbrisRelations,
      lineage: finalPost.mbrisLineage,
      publicVisible: finalPost.publicVisibility,
      auditVisible: finalPost.auditVisibility,
      rerunInserted: rerunCounts,
      committedBatches: batchReports.length,
      failedBatches: 0,
      productionImportExecuted: false,
    }));
  } catch (error) {
    if (batchReports.length && !fs.existsSync(firstReportPath)) writeFailureArtifacts(prewrite, batchReports, error);
    throw new Error(`${stage}:${safeError(error)}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ status: "FULL_MBRIS_IMPORT_FAIL", reason: safeError(error) }));
    process.exitCode = 1;
  }
}

module.exports = { prepareAdmission, speciesBatchSql, existingLinksSql, chunk, postcheck };

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
  writeJson,
} = require("./run-canary-import-v1.cjs");

const targetId = "1f158822-5672-4174-b44a-2237496b9504";
const nifsSourceId = "fish_1575881532404";
const mbrisSourceId = "MBRIS:척추동물:644";
const mbrisCatalogSourceId = "mbris-national-species-catalog";
const internalId = "BM-SPECIES-000642";
const updateBatch = "mottled-skate-canonical-update-v1";
const changeType = "mottled_skate_canonical_update_v1";
const expectedBefore = "Raja pulchra";
const expectedAfter = "Beringraja pulchra";
const protectedReviewNames = ["Chaeturichthys jeoni", "열목어", "끄리", "참몰개", "몰개", "긴몰개"];

const reviewDocPath = path.join(root, "docs", "MBRIS_MANUAL_TAXONOMY_REVIEW_V1.md");
const blockedPath = path.join(root, "reports", "mbris", "mbris-manual-review-blocked-v1.json");
const updateReportPath = path.join(root, "reports", "mbris", "mbris-mottled-skate-update-v1.json");
const rerunReportPath = path.join(root, "reports", "mbris", "mbris-mottled-skate-update-rerun-v1.json");
const postcheckPath = path.join(root, "reports", "mbris", "mbris-mottled-skate-postcheck-v1.json");
const outputDocPath = path.join(root, "docs", "MBRIS_MOTTLED_SKATE_CANONICAL_UPDATE_V1.md");

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function loadAudit() {
  const env = readEnv(auditEnvPath);
  const auditUrl = env.FISH_SUPABASE_AUDIT_DATABASE_URL;
  assert(auditUrl, "AUDIT_URL_MISSING");
  const parsed = new URL(auditUrl);
  const username = decodeURIComponent(parsed.username);
  assert(["blue_marina_readonly_auditor", `blue_marina_readonly_auditor.${projectRef}`].includes(username), "AUDITOR_ROLE_INVALID");
  const [remote] = runAuditor(auditSql(), auditUrl);
  assert(remote.identity.currentUser === "blue_marina_readonly_auditor", "AUDITOR_IDENTITY_INVALID");
  assert(remote.identity.readOnly === "on" && remote.identity.bypassRls === false, "AUDITOR_NOT_READ_ONLY");
  return remote;
}

function validateApprovalArtifacts() {
  const reviewDoc = fs.readFileSync(reviewDocPath, "utf8");
  const blocked = JSON.parse(fs.readFileSync(blockedPath, "utf8"));
  const record = blocked.records.find((item) => item.sourceId === mbrisSourceId);
  assert(record, "APPROVAL_RECORD_MISSING");
  assert(record.recommendedAcceptedScientificName === expectedAfter, "APPROVED_NAME_MISMATCH");
  assert(record.nifsOriginalScientificName === expectedBefore, "PREVIOUS_NAME_MISMATCH");
  assert(record.recommendedAction === "UPDATE_CANONICAL_AFTER_APPROVAL", "APPROVED_ACTION_MISMATCH");
  assert(reviewDoc.includes("`UPDATE_CANONICAL_AFTER_APPROVAL`"), "REVIEW_DOC_ACTION_MISSING");
  assert(reviewDoc.includes("*Beringraja pulchra*"), "REVIEW_DOC_ACCEPTED_NAME_MISSING");
  return {
    reviewDoc: path.relative(root, reviewDocPath).replaceAll("\\", "/"),
    blockedReport: path.relative(root, blockedPath).replaceAll("\\", "/"),
    classification: record.finalClassification,
    action: record.recommendedAction,
    evidenceCount: record.evidence.length,
  };
}

function sourceMap(remote) {
  return new Map(remote.sources.map((item) => [item.source_record_id, item]));
}

function snapshotProtected(remote) {
  const sourceIds = new Set([
    "MBRIS:척추동물:384",
    "MBRIS:육상담수종:6",
    "MBRIS:육상담수종:62",
    "MBRIS:육상담수종:110",
    "MBRIS:육상담수종:111",
    "MBRIS:육상담수종:112",
  ]);
  const internalIds = new Set([
    "BM-SPECIES-000382",
    "BM-SPECIES-016332",
    "BM-SPECIES-016388",
    "BM-SPECIES-016436",
    "BM-SPECIES-016437",
    "BM-SPECIES-016438",
  ]);
  return {
    species: remote.species.filter((item) => protectedReviewNames.includes(item.korean_name) || protectedReviewNames.includes(item.scientific_name)),
    relations: remote.relations.filter((item) => sourceIds.has(item.mbris_source_id)),
    logs: remote.logs.filter((item) => internalIds.has(item.internal_id)),
  };
}

function prewrite(remote) {
  const target = remote.species.filter((item) => item.species_id === targetId || item.korean_name === "참홍어" || item.slug === "mottled-skate");
  assert(remote.species.length === 1258, "SPECIES_TOTAL_PREWRITE_INVALID");
  assert(target.length === 1, "TARGET_NOT_EXACT");
  const row = target[0];
  assert(row.species_id === targetId, "TARGET_ID_MISMATCH");
  assert(row.korean_name === "참홍어" && row.slug === "mottled-skate", "TARGET_NAME_OR_SLUG_MISMATCH");
  assert(row.scientific_name === expectedBefore, "TARGET_CURRENT_SCIENTIFIC_MISMATCH");
  const sources = sourceMap(remote);
  const relations = remote.relations.filter((item) => item.species_id === targetId && !item.archived_at);
  const nifsRelations = relations.filter((item) => sources.get(item.source_record_id)?.source_provider === "NIFS" && sources.get(item.source_record_id)?.source_id === nifsSourceId);
  const mbrisRelations = relations.filter((item) => sources.get(item.source_record_id)?.source_provider === "MBRIS" && item.mbris_source_id === mbrisSourceId);
  const aliases = remote.aliases.filter((item) => item.species_id === targetId && !item.archived_at);
  const lineage = remote.logs.filter((item) => item.entity_id === targetId);
  const collisions = {
    acceptedCanonicalOther: remote.species.filter((item) => item.species_id !== targetId && normalize(item.scientific_name) === normalize(expectedAfter)).length,
    acceptedNormalizedOther: remote.species.filter((item) => item.species_id !== targetId && normalize(item.normalized_scientific_name) === normalize(expectedAfter)).length,
    previousAliasOther: remote.aliases.filter((item) => item.species_id !== targetId && !item.archived_at && normalize(item.normalized_alias || item.alias_name) === normalize(expectedBefore)).length,
    acceptedAliasOther: remote.aliases.filter((item) => item.species_id !== targetId && !item.archived_at && normalize(item.normalized_alias || item.alias_name) === normalize(expectedAfter)).length,
    slugOther: remote.species.filter((item) => item.species_id !== targetId && item.slug === "mottled-skate").length,
  };
  assert(Object.values(collisions).every((count) => count === 0), "PREWRITE_COLLISION");
  assert(nifsRelations.length === 1, "NIFS_RELATION_NOT_EXACT");
  assert(mbrisRelations.length === 0, "MBRIS_RELATION_ALREADY_PRESENT_PREWRITE");
  assert(aliases.filter((item) => normalize(item.normalized_alias || item.alias_name) === normalize(expectedBefore)).length === 0, "PREVIOUS_ALIAS_ALREADY_PRESENT_PREWRITE");
  assert(lineage.filter((item) => item.change_type === changeType).length === 0, "UPDATE_LINEAGE_ALREADY_PRESENT_PREWRITE");
  return {
    speciesTotal: remote.species.length,
    target: {
      speciesId: row.species_id,
      koreanName: row.korean_name,
      scientificName: row.scientific_name,
      slug: row.slug,
      publishStatus: row.publish_status,
      reviewStatus: row.fact_review_status,
    },
    collisions,
    nifsRelationCount: nifsRelations.length,
    mbrisRelationCount: mbrisRelations.length,
    aliasCount: aliases.length,
    lineageCount: lineage.length,
    fingerprints: remote.fingerprints,
    nonTargetSpeciesHash: hash(remote.species.filter((item) => item.species_id !== targetId)),
    protectedSixHash: hash(snapshotProtected(remote)),
  };
}

function adminDetailSql() {
  return String.raw`
begin read only;
select jsonb_build_object(
  'speciesTotal',(select count(*) from public.fish_species where archived_at is null),
  'targetCount',(select count(*) from public.fish_species where id='${targetId}'::uuid and archived_at is null),
  'scientificName',(select scientific_name from public.fish_species where id='${targetId}'::uuid),
  'koreanName',(select korean_name from public.fish_species where id='${targetId}'::uuid),
  'slug',(select slug from public.fish_species where id='${targetId}'::uuid),
  'version',(select version from public.fish_species where id='${targetId}'::uuid),
  'officialFactsHash',(select md5(official_facts::text) from public.fish_species where id='${targetId}'::uuid),
  'taxonomyHash',(select md5(taxonomy::text) from public.fish_species where id='${targetId}'::uuid),
  'nifsRawRajaPreserved',(select official_facts::text like '%Raja pulchra%' from public.fish_species where id='${targetId}'::uuid)
)::text;
commit;`;
}

function updateSql() {
  return String.raw`
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';

select id from public.fish_species where id='${targetId}'::uuid for update;

do $precheck$
declare v_name text;
begin
  if (select count(*) from public.fish_species where archived_at is null) <> 1258 then raise exception 'MOTTLED_SKATE_SPECIES_TOTAL_INVALID'; end if;
  if (select count(*) from public.fish_species where id='${targetId}'::uuid and korean_name='참홍어' and slug='mottled-skate' and archived_at is null) <> 1 then raise exception 'MOTTLED_SKATE_TARGET_INVALID'; end if;
  select scientific_name into v_name from public.fish_species where id='${targetId}'::uuid;
  if v_name not in ('${expectedBefore}','${expectedAfter}') then raise exception 'MOTTLED_SKATE_CURRENT_NAME_INVALID'; end if;
  if exists (select 1 from public.fish_species where id<>'${targetId}'::uuid and lower(btrim(scientific_name))=lower('${expectedAfter}')) then raise exception 'MOTTLED_SKATE_ACCEPTED_COLLISION'; end if;
  if exists (select 1 from public.fish_aliases where fish_species_id<>'${targetId}'::uuid and archived_at is null and normalized_alias=lower('${expectedBefore}')) then raise exception 'MOTTLED_SKATE_ALIAS_COLLISION'; end if;
  if (select count(*) from public.fish_source_records where source_provider='MBRIS' and source_id='${mbrisCatalogSourceId}' and is_current and archived_at is null) <> 1 then raise exception 'MOTTLED_SKATE_MBRIS_SOURCE_NOT_EXACT'; end if;
  if (select count(*) from public.fish_species_sources r join public.fish_source_records s on s.id=r.source_record_id where r.fish_species_id='${targetId}'::uuid and r.archived_at is null and s.source_provider='NIFS' and s.source_id='${nifsSourceId}') <> 1 then raise exception 'MOTTLED_SKATE_NIFS_RELATION_NOT_EXACT'; end if;
end
$precheck$;

with species_update as (
  update public.fish_species
  set scientific_name='${expectedAfter}', version=version+1
  where id='${targetId}'::uuid and scientific_name='${expectedBefore}'
  returning id
), alias_insert as (
  insert into public.fish_aliases(fish_species_id,alias_name,normalized_alias,alias_type,source_type,review_status)
  select '${targetId}'::uuid,'${expectedBefore}',lower('${expectedBefore}'),'scientific','official','approved'
  where not exists (select 1 from public.fish_aliases where fish_species_id='${targetId}'::uuid and normalized_alias=lower('${expectedBefore}'))
  returning id
), resolved_source as (
  select id from public.fish_source_records where source_provider='MBRIS' and source_id='${mbrisCatalogSourceId}' and is_current and archived_at is null
), relation_insert as (
  insert into public.fish_species_sources(fish_species_id,source_record_id,is_primary,field_precedence,linked_by)
  select '${targetId}'::uuid,s.id,false,jsonb_build_object(
    'mbrisSourceId','${mbrisSourceId}',
    'importMetadata',jsonb_build_object('mbrisSourceId','${mbrisSourceId}','internalId','${internalId}','importBatch','${updateBatch}'),
    'taxonomy','MBRIS_ACCEPTED_NAME','scientificName','MBRIS_ACCEPTED_NAME'
  ),'import_review'
  from resolved_source s
  where not exists (select 1 from public.fish_species_sources r where r.fish_species_id='${targetId}'::uuid and r.source_record_id=s.id)
  returning id
), lineage_insert as (
  insert into public.fish_change_logs(entity_type,entity_id,change_type,before_payload,after_payload,source_record_id,actor_type)
  select 'fish_species','${targetId}'::uuid,'${changeType}',
    jsonb_build_object('scientificName','${expectedBefore}','sourceProvider','NIFS','sourceId','${nifsSourceId}','nifsSourceRetained',true),
    jsonb_build_object('scientificName','${expectedAfter}','previousScientificName','${expectedBefore}','reason','taxonomy_genus_reassignment','sourceProvider','MBRIS','sourceId','${mbrisSourceId}','internalId','${internalId}','importBatch','${updateBatch}','nifsSourceRetained',true,'reviewArtifact','docs/MBRIS_MANUAL_TAXONOMY_REVIEW_V1.md'),
    s.id,'importer'
  from resolved_source s
  where not exists (select 1 from public.fish_change_logs l where l.entity_type='fish_species' and l.entity_id='${targetId}'::uuid and l.change_type='${changeType}' and l.after_payload->>'importBatch'='${updateBatch}')
  returning id
)
select jsonb_build_object(
  'speciesUpdated',(select count(*) from species_update),
  'aliasInserted',(select count(*) from alias_insert),
  'relationInserted',(select count(*) from relation_insert),
  'lineageInserted',(select count(*) from lineage_insert)
)::text;

do $verify$
begin
  if (select count(*) from public.fish_species where id='${targetId}'::uuid and korean_name='참홍어' and scientific_name='${expectedAfter}' and slug='mottled-skate' and archived_at is null) <> 1 then raise exception 'MOTTLED_SKATE_POST_IDENTITY_INVALID'; end if;
  if (select count(*) from public.fish_aliases where fish_species_id='${targetId}'::uuid and normalized_alias=lower('${expectedBefore}') and alias_type='scientific' and archived_at is null) <> 1 then raise exception 'MOTTLED_SKATE_ALIAS_NOT_EXACT'; end if;
  if (select count(*) from public.fish_species_sources r join public.fish_source_records s on s.id=r.source_record_id where r.fish_species_id='${targetId}'::uuid and r.archived_at is null and s.source_provider='NIFS' and s.source_id='${nifsSourceId}') <> 1 then raise exception 'MOTTLED_SKATE_NIFS_RELATION_LOST'; end if;
  if (select count(*) from public.fish_species_sources r join public.fish_source_records s on s.id=r.source_record_id where r.fish_species_id='${targetId}'::uuid and r.archived_at is null and s.source_provider='MBRIS' and r.field_precedence->>'mbrisSourceId'='${mbrisSourceId}') <> 1 then raise exception 'MOTTLED_SKATE_MBRIS_RELATION_NOT_EXACT'; end if;
  if (select count(*) from public.fish_change_logs where entity_type='fish_species' and entity_id='${targetId}'::uuid and change_type='${changeType}' and after_payload->>'importBatch'='${updateBatch}') <> 1 then raise exception 'MOTTLED_SKATE_LINEAGE_NOT_EXACT'; end if;
  if (select count(*) from public.fish_species where archived_at is null) <> 1258 then raise exception 'MOTTLED_SKATE_SPECIES_TOTAL_CHANGED'; end if;
end
$verify$;
commit;`;
}

function postcheck(remote, before, beforeDetail, afterDetail) {
  const target = remote.species.filter((item) => item.species_id === targetId);
  const sources = sourceMap(remote);
  const relations = remote.relations.filter((item) => item.species_id === targetId && !item.archived_at);
  const nifsRelations = relations.filter((item) => sources.get(item.source_record_id)?.source_provider === "NIFS" && sources.get(item.source_record_id)?.source_id === nifsSourceId);
  const mbrisRelations = relations.filter((item) => sources.get(item.source_record_id)?.source_provider === "MBRIS" && item.mbris_source_id === mbrisSourceId);
  const aliases = remote.aliases.filter((item) => item.species_id === targetId && !item.archived_at && normalize(item.normalized_alias || item.alias_name) === normalize(expectedBefore));
  const lineage = remote.logs.filter((item) => item.entity_id === targetId && item.change_type === changeType && item.import_batch === updateBatch);
  const result = {
    speciesTotal: remote.species.length,
    targetCount: target.length,
    target: target[0] || null,
    aliasCount: aliases.length,
    nifsRelationCount: nifsRelations.length,
    mbrisRelationCount: mbrisRelations.length,
    lineageCount: lineage.length,
    duplicateSpecies: remote.species.filter((item) => item.korean_name === "참홍어" || item.slug === "mottled-skate").length - 1,
    duplicateAlias: Math.max(0, aliases.length - 1),
    duplicateRelation: Math.max(0, mbrisRelations.length - 1),
    publishReviewChanged: target[0]?.publish_status !== before.target.publishStatus || target[0]?.fact_review_status !== before.target.reviewStatus,
    schemaChanged: JSON.stringify(remote.fingerprints) !== JSON.stringify(before.fingerprints),
    rlsChanged: remote.fingerprints.policies !== before.fingerprints.policies,
    nonTargetSpeciesChanged: hash(remote.species.filter((item) => item.species_id !== targetId)) !== before.nonTargetSpeciesHash,
    protectedSixChanged: hash(snapshotProtected(remote)) !== before.protectedSixHash,
    officialFactsChanged: beforeDetail.officialFactsHash !== afterDetail.officialFactsHash,
    taxonomyChanged: beforeDetail.taxonomyHash !== afterDetail.taxonomyHash,
    nifsRawRajaPreserved: afterDetail.nifsRawRajaPreserved,
    versionBefore: beforeDetail.version,
    versionAfter: afterDetail.version,
    fingerprints: remote.fingerprints,
  };
  result.pass = result.speciesTotal === 1258
    && result.targetCount === 1
    && result.target.korean_name === "참홍어"
    && result.target.scientific_name === expectedAfter
    && result.target.slug === "mottled-skate"
    && result.aliasCount === 1
    && result.nifsRelationCount === 1
    && result.mbrisRelationCount === 1
    && result.lineageCount === 1
    && result.duplicateSpecies === 0
    && result.duplicateAlias === 0
    && result.duplicateRelation === 0
    && !result.publishReviewChanged
    && !result.schemaChanged
    && !result.rlsChanged
    && !result.nonTargetSpeciesChanged
    && !result.protectedSixChanged
    && !result.officialFactsChanged
    && !result.taxonomyChanged
    && result.nifsRawRajaPreserved
    && result.versionAfter === result.versionBefore + 1;
  return result;
}

function safeError(error) {
  return String(error?.message || error)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/password\s*=\s*\S+/gi, "password=[REDACTED]")
    .slice(0, 800);
}

function writeReports({ generatedAt, approval, before, beforeDetail, firstRun, rerun, post }) {
  writeJson(updateReportPath, {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status: post.pass ? "MOTTLED_SKATE_CANONICAL_UPDATE_PASS" : "MOTTLED_SKATE_CANONICAL_UPDATE_FAIL",
    approval,
    prewrite: before,
    beforeDetail,
    update: firstRun,
    transactionCommitted: post.pass,
    speciesInserted: 0,
    productionWrites: 0,
  });
  writeJson(rerunReportPath, {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status: Object.values(rerun).every((value) => value === 0) ? "MOTTLED_SKATE_UPDATE_IDEMPOTENCY_PASS" : "MOTTLED_SKATE_UPDATE_IDEMPOTENCY_FAIL",
    insertedOrUpdated: rerun,
  });
  writeJson(postcheckPath, {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status: post.pass ? "MOTTLED_SKATE_POSTCHECK_PASS" : "MOTTLED_SKATE_POSTCHECK_FAIL",
    ...post,
    schemaWrites: 0,
    rlsWrites: 0,
    roleAclWrites: 0,
    otherReviewRecordWrites: 0,
    nonFishWrites: 0,
  });
  fs.writeFileSync(outputDocPath, `# MBRIS Mottled Skate Canonical Update V1\n\n- Generated: ${generatedAt}\n- Environment: staging (${projectRef})\n- Status: ${post.pass ? "MOTTLED_SKATE_CANONICAL_UPDATE_PASS" : "MOTTLED_SKATE_CANONICAL_UPDATE_FAIL"}\n\n## Before\n\n- Species ID: ${targetId}\n- Korean name: ${before.target.koreanName}\n- Scientific name: ${before.target.scientificName}\n- Slug: ${before.target.slug}\n- State: ${before.target.publishStatus}/${before.target.reviewStatus}\n- Species total: ${before.speciesTotal}\n\n## After\n\n- Scientific name: ${post.target.scientific_name}\n- Korean name: ${post.target.korean_name}\n- Slug: ${post.target.slug}\n- Species total: ${post.speciesTotal}\n- Version: ${post.versionBefore} -> ${post.versionAfter}\n\n## Alias and Provenance\n\n- Scientific alias \`${expectedBefore}\`: ${post.aliasCount}\n- NIFS relation retained: ${post.nifsRelationCount}\n- MBRIS relation: ${post.mbrisRelationCount}\n- Taxonomy update lineage: ${post.lineageCount}\n- NIFS raw \`${expectedBefore}\` preserved: ${post.nifsRawRajaPreserved}\n- Original official facts changed: ${post.officialFactsChanged}\n\n## Evidence\n\nThe accepted name \`${expectedAfter}\` and former combination \`${expectedBefore}\` were approved in \`docs/MBRIS_MANUAL_TAXONOMY_REVIEW_V1.md\`. The update preserves the NIFS source relation and raw source facts while linking the existing canonical row to the MBRIS catalog record.\n\n## Idempotency\n\n- Second-run species update: ${rerun.speciesUpdated}\n- Second-run alias insert: ${rerun.aliasInserted}\n- Second-run relation insert: ${rerun.relationInserted}\n- Second-run lineage insert: ${rerun.lineageInserted}\n\n## Security\n\n- Publish/review changed: ${post.publishReviewChanged}\n- RLS changed: ${post.rlsChanged}\n- Schema changed: ${post.schemaChanged}\n- Role/ACL changed: false\n- Other species changed: ${post.nonTargetSpeciesChanged}\n- Other six review records changed: ${post.protectedSixChanged}\n- Production writes: 0\n\nNo DSN, password, token, or credential is stored in these artifacts.\n`, "utf8");
}

function main() {
  const approval = validateApprovalArtifacts();
  const beforeRemote = loadAudit();
  const before = prewrite(beforeRemote);
  assert(process.env.PGPASSWORD, "ADMIN_PASSWORD_MISSING");
  let beforeDetail;
  let afterDetail;
  let firstRun;
  let rerun;
  try {
    [beforeDetail] = runAdmin(adminDetailSql());
    assert(beforeDetail.speciesTotal === 1258 && beforeDetail.targetCount === 1, "ADMIN_PREWRITE_INVALID");
    assert(beforeDetail.scientificName === expectedBefore && beforeDetail.koreanName === "참홍어" && beforeDetail.slug === "mottled-skate", "ADMIN_TARGET_IDENTITY_INVALID");
    assert(beforeDetail.nifsRawRajaPreserved, "NIFS_RAW_PROVENANCE_NOT_FOUND");
    [firstRun] = runAdmin(updateSql());
    assert(firstRun.speciesUpdated === 1 && firstRun.aliasInserted === 1 && firstRun.relationInserted === 1 && firstRun.lineageInserted === 1, "FIRST_RUN_COUNT_MISMATCH");
    [rerun] = runAdmin(updateSql());
    assert(Object.values(rerun).every((value) => value === 0), "IDEMPOTENCY_RERUN_FAILED");
    [afterDetail] = runAdmin(adminDetailSql());
  } finally {
    delete process.env.PGPASSWORD;
  }
  const afterRemote = loadAudit();
  const post = postcheck(afterRemote, before, beforeDetail, afterDetail);
  assert(post.pass, "POSTCHECK_FAILED");
  const generatedAt = new Date().toISOString();
  writeReports({ generatedAt, approval, before, beforeDetail, firstRun, rerun, post });
  console.log(JSON.stringify({
    status: "MOTTLED_SKATE_CANONICAL_UPDATE_PASS",
    speciesId: targetId,
    speciesTotal: post.speciesTotal,
    firstRun,
    rerun,
    nifsRelation: post.nifsRelationCount,
    mbrisRelation: post.mbrisRelationCount,
    alias: post.aliasCount,
    lineage: post.lineageCount,
    nifsRawPreserved: post.nifsRawRajaPreserved,
    schemaChanged: post.schemaChanged,
    rlsChanged: post.rlsChanged,
    otherSpeciesChanged: post.nonTargetSpeciesChanged,
  }));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ status: "MOTTLED_SKATE_CANONICAL_UPDATE_FAIL", reason: safeError(error) }));
    process.exitCode = 1;
  }
}

module.exports = { adminDetailSql, updateSql, prewrite, postcheck };

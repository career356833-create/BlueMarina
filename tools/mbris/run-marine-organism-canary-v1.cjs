const fs = require("node:fs");
const path = require("node:path");
const importer = require("./import-marine-organisms.cjs");
const db = require("./run-canary-import-v1.cjs");

const root = path.resolve(__dirname, "..", "..");
const planPath = path.join(root, "reports", "mbris", "marine-organism-canary-plan-v2.json");
const firstReportPath = path.join(root, "reports", "mbris", "marine-organism-canary-import-v1.json");
const rerunReportPath = path.join(root, "reports", "mbris", "marine-organism-canary-rerun-v1.json");
const postcheckPath = path.join(root, "reports", "mbris", "marine-organism-canary-postcheck-v1.json");
const projectRef = "mlfvpaikfpjrgrhwlrjn";
const importBatch = "marine-organism-canary-v1";
const expectedNames = [
  "극동곤쟁이", "네마디안다리곤쟁이", "꼬마오징어", "꼬마꼴뚜기", "컵산호갯민숭이",
  "별무리갯민숭이", "꼬마말발조개", "곧은줄꽃잎조개", "분지성게", "하드윅분지성게",
];
const excludedCrossDomainScientific = new Set([
  "Amphioctopus fangsiao", "Chionoecetes japonicus", "Chionoecetes opilio",
]);

function validatePlan(plan) {
  if (plan.status !== "MARINE_ORGANISM_CANARY_PLAN_READY" || plan.plannedCount !== 10 || plan.rows.length !== 10) {
    throw new Error("CANARY_PLAN_INVALID");
  }
  if (JSON.stringify(plan.rows.map((row) => row.koreanName)) !== JSON.stringify(expectedNames)) {
    throw new Error("CANARY_NAME_SET_CHANGED");
  }
  if (new Set(plan.rows.map((row) => row.canonicalId)).size !== 10 || new Set(plan.rows.map((row) => row.internalId)).size !== 10) {
    throw new Error("CANARY_ID_DUPLICATE");
  }
  if (new Set(plan.rows.map((row) => row.sourceRecordId)).size !== 1 || plan.rows[0].sourceRecordId !== plan.sharedSourceRecord.sourceRecordId) {
    throw new Error("CANARY_SHARED_SOURCE_INVALID");
  }
  if (plan.rows.some((row) => excludedCrossDomainScientific.has(row.scientificName))) {
    throw new Error("CROSS_DOMAIN_REVIEW_ROW_IN_CANARY");
  }
  const expectedGroups = {CRUSTACEAN: 2, CEPHALOPOD: 2, GASTROPOD: 2, BIVALVE: 2, ECHINODERM: 2};
  if (JSON.stringify(plan.groupCounts) !== JSON.stringify(expectedGroups)) throw new Error("CANARY_GROUP_DISTRIBUTION_INVALID");
  if (plan.rows.some((row) => row.publishStatus !== "draft" || row.reviewStatus !== "pending")) {
    throw new Error("CANARY_STATE_INVALID");
  }
  return plan.rows.map((row) => ({
    ...row,
    changeLogId: importer.uuidV5(`marine-organism-change-log:${importBatch}:${row.canonicalId}`),
  }));
}

function auditSql() {
  return String.raw`
begin read only;
select jsonb_build_object(
  'identity',jsonb_build_object(
    'currentUser',current_user,
    'readOnly',current_setting('transaction_read_only'),
    'bypassRls',(select rolbypassrls from pg_catalog.pg_roles where rolname=current_user)
  ),
  'organisms',(select coalesce(jsonb_agg(to_jsonb(o) order by o.internal_id),'[]'::jsonb) from public.marine_organism_readonly_audit_organisms_v1() o),
  'sourceRecords',(select coalesce(jsonb_agg(to_jsonb(s) order by s.source_provider,s.source_id),'[]'::jsonb) from public.marine_organism_readonly_audit_source_records_v1() s),
  'sourceRelations',(select coalesce(jsonb_agg(to_jsonb(r) order by r.organism_id),'[]'::jsonb) from public.marine_organism_readonly_audit_sources_v1() r),
  'aliases',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.marine_organism_readonly_audit_aliases_v1() a),
  'slugAliases',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.marine_organism_readonly_audit_slug_aliases_v1() a),
  'changeLogs',(select coalesce(jsonb_agg(to_jsonb(l) order by l.internal_id),'[]'::jsonb) from public.marine_organism_readonly_audit_change_logs_v1() l),
  'fish',jsonb_build_object(
    'species',(select count(*) from public.fish_readonly_audit_species_v1()),
    'nifs',(select count(*) from public.fish_readonly_audit_species_v1() where source_provider='NIFS'),
    'mbrisSpecies',(select count(*) from public.fish_readonly_audit_species_v1() where source_provider='MBRIS'),
    'mbrisRelations',(select count(*) from public.fish_readonly_audit_species_sources_v1() where mbris_source_id is not null),
    'fingerprints',jsonb_build_object(
      'policies',(select md5(coalesce(string_agg(c.relname||':'||p.polname||':'||p.polcmd::text||':'||coalesce(pg_catalog.pg_get_expr(p.polqual,p.polrelid),'')||':'||coalesce(pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid),''),E'\n' order by c.relname,p.polname),'')) from pg_catalog.pg_policy p join pg_catalog.pg_class c on c.oid=p.polrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%'),
      'constraints',(select md5(coalesce(string_agg(c.relname||':'||con.conname||':'||pg_catalog.pg_get_constraintdef(con.oid,true),E'\n' order by c.relname,con.conname),'')) from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%'),
      'indexes',(select md5(coalesce(string_agg(c.relname||':'||i.relname||':'||pg_catalog.pg_get_indexdef(i.oid),E'\n' order by c.relname,i.relname),'')) from pg_catalog.pg_index x join pg_catalog.pg_class c on c.oid=x.indrelid join pg_catalog.pg_class i on i.oid=x.indexrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%'),
      'triggers',(select md5(coalesce(string_agg(c.relname||':'||t.tgname||':'||pg_catalog.pg_get_triggerdef(t.oid,true),E'\n' order by c.relname,t.tgname),'')) from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%' and not t.tgisinternal)
    )
  ),
  'marineFingerprints',jsonb_build_object(
    'policies',(select md5(coalesce(string_agg(c.relname||':'||p.polname||':'||p.polcmd::text||':'||coalesce(pg_catalog.pg_get_expr(p.polqual,p.polrelid),'')||':'||coalesce(pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid),''),E'\n' order by c.relname,p.polname),'')) from pg_catalog.pg_policy p join pg_catalog.pg_class c on c.oid=p.polrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'marine_organism%'),
    'constraints',(select md5(coalesce(string_agg(c.relname||':'||con.conname||':'||pg_catalog.pg_get_constraintdef(con.oid,true),E'\n' order by c.relname,con.conname),'')) from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'marine_organism%')
  )
)::text;
commit;`;
}

function inventory(remote) {
  return {
    sourceRecords: remote.sourceRecords.length,
    organisms: remote.organisms.length,
    sourceRelations: remote.sourceRelations.length,
    changeLogs: remote.changeLogs.length,
    aliases: remote.aliases.length,
    slugAliases: remote.slugAliases.length,
  };
}

function assertAuditor(remote) {
  if (remote.identity.currentUser !== "blue_marina_readonly_auditor" || remote.identity.readOnly !== "on" || remote.identity.bypassRls !== false) {
    throw new Error("AUDITOR_IDENTITY_INVALID");
  }
}

function prewriteCheck(remote, rows, source) {
  assertAuditor(remote);
  const counts = inventory(remote);
  if (Object.values(counts).some((count) => count !== 0)) throw new Error("MARINE_CANARY_PREWRITE_NOT_EMPTY");
  if (remote.fish.species !== 1258 || remote.fish.nifs !== 8 || remote.fish.mbrisSpecies !== 1250 || remote.fish.mbrisRelations !== 1253) {
    throw new Error("FISH_BASELINE_DRIFT");
  }
  const collisionSets = {
    internalId: new Set(remote.organisms.map((row) => row.internal_id)),
    uuid: new Set(remote.organisms.map((row) => row.organism_id)),
    scientific: new Set(remote.organisms.map((row) => row.scientific_name)),
    normalizedScientific: new Set(remote.organisms.map((row) => row.normalized_scientific_name)),
    slug: new Set(remote.organisms.map((row) => row.slug)),
    sourceId: new Set(remote.sourceRecords.map((row) => `${row.source_provider}:${row.source_id}`)),
  };
  const collisions = {internalId: 0, uuid: 0, scientific: 0, normalizedScientific: 0, slug: 0, sourceId: 0};
  for (const row of rows) {
    if (collisionSets.internalId.has(row.internalId)) collisions.internalId += 1;
    if (collisionSets.uuid.has(row.canonicalId)) collisions.uuid += 1;
    if (collisionSets.scientific.has(row.scientificName)) collisions.scientific += 1;
    if (collisionSets.normalizedScientific.has(row.normalizedScientificName)) collisions.normalizedScientific += 1;
    if (collisionSets.slug.has(row.slug)) collisions.slug += 1;
  }
  if (collisionSets.sourceId.has(`${source.sourceProvider}:${source.sourceId}`)) collisions.sourceId += 1;
  if (Object.values(collisions).some((count) => count !== 0)) throw new Error("MARINE_CANARY_PREWRITE_COLLISION");
  return {counts, collisions};
}

function payloadRows(rows) {
  return rows.map((row) => ({
    canonical_id: row.canonicalId,
    relation_id: row.sourceRelationId,
    change_log_id: row.changeLogId,
    internal_id: row.internalId,
    slug: row.slug,
    korean_name: row.koreanName,
    scientific_name: row.scientificName,
    normalized_scientific_name: row.normalizedScientificName,
    organism_group: row.organismGroup,
    taxonomy: row.taxonomy,
    row_source_id: row.sourceId,
    lineage: row.lineage,
  }));
}

function importSql(rows, source) {
  const payload = db.sqlLiteralJson(payloadRows(rows));
  const sourceSummary = db.sqlLiteralJson({
    sourceProvider: source.sourceProvider,
    catalog: "national marine species catalog",
    candidateReport: "reports/mbris/mbris-marine-organism-candidates-v1.json",
    canaryPlan: "reports/mbris/marine-organism-canary-plan-v2.json",
    canaryCount: 10,
    importBatch,
  });
  const sourceId = source.sourceRecordId;
  return String.raw`
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';

insert into public.marine_organism_source_records (
  id,source_provider,source_id,source_url,raw_storage_path,raw_payload_summary,content_hash,
  parser_version,crawl_status,fetched_at,last_seen_at,is_current
) values (
  '${sourceId}'::uuid,'${source.sourceProvider}','${source.sourceId}','${source.sourceUrl}',
  '${source.rawStoragePath}',${sourceSummary},'${source.contentHash}','${source.parserVersion}',
  '${source.crawlStatus}','${source.fetchedAt}'::timestamptz,'${source.fetchedAt}'::timestamptz,true
)
on conflict (id) do nothing;

with input as (
  select * from jsonb_to_recordset(${payload}) as x(
    canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,
    scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb
  )
)
insert into public.marine_organisms (
  id,internal_id,slug,korean_name,scientific_name,normalized_scientific_name,organism_group,
  phylum,taxonomic_class,taxonomic_order,family,genus,taxonomy,review_status,publish_status
)
select canonical_id,internal_id,slug,korean_name,scientific_name,normalized_scientific_name,organism_group,
  taxonomy->>'phylum',taxonomy->>'class',taxonomy->>'order',taxonomy->>'family',taxonomy->>'genus',
  taxonomy,'pending','draft'
from input
on conflict (id) do nothing;

with input as (
  select * from jsonb_to_recordset(${payload}) as x(
    canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,
    scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb
  )
)
insert into public.marine_organism_sources (
  id,marine_organism_id,source_record_id,is_primary,field_precedence,lineage,linked_by
)
select relation_id,canonical_id,'${sourceId}'::uuid,true,
  jsonb_build_object('rowSourceId',row_source_id,'strategy','mbris_catalog_row'),
  lineage || jsonb_build_object('sourceId',row_source_id,'importBatch','${importBatch}'),
  'import_review'
from input
on conflict (id) do nothing;

with input as (
  select * from jsonb_to_recordset(${payload}) as x(
    canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,
    scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb
  )
)
insert into public.marine_organism_change_logs (
  id,entity_type,entity_id,change_type,after_payload,source_record_id,actor_type
)
select change_log_id,'marine_organism',canonical_id,'canary_import',
  jsonb_build_object(
    'sourceProvider','${source.sourceProvider}','sourceId',row_source_id,'internalId',internal_id,
    'importBatch','${importBatch}','normalizedScientificName',normalized_scientific_name,
    'koreanName',korean_name,'scientificName',scientific_name,'taxonomy',taxonomy
  ),'${sourceId}'::uuid,'importer'
from input
on conflict (id) do nothing;

do $validate$
declare
  payload constant jsonb := ${payload};
begin
  if (select count(*) from public.marine_organism_source_records) <> 1
    or (select count(*) from public.marine_organisms) <> 10
    or (select count(*) from public.marine_organism_sources) <> 10
    or (select count(*) from public.marine_organism_change_logs) <> 10
    or (select count(*) from public.marine_organism_aliases) <> 0
    or (select count(*) from public.marine_organism_slug_aliases) <> 0 then
    raise exception 'CANARY_TOTAL_VALIDATION_FAILED';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(payload) as p(
      canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,
      scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb
    )
    left join public.marine_organisms o on o.id=p.canonical_id
    left join public.marine_organism_sources r on r.id=p.relation_id
    left join public.marine_organism_change_logs l on l.id=p.change_log_id
    where o.id is null or o.internal_id<>p.internal_id or o.slug<>p.slug or o.korean_name<>p.korean_name
      or o.scientific_name<>p.scientific_name or o.normalized_scientific_name<>p.normalized_scientific_name
      or o.organism_group<>p.organism_group or o.taxonomy<>p.taxonomy
      or o.review_status<>'pending' or o.publish_status<>'draft'
      or r.id is null or r.marine_organism_id<>p.canonical_id or r.source_record_id<>'${sourceId}'::uuid
      or r.lineage->>'sourceId'<>p.row_source_id or r.lineage->>'importBatch'<>'${importBatch}'
      or l.id is null or l.entity_id<>p.canonical_id or l.source_record_id<>'${sourceId}'::uuid
      or l.after_payload->>'sourceId'<>p.row_source_id or l.after_payload->>'importBatch'<>'${importBatch}'
  ) then
    raise exception 'CANARY_PAYLOAD_VALIDATION_FAILED';
  end if;
  if exists (
    select organism_group
    from public.marine_organisms
    group by organism_group
    having count(*)<>2
  ) or (select count(distinct organism_group) from public.marine_organisms)<>5 then
    raise exception 'CANARY_GROUP_VALIDATION_FAILED';
  end if;
end
$validate$;

commit;`;
}

function publicVisibilitySql() {
  return String.raw`
begin read only;
set local role anon;
select jsonb_build_object('publicVisible',count(*))::text from public.marine_organisms;
rollback;`;
}

function validatePostcheck(remote, rows, source, baseline) {
  assertAuditor(remote);
  const counts = inventory(remote);
  const expected = {sourceRecords: 1, organisms: 10, sourceRelations: 10, changeLogs: 10, aliases: 0, slugAliases: 0};
  if (JSON.stringify(counts) !== JSON.stringify(expected)) throw new Error("CANARY_POSTCHECK_COUNT_INVALID");
  if (remote.fish.species !== 1258 || remote.fish.nifs !== 8 || remote.fish.mbrisSpecies !== 1250 || remote.fish.mbrisRelations !== 1253) {
    throw new Error("FISH_POSTCHECK_DRIFT");
  }
  if (JSON.stringify(remote.fish.fingerprints) !== JSON.stringify(baseline.fish.fingerprints)) throw new Error("FISH_FINGERPRINT_DRIFT");
  if (JSON.stringify(remote.marineFingerprints) !== JSON.stringify(baseline.marineFingerprints)) throw new Error("MARINE_SCHEMA_RLS_DRIFT");
  const expectedIds = new Set(rows.map((row) => row.internalId));
  if (remote.organisms.some((row) => !expectedIds.has(row.internal_id))) throw new Error("UNEXPECTED_MARINE_ORGANISM");
  if (remote.organisms.some((row) => row.publish_status !== "draft" || row.review_status !== "pending")) throw new Error("CANARY_PUBLICATION_STATE_INVALID");
  if (remote.sourceRecords[0].source_record_id !== source.sourceRecordId) throw new Error("CANARY_SOURCE_ID_INVALID");
  const groups = Object.fromEntries(["CRUSTACEAN","CEPHALOPOD","GASTROPOD","BIVALVE","ECHINODERM"].map((group) => [group, remote.organisms.filter((row) => row.organism_group === group).length]));
  if (Object.values(groups).some((count) => count !== 2)) throw new Error("CANARY_GROUP_POSTCHECK_INVALID");
  return {counts, groups};
}

function safeRows(remote) {
  return remote.organisms.map((row) => ({
    organismId: row.organism_id,
    internalId: row.internal_id,
    slug: row.slug,
    koreanName: row.korean_name,
    scientificName: row.scientific_name,
    organismGroup: row.organism_group,
    reviewStatus: row.review_status,
    publishStatus: row.publish_status,
  }));
}

function delta(before, after) {
  const a = inventory(before);
  const b = inventory(after);
  return Object.fromEntries(Object.keys(a).map((key) => [key, b[key] - a[key]]));
}

function main() {
  let stage = "LOAD_PLAN";
  try {
    if (!process.argv.includes("--execute-canary") || !process.argv.includes("--approval=MARINE_ORGANISM_CANARY_IMPORT")) {
      throw new Error("EXPLICIT_CANARY_APPROVAL_REQUIRED");
    }
    if (!process.env.PGPASSWORD) throw new Error("ADMIN_PASSWORD_MISSING");
    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const rows = validatePlan(plan);
    const source = plan.sharedSourceRecord;
    const auditEnv = db.readEnv(db.auditEnvPath);
    const auditUrl = auditEnv.FISH_SUPABASE_AUDIT_DATABASE_URL;
    if (!auditUrl) throw new Error("AUDITOR_URL_MISSING");

    stage = "PREWRITE";
    const [before] = db.runAuditor(auditSql(), auditUrl);
    const prewrite = prewriteCheck(before, rows, source);

    stage = "FIRST_IMPORT";
    db.runAdmin(importSql(rows, source));
    const [afterFirst] = db.runAuditor(auditSql(), auditUrl);
    const firstPostcheck = validatePostcheck(afterFirst, rows, source, before);
    const [firstPublic] = db.runAdmin(publicVisibilitySql());
    if (Number(firstPublic.publicVisible) !== 0) throw new Error("MARINE_CANARY_SECURITY_FAIL");
    const firstDelta = delta(before, afterFirst);
    const expectedFirst = {sourceRecords: 1, organisms: 10, sourceRelations: 10, changeLogs: 10, aliases: 0, slugAliases: 0};
    if (JSON.stringify(firstDelta) !== JSON.stringify(expectedFirst)) throw new Error("FIRST_IMPORT_DELTA_INVALID");

    stage = "IDEMPOTENCY_RERUN";
    db.runAdmin(importSql(rows, source));
    const [afterRerun] = db.runAuditor(auditSql(), auditUrl);
    const rerunPostcheck = validatePostcheck(afterRerun, rows, source, before);
    const [rerunPublic] = db.runAdmin(publicVisibilitySql());
    if (Number(rerunPublic.publicVisible) !== 0) throw new Error("MARINE_CANARY_SECURITY_FAIL");
    const rerunDelta = delta(afterFirst, afterRerun);
    if (Object.values(rerunDelta).some((count) => count !== 0)) throw new Error("IDEMPOTENCY_RERUN_INSERTED_ROWS");

    const generatedAt = new Date().toISOString();
    db.writeJson(firstReportPath, {
      reportVersion: "v1", generatedAt, status: "MARINE_ORGANISM_CANARY_IMPORT_PASS",
      environment: "staging", projectRef, prewrite, transactionCommitted: true,
      inserted: firstDelta, totalInserted: Object.values(firstDelta).reduce((sum, count) => sum + count, 0),
      groups: firstPostcheck.groups, publicVisible: Number(firstPublic.publicVisible), auditVisible: afterFirst.organisms.length,
      rows: safeRows(afterFirst), unexpectedWrites: 0, fishWrites: 0, productionWrites: 0,
    });
    db.writeJson(rerunReportPath, {
      reportVersion: "v1", generatedAt, status: "MARINE_ORGANISM_CANARY_RERUN_PASS",
      environment: "staging", projectRef, inserted: rerunDelta,
      existing: rerunPostcheck.counts, publicVisible: Number(rerunPublic.publicVisible), duplicates: 0,
      fishWrites: 0, productionWrites: 0,
    });
    db.writeJson(postcheckPath, {
      reportVersion: "v1", generatedAt, status: "MARINE_ORGANISM_CANARY_IMPORT_PASS",
      environment: "staging", projectRef, inventory: rerunPostcheck.counts, groups: rerunPostcheck.groups,
      publicVisible: 0, auditVisible: 10, draftPending: 10, duplicates: 0,
      fishBefore: before.fish, fishAfter: afterRerun.fish, fishChanged: false,
      marineFingerprintsBefore: before.marineFingerprints, marineFingerprintsAfter: afterRerun.marineFingerprints,
      marineSchemaOrRlsChanged: false,
      excludedWrites: {remainingReady: 0, review: 0, outOfScope: 0, crossDomainReview: 0},
      readyForFullMarineOrganismImport: true,
    });
    console.log(JSON.stringify({
      status: "MARINE_ORGANISM_CANARY_IMPORT_PASS", inserted: firstDelta, rerunInserted: rerunDelta,
      inventory: rerunPostcheck.counts, groups: rerunPostcheck.groups, publicVisible: 0,
      auditVisible: 10, fishSpecies: afterRerun.fish.species, databaseWrites: 31,
    }, null, 2));
  } catch (error) {
    throw new Error(`${stage}:${error.message}`);
  } finally {
    delete process.env.PGPASSWORD;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({status: "MARINE_ORGANISM_CANARY_IMPORT_FAIL", reason: error.message}));
    process.exitCode = 1;
  }
}

module.exports = {validatePlan, auditSql, inventory, prewriteCheck, payloadRows, importSql, publicVisibilitySql, validatePostcheck, delta};

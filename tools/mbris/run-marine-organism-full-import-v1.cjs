const fs = require("node:fs");
const path = require("node:path");
const importer = require("./import-marine-organisms.cjs");
const db = require("./run-canary-import-v1.cjs");

const root = path.resolve(__dirname, "..", "..");
const dryRunPath = path.join(root, "reports", "mbris", "marine-organism-import-dry-run-v2.json");
const canaryPlanPath = path.join(root, "reports", "mbris", "marine-organism-canary-plan-v2.json");
const firstReportPath = path.join(root, "reports", "mbris", "marine-organism-full-import-v1.json");
const batchesReportPath = path.join(root, "reports", "mbris", "marine-organism-full-import-batches-v1.json");
const rerunReportPath = path.join(root, "reports", "mbris", "marine-organism-full-import-rerun-v1.json");
const postcheckReportPath = path.join(root, "reports", "mbris", "marine-organism-full-import-postcheck-v1.json");
const crossDomainReportPath = path.join(root, "reports", "mbris", "marine-organism-cross-domain-overlap-v1.json");
const docPath = path.join(root, "docs", "MARINE_ORGANISM_FULL_STAGING_IMPORT_V1.md");
const projectRef = "mlfvpaikfpjrgrhwlrjn";
const importBatch = "marine-organism-full-import-v1";
const batchSize = 100;
const groups = ["CRUSTACEAN", "CEPHALOPOD", "GASTROPOD", "BIVALVE", "ECHINODERM"];
const expectedFinalGroups = {CRUSTACEAN: 1067, CEPHALOPOD: 55, GASTROPOD: 1161, BIVALVE: 506, ECHINODERM: 227};
const expectedRemainingGroups = {CRUSTACEAN: 1065, CEPHALOPOD: 53, GASTROPOD: 1159, BIVALVE: 504, ECHINODERM: 225};
const crossDomainScientific = new Map([
  ["Amphioctopus fangsiao", "CEPHALOPOD"],
  ["Chionoecetes japonicus", "CRUSTACEAN"],
  ["Chionoecetes opilio", "CRUSTACEAN"],
]);

function countBy(rows, selector) {
  const counts = new Map();
  for (const row of rows) {
    const key = selector(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function duplicateCount(rows, selector) {
  return [...countBy(rows, selector).values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
}

function groupCounts(rows) {
  return Object.fromEntries(groups.map((group) => [group, rows.filter((row) => row.organismGroup === group).length]));
}

function loadAdmission(dryRun, canaryPlan) {
  if (dryRun.status !== "MARINE_ORGANISM_IMPORT_DRY_RUN_PASS" || dryRun.mappedCount !== 3016 || dryRun.rows.length !== 3016) {
    throw new Error("FULL_IMPORT_DRY_RUN_INVALID");
  }
  if (canaryPlan.status !== "MARINE_ORGANISM_CANARY_PLAN_READY" || canaryPlan.rows.length !== 10) {
    throw new Error("FULL_IMPORT_CANARY_PLAN_INVALID");
  }
  if (JSON.stringify(groupCounts(dryRun.rows)) !== JSON.stringify(expectedFinalGroups)) throw new Error("FULL_IMPORT_GROUP_TOTAL_INVALID");
  const canaryIds = new Set(canaryPlan.rows.map((row) => row.canonicalId));
  const remaining = dryRun.rows.filter((row) => !canaryIds.has(row.canonicalId));
  if (remaining.length !== 3006 || JSON.stringify(groupCounts(remaining)) !== JSON.stringify(expectedRemainingGroups)) {
    throw new Error("FULL_IMPORT_ADMISSION_COUNT_INVALID");
  }
  const collisionChecks = {
    internalId: duplicateCount(remaining, (row) => row.internalId),
    uuid: duplicateCount(remaining, (row) => row.canonicalId),
    scientific: duplicateCount(remaining, (row) => row.scientificName),
    normalizedScientific: duplicateCount(remaining, (row) => row.normalizedScientificName),
    slug: duplicateCount(remaining, (row) => row.slug),
    sourceExternalId: duplicateCount(remaining, (row) => row.sourceId),
    relationId: duplicateCount(remaining, (row) => row.sourceRelationId),
  };
  if (Object.values(collisionChecks).some(Boolean)) throw new Error("FULL_IMPORT_LOCAL_COLLISION");
  if (remaining.some((row) => row.sourceRecordId !== dryRun.sharedSourceRecord.sourceRecordId)) throw new Error("FULL_IMPORT_SHARED_SOURCE_INVALID");
  if (remaining.some((row) => row.publishStatus !== "draft" || row.reviewStatus !== "pending")) throw new Error("FULL_IMPORT_STATE_INVALID");
  const crossDomain = remaining.filter((row) => crossDomainScientific.has(row.scientificName));
  if (crossDomain.length !== 3 || crossDomain.some((row) => row.organismGroup !== crossDomainScientific.get(row.scientificName))) {
    throw new Error("FULL_IMPORT_CROSS_DOMAIN_SET_INVALID");
  }
  return {
    rows: remaining.map((row) => ({
      ...row,
      changeLogId: importer.uuidV5(`marine-organism-change-log:${importBatch}:${row.canonicalId}`),
      secondaryFlag: crossDomainScientific.has(row.scientificName) ? "CROSS_DOMAIN_TRANSITIONAL_DUPLICATE" : null,
    })),
    source: dryRun.sharedSourceRecord,
    localCollisions: collisionChecks,
  };
}

function fingerprintSql(prefix) {
  const like = `${prefix}%`;
  return String.raw`jsonb_build_object(
    'policies',(select md5(coalesce(string_agg(c.relname||':'||p.polname||':'||p.polcmd::text||':'||coalesce(pg_catalog.pg_get_expr(p.polqual,p.polrelid),'')||':'||coalesce(pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid),''),E'\n' order by c.relname,p.polname),'')) from pg_catalog.pg_policy p join pg_catalog.pg_class c on c.oid=p.polrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like '${like}'),
    'constraints',(select md5(coalesce(string_agg(c.relname||':'||con.conname||':'||pg_catalog.pg_get_constraintdef(con.oid,true),E'\n' order by c.relname,con.conname),'')) from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like '${like}'),
    'indexes',(select md5(coalesce(string_agg(c.relname||':'||i.relname||':'||pg_catalog.pg_get_indexdef(i.oid),E'\n' order by c.relname,i.relname),'')) from pg_catalog.pg_index x join pg_catalog.pg_class c on c.oid=x.indrelid join pg_catalog.pg_class i on i.oid=x.indexrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like '${like}'),
    'triggers',(select md5(coalesce(string_agg(c.relname||':'||t.tgname||':'||pg_catalog.pg_get_triggerdef(t.oid,true),E'\n' order by c.relname,t.tgname),'')) from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like '${like}' and not t.tgisinternal),
    'columns',(select md5(coalesce(string_agg(c.relname||':'||a.attname||':'||pg_catalog.format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text,E'\n' order by c.relname,a.attnum),'')) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like '${like}' and a.attnum>0 and not a.attisdropped),
    'tableAcl',(select md5(coalesce(string_agg(c.relname||':'||coalesce(c.relacl::text,''),E'\n' order by c.relname),'')) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like '${like}'),
    'functionAcl',(select md5(coalesce(string_agg(p.proname||':'||pg_catalog.pg_get_function_identity_arguments(p.oid)||':'||p.prosecdef::text||':'||coalesce(p.proacl::text,'')||':'||coalesce(array_to_string(p.proconfig,','),''),E'\n' order by p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid)),'')) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '${like}')
  )`;
}

function auditSql() {
  return String.raw`
begin read only;
select jsonb_build_object(
  'identity',jsonb_build_object('currentUser',current_user,'readOnly',current_setting('transaction_read_only'),'bypassRls',(select rolbypassrls from pg_catalog.pg_roles where rolname=current_user)),
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
    'crossDomain',(select coalesce(jsonb_agg(to_jsonb(s) order by s.scientific_name),'[]'::jsonb) from public.fish_readonly_audit_species_v1() s where s.scientific_name in ('Amphioctopus fangsiao','Chionoecetes japonicus','Chionoecetes opilio')),
    'fingerprints',${fingerprintSql("fish_")}
  ),
  'marineFingerprints',${fingerprintSql("marine_organism")},
  'auditFunctions',(select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'marine_organism_readonly_audit_%_v1')
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

function validateFishBaseline(remote) {
  if (Number(remote.fish.species) !== 1258 || Number(remote.fish.nifs) !== 8 || Number(remote.fish.mbrisSpecies) !== 1250 || Number(remote.fish.mbrisRelations) !== 1253) {
    throw new Error("FISH_BASELINE_DRIFT");
  }
}

function prewriteCheck(remote, admission, canaryPlan) {
  assertAuditor(remote);
  validateFishBaseline(remote);
  const counts = inventory(remote);
  const expected = {sourceRecords: 1, organisms: 10, sourceRelations: 10, changeLogs: 10, aliases: 0, slugAliases: 0};
  if (JSON.stringify(counts) !== JSON.stringify(expected)) throw new Error("FULL_IMPORT_PREWRITE_INVENTORY_INVALID");
  if (remote.auditFunctions !== 6) throw new Error("MARINE_AUDIT_SURFACE_DRIFT");
  if (remote.sourceRecords.length !== 1 || remote.sourceRecords[0].source_record_id !== admission.source.sourceRecordId || remote.sourceRecords[0].source_id !== admission.source.sourceId || remote.sourceRecords[0].content_hash !== admission.source.contentHash) {
    throw new Error("FULL_IMPORT_SOURCE_INVALID");
  }
  const canaryById = new Map(canaryPlan.rows.map((row) => [row.canonicalId, row]));
  if (remote.organisms.some((row) => {
    const expectedRow = canaryById.get(row.organism_id);
    return !expectedRow || expectedRow.internalId !== row.internal_id || expectedRow.scientificName !== row.scientific_name || expectedRow.slug !== row.slug;
  })) throw new Error("CANARY_BASELINE_DRIFT");

  const remoteSets = {
    internalId: new Set(remote.organisms.map((row) => row.internal_id)),
    uuid: new Set(remote.organisms.map((row) => row.organism_id)),
    scientific: new Set(remote.organisms.map((row) => row.scientific_name)),
    normalizedScientific: new Set(remote.organisms.map((row) => row.normalized_scientific_name)),
    slug: new Set(remote.organisms.map((row) => row.slug)),
    relationId: new Set(remote.sourceRelations.map((row) => row.relation_id)),
    changeLogId: new Set(remote.changeLogs.map((row) => row.change_log_id)),
    sourceExternalId: new Set(remote.changeLogs.map((row) => row.source_id)),
  };
  const collisions = Object.fromEntries(Object.keys(remoteSets).map((key) => [key, 0]));
  for (const row of admission.rows) {
    const values = {
      internalId: row.internalId, uuid: row.canonicalId, scientific: row.scientificName,
      normalizedScientific: row.normalizedScientificName, slug: row.slug, relationId: row.sourceRelationId,
      changeLogId: row.changeLogId, sourceExternalId: row.sourceId,
    };
    for (const [key, value] of Object.entries(values)) if (remoteSets[key].has(value)) collisions[key] += 1;
  }
  if (Object.values(collisions).some(Boolean)) throw new Error("FULL_IMPORT_REMOTE_COLLISION");

  const fishByScientific = new Map(remote.fish.crossDomain.map((row) => [row.scientific_name, row]));
  if (fishByScientific.size !== 3) throw new Error("CROSS_DOMAIN_FISH_IDENTITY_MISSING");
  const crossRows = admission.rows.filter((row) => row.secondaryFlag);
  if (crossRows.length !== 3 || crossRows.some((row) => !fishByScientific.has(row.scientificName))) throw new Error("CROSS_DOMAIN_ADMISSION_INVALID");
  return {counts, collisions, fishCrossDomain: remote.fish.crossDomain};
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
    secondary_flag: row.secondaryFlag,
  }));
}

function batchSql(rows, source, expectedInsert, batchNumber) {
  const payload = db.sqlLiteralJson(payloadRows(rows));
  const expected = expectedInsert ? rows.length : 0;
  return String.raw`
begin;
set local statement_timeout='60s';
set local lock_timeout='5s';
do $batch$
declare
  payload constant jsonb := ${payload};
  inserted_count integer;
begin
  if (select count(*) from public.marine_organism_source_records where id='${source.sourceRecordId}'::uuid and source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null) <> 1 then
    raise exception 'FULL_IMPORT_SOURCE_PRECONDITION_FAILED';
  end if;

  insert into public.marine_organisms(id,internal_id,slug,korean_name,scientific_name,normalized_scientific_name,organism_group,phylum,taxonomic_class,taxonomic_order,family,genus,taxonomy,review_status,publish_status)
  select canonical_id,internal_id,slug,korean_name,scientific_name,normalized_scientific_name,organism_group,
    taxonomy->>'phylum',taxonomy->>'class',taxonomy->>'order',taxonomy->>'family',taxonomy->>'genus',taxonomy,'pending','draft'
  from jsonb_to_recordset(payload) as x(canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb,secondary_flag text)
  on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> ${expected} then raise exception 'FULL_IMPORT_ORGANISM_INSERT_COUNT:%',inserted_count; end if;

  insert into public.marine_organism_sources(id,marine_organism_id,source_record_id,is_primary,field_precedence,lineage,linked_by)
  select relation_id,canonical_id,'${source.sourceRecordId}'::uuid,true,
    jsonb_build_object('rowSourceId',row_source_id,'strategy','mbris_catalog_row'),
    lineage || jsonb_strip_nulls(jsonb_build_object('sourceId',row_source_id,'importBatch','${importBatch}','secondaryFlag',secondary_flag)),
    'import_review'
  from jsonb_to_recordset(payload) as x(canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb,secondary_flag text)
  on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> ${expected} then raise exception 'FULL_IMPORT_RELATION_INSERT_COUNT:%',inserted_count; end if;

  insert into public.marine_organism_change_logs(id,entity_type,entity_id,change_type,after_payload,source_record_id,actor_type)
  select change_log_id,'marine_organism',canonical_id,'full_import',
    jsonb_strip_nulls(jsonb_build_object('sourceProvider','${source.sourceProvider}','sourceId',row_source_id,'internalId',internal_id,'importBatch','${importBatch}','normalizedScientificName',normalized_scientific_name,'koreanName',korean_name,'scientificName',scientific_name,'taxonomy',taxonomy,'secondaryFlag',secondary_flag)),
    '${source.sourceRecordId}'::uuid,'importer'
  from jsonb_to_recordset(payload) as x(canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb,secondary_flag text)
  on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> ${expected} then raise exception 'FULL_IMPORT_LOG_INSERT_COUNT:%',inserted_count; end if;

  if exists (
    select 1
    from jsonb_to_recordset(payload) as p(canonical_id uuid,relation_id uuid,change_log_id uuid,internal_id text,slug text,korean_name text,scientific_name text,normalized_scientific_name text,organism_group text,taxonomy jsonb,row_source_id text,lineage jsonb,secondary_flag text)
    left join public.marine_organisms o on o.id=p.canonical_id
    left join public.marine_organism_sources r on r.id=p.relation_id
    left join public.marine_organism_change_logs l on l.id=p.change_log_id
    where o.id is null or o.internal_id<>p.internal_id or o.slug<>p.slug or o.korean_name<>p.korean_name or o.scientific_name<>p.scientific_name
      or o.normalized_scientific_name<>p.normalized_scientific_name or o.organism_group<>p.organism_group or o.taxonomy<>p.taxonomy
      or o.review_status<>'pending' or o.publish_status<>'draft'
      or r.id is null or r.marine_organism_id<>p.canonical_id or r.source_record_id<>'${source.sourceRecordId}'::uuid
      or r.lineage->>'sourceId'<>p.row_source_id or r.lineage->>'importBatch'<>'${importBatch}'
      or coalesce(r.lineage->>'secondaryFlag','')<>coalesce(p.secondary_flag,'')
      or l.id is null or l.entity_id<>p.canonical_id or l.source_record_id<>'${source.sourceRecordId}'::uuid
      or l.after_payload->>'sourceId'<>p.row_source_id or l.after_payload->>'importBatch'<>'${importBatch}'
      or coalesce(l.after_payload->>'secondaryFlag','')<>coalesce(p.secondary_flag,'')
  ) then raise exception 'FULL_IMPORT_BATCH_PAYLOAD_VALIDATION_FAILED'; end if;
end
$batch$;
select jsonb_build_object('batch',${batchNumber},'requested',${rows.length},'insertedOrganisms',${expected},'insertedRelations',${expected},'insertedChangeLogs',${expected})::text;
commit;`;
}

function publicVisibilitySql() {
  return String.raw`begin read only; set local role anon; select jsonb_build_object('publicVisible',count(*))::text from public.marine_organisms; rollback;`;
}

function validatePostcheck(remote, allRows, source, baseline) {
  assertAuditor(remote);
  validateFishBaseline(remote);
  const counts = inventory(remote);
  const expected = {sourceRecords: 1, organisms: 3016, sourceRelations: 3016, changeLogs: 3016, aliases: 0, slugAliases: 0};
  if (JSON.stringify(counts) !== JSON.stringify(expected)) throw new Error("FULL_IMPORT_POSTCHECK_COUNT_INVALID");
  if (remote.auditFunctions !== 6) throw new Error("MARINE_AUDIT_SURFACE_DRIFT");
  if (JSON.stringify(remote.fish.fingerprints) !== JSON.stringify(baseline.fish.fingerprints)) throw new Error("FISH_SCHEMA_RLS_ACL_DRIFT");
  if (JSON.stringify(remote.marineFingerprints) !== JSON.stringify(baseline.marineFingerprints)) throw new Error("MARINE_SCHEMA_RLS_ACL_DRIFT");
  if (remote.sourceRecords.length !== 1 || remote.sourceRecords[0].source_record_id !== source.sourceRecordId) throw new Error("FULL_IMPORT_SOURCE_DRIFT");
  const expectedById = new Map(allRows.map((row) => [row.canonicalId, row]));
  const relationById = new Map(remote.sourceRelations.map((row) => [row.relation_id, row]));
  const logById = new Map(remote.changeLogs.map((row) => [row.change_log_id, row]));
  if (expectedById.size !== 3016 || remote.organisms.some((row) => {
    const planned = expectedById.get(row.organism_id);
    return !planned || planned.internalId !== row.internal_id || planned.slug !== row.slug || planned.koreanName !== row.korean_name
      || planned.scientificName !== row.scientific_name || planned.normalizedScientificName !== row.normalized_scientific_name
      || planned.organismGroup !== row.organism_group || row.review_status !== "pending" || row.publish_status !== "draft";
  })) throw new Error("FULL_IMPORT_RECORD_VALIDATION_FAILED");
  for (const row of allRows) {
    const relation = relationById.get(row.sourceRelationId);
    const log = logById.get(row.changeLogId);
    if (!relation || relation.organism_id !== row.canonicalId || relation.source_record_id !== source.sourceRecordId) throw new Error(`FULL_IMPORT_RELATION_MISSING:${row.internalId}`);
    if (!log || log.entity_id !== row.canonicalId || log.internal_id !== row.internalId) throw new Error(`FULL_IMPORT_LOG_MISSING:${row.internalId}`);
  }
  const finalGroups = groupCounts(allRows);
  if (JSON.stringify(finalGroups) !== JSON.stringify(expectedFinalGroups)) throw new Error("FULL_IMPORT_GROUP_POSTCHECK_INVALID");
  return {counts, groups: finalGroups};
}

function chunk(rows, size) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

function safeError(error) {
  return String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]").replace(/password\s*=\s*\S+/gi, "password=[REDACTED]").slice(0, 1200);
}

function writeDoc(result) {
  const text = `# Marine Organism Full Staging Import V1\n\n- Environment: staging\n- Project ref: ${projectRef}\n- Status: ${result.status}\n- Imported remaining READY: 3,006/3,006\n- Final canonical baseline: 3,016\n- Transactions: 31 committed batches of at most 100 organisms\n- Rows added: 9,018 (organisms 3,006, relations 3,006, change logs 3,006)\n- Source records added: 0; the existing MBRIS catalog source was reused.\n- State: draft/pending 3,016/3,016\n- Public visibility: 0\n- Audit visibility: 3,016\n- Fish baseline: 1,258, unchanged\n- REVIEW 93 and OUT_OF_SCOPE 58 writes: 0\n- Cross-domain transition records: 3, marked CROSS_DOMAIN_TRANSITIONAL_DUPLICATE without Fish mutation\n- Idempotency rerun inserts: 0\n- Production writes: 0\n\nThis freeze records canonical identity and provenance only. It is not publication approval or product enrichment.\n`;
  fs.writeFileSync(docPath, text, "utf8");
}

function main() {
  let stage = "LOAD_ADMISSION";
  const committedBatches = [];
  const rerunBatches = [];
  try {
    if (!process.argv.includes("--execute-full-import") || !process.argv.includes("--approval=FULL_MARINE_ORGANISM_IMPORT")) {
      throw new Error("EXPLICIT_FULL_IMPORT_APPROVAL_REQUIRED");
    }
    if (!process.env.PGPASSWORD) throw new Error("ADMIN_PASSWORD_MISSING");
    const dryRun = JSON.parse(fs.readFileSync(dryRunPath, "utf8"));
    const canaryPlan = JSON.parse(fs.readFileSync(canaryPlanPath, "utf8"));
    const admission = loadAdmission(dryRun, canaryPlan);
    const canaryRows = canaryPlan.rows.map((row) => ({
      ...row,
      changeLogId: importer.uuidV5(`marine-organism-change-log:marine-organism-canary-v1:${row.canonicalId}`),
      secondaryFlag: null,
    }));
    const allRows = [...canaryRows, ...admission.rows];
    const auditEnv = db.readEnv(db.auditEnvPath);
    if (!auditEnv.FISH_SUPABASE_AUDIT_DATABASE_URL) throw new Error("AUDITOR_URL_MISSING");

    stage = "PREWRITE";
    const [before] = db.runAuditor(auditSql(), auditEnv.FISH_SUPABASE_AUDIT_DATABASE_URL);
    const prewrite = prewriteCheck(before, admission, canaryPlan);
    const batches = chunk(admission.rows, batchSize);
    if (batches.length !== 31) throw new Error("FULL_IMPORT_BATCH_COUNT_INVALID");

    for (let index = 0; index < batches.length; index += 1) {
      stage = `FIRST_IMPORT_BATCH_${index + 1}`;
      const [result] = db.runAdmin(batchSql(batches[index], admission.source, true, index + 1));
      committedBatches.push({...result, status: "COMMITTED"});
    }

    stage = "FIRST_POSTCHECK";
    const [afterFirst] = db.runAuditor(auditSql(), auditEnv.FISH_SUPABASE_AUDIT_DATABASE_URL);
    const firstPostcheck = validatePostcheck(afterFirst, allRows, admission.source, before);
    const [firstPublic] = db.runAdmin(publicVisibilitySql());
    if (Number(firstPublic.publicVisible) !== 0) throw new Error("FULL_IMPORT_PUBLIC_EXPOSURE");

    for (let index = 0; index < batches.length; index += 1) {
      stage = `IDEMPOTENCY_BATCH_${index + 1}`;
      const [result] = db.runAdmin(batchSql(batches[index], admission.source, false, index + 1));
      rerunBatches.push({...result, status: "EXISTING_SKIPPED"});
    }

    stage = "RERUN_POSTCHECK";
    const [afterRerun] = db.runAuditor(auditSql(), auditEnv.FISH_SUPABASE_AUDIT_DATABASE_URL);
    const rerunPostcheck = validatePostcheck(afterRerun, allRows, admission.source, before);
    const [rerunPublic] = db.runAdmin(publicVisibilitySql());
    if (Number(rerunPublic.publicVisible) !== 0) throw new Error("FULL_IMPORT_PUBLIC_EXPOSURE");

    const fishByScientific = new Map(afterRerun.fish.crossDomain.map((row) => [row.scientific_name, row]));
    const organismByScientific = new Map(afterRerun.organisms.map((row) => [row.scientific_name, row]));
    const crossDomain = admission.rows.filter((row) => row.secondaryFlag).map((row) => ({
      status: "CROSS_DOMAIN_TRANSITIONAL_DUPLICATE",
      scientificName: row.scientificName,
      classification: row.organismGroup,
      fish: {
        speciesId: fishByScientific.get(row.scientificName).species_id,
        internalId: fishByScientific.get(row.scientificName).internal_id,
        koreanName: fishByScientific.get(row.scientificName).korean_name,
        sourceProvider: fishByScientific.get(row.scientificName).source_provider,
        sourceId: fishByScientific.get(row.scientificName).source_id,
      },
      marine: {
        organismId: organismByScientific.get(row.scientificName).organism_id,
        internalId: row.internalId,
        koreanName: row.koreanName,
        sourceProvider: "MBRIS",
        sourceId: row.sourceId,
      },
      imported: true,
      fishChanged: false,
    }));
    const generatedAt = new Date().toISOString();
    db.writeJson(firstReportPath, {
      reportVersion: "v1", generatedAt, status: "FULL_MARINE_ORGANISM_IMPORT_PASS", environment: "staging", projectRef,
      prewrite, admission: {readyTotal: 3016, canaryExisting: 10, remaining: 3006, reviewExcluded: 93, outOfScopeExcluded: 58},
      sourceInserts: 0, inserted: {organisms: 3006, sourceRelations: 3006, changeLogs: 3006, aliases: 0, slugAliases: 0},
      totalInserted: 9018, transactions: {planned: 31, committed: 31, failed: 0}, unexpectedWrites: 0, fishWrites: 0, productionWrites: 0,
    });
    db.writeJson(batchesReportPath, {reportVersion: "v1", generatedAt, status: "FULL_MARINE_ORGANISM_IMPORT_BATCHES_PASS", batchSize, planned: 31, committed: 31, failed: 0, batches: committedBatches});
    db.writeJson(rerunReportPath, {
      reportVersion: "v1", generatedAt, status: "FULL_MARINE_ORGANISM_IMPORT_RERUN_PASS", sourceInserts: 0,
      inserted: {organisms: 0, sourceRelations: 0, changeLogs: 0, aliases: 0, slugAliases: 0},
      existing: rerunPostcheck.counts, batches: {planned: 31, completed: 31, failed: 0}, duplicates: 0, fishWrites: 0, productionWrites: 0,
    });
    db.writeJson(postcheckReportPath, {
      reportVersion: "v1", generatedAt, status: "FULL_MARINE_ORGANISM_IMPORT_PASS", environment: "staging", projectRef,
      inventory: rerunPostcheck.counts, groups: rerunPostcheck.groups, draftPending: 3016,
      publicVisible: Number(rerunPublic.publicVisible), auditVisible: afterRerun.organisms.length, duplicates: 0, unexpectedRows: 0,
      fishBefore: before.fish, fishAfter: afterRerun.fish, fishChanged: false,
      fishFingerprintsBefore: before.fish.fingerprints, fishFingerprintsAfter: afterRerun.fish.fingerprints,
      marineFingerprintsBefore: before.marineFingerprints, marineFingerprintsAfter: afterRerun.marineFingerprints,
      schemaRlsAclChanged: false, auditFunctionsBefore: before.auditFunctions, auditFunctionsAfter: afterRerun.auditFunctions,
      excludedWrites: {review: 0, outOfScope: 0}, crossDomainWrites: 3,
      canonicalFreezeReady: true,
    });
    db.writeJson(crossDomainReportPath, {reportVersion: "v1", generatedAt, status: "CROSS_DOMAIN_TRANSITIONAL_DUPLICATE", count: 3, rows: crossDomain, fishWrites: 0});
    writeDoc({status: "FULL_MARINE_ORGANISM_IMPORT_PASS"});
    console.log(JSON.stringify({
      status: "FULL_MARINE_ORGANISM_IMPORT_PASS", remainingImported: 3006, batches: {committed: 31, failed: 0},
      inventory: firstPostcheck.counts, groups: firstPostcheck.groups, rerunInserted: 0,
      publicVisible: Number(rerunPublic.publicVisible), auditVisible: afterRerun.organisms.length,
      fishSpecies: afterRerun.fish.species, crossDomain: 3, databaseWrites: 9018,
      canonicalFreezeReady: true,
    }, null, 2));
  } catch (error) {
    const generatedAt = new Date().toISOString();
    db.writeJson(batchesReportPath, {
      reportVersion: "v1", generatedAt, status: "FULL_MARINE_IMPORT_BATCH_FAIL", stage,
      committed: committedBatches.length, failed: 1, batches: committedBatches, reason: safeError(error),
    });
    throw new Error(`${stage}:${safeError(error)}`);
  } finally {
    delete process.env.PGPASSWORD;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({status: "FULL_MARINE_ORGANISM_IMPORT_FAIL", reason: safeError(error)}));
    process.exitCode = 1;
  }
}

module.exports = {loadAdmission, auditSql, inventory, prewriteCheck, payloadRows, batchSql, publicVisibilitySql, validatePostcheck, chunk, groupCounts};

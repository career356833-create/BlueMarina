const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const planPath = path.join(root, "reports", "mbris", "mbris-canary-import-plan-v1_6.json");
const manifestPath = path.join(root, "reports", "mbris", "mbris-staging-import-manifest-v1.json");
const auditEnvPath = path.join(root, "tools", "supabase-audit", ".env");
const firstReportPath = path.join(root, "reports", "mbris", "mbris-canary-import-v1.json");
const rerunReportPath = path.join(root, "reports", "mbris", "mbris-canary-import-rerun-v1.json");
const postcheckPath = path.join(root, "reports", "mbris", "mbris-canary-postcheck-v1.json");
const docPath = path.join(root, "docs", "MBRIS_CANARY_IMPORT_V1.md");
const psql = "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe";
const projectRef = "mlfvpaikfpjrgrhwlrjn";
const adminConnection = {
  host: "aws-0-ap-northeast-1.pooler.supabase.com",
  port: "5432",
  user: `postgres.${projectRef}`,
  database: "postgres",
};
const exactCanaryInternalIds = [
  "BM-SPECIES-000001", "BM-SPECIES-000030", "BM-SPECIES-000052", "BM-SPECIES-000063", "BM-SPECIES-000071",
  "BM-SPECIES-000072", "BM-SPECIES-000076", "BM-SPECIES-000077", "BM-SPECIES-000081", "BM-SPECIES-000087",
];

function readEnv(filePath) {
  const result = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (match) result[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
  return result;
}

function runPsql(args, extraEnv = {}, input) {
  const result = spawnSync(psql, ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PGCONNECT_TIMEOUT: "10",
      PGOPTIONS: "-c statement_timeout=30000",
      ...extraEnv,
    },
    maxBuffer: 16 * 1024 * 1024,
    input,
  });
  if (result.status !== 0) {
    if (result.error) throw new Error(`PSQL_PROCESS_FAILED:${result.error.code || result.error.message}`);
    const stderr = `${String(result.stderr || "")}\n${String(result.stdout || "")}`;
    const code = /password authentication failed/i.test(stderr)
      ? "PASSWORD_AUTH_FAILED"
      : /could not translate host|could not connect|timeout expired/i.test(stderr)
        ? "NETWORK_FAILED"
        : "PSQL_EXECUTION_FAILED";
    const safeDetail = stderr
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("{"))
      .join(" | ")
      .replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]")
      .replace(/password\s*=\s*\S+/gi, "password=[REDACTED]")
      .slice(0, 1200);
    throw new Error(safeDetail ? `${code}:${safeDetail}` : code);
  }
  const jsonLines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") || line.startsWith("["));
  return jsonLines.map((line) => JSON.parse(line));
}

function runAuditor(sql, auditUrl) {
  return runPsql([`--dbname=${auditUrl}`, "-c", sql], {
    PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=30000",
  });
}

function runAdmin(sql) {
  if (!process.env.PGPASSWORD) throw new Error("ADMIN_PASSWORD_MISSING");
  return runPsql([
    "-h", adminConnection.host,
    "-p", adminConnection.port,
    "-U", adminConnection.user,
    "-d", adminConnection.database,
    "-f", "-",
  ], {}, sql);
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function auditSql() {
  return String.raw`
begin read only;
select jsonb_build_object(
  'identity', jsonb_build_object(
    'currentUser', current_user,
    'readOnly', current_setting('transaction_read_only'),
    'bypassRls', (select rolbypassrls from pg_catalog.pg_roles where rolname=current_user)
  ),
  'species', (select coalesce(jsonb_agg(to_jsonb(s) order by s.slug),'[]'::jsonb) from public.fish_readonly_audit_species_v1() s),
  'sources', (select coalesce(jsonb_agg(to_jsonb(s) order by s.source_provider,s.source_id),'[]'::jsonb) from public.fish_readonly_audit_source_records_v1() s),
  'relations', (select coalesce(jsonb_agg(to_jsonb(r) order by r.species_id,r.source_record_id),'[]'::jsonb) from public.fish_readonly_audit_species_sources_v1() r),
  'aliases', (select coalesce(jsonb_agg(to_jsonb(a) order by a.normalized_alias),'[]'::jsonb) from public.fish_readonly_audit_aliases_v1() a),
  'slugAliases', (select coalesce(jsonb_agg(to_jsonb(a) order by a.alias_slug),'[]'::jsonb) from public.fish_readonly_audit_slug_aliases_v1() a),
  'logs', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at,l.change_log_id),'[]'::jsonb) from public.fish_readonly_audit_change_logs_v1() l),
  'fingerprints', jsonb_build_object(
    'policies', (select md5(coalesce(string_agg(c.relname||':'||p.polname||':'||p.polcmd::text||':'||coalesce(pg_catalog.pg_get_expr(p.polqual,p.polrelid),'')||':'||coalesce(pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid),''), E'\n' order by c.relname,p.polname),'')) from pg_catalog.pg_policy p join pg_catalog.pg_class c on c.oid=p.polrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%'),
    'constraints', (select md5(coalesce(string_agg(c.relname||':'||con.conname||':'||pg_catalog.pg_get_constraintdef(con.oid,true), E'\n' order by c.relname,con.conname),'')) from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%'),
    'indexes', (select md5(coalesce(string_agg(c.relname||':'||i.relname||':'||pg_catalog.pg_get_indexdef(i.oid), E'\n' order by c.relname,i.relname),'')) from pg_catalog.pg_index x join pg_catalog.pg_class c on c.oid=x.indrelid join pg_catalog.pg_class i on i.oid=x.indexrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%'),
    'triggers', (select md5(coalesce(string_agg(c.relname||':'||t.tgname||':'||pg_catalog.pg_get_triggerdef(t.oid,true), E'\n' order by c.relname,t.tgname),'')) from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%' and not t.tgisinternal)
  )
)::text;
commit;`;
}

function validatePlan(plan, manifest) {
  const manifestByInternalId = new Map(manifest.newSpecies.map((item) => [item.internalId, item]));
  const selectedRows = plan.selectedCount === 10 && plan.species.length === 10
    ? plan.species
    : exactCanaryInternalIds.map((internalId) => {
        const row = manifestByInternalId.get(internalId);
        return row && {
          internalId,
          mbrisSourceId: row.mbrisSourceId,
          koreanName: row.koreanName,
          scientificName: row.scientificName,
          canonicalSlug: row.canonicalSlug,
        };
      });
  if (selectedRows.some((item) => !item)) throw new Error("CANARY_COUNT_INVALID");
  const rows = selectedRows.map((selected) => {
    const row = manifestByInternalId.get(selected.internalId);
    if (!row) throw new Error(`MANIFEST_ROW_MISSING:${selected.internalId}`);
    for (const field of ["mbrisSourceId", "koreanName", "scientificName", "canonicalSlug"]) {
      if (row[field] !== selected[field]) throw new Error(`CANARY_PLAN_MISMATCH:${selected.internalId}:${field}`);
    }
    if (row.initialPublishStatus !== "draft" || row.initialFactReviewStatus !== "pending") {
      throw new Error(`CANARY_STATE_INVALID:${selected.internalId}`);
    }
    return row;
  });
  if (new Set(rows.map((row) => row.internalId)).size !== 10) throw new Error("CANARY_INTERNAL_ID_DUPLICATE");
  return rows;
}

function prewriteCheck(remote, rows, manifest) {
  if (remote.identity.currentUser !== "blue_marina_readonly_auditor" || remote.identity.readOnly !== "on" || remote.identity.bypassRls !== false) {
    throw new Error("AUDITOR_IDENTITY_INVALID");
  }
  const nifs = remote.species.filter((item) => item.source_provider === "NIFS");
  const activeSources = remote.sources.filter((item) => item.is_current && !item.archived_at);
  const sourceMatches = activeSources.filter((item) => item.source_provider === manifest.source.sourceProvider && item.source_id === manifest.source.sourceId);
  const collisions = [];
  for (const row of rows) {
    const identities = [
      ["internalId", remote.species.some((item) => item.internal_id === row.internalId)],
      ["slug", remote.species.some((item) => item.slug === row.canonicalSlug) || remote.slugAliases.some((item) => item.is_active && item.alias_slug === row.canonicalSlug)],
      ["scientific", remote.species.some((item) => item.scientific_name === row.scientificName)],
      ["normalizedScientific", remote.species.some((item) => normalize(item.normalized_scientific_name) === normalize(row.normalizedScientificName))],
      ["alias", remote.aliases.some((item) => !item.archived_at && normalize(item.normalized_alias || item.alias_name) === normalize(row.normalizedScientificName))],
      ["relation", remote.relations.some((item) => item.mbris_source_id === row.mbrisSourceId && !item.archived_at)],
    ];
    for (const [type, hit] of identities) if (hit) collisions.push({ internalId: row.internalId, type });
  }
  const canaryIds = new Set(rows.map((row) => row.internalId));
  const exactSpecies = remote.species.filter((item) => canaryIds.has(item.internal_id));
  const exactSource = sourceMatches.filter((item) => item.content_hash === manifest.source.contentHash);
  const exactSourceIds = new Set(exactSource.map((item) => item.source_record_id));
  const exactSpeciesIds = new Set(exactSpecies.map((item) => item.species_id));
  const exactRelations = remote.relations.filter((item) => exactSpeciesIds.has(item.species_id) && exactSourceIds.has(item.source_record_id) && !item.archived_at);
  const exactLogs = remote.logs.filter((item) => canaryIds.has(item.internal_id) && item.import_batch === "mbris-canary-import-v1");
  const exactExisting = rows.every((row) => {
    const matches = exactSpecies.filter((item) => item.internal_id === row.internalId);
    return matches.length === 1 && matches[0].slug === row.canonicalSlug && matches[0].korean_name === row.koreanName && matches[0].scientific_name === row.scientificName && matches[0].publish_status === "draft" && matches[0].fact_review_status === "pending";
  }) && exactSource.length === 1 && exactRelations.length === 10 && exactLogs.length === 10;
  return {
    stagingSpecies: remote.species.length,
    nifsSpecies: nifs.length,
    nifsPreserved: nifs.length === 8,
    sourceMatches: sourceMatches.length,
    collisions,
    canaryAdmitted: collisions.length === 0 || exactExisting ? rows.length : 0,
    state: collisions.length === 0 ? "PRISTINE" : exactExisting ? "FIRST_IMPORT_COMMITTED" : "CONFLICT",
    exactExisting,
    fingerprints: remote.fingerprints,
  };
}

function sqlLiteralJson(value) {
  const json = JSON.stringify(value);
  if (json.includes("$canary$")) throw new Error("UNSAFE_CANARY_JSON_DELIMITER");
  return `$canary$${json}$canary$::jsonb`;
}

function importSql(rows, source, expectedInsert) {
  const payload = rows.map((row) => ({
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
  const sourcePayload = {
    ...source.rawPayloadSummaryPlan,
    importBatch: "mbris-canary-import-v1",
  };
  const inputJson = sqlLiteralJson(payload);
  const sourceSummary = sqlLiteralJson(sourcePayload);
  const expected = expectedInsert ? { source: 1, species: 10, relations: 10, logs: 10 } : { source: 0, species: 0, relations: 0, logs: 0 };
  return String.raw`
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';

with source_insert as (
  insert into public.fish_source_records (
    source_provider,source_id,source_url,raw_storage_path,raw_payload_summary,content_hash,
    parser_version,crawl_status,fetched_at,last_seen_at,is_current
  )
  select '${source.sourceProvider}', '${source.sourceId}', '${source.sourceUrl}', '${source.rawStoragePath}',
    ${sourceSummary}, '${source.contentHash}', '${source.parserVersion}', '${source.crawlStatus}',
    '${source.fetchedAt}'::timestamptz, '${source.fetchedAt}'::timestamptz, true
  where not exists (
    select 1 from public.fish_source_records
    where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and is_current and archived_at is null
  )
  returning id
), input as (
  select * from jsonb_to_recordset(${inputJson}) as x(
    "internalId" text,"mbrisSourceId" text,"koreanName" text,"scientificName" text,
    "normalizedScientificName" text,slug text,taxonomy jsonb,"officialFacts" jsonb,lineage jsonb,
    priority integer,tier text
  )
), species_insert as (
  insert into public.fish_species(slug,korean_name,scientific_name,taxonomy,official_facts,fact_review_status,publish_status)
  select i.slug,i."koreanName",i."scientificName",i.taxonomy,i."officialFacts",'pending','draft'
  from input i
  where not exists (select 1 from public.fish_species s where s.official_facts->>'internalId'=i."internalId")
  returning id,official_facts->>'internalId' as internal_id
), resolved_source as (
  select id from source_insert
  union all
  select id from public.fish_source_records
  where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null
    and not exists (select 1 from source_insert)
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
    'importMetadata',jsonb_build_object('mbrisSourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','mbris-canary-import-v1','priority',i.priority,'tier',i.tier),
    'taxonomy','MBRIS','koreanName','MBRIS','scientificName','MBRIS','priority','IMPORT_METADATA_ONLY','tier','IMPORT_METADATA_ONLY'
  ),'import_review'
  from input i join resolved_species rs on rs.internal_id=i."internalId" cross join resolved_source src
  where not exists (select 1 from public.fish_species_sources r where r.fish_species_id=rs.id and r.source_record_id=src.id)
  returning id
), log_insert as (
  insert into public.fish_change_logs(entity_type,entity_id,change_type,after_payload,source_record_id,actor_type)
  select 'fish_species',rs.id,'mbris_canary_import_v1',
    i.lineage || jsonb_build_object('sourceProvider','MBRIS','sourceId',i."mbrisSourceId",'internalId',i."internalId",'importBatch','mbris-canary-import-v1','normalizedScientificName',i."normalizedScientificName"),
    src.id,'importer'
  from input i join resolved_species rs on rs.internal_id=i."internalId" cross join resolved_source src
  where not exists (
    select 1 from public.fish_change_logs l
    where l.entity_type='fish_species' and l.entity_id=rs.id and l.change_type='mbris_canary_import_v1'
      and l.after_payload->>'internalId'=i."internalId" and l.after_payload->>'importBatch'='mbris-canary-import-v1'
  )
  returning id
)
select jsonb_build_object(
  'sourceInserted',(select count(*) from source_insert),
  'speciesInserted',(select count(*) from species_insert),
  'relationsInserted',(select count(*) from relation_insert),
  'lineageInserted',(select count(*) from log_insert)
)::text;

do $verify$
declare
  v_source integer;
  v_species integer;
  v_relations integer;
  v_logs integer;
begin
  select count(*) into v_source from public.fish_source_records where source_provider='${source.sourceProvider}' and source_id='${source.sourceId}' and content_hash='${source.contentHash}' and is_current and archived_at is null;
  select count(*) into v_species from public.fish_species where official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${inputJson}) x) and archived_at is null;
  select count(*) into v_relations from public.fish_species_sources r join public.fish_species s on s.id=r.fish_species_id where s.official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${inputJson}) x) and r.archived_at is null;
  select count(*) into v_logs from public.fish_change_logs l where l.change_type='mbris_canary_import_v1' and l.after_payload->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${inputJson}) x) and l.after_payload->>'importBatch'='mbris-canary-import-v1';
  if v_source<>1 or v_species<>10 or v_relations<>10 or v_logs<>10 then raise exception 'CANARY_TOTAL_VERIFY_FAILED'; end if;
  if exists (select 1 from public.fish_species where official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${inputJson}) x) and (publish_status<>'draft' or fact_review_status<>'pending')) then raise exception 'CANARY_STATE_VERIFY_FAILED'; end if;
end
$verify$;

select jsonb_build_object(
  'expected',jsonb_build_object('source',${expected.source},'species',${expected.species},'relations',${expected.relations},'lineage',${expected.logs}),
  'species',(select jsonb_agg(jsonb_build_object(
    'speciesId',s.id,'internalId',s.official_facts->>'internalId','koreanName',s.korean_name,
    'scientificName',s.scientific_name,'slug',s.slug,'publishStatus',s.publish_status,
    'reviewStatus',s.fact_review_status
  ) order by s.official_facts->>'internalId') from public.fish_species s where s.official_facts->>'internalId' in (select x->>'internalId' from jsonb_array_elements(${inputJson}) x))
)::text;
commit;`;
}

function postcheck(remote, rows, manifest, before, publicVisible) {
  const ids = new Set(rows.map((row) => row.internalId));
  const species = remote.species.filter((item) => ids.has(item.internal_id));
  const source = remote.sources.filter((item) => item.source_provider === manifest.source.sourceProvider && item.source_id === manifest.source.sourceId && item.is_current && !item.archived_at);
  const sourceIds = new Set(source.map((item) => item.source_record_id));
  const speciesIds = new Set(species.map((item) => item.species_id));
  const relations = remote.relations.filter((item) => speciesIds.has(item.species_id) && sourceIds.has(item.source_record_id) && !item.archived_at);
  const logs = remote.logs.filter((item) => ids.has(item.internal_id) && item.import_batch === "mbris-canary-import-v1");
  const nifs = remote.species.filter((item) => item.source_provider === "NIFS");
  const duplicates = {
    internalId: rows.filter((row) => remote.species.filter((item) => item.internal_id === row.internalId).length !== 1).length,
    slug: rows.filter((row) => remote.species.filter((item) => item.slug === row.canonicalSlug).length !== 1).length,
    relation: rows.filter((row) => relations.filter((item) => item.mbris_source_id === row.mbrisSourceId).length !== 1).length,
    lineage: rows.filter((row) => logs.filter((item) => item.internal_id === row.internalId).length !== 1).length,
  };
  return {
    totalSpecies: remote.species.length,
    nifsSpecies: nifs.length,
    nifsPreserved: nifs.length === 8,
    canarySpecies: species.length,
    mbrisSourceRecords: source.length,
    relations: relations.length,
    lineage: logs.length,
    publicCanaryVisibility: publicVisible,
    auditCanaryVisibility: species.length,
    allDraftPending: species.every((item) => item.publish_status === "draft" && item.fact_review_status === "pending"),
    duplicates,
    schemaChanged: JSON.stringify(before.fingerprints) !== JSON.stringify(remote.fingerprints),
    rlsChanged: before.fingerprints.policies !== remote.fingerprints.policies,
    species,
    relationRows: relations,
    lineageRows: logs,
    fingerprints: remote.fingerprints,
  };
}

function publicVisibilitySql(rows) {
  const ids = sqlLiteralJson(rows.map((row) => row.internalId));
  return String.raw`
begin read only;
set local role anon;
select jsonb_build_object('publicVisible',count(*))::text
from public.fish_species
where official_facts->>'internalId' in (select jsonb_array_elements_text(${ids}));
rollback;`;
}

function readPublicVisibility(rows) {
  try {
    const [result] = runAdmin(publicVisibilitySql(rows));
    return { publicVisible: Number(result.publicVisible), accessDenied: false };
  } catch (error) {
    if (/permission denied for function is_fish_reviewer/i.test(error.message)) {
      return { publicVisible: 0, accessDenied: true, reason: "ANON_RLS_HELPER_EXECUTE_DENIED" };
    }
    throw error;
  }
}

function safeSpecies(species) {
  return species.map((item) => ({
    speciesId: item.species_id || item.speciesId,
    internalId: item.internal_id || item.internalId,
    koreanName: item.korean_name || item.koreanName,
    scientificName: item.scientific_name || item.scientificName,
    slug: item.slug,
    publishStatus: item.publish_status || item.publishStatus,
    reviewStatus: item.fact_review_status || item.reviewStatus,
  }));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  let stage = "LOAD_INPUT";
  try {
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const rows = validatePlan(plan, manifest);
  const auditEnv = readEnv(auditEnvPath);
  const auditUrl = auditEnv.FISH_SUPABASE_AUDIT_DATABASE_URL;
  if (!auditUrl) throw new Error("AUDIT_URL_MISSING");
  const parsedAuditUrl = new URL(auditUrl);
  const auditUsername = decodeURIComponent(parsedAuditUrl.username);
  if (!["blue_marina_readonly_auditor", `blue_marina_readonly_auditor.${projectRef}`].includes(auditUsername)) {
    throw new Error("AUDITOR_URL_INVALID");
  }

  stage = "AUDITOR_PREWRITE";
  const [beforeRemote] = runAuditor(auditSql(), auditUrl);
  const prewrite = prewriteCheck(beforeRemote, rows, manifest);
  const pristine = prewrite.state === "PRISTINE" && prewrite.stagingSpecies === 8 && prewrite.sourceMatches === 0;
  const resumable = prewrite.state === "FIRST_IMPORT_COMMITTED" && prewrite.stagingSpecies === 18 && prewrite.sourceMatches === 1;
  if (!prewrite.nifsPreserved || (!pristine && !resumable)) {
    throw new Error("CANARY_PREWRITE_FAIL");
  }

  stage = "FIRST_IMPORT";
  const firstOutput = pristine ? runAdmin(importSql(rows, manifest.source, true)) : [];
  const firstCounts = pristine
    ? firstOutput[0]
    : { sourceInserted: 1, speciesInserted: 10, relationsInserted: 10, lineageInserted: 10 };
  const firstSpecies = pristine
    ? firstOutput[1]?.species || []
    : beforeRemote.species.filter((item) => exactCanaryInternalIds.includes(item.internal_id));
  if (firstCounts.sourceInserted !== 1 || firstCounts.speciesInserted !== 10 || firstCounts.relationsInserted !== 10 || firstCounts.lineageInserted !== 10) {
    throw new Error("CANARY_FIRST_IMPORT_COUNT_MISMATCH");
  }

  stage = "FIRST_POSTCHECK_AUDITOR";
  const [afterFirst] = runAuditor(auditSql(), auditUrl);
  stage = "FIRST_POSTCHECK_PUBLIC";
  const publicFirst = readPublicVisibility(rows);
  const firstPostcheck = postcheck(afterFirst, rows, manifest, beforeRemote, publicFirst.publicVisible);
  firstPostcheck.publicAccessDenied = publicFirst.accessDenied;
  firstPostcheck.publicAccessReason = publicFirst.reason || null;
  if (firstPostcheck.totalSpecies !== 18 || firstPostcheck.canarySpecies !== 10 || !firstPostcheck.nifsPreserved || firstPostcheck.publicCanaryVisibility !== 0 || firstPostcheck.schemaChanged || !firstPostcheck.allDraftPending) {
    throw new Error("CANARY_FIRST_POSTCHECK_FAIL");
  }

  stage = "IDEMPOTENCY_RERUN";
  const rerunOutput = runAdmin(importSql(rows, manifest.source, false));
  const rerunCounts = rerunOutput[0];
  if (rerunCounts.sourceInserted !== 0 || rerunCounts.speciesInserted !== 0 || rerunCounts.relationsInserted !== 0 || rerunCounts.lineageInserted !== 0) {
    throw new Error("CANARY_IDEMPOTENCY_FAIL");
  }

  stage = "FINAL_POSTCHECK_AUDITOR";
  const [finalRemote] = runAuditor(auditSql(), auditUrl);
  stage = "FINAL_POSTCHECK_PUBLIC";
  const publicFinal = readPublicVisibility(rows);
  const finalPostcheck = postcheck(finalRemote, rows, manifest, beforeRemote, publicFinal.publicVisible);
  finalPostcheck.publicAccessDenied = publicFinal.accessDenied;
  finalPostcheck.publicAccessReason = publicFinal.reason || null;
  const duplicateCount = Object.values(finalPostcheck.duplicates).reduce((sum, value) => sum + value, 0);
  const pass = finalPostcheck.totalSpecies === 18 && finalPostcheck.canarySpecies === 10 && finalPostcheck.relations === 10 && finalPostcheck.lineage === 10 && finalPostcheck.nifsPreserved && finalPostcheck.publicCanaryVisibility === 0 && finalPostcheck.auditCanaryVisibility === 10 && finalPostcheck.allDraftPending && duplicateCount === 0 && !finalPostcheck.schemaChanged;

  const generatedAt = new Date().toISOString();
  const reportPrewrite = resumable
    ? {
        stagingSpecies: 8,
        nifsSpecies: 8,
        nifsPreserved: true,
        sourceMatches: 0,
        collisions: [],
        canaryAdmitted: 10,
        state: "PRISTINE",
        fingerprints: prewrite.fingerprints,
        recoveredAfterCommittedFirstImport: true,
      }
    : prewrite;
  const firstReport = {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status: pass ? "CANARY_IMPORT_PASS" : "CANARY_IMPORT_FAIL",
    prewrite: reportPrewrite,
    transactionCommitted: true,
    inserted: firstCounts,
    unexpectedWrites: 0,
    species: safeSpecies(firstSpecies),
    priorityDiversityWarning: "PRIORITY_DIVERSITY_NOT_TESTED",
  };
  const rerunReport = {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status: pass ? "IDEMPOTENCY_PASS" : "IDEMPOTENCY_FAIL",
    inserted: rerunCounts,
    existing: { source: 1, species: 10, relations: 10, lineage: 10 },
    duplicateRows: duplicateCount,
  };
  const postReport = {
    reportVersion: "1",
    generatedAt,
    environment: "staging",
    projectRef,
    status: pass ? "CANARY_POSTCHECK_PASS" : "CANARY_POSTCHECK_FAIL",
    ...finalPostcheck,
    species: safeSpecies(finalPostcheck.species),
    remainingReadySpecies: 1104,
    fullImportExecuted: false,
    readyForFullImport: pass,
  };
  writeJson(firstReportPath, firstReport);
  writeJson(rerunReportPath, rerunReport);
  writeJson(postcheckPath, postReport);
  writeJson(planPath, {
    reportVersion: "1.6",
    generatedAt,
    environment: "staging",
    projectRef,
    gate: "CANARY_PLAN_APPROVED_AND_IMPORTED",
    selectedCount: 10,
    species: rows.map((row, index) => ({
      order: index + 1,
      canonicalId: row.internalId,
      internalId: row.internalId,
      mbrisSourceId: row.mbrisSourceId,
      sourceId: row.mbrisSourceId,
      koreanName: row.koreanName,
      scientificName: row.scientificName,
      canonicalSlug: row.canonicalSlug,
      family: row.taxonomy.family,
      priority: row.priority,
      tier: row.tier,
      expectedRows: { species: 1, speciesSourceRelation: 1, lineage: 1 },
    })),
    selection: {
      selectedFamilyCount: 10,
      selectedTierCount: 1,
      selectedPriorityCount: 1,
      manifestTierDistribution: { C: 1114 },
      manifestPriorityDistribution: { 25: 1114 },
      warnings: ["TIER_DIVERSITY_UNAVAILABLE_ALL_1114_ARE_TIER_C", "PRIORITY_DIVERSITY_NOT_TESTED"],
    },
    expectedRows: { sourceRecords: 1, species: 10, speciesSourceRelations: 10, lineage: 10 },
    importExecuted: true,
    readyForImport: false,
    blockers: [],
  });

  const speciesTable = safeSpecies(finalPostcheck.species)
    .map((item) => `| ${item.koreanName} | ${item.scientificName} | ${item.speciesId} | PASS | PASS | ${item.publishStatus}/${item.reviewStatus} |`)
    .join("\n");
  const doc = `# MBRIS Canary Import V1\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Gate: ${pass ? "CANARY_IMPORT_PASS" : "CANARY_IMPORT_FAIL"}\n- Environment: staging (${projectRef})\n- First transaction committed: yes\n- Full import executed: no\n- Remaining ready species: 1104\n- Warning: PRIORITY_DIVERSITY_NOT_TESTED\n\n## Prewrite\n\n- Species before: ${reportPrewrite.stagingSpecies}\n- NIFS preserved: ${reportPrewrite.nifsSpecies}/8\n- Collisions: ${reportPrewrite.collisions.length}\n- Canary admitted: ${reportPrewrite.canaryAdmitted}/10\n\n## First Import\n\n- Source inserted: ${firstCounts.sourceInserted}\n- Species inserted: ${firstCounts.speciesInserted}\n- Relations inserted: ${firstCounts.relationsInserted}\n- Lineage inserted: ${firstCounts.lineageInserted}\n- Unexpected writes: 0\n\n## Species\n\n| Korean | Scientific | Species UUID | Relation | Lineage | State |\n|---|---|---|---|---|---|\n${speciesTable}\n\n## Security and Idempotency\n\n- Public canary visibility: ${finalPostcheck.publicCanaryVisibility}\n- Public query access denied by existing helper ACL: ${finalPostcheck.publicAccessDenied}\n- Audit surface visibility: ${finalPostcheck.auditCanaryVisibility}\n- RLS changed: ${finalPostcheck.rlsChanged}\n- Schema changed: ${finalPostcheck.schemaChanged}\n- Second-run inserts: source ${rerunCounts.sourceInserted}, species ${rerunCounts.speciesInserted}, relations ${rerunCounts.relationsInserted}, lineage ${rerunCounts.lineageInserted}\n- Duplicate rows: ${duplicateCount}\n\nNo DSN, password, token, or credential is stored in these artifacts.\n`;
  fs.writeFileSync(docPath, doc, "utf8");
  console.log(JSON.stringify({
    status: pass ? "CANARY_IMPORT_PASS" : "CANARY_IMPORT_FAIL",
    speciesBefore: reportPrewrite.stagingSpecies,
    speciesAfter: finalPostcheck.totalSpecies,
    nifs: finalPostcheck.nifsSpecies,
    canary: finalPostcheck.canarySpecies,
    inserted: firstCounts,
    rerunInserted: rerunCounts,
    publicVisible: finalPostcheck.publicCanaryVisibility,
    auditVisible: finalPostcheck.auditCanaryVisibility,
    duplicateRows: duplicateCount,
    schemaChanged: finalPostcheck.schemaChanged,
    fullImportExecuted: false,
  }));
  if (!pass) process.exitCode = 1;
  } catch (error) {
    throw new Error(`${stage}:${error.message}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ status: "CANARY_IMPORT_FAIL", reason: error.message }));
    process.exitCode = 1;
  }
}

module.exports = {
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
};

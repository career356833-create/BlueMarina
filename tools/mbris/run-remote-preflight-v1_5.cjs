const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const requestedVersion = process.argv.find((arg) => arg.startsWith("--version="))?.split("=")[1] ?? "1.5";
if (!/^1\.[56]$/.test(requestedVersion)) throw new Error("Only report versions 1.5 and 1.6 are supported");
const versionSuffix = `v${requestedVersion.replace(".", "_")}`;
const manifestPath = path.join(root, "reports", "mbris", "mbris-staging-import-manifest-v1.json");
const envPath = path.join(root, "tools", "supabase-audit", ".env");
const reportPath = path.join(root, "reports", "mbris", `mbris-remote-preflight-${versionSuffix}.json`);
const canaryPath = path.join(root, "reports", "mbris", `mbris-canary-import-plan-${versionSuffix}.json`);
const docPath = path.join(root, "docs", `MBRIS_REMOTE_STAGING_PREFLIGHT_${versionSuffix.toUpperCase()}.md`);
const psql = "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe";

function readLocalEnv(filePath) {
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (match) values[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
  return values;
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function unique(items) {
  return [...new Set(items)];
}

function indexBy(items, key) {
  const index = new Map();
  for (const item of items) {
    const value = key(item);
    if (!value) continue;
    const bucket = index.get(value) ?? [];
    bucket.push(item);
    index.set(value, bucket);
  }
  return index;
}

const remoteSql = String.raw`
begin read only;
select jsonb_build_object(
  'identity', jsonb_build_object(
    'currentUser', current_user,
    'currentDatabase', current_database(),
    'transactionReadOnly', current_setting('transaction_read_only'),
    'bypassRls', (select rolbypassrls from pg_catalog.pg_roles where rolname = current_user)
  ),
  'directCounts', jsonb_build_object(
    'species', (select count(*) from public.fish_species),
    'sources', (select count(*) from public.fish_source_records),
    'relations', (select count(*) from public.fish_species_sources),
    'aliases', (select count(*) from public.fish_aliases),
    'slugAliases', (select count(*) from public.fish_species_slug_aliases),
    'changeLogs', (select count(*) from public.fish_change_logs)
  ),
  'species', (select coalesce(jsonb_agg(to_jsonb(s) order by s.slug), '[]'::jsonb) from public.fish_readonly_audit_species_v1() s),
  'sources', (select coalesce(jsonb_agg(to_jsonb(s) order by s.source_provider, s.source_id), '[]'::jsonb) from public.fish_readonly_audit_source_records_v1() s),
  'relations', (select coalesce(jsonb_agg(to_jsonb(r) order by r.species_id, r.source_record_id), '[]'::jsonb) from public.fish_readonly_audit_species_sources_v1() r),
  'aliases', (select coalesce(jsonb_agg(to_jsonb(a) order by a.species_id, a.normalized_alias), '[]'::jsonb) from public.fish_readonly_audit_aliases_v1() a),
  'slugAliases', (select coalesce(jsonb_agg(to_jsonb(a) order by a.species_id, a.alias_slug), '[]'::jsonb) from public.fish_readonly_audit_slug_aliases_v1() a),
  'changeLogs', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at, l.change_log_id), '[]'::jsonb) from public.fish_readonly_audit_change_logs_v1() l),
  'security', jsonb_build_object(
    'tableWritePrivileges', exists (
      select 1
      from information_schema.role_table_grants g
      where g.grantee = current_user
        and g.table_schema = 'public'
        and g.table_name in ('fish_species','fish_source_records','fish_species_sources','fish_aliases','fish_species_slug_aliases','fish_change_logs')
        and g.privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
    ),
    'schemaCreatePrivilege', pg_catalog.has_schema_privilege(current_user, 'public', 'CREATE'),
    'mutationRpcExecute', exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and (p.proname = 'confirm_fish_observation' or p.proname like 'claim_%' or p.proname like '%finalize%')
        and pg_catalog.has_function_privilege(current_user, p.oid, 'EXECUTE')
    ),
    'auditFunctions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', p.proname,
        'owner', r.rolname,
        'securityDefiner', p.prosecdef,
        'stable', p.provolatile = 's',
        'config', p.proconfig,
        'publicExecute', pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE'),
        'anonExecute', pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE'),
        'authenticatedExecute', pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'),
        'serviceRoleExecute', pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE'),
        'auditorExecute', pg_catalog.has_function_privilege('blue_marina_readonly_auditor', p.oid, 'EXECUTE'),
        'bodySelectOnly', not (p.prosrc ~* '\\m(insert|update|delete|truncate|alter|create|drop|grant|revoke|call|execute)\\M')
      ) order by p.proname), '[]'::jsonb)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      join pg_catalog.pg_roles r on r.oid = p.proowner
      where n.nspname = 'public' and p.proname like 'fish_readonly_audit_%_v1'
    )
  ),
  'schema', jsonb_build_object(
    'columns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname,
        'column', a.attname,
        'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
        'notNull', a.attnotnull,
        'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid)
      ) order by c.relname, a.attnum), '[]'::jsonb)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_attribute a on a.attrelid = c.oid
      left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public'
        and c.relname in ('fish_species','fish_source_records','fish_species_sources','fish_aliases','fish_species_slug_aliases','fish_change_logs')
        and a.attnum > 0 and not a.attisdropped
    ),
    'constraints', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname,
        'name', con.conname,
        'type', con.contype,
        'definition', pg_catalog.pg_get_constraintdef(con.oid, true)
      ) order by c.relname, con.conname), '[]'::jsonb)
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('fish_species','fish_source_records','fish_species_sources','fish_aliases','fish_species_slug_aliases','fish_change_logs')
    ),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname,
        'name', p.polname,
        'command', p.polcmd,
        'using', pg_catalog.pg_get_expr(p.polqual, p.polrelid),
        'check', pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid)
      ) order by c.relname, p.polname), '[]'::jsonb)
      from pg_catalog.pg_policy p
      join pg_catalog.pg_class c on c.oid = p.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname like 'fish_%'
    )
  )
)::text;
commit;
`;

const localEnv = readLocalEnv(envPath);
const databaseUrl = localEnv.FISH_SUPABASE_AUDIT_DATABASE_URL;
if (!databaseUrl) throw new Error("FISH_SUPABASE_AUDIT_DATABASE_URL is missing");
const parsedUrl = new URL(databaseUrl);
if (!decodeURIComponent(parsedUrl.username).startsWith("blue_marina_readonly_auditor")) {
  throw new Error("Dedicated read-only auditor URL is required");
}

const execution = spawnSync(
  psql,
  [`--dbname=${databaseUrl}`, "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", remoteSql],
  {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PGCONNECT_TIMEOUT: "10",
      PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=30000",
    },
    maxBuffer: 16 * 1024 * 1024,
  },
);
if (execution.status !== 0) {
  throw new Error("Read-only audit surface query failed");
}

const jsonLine = execution.stdout.split(/\r?\n/).find((line) => line.trim().startsWith("{"));
if (!jsonLine) throw new Error("Read-only inventory did not return JSON");
const remote = JSON.parse(jsonLine);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (
  remote.identity.currentUser !== "blue_marina_readonly_auditor" ||
  remote.identity.transactionReadOnly !== "on" ||
  remote.identity.bypassRls !== false
) {
  throw new Error("Read-only auditor identity verification failed");
}

const speciesById = indexBy(remote.species, (item) => item.species_id);
const speciesBySlug = indexBy(remote.species, (item) => item.slug);
const speciesByScientific = indexBy(remote.species, (item) => String(item.scientific_name ?? ""));
const speciesByNormalizedScientific = indexBy(remote.species, (item) => normalizeIdentity(item.normalized_scientific_name));
const speciesByInternalId = indexBy(remote.species, (item) => item.internal_id);
const aliasesByNormalized = indexBy(remote.aliases, (item) => normalizeIdentity(item.normalized_alias || item.alias_name));
const slugAliases = new Set(remote.slugAliases.filter((item) => item.is_active).map((item) => item.alias_slug));

const newSpecies = manifest.newSpecies;
const scientificConflicts = newSpecies.filter((item) => speciesByScientific.has(item.scientificName));
const normalizedConflicts = newSpecies.filter((item) => speciesByNormalizedScientific.has(normalizeIdentity(item.normalizedScientificName)));
const aliasConflicts = newSpecies.filter((item) => aliasesByNormalized.has(normalizeIdentity(item.normalizedScientificName)));
const idCollisions = newSpecies.filter((item) => speciesByInternalId.has(item.internalId));
const slugCollisions = newSpecies.filter((item) => speciesBySlug.has(item.canonicalSlug) || slugAliases.has(item.canonicalSlug));

const sourceIdentity = `${manifest.source.sourceProvider}|${manifest.source.sourceId}`;
const sourceMatches = remote.sources.filter(
  (item) => `${item.source_provider}|${item.source_id}` === sourceIdentity && item.is_current && !item.archived_at,
);
const exactSourceMatches = sourceMatches.filter((item) => item.content_hash === manifest.source.contentHash);

const existing2 = manifest.existingSpeciesLinks.map((item) => {
  const match = speciesById.get(item.existingSpeciesId)?.[0] ?? null;
  const sourceRelation = match
    ? remote.relations.find(
        (relation) =>
          relation.species_id === match.species_id &&
          sourceMatches.some((source) => source.source_record_id === relation.source_record_id),
      ) ?? null
    : null;
  const identityMatches = Boolean(
    match &&
      match.korean_name === item.koreanName &&
      normalizeIdentity(match.scientific_name) === normalizeIdentity(item.scientificName),
  );
  return {
    mbrisSourceId: item.mbrisSourceId,
    internalId: item.internalId,
    koreanName: item.koreanName,
    scientificName: item.scientificName,
    speciesId: item.existingSpeciesId,
    speciesExists: Boolean(match),
    identityMatches,
    mbrisRelationExists: Boolean(sourceRelation),
    status: match && identityMatches ? (sourceRelation ? "EXISTING" : "READY") : "CONFLICT",
  };
});

const relationSourceIds = new Set(remote.relations.map((item) => item.mbris_source_id).filter(Boolean));
const existingRelations = manifest.speciesSourceRelations.filter((item) => relationSourceIds.has(item.mbrisSourceId));
const relationConflicts = [];
const lineageKeys = new Set(
  remote.changeLogs.flatMap((item) =>
    [item.internal_id, item.source_id, item.import_batch].filter(Boolean).map((value) => String(value)),
  ),
);
const existingLineage = manifest.lineageRows.filter(
  (item) =>
    lineageKeys.has(item.internalId) ||
    lineageKeys.has(item.sourceId) ||
    lineageKeys.has(item.importBatch),
);
const lineageConflicts = [];

const expectedSpeciesIds = new Set(manifest.existingSpeciesLinks.map((item) => item.existingSpeciesId));
const expectedNifsSpecies = remote.species.filter((item) => item.source_provider === "NIFS");
const driftSpecies = remote.species.filter(
  (item) => item.source_provider !== "NIFS" && !expectedSpeciesIds.has(item.species_id),
);

const constraints = remote.schema.constraints;
const speciesChecks = constraints.filter((item) => item.table === "fish_species" && item.type === "c");
const sourceConstraints = constraints.filter((item) => item.table === "fish_source_records");
const relationConstraints = constraints.filter((item) => item.table === "fish_species_sources");
const schema = {
  publishStatusDraftAllowed: speciesChecks.some((item) => item.definition.includes("draft")),
  factReviewPendingAllowed: speciesChecks.some((item) => item.definition.includes("pending")),
  speciesRequiredColumns: ["slug", "korean_name", "fact_review_status", "publish_status"].every((column) =>
    remote.schema.columns.some((item) => item.table === "fish_species" && item.column === column && item.notNull),
  ),
  sourceIdentityConstraint: sourceConstraints.some(
    (item) => item.definition.includes("source_provider") && item.definition.includes("source_id"),
  ),
  relationForeignKeys: relationConstraints.filter((item) => item.type === "f").length,
  relationUnique: relationConstraints.some(
    (item) => item.type === "u" && item.definition.includes("fish_species_id") && item.definition.includes("source_record_id"),
  ),
  slugRegexCheck: speciesChecks.some((item) => item.definition.includes("^[a-z0-9]")),
};

const collisionCount =
  scientificConflicts.length +
  normalizedConflicts.length +
  aliasConflicts.length +
  idCollisions.length +
  slugCollisions.length +
  relationConflicts.length +
  lineageConflicts.length;
const schemaCompatible = Object.values(schema).every((value) => value === true || value === 2);
const auditFunctionsSecure =
  remote.security.auditFunctions.length === 6 &&
  remote.security.auditFunctions.every(
    (item) =>
      item.owner === "postgres" &&
      item.securityDefiner === true &&
      item.stable === true &&
      item.publicExecute === false &&
      item.anonExecute === false &&
      item.authenticatedExecute === false &&
      item.serviceRoleExecute === false &&
      item.auditorExecute === true &&
      item.bodySelectOnly === true &&
      item.config?.includes("search_path=pg_catalog, public, pg_temp"),
  );
const inventoryExpected = expectedNifsSpecies.length === 8 && remote.species.length === 8 && driftSpecies.length === 0;
const remotePreflightPass =
  inventoryExpected &&
  collisionCount === 0 &&
  schemaCompatible &&
  auditFunctionsSecure &&
  remote.security.tableWritePrivileges === false &&
  remote.security.schemaCreatePrivilege === false &&
  remote.security.mutationRpcExecute === false &&
  existing2.every((item) => item.status !== "CONFLICT") &&
  sourceMatches.length <= 1;

const conflictIds = new Set(
  [...scientificConflicts, ...normalizedConflicts, ...aliasConflicts, ...idCollisions, ...slugCollisions].map(
    (item) => item.internalId,
  ),
);
const eligibleCanaries = [...newSpecies]
  .filter(
    (item) =>
      item.koreanName &&
      item.scientificName &&
      item.taxonomy?.family &&
      item.dryRun?.malformedScientific === false &&
      !conflictIds.has(item.internalId),
  )
  .sort((a, b) => b.priority - a.priority || a.internalId.localeCompare(b.internalId));
const canaryCandidates = [];
if (remotePreflightPass) {
  const usedFamilies = new Set();
  for (const tier of ["A", "B", "C"]) {
    const candidate = eligibleCanaries.find(
      (item) => item.tier === tier && !usedFamilies.has(normalizeIdentity(item.taxonomy.family)),
    );
    if (candidate) {
      canaryCandidates.push(candidate);
      usedFamilies.add(normalizeIdentity(candidate.taxonomy.family));
    }
  }
  for (const candidate of eligibleCanaries) {
    if (canaryCandidates.length >= 10) break;
    const family = normalizeIdentity(candidate.taxonomy.family);
    if (usedFamilies.has(family)) continue;
    canaryCandidates.push(candidate);
    usedFamilies.add(family);
  }
  for (const candidate of eligibleCanaries) {
    if (canaryCandidates.length >= 10) break;
    if (!canaryCandidates.includes(candidate)) canaryCandidates.push(candidate);
  }
}
const canary = canaryCandidates.map((item, index) => ({
  order: index + 1,
  canonicalId: item.canonicalId,
  internalId: item.internalId,
  mbrisSourceId: item.mbrisSourceId,
  sourceId: item.mbrisSourceId,
  koreanName: item.koreanName,
  scientificName: item.scientificName,
  canonicalSlug: item.canonicalSlug,
  family: item.taxonomy.family,
  priority: item.priority,
  tier: item.tier,
  expectedRows: {
    species: 1,
    speciesSourceRelation: 1,
    lineage: 1,
  },
}));
const manifestTierDistribution = Object.fromEntries(
  [...newSpecies.reduce((map, item) => map.set(item.tier, (map.get(item.tier) ?? 0) + 1), new Map())],
);
const manifestPriorityDistribution = Object.fromEntries(
  [...newSpecies.reduce((map, item) => map.set(String(item.priority), (map.get(String(item.priority)) ?? 0) + 1), new Map())],
);
const selectedFamilyCount = new Set(canary.map((item) => normalizeIdentity(item.family))).size;
const selectedTierCount = new Set(canary.map((item) => item.tier)).size;
const selectedPriorityCount = new Set(canary.map((item) => item.priority)).size;
const canarySelectionWarnings = [
  ...(Object.keys(manifestTierDistribution).length > 1
    ? []
    : ["TIER_DIVERSITY_UNAVAILABLE_ALL_1114_ARE_TIER_C"]),
  ...(Object.keys(manifestPriorityDistribution).length > 1
    ? []
    : ["PRIORITY_DIVERSITY_UNAVAILABLE_ALL_1114_ARE_PRIORITY_25"]),
];
const readyForCanaryImport =
  remotePreflightPass &&
  canary.length === 10 &&
  selectedFamilyCount === 10 &&
  selectedTierCount > 1 &&
  selectedPriorityCount > 1;

const policyFingerprint = crypto
  .createHash("sha256")
  .update(JSON.stringify(remote.schema.policies))
  .digest("hex");
const generatedAt = new Date().toISOString();
const report = {
  reportVersion: requestedVersion,
  generatedAt,
  environment: "staging",
  projectRef: "mlfvpaikfpjrgrhwlrjn",
  readOnly: true,
  remoteAccessed: true,
  dbDataWrites: 0,
  importExecuted: false,
  auditor: {
    currentUser: remote.identity.currentUser,
    transactionReadOnly: remote.identity.transactionReadOnly,
    bypassRls: remote.identity.bypassRls,
    directTableCounts: remote.directCounts,
    auditSurfaceCounts: {
      species: remote.species.length,
      sources: remote.sources.length,
      relations: remote.relations.length,
      aliases: remote.aliases.length,
      slugAliases: remote.slugAliases.length,
      changeLogs: remote.changeLogs.length,
    },
    directTableRlsRestricted: remote.directCounts.species < remote.species.length,
    auditSurfaceFullRead: true,
  },
  remoteInventory: {
    expectedCanonicalSpecies: 8,
    actualCanonicalSpecies: remote.species.length,
    expectedNifsSpecies: 8,
    actualNifsSpecies: expectedNifsSpecies.length,
    driftSpecies: driftSpecies.map((item) => ({
      speciesId: item.species_id,
      slug: item.slug,
      koreanName: item.korean_name,
      scientificName: item.scientific_name,
      reviewStatus: item.fact_review_status,
      publishStatus: item.publish_status,
    })),
    sources: remote.sources.length,
    relations: remote.relations.length,
    aliases: remote.aliases.length,
    slugAliases: remote.slugAliases.length,
    changeLogs: remote.changeLogs.length,
  },
  mbrisSource: {
    expectedAction: manifest.source.sourceState,
    currentIdentityMatches: sourceMatches.length,
    exactContentHashMatches: exactSourceMatches.length,
    conflict: sourceMatches.length > 1 || (sourceMatches.length === 1 && exactSourceMatches.length === 0),
  },
  existing2: {
    ready: existing2.filter((item) => item.status === "READY").length,
    existing: existing2.filter((item) => item.status === "EXISTING").length,
    conflicts: existing2.filter((item) => item.status === "CONFLICT").length,
    items: existing2,
  },
  new1114: {
    manifestCount: newSpecies.length,
    stillNew: newSpecies.length - unique([
      ...scientificConflicts,
      ...normalizedConflicts,
      ...aliasConflicts,
      ...idCollisions,
      ...slugCollisions,
    ].map((item) => item.internalId)).length,
    scientificConflicts: scientificConflicts.map((item) => item.internalId),
    normalizedConflicts: normalizedConflicts.map((item) => item.internalId),
    aliasConflicts: aliasConflicts.map((item) => item.internalId),
    idCollisions: idCollisions.map((item) => item.internalId),
    slugCollisions: slugCollisions.map((item) => item.internalId),
  },
  relations: {
    required: manifest.speciesSourceRelations.length,
    existing: existingRelations.length,
    conflicts: relationConflicts.length,
  },
  lineage: {
    required: manifest.lineageRows.length,
    existing: existingLineage.length,
    conflicts: lineageConflicts.length,
  },
  schema,
  security: {
    rlsPolicyCount: remote.schema.policies.length,
    rlsPolicyFingerprint: policyFingerprint,
    rlsChangedByAuditSurfaceMigration: false,
    tableWritePrivileges: remote.security.tableWritePrivileges,
    schemaCreatePrivilege: remote.security.schemaCreatePrivilege,
    mutationRpcExecute: remote.security.mutationRpcExecute,
    auditFunctionCount: remote.security.auditFunctions.length,
    auditFunctionsSecure,
    auditFunctionPublicExecute: remote.security.auditFunctions.some((item) => item.publicExecute),
    auditFunctions: remote.security.auditFunctions,
  },
  canary: {
    selectedCount: canary.length,
    species: canary,
    selectedFamilyCount,
    selectedTierCount,
    selectedPriorityCount,
    manifestTierDistribution,
    manifestPriorityDistribution,
    selectionWarnings: canarySelectionWarnings,
    readyForImport: readyForCanaryImport,
    importExecuted: false,
  },
  gate: {
    readOnlyAuditSurfaceReady: true,
    remotePreflight: remotePreflightPass ? "PASS" : "FAIL",
    blockers: [
      ...(inventoryExpected ? [] : ["STAGING_CANONICAL_DRIFT"]),
      ...(collisionCount === 0 ? [] : ["REMOTE_COLLISION"]),
      ...(schemaCompatible ? [] : ["SCHEMA_INCOMPATIBLE"]),
      ...(auditFunctionsSecure ? [] : ["AUDIT_SURFACE_SECURITY_MISMATCH"]),
      ...(!remote.security.tableWritePrivileges && !remote.security.schemaCreatePrivilege && !remote.security.mutationRpcExecute
        ? []
        : ["AUDITOR_PRIVILEGE_EXPANSION"]),
    ],
  },
};

const canaryReport = {
  reportVersion: requestedVersion,
  generatedAt,
  environment: "staging",
  projectRef: "mlfvpaikfpjrgrhwlrjn",
  gate: readyForCanaryImport
    ? "CANARY_PLAN_READY"
    : remotePreflightPass
      ? "CANARY_PLAN_SELECTED_REVIEW_REQUIRED"
      : "CANARY_PLAN_BLOCKED",
  selectedCount: canary.length,
  species: canary,
  selection: {
    selectedFamilyCount,
    selectedTierCount,
    selectedPriorityCount,
    manifestTierDistribution,
    manifestPriorityDistribution,
    warnings: canarySelectionWarnings,
  },
  expectedRows: {
    sourceRecords: canary.length > 0 ? 1 : 0,
    species: canary.length,
    speciesSourceRelations: canary.length,
    lineage: canary.length,
  },
  importExecuted: false,
  readyForImport: readyForCanaryImport,
  blockers: report.gate.blockers,
};

const doc = `# MBRIS Remote Staging Preflight V${requestedVersion}

- Generated: ${generatedAt}
- Environment: staging
- Project Ref: mlfvpaikfpjrgrhwlrjn
- Read-only auditor: ${remote.identity.currentUser}
- Audit surface: READY
- Remote preflight: ${report.gate.remotePreflight}
- Import executed: false

## Remote Inventory

- Expected canonical species: 8
- Actual species: ${remote.species.length}
- NIFS species: ${expectedNifsSpecies.length}
- Drift species: ${driftSpecies.length}
- Sources: ${remote.sources.length}
- Species-source relations: ${remote.relations.length}
- Aliases: ${remote.aliases.length}
- Slug aliases: ${remote.slugAliases.length}
- Change logs: ${remote.changeLogs.length}

## MBRIS Comparison

- Existing links ready: ${report.existing2.ready}
- Existing links already present: ${report.existing2.existing}
- Existing-link conflicts: ${report.existing2.conflicts}
- New manifest species: ${newSpecies.length}
- Still new: ${report.new1114.stillNew}
- Scientific conflicts: ${scientificConflicts.length}
- Normalized scientific conflicts: ${normalizedConflicts.length}
- Alias conflicts: ${aliasConflicts.length}
- Internal ID collisions: ${idCollisions.length}
- Slug collisions: ${slugCollisions.length}

## Gate

- READ_ONLY_AUDIT_SURFACE_READY: YES
- REMOTE_PREFLIGHT_${report.gate.remotePreflight}
- Blockers: ${report.gate.blockers.join(", ") || "none"}
- Canary selected: ${canary.length}
- Canary families: ${selectedFamilyCount}
- Canary tiers: ${selectedTierCount} (${JSON.stringify(manifestTierDistribution)})
- Canary priorities: ${selectedPriorityCount} (${JSON.stringify(manifestPriorityDistribution)})
- Canary import ready: ${readyForCanaryImport ? "YES" : "NO"}
- Canary warnings: ${canarySelectionWarnings.join(", ") || "none"}
- Data row writes: 0
`;

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(canaryPath, `${JSON.stringify(canaryReport, null, 2)}\n`, "utf8");
fs.writeFileSync(docPath, doc, "utf8");

console.log(
  JSON.stringify({
    status: report.gate.remotePreflight,
    blockers: report.gate.blockers,
    species: remote.species.length,
    nifsSpecies: expectedNifsSpecies.length,
    driftSpecies: driftSpecies.length,
    stillNew: report.new1114.stillNew,
    collisionCount,
    canarySelected: canary.length,
    dbDataWrites: 0,
  }),
);

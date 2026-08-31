const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const candidatePath = path.join(root, "reports", "mbris", "mbris-marine-organism-candidates-v1.json");
const sourceMetadataPath = path.join(root, "data", "mbris", "raw", "catalog", "metadata.json");
const UUID_NAMESPACE = "c03e2c45-6f6d-5f17-8d4a-b33cc90af11f";
const SHARED_SOURCE_PROVIDER = "MBRIS";
const SHARED_SOURCE_ID = "mbris-national-species-catalog";

function reportPath(name, version) {
  return path.join(root, "reports", "mbris", `${name}-${version}.json`);
}

function requestedReportVersion() {
  const arg = process.argv.find((value) => value.startsWith("--report-version="));
  const version = arg ? arg.split("=", 2)[1] : "v1";
  if (!/^v[1-9][0-9]*$/.test(version)) throw new Error("REPORT_VERSION_INVALID");
  return version;
}

function uuidToBytes(uuid) {
  return Buffer.from(uuid.replaceAll("-", ""), "hex");
}

function bytesToUuid(bytes) {
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function uuidV5(name, namespace = UUID_NAMESPACE) {
  const hash = crypto.createHash("sha1").update(Buffer.concat([uuidToBytes(namespace), Buffer.from(name, "utf8")])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return bytesToUuid(hash.subarray(0, 16));
}

function normalizeScientificName(value) {
  return String(value).normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function scientificSlug(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function duplicateCount(rows, selector) {
  const counts = new Map();
  for (const row of rows) counts.set(selector(row), (counts.get(selector(row)) || 0) + 1);
  return [...counts].filter(([key, count]) => key && count > 1).length;
}

function mapReadyRecord(row) {
  const canonicalId = uuidV5(`marine-organism:${row.internalId}`);
  const sourceRecordId = uuidV5(`marine-organism-source:${SHARED_SOURCE_PROVIDER}:${SHARED_SOURCE_ID}:${row.sourceProvenance.sourceHash}`);
  return {
    canonicalId,
    sourceRecordId,
    sourceRelationId: uuidV5(`marine-organism-relation:${canonicalId}:${sourceRecordId}`),
    internalId: row.internalId,
    slug: scientificSlug(row.scientificName),
    koreanName: row.koreanName,
    scientificName: row.scientificName,
    normalizedScientificName: normalizeScientificName(row.scientificName),
    organismGroup: row.marineClass,
    taxonomy: row.taxonomy,
    sourceId: row.sourceId,
    sourceProvenance: row.sourceProvenance,
    publishStatus: "draft",
    reviewStatus: "pending",
    relation: {isPrimary: true, linkedBy: "import_review"},
    lineage: {
      sourceProvider: row.sourceProvenance.sourceProvider,
      sourceSheet: row.sourceProvenance.sourceSheet,
      sourceRow: row.sourceProvenance.sourceRow,
      sourceHash: row.sourceProvenance.sourceHash,
      internalId: row.internalId,
      candidateReport: "mbris-marine-organism-candidates-v1.json",
    },
  };
}

function buildSharedSource(mappedRows) {
  const hashes = new Set(mappedRows.map((row) => row.sourceProvenance.sourceHash));
  if (hashes.size !== 1) throw new Error("SHARED_SOURCE_HASH_MISMATCH");
  const metadata = JSON.parse(fs.readFileSync(sourceMetadataPath, "utf8"));
  const [contentHash] = hashes;
  if (metadata.sha256 !== contentHash) throw new Error("SOURCE_METADATA_HASH_MISMATCH");
  return {
    sourceRecordId: uuidV5(`marine-organism-source:${SHARED_SOURCE_PROVIDER}:${SHARED_SOURCE_ID}:${contentHash}`),
    sourceProvider: SHARED_SOURCE_PROVIDER,
    sourceId: SHARED_SOURCE_ID,
    sourceUrl: metadata.downloadPageUrl,
    rawStoragePath: "data/mbris/raw/catalog/original/mbris-national-species-catalog.xlsx",
    contentHash,
    parserVersion: "mbris-marine-organism-v1",
    crawlStatus: "complete",
    fetchedAt: metadata.downloadedAt,
    sourceMultiplicityPolicy: "one_catalog_source_record_not_one_per_organism",
  };
}

function fishCrossDomainAudit(mappedRows) {
  const result = {performed: false, internalId: 0, slug: 0, scientific: 0, matches: []};
  if (!process.argv.includes("--remote-audit")) return result;
  const helper = require("./run-canary-import-v1.cjs");
  const env = helper.readEnv(helper.auditEnvPath);
  const auditUrl = env.FISH_SUPABASE_AUDIT_DATABASE_URL;
  if (!auditUrl) throw new Error("AUDITOR_URL_MISSING");
  const [remote] = helper.runAuditor(helper.auditSql(), auditUrl);
  if (remote.identity.currentUser !== "blue_marina_readonly_auditor" || remote.identity.readOnly !== "on") {
    throw new Error("AUDITOR_IDENTITY_INVALID");
  }
  const fishByInternalId = new Map(remote.species.filter((row) => row.internal_id).map((row) => [row.internal_id, row]));
  const fishBySlug = new Map(remote.species.map((row) => [row.slug, row]));
  const fishByScientific = new Map(remote.species.filter((row) => row.scientific_name).map((row) => [normalizeScientificName(row.scientific_name), row]));
  result.performed = true;
  for (const row of mappedRows) {
    if (fishByInternalId.has(row.internalId)) result.internalId += 1;
    if (fishBySlug.has(row.slug)) result.slug += 1;
    const fish = fishByScientific.get(row.normalizedScientificName);
    if (fish) {
      result.scientific += 1;
      result.matches.push({
        internalId: row.internalId,
        scientificName: row.scientificName,
        marineOrganismSlug: row.slug,
        fishSpeciesId: fish.species_id,
        fishSlug: fish.slug,
        reason: "DOCUMENTED_CROSS_DOMAIN_SCIENTIFIC_IDENTITY",
      });
    }
  }
  return result;
}

function marineDomainAudit(mappedRows) {
  const result = {
    performed: false,
    inventory: {organisms: 0, sourceRecords: 0, sourceRelations: 0, aliases: 0, slugAliases: 0, changeLogs: 0},
    collisions: {internalId: 0, slug: 0, normalizedScientific: 0, sourceIdentity: 0},
  };
  if (!process.argv.includes("--remote-audit")) return result;
  const helper = require("./run-canary-import-v1.cjs");
  const env = helper.readEnv(helper.auditEnvPath);
  const auditUrl = env.FISH_SUPABASE_AUDIT_DATABASE_URL;
  if (!auditUrl) throw new Error("AUDITOR_URL_MISSING");
  const sql = String.raw`
begin read only;
select jsonb_build_object(
  'identity', jsonb_build_object('currentUser',current_user,'readOnly',current_setting('transaction_read_only')),
  'organisms', (select coalesce(jsonb_agg(to_jsonb(o)),'[]'::jsonb) from public.marine_organism_readonly_audit_organisms_v1() o),
  'sourceRecords', (select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from public.marine_organism_readonly_audit_source_records_v1() s),
  'sourceRelations', (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.marine_organism_readonly_audit_sources_v1() r),
  'aliases', (select count(*) from public.marine_organism_readonly_audit_aliases_v1()),
  'slugAliases', (select count(*) from public.marine_organism_readonly_audit_slug_aliases_v1()),
  'changeLogs', (select count(*) from public.marine_organism_readonly_audit_change_logs_v1())
)::text;
commit;`;
  const [remote] = helper.runAuditor(sql, auditUrl);
  if (remote.identity.currentUser !== "blue_marina_readonly_auditor" || remote.identity.readOnly !== "on") {
    throw new Error("AUDITOR_IDENTITY_INVALID");
  }
  const organismInternalIds = new Set(remote.organisms.map((row) => row.internal_id));
  const organismSlugs = new Set(remote.organisms.map((row) => row.slug));
  const organismScientific = new Set(remote.organisms.map((row) => row.normalized_scientific_name));
  const sourceIdentities = new Set(remote.sourceRecords.map((row) => `${row.source_provider}:${row.source_id}`));
  result.performed = true;
  result.inventory = {
    organisms: remote.organisms.length,
    sourceRecords: remote.sourceRecords.length,
    sourceRelations: remote.sourceRelations.length,
    aliases: Number(remote.aliases),
    slugAliases: Number(remote.slugAliases),
    changeLogs: Number(remote.changeLogs),
  };
  for (const row of mappedRows) {
    if (organismInternalIds.has(row.internalId)) result.collisions.internalId += 1;
    if (organismSlugs.has(row.slug)) result.collisions.slug += 1;
    if (organismScientific.has(row.normalizedScientificName)) result.collisions.normalizedScientific += 1;
    if (sourceIdentities.has(`${row.sourceProvenance.sourceProvider}:${row.sourceId}`)) result.collisions.sourceIdentity += 1;
  }
  return result;
}

function buildDryRun(candidateReport, reportVersion = "v1") {
  const ready = candidateReport.records.filter((row) => row.readiness === "MARINE_ORGANISM_READY");
  const mapped = ready.map(mapReadyRecord);
  const intraDomainCollisions = {
    canonicalId: duplicateCount(mapped, (row) => row.canonicalId),
    internalId: duplicateCount(mapped, (row) => row.internalId),
    scientific: duplicateCount(mapped, (row) => row.scientificName),
    normalizedScientific: duplicateCount(mapped, (row) => row.normalizedScientificName),
    slug: duplicateCount(mapped, (row) => row.slug),
    sourceIdentity: duplicateCount(mapped, (row) => row.sourceId),
    sourceRecordId: new Set(mapped.map((row) => row.sourceRecordId)).size === 1 ? 0 : 1,
    sourceRelationId: duplicateCount(mapped, (row) => row.sourceRelationId),
  };
  const fishCrossDomain = fishCrossDomainAudit(mapped);
  const marineDomain = marineDomainAudit(mapped);
  const sharedSourceRecord = buildSharedSource(mapped);
  const groupCounts = Object.fromEntries(
    [...new Set(mapped.map((row) => row.organismGroup))]
      .sort()
      .map((group) => [group, mapped.filter((row) => row.organismGroup === group).length]),
  );
  const checks = {
    inputTotal: candidateReport.records.length === 3167,
    readyMapped: mapped.length === 3016,
    reviewExcluded: candidateReport.readinessCounts.MARINE_ORGANISM_REVIEW === 93,
    outOfScopeExcluded: candidateReport.readinessCounts.OUT_OF_SCOPE === 58,
    koreanNamePresent: mapped.every((row) => row.koreanName),
    taxonomyComplete: mapped.every((row) => row.taxonomy?.phylum && row.taxonomy?.class && row.taxonomy?.order && row.taxonomy?.family && row.taxonomy?.genus),
    organismGroupMapped: mapped.every((row) => ["CRUSTACEAN","CEPHALOPOD","GASTROPOD","BIVALVE","OTHER_MOLLUSK","ECHINODERM","CNIDARIAN","OTHER_MARINE_INVERTEBRATE","OTHER_MARINE_ANIMAL"].includes(row.organismGroup)),
    slugValid: mapped.every((row) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)),
    intraDomainCollisionsZero: Object.values(intraDomainCollisions).every((count) => count === 0),
    remoteMarineCollisionsZero: !marineDomain.performed || Object.values(marineDomain.collisions).every((count) => count === 0),
  };
  const passed = Object.values(checks).every(Boolean);
  return {
    reportVersion,
    generatedAt: new Date().toISOString(),
    mode: "DRY_RUN",
    status: passed ? "MARINE_ORGANISM_IMPORT_DRY_RUN_PASS" : "MARINE_ORGANISM_IMPORT_DRY_RUN_BLOCKED",
    input: {total: 3167, ready: 3016, reviewExcluded: 93, outOfScopeExcluded: 58},
    mappedCount: mapped.length,
    excludedCount: 151,
    blockedReadyCount: passed ? 0 : mapped.length,
    groupCounts,
    checks,
    intraDomainCollisions,
    fishCrossDomain,
    marineDomain,
    sharedSourceRecord,
    crossDomainPolicy: "Fish and Marine Organism use separate table, UUID, and slug namespaces. Scientific overlap is documented and is not an intra-domain uniqueness collision.",
    sourceStrategy: "Dedicated Marine Organism source registry with stable source identity strings.",
    idempotencyKey: "internalId + sourceId + sourceHash",
    initialState: {publishStatus: "draft", reviewStatus: "pending"},
    transactionContract: {singleBatchTransaction: true, onAnyFailure: "ROLLBACK", executeImplemented: false},
    rows: mapped,
    databaseWrites: 0,
  };
}

function buildCanary(dryRun, reportVersion = dryRun.reportVersion || "v1") {
  const groups = ["CRUSTACEAN", "CEPHALOPOD", "GASTROPOD", "BIVALVE", "ECHINODERM"];
  const sharedSourceRecord = dryRun.sharedSourceRecord || buildSharedSource(dryRun.rows);
  const selected = groups
    .flatMap((group) => dryRun.rows.filter((row) => row.organismGroup === group).sort((a, b) => a.internalId.localeCompare(b.internalId)).slice(0, 2))
    .map((row) => ({
      ...row,
      sourceRecordId: sharedSourceRecord.sourceRecordId,
      sourceRelationId: uuidV5(`marine-organism-relation:${row.canonicalId}:${sharedSourceRecord.sourceRecordId}`),
      expectedRows: {organisms: 1, sourceRelations: 1, changeLogs: 1},
    }));
  return {
    reportVersion,
    generatedAt: new Date().toISOString(),
    status: selected.length === 10 ? "MARINE_ORGANISM_CANARY_PLAN_READY" : "MARINE_ORGANISM_CANARY_PLAN_BLOCKED",
    plannedCount: selected.length,
    sharedSourceRecord,
    expectedTotals: {sourceRecords: 1, organisms: 10, sourceRelations: 10, changeLogs: 10, aliases: 0, slugAliases: 0},
    groupCounts: Object.fromEntries(groups.map((group) => [group, selected.filter((row) => row.organismGroup === group).length])),
    selectionPolicy: "Two deterministic READY records per initial organism group, ordered by internal ID.",
    executionAuthorized: false,
    rows: selected,
    databaseWrites: 0,
  };
}

function main() {
  if (process.argv.includes("--execute")) throw new Error("EXECUTE_NOT_IMPLEMENTED_REQUIRES_SEPARATE_APPROVAL");
  const candidateReport = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  const reportVersion = requestedReportVersion();
  if (!process.argv.includes("--dry-run") && !process.argv.includes("--canary")) {
    throw new Error("USE_DRY_RUN_OR_CANARY");
  }
  const dryRun = buildDryRun(candidateReport, reportVersion);
  if (process.argv.includes("--dry-run")) fs.writeFileSync(reportPath("marine-organism-import-dry-run", reportVersion), `${JSON.stringify(dryRun, null, 2)}\n`);
  if (process.argv.includes("--canary")) fs.writeFileSync(reportPath("marine-organism-canary-plan", reportVersion), `${JSON.stringify(buildCanary(dryRun, reportVersion), null, 2)}\n`);
  console.log(JSON.stringify({status: dryRun.status, mappedCount: dryRun.mappedCount, checks: dryRun.checks, intraDomainCollisions: dryRun.intraDomainCollisions, fishCrossDomain: dryRun.fishCrossDomain, databaseWrites: 0}, null, 2));
  if (dryRun.status !== "MARINE_ORGANISM_IMPORT_DRY_RUN_PASS") process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {UUID_NAMESPACE, uuidV5, normalizeScientificName, scientificSlug, mapReadyRecord, buildSharedSource, buildDryRun, buildCanary, marineDomainAudit, reportPath, requestedReportVersion};

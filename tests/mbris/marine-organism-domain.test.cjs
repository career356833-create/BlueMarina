const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const migrationPath = path.join(root, "supabase", "migrations", "drafts", "202608310001_create_marine_organism_domain.sql");
const auditMigrationPath = path.join(root, "supabase", "migrations", "drafts", "staging-hotfix", "202608310002_add_marine_organism_readonly_audit_surface.sql");
const candidatePath = path.join(root, "reports", "mbris", "mbris-marine-organism-candidates-v1.json");
const phase0Path = path.join(root, "reports", "mbris", "marine-organism-phase0-v1.json");
const postcheckPath = path.join(root, "reports", "mbris", "marine-organism-schema-postcheck-v1.json");
const dryRunV2Path = path.join(root, "reports", "mbris", "marine-organism-import-dry-run-v2.json");
const canaryV2Path = path.join(root, "reports", "mbris", "marine-organism-canary-plan-v2.json");
const importer = require(path.join(root, "tools", "mbris", "import-marine-organisms.cjs"));

test("migration creates only the Marine Organism boundary", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  for (const table of [
    "marine_organisms", "marine_organism_source_records", "marine_organism_sources",
    "marine_organism_aliases", "marine_organism_slug_aliases", "marine_organism_change_logs",
  ]) assert.match(sql, new RegExp(`create table public\\.${table}\\s*\\(`));
  assert.doesNotMatch(sql, /(?:alter|insert\s+into|update|delete\s+from|drop)\s+(?:table\s+)?public\.fish_/i);
  assert.match(sql, /alter table public\.marine_organisms enable row level security/i);
  assert.match(sql, /publish_status = 'published' and review_status = 'approved'/i);
  assert.match(sql, /revoke all privileges on table public\.marine_organisms from anon, authenticated/i);
  assert.match(sql, /Audit SECURITY DEFINER functions are intentionally deferred/i);
  assert.match(sql, /revoke all on function public\.marine_organism_set_updated_at\(\) from public, anon, authenticated, service_role/i);
  assert.match(sql, /revoke all on function public\.prevent_marine_organism_slug_change\(\) from public, anon, authenticated, service_role/i);
});

test("read-only audit surface is static, definer-only, and auditor-only", () => {
  const sql = fs.readFileSync(auditMigrationPath, "utf8");
  assert.equal((sql.match(/create or replace function public\.marine_organism_readonly_audit_[a-z_]+_v1\(\)/gi) || []).length, 6);
  assert.equal((sql.match(/security definer/gi) || []).length, 6);
  assert.equal((sql.match(/\bstable\b/gi) || []).length, 6);
  assert.equal((sql.match(/set search_path = pg_catalog, public, pg_temp/gi) || []).length, 6);
  assert.equal((sql.match(/grant execute on function public\.marine_organism_readonly_audit_[a-z_]+_v1\(\) to blue_marina_readonly_auditor/gi) || []).length, 6);
  assert.equal((sql.match(/revoke all on function public\.marine_organism_readonly_audit_[a-z_]+_v1\(\) from public, anon, authenticated, service_role/gi) || []).length, 6);
  assert.doesNotMatch(sql, /\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i);
  assert.doesNotMatch(sql, /\bexecute\s+(?:format|immediate)|\bformat\s*\(/i);
});

test("dry-run maps exactly 3,016 collision-free READY records", () => {
  const candidates = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  const previousArgv = process.argv;
  process.argv = process.argv.filter((arg) => arg !== "--remote-audit");
  try {
    const report = importer.buildDryRun(candidates);
    assert.equal(report.status, "MARINE_ORGANISM_IMPORT_DRY_RUN_PASS");
    assert.equal(report.mappedCount, 3016);
    assert.equal(report.input.reviewExcluded, 93);
    assert.equal(report.input.outOfScopeExcluded, 58);
    assert.deepEqual(new Set(Object.values(report.intraDomainCollisions)), new Set([0]));
    assert.equal(report.rows.every((row) => row.koreanName && row.reviewStatus === "pending" && row.publishStatus === "draft"), true);
  } finally {
    process.argv = previousArgv;
  }
});

test("UUID and slug mapping are deterministic and canary covers five groups", () => {
  const candidates = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  const previousArgv = process.argv;
  process.argv = process.argv.filter((arg) => arg !== "--remote-audit");
  try {
    const report = importer.buildDryRun(candidates);
    const first = report.rows[0];
    assert.equal(importer.mapReadyRecord(candidates.records.find((row) => row.internalId === first.internalId)).canonicalId, first.canonicalId);
    assert.match(first.canonicalId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.match(first.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const canary = importer.buildCanary(report);
    assert.equal(canary.status, "MARINE_ORGANISM_CANARY_PLAN_READY");
    assert.equal(canary.plannedCount, 10);
    assert.deepEqual(new Set(Object.values(canary.groupCounts)), new Set([2]));
    assert.equal(new Set(canary.rows.map((row) => row.sourceRecordId)).size, 1);
    assert.equal(canary.rows[0].sourceRecordId, canary.sharedSourceRecord.sourceRecordId);
    assert.deepEqual(canary.expectedTotals, {sourceRecords: 1, organisms: 10, sourceRelations: 10, changeLogs: 10, aliases: 0, slugAliases: 0});
    assert.equal(canary.rows.every((row) => row.expectedRows.organisms === 1 && row.expectedRows.sourceRelations === 1 && row.expectedRows.changeLogs === 1), true);
  } finally {
    process.argv = previousArgv;
  }
});

test("Phase 0, schema postcheck, dry-run V2, and canary V2 form one verified gate", () => {
  const phase0 = JSON.parse(fs.readFileSync(phase0Path, "utf8"));
  const postcheck = JSON.parse(fs.readFileSync(postcheckPath, "utf8"));
  const dryRun = JSON.parse(fs.readFileSync(dryRunV2Path, "utf8"));
  const canary = JSON.parse(fs.readFileSync(canaryV2Path, "utf8"));
  assert.equal(phase0.gate, "MARINE_ORGANISM_PHASE0_PASS");
  assert.equal(postcheck.status, "MARINE_ORGANISM_SCHEMA_APPLY_PASS");
  assert.equal(postcheck.schema.tables, 6);
  assert.equal(postcheck.schema.rlsEnabled, 6);
  assert.equal(postcheck.auditSurface.auditorExecute, 6);
  assert.equal(postcheck.auditSurface.publicExecute, 0);
  assert.equal(postcheck.fishProtection.speciesBefore, 1258);
  assert.equal(postcheck.fishProtection.speciesAfter, 1258);
  assert.equal(dryRun.status, "MARINE_ORGANISM_IMPORT_DRY_RUN_PASS");
  assert.equal(dryRun.mappedCount, 3016);
  assert.equal(dryRun.marineDomain.performed, true);
  assert.deepEqual(new Set(Object.values(dryRun.marineDomain.inventory)), new Set([0]));
  assert.deepEqual(new Set(Object.values(dryRun.marineDomain.collisions)), new Set([0]));
  assert.equal(canary.plannedCount, 10);
  assert.deepEqual(new Set(Object.values(canary.groupCounts)), new Set([2]));
  assert.equal(canary.executionAuthorized, false);
});

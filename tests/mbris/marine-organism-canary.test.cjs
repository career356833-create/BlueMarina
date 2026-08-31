const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const plan = JSON.parse(fs.readFileSync(path.join(root, "reports", "mbris", "marine-organism-canary-plan-v2.json"), "utf8"));
const runner = require(path.join(root, "tools", "mbris", "run-marine-organism-canary-v1.cjs"));

test("canary plan fixes exactly ten identities on one shared source", () => {
  const rows = runner.validatePlan(plan);
  assert.equal(rows.length, 10);
  assert.equal(new Set(rows.map((row) => row.canonicalId)).size, 10);
  assert.equal(new Set(rows.map((row) => row.sourceRecordId)).size, 1);
  assert.equal(new Set(rows.map((row) => row.changeLogId)).size, 10);
  assert.deepEqual(plan.expectedTotals, {sourceRecords: 1, organisms: 10, sourceRelations: 10, changeLogs: 10, aliases: 0, slugAliases: 0});
});

test("canary transaction writes only the four approved Marine tables", () => {
  const rows = runner.validatePlan(plan);
  const sql = runner.importSql(rows, plan.sharedSourceRecord);
  const insertTables = [...sql.matchAll(/insert into public\.([a-z_]+)/gi)].map((match) => match[1]);
  assert.deepEqual(insertTables, [
    "marine_organism_source_records",
    "marine_organisms",
    "marine_organism_sources",
    "marine_organism_change_logs",
  ]);
  assert.doesNotMatch(sql, /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\.fish_/i);
  assert.equal((sql.match(/on conflict \(id\) do nothing/gi) || []).length, 4);
  assert.match(sql, /CANARY_TOTAL_VALIDATION_FAILED/);
  assert.match(sql, /CANARY_PAYLOAD_VALIDATION_FAILED/);
  assert.match(sql, /CANARY_GROUP_VALIDATION_FAILED/);
  assert.match(sql, /\bcommit;/i);
});

test("public visibility probe is read-only under anon role", () => {
  const sql = runner.publicVisibilitySql();
  assert.match(sql, /begin read only/i);
  assert.match(sql, /set local role anon/i);
  assert.match(sql, /from public\.marine_organisms/i);
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate|create|alter|drop)\b/i);
});

test("saved canary reports prove first-write, rerun, security, and Fish invariants", () => {
  const first = JSON.parse(fs.readFileSync(path.join(root, "reports", "mbris", "marine-organism-canary-import-v1.json"), "utf8"));
  const rerun = JSON.parse(fs.readFileSync(path.join(root, "reports", "mbris", "marine-organism-canary-rerun-v1.json"), "utf8"));
  const post = JSON.parse(fs.readFileSync(path.join(root, "reports", "mbris", "marine-organism-canary-postcheck-v1.json"), "utf8"));
  assert.equal(first.status, "MARINE_ORGANISM_CANARY_IMPORT_PASS");
  assert.equal(first.totalInserted, 31);
  assert.deepEqual(first.inserted, {sourceRecords: 1, organisms: 10, sourceRelations: 10, changeLogs: 10, aliases: 0, slugAliases: 0});
  assert.equal(first.publicVisible, 0);
  assert.equal(first.auditVisible, 10);
  assert.equal(rerun.status, "MARINE_ORGANISM_CANARY_RERUN_PASS");
  assert.deepEqual(new Set(Object.values(rerun.inserted)), new Set([0]));
  assert.equal(post.fishBefore.species, 1258);
  assert.deepEqual(post.fishBefore, post.fishAfter);
  assert.equal(post.marineSchemaOrRlsChanged, false);
  assert.deepEqual(new Set(Object.values(post.excludedWrites)), new Set([0]));
  assert.equal(post.readyForFullMarineOrganismImport, true);
});

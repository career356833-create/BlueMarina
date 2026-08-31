const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const dryRun = JSON.parse(fs.readFileSync(path.join(root, "reports", "mbris", "marine-organism-import-dry-run-v2.json"), "utf8"));
const canary = JSON.parse(fs.readFileSync(path.join(root, "reports", "mbris", "marine-organism-canary-plan-v2.json"), "utf8"));
const runner = require(path.join(root, "tools", "mbris", "run-marine-organism-full-import-v1.cjs"));

test("full admission fixes exactly 3,006 remaining READY identities", () => {
  const admission = runner.loadAdmission(dryRun, canary);
  assert.equal(admission.rows.length, 3006);
  assert.equal(new Set(admission.rows.map((row) => row.canonicalId)).size, 3006);
  assert.equal(new Set(admission.rows.map((row) => row.sourceId)).size, 3006);
  assert.deepEqual(runner.groupCounts(admission.rows), {CRUSTACEAN: 1065, CEPHALOPOD: 53, GASTROPOD: 1159, BIVALVE: 504, ECHINODERM: 225});
  assert.equal(admission.rows.filter((row) => row.secondaryFlag === "CROSS_DOMAIN_TRANSITIONAL_DUPLICATE").length, 3);
  assert.equal(runner.chunk(admission.rows, 100).length, 31);
});

test("each batch writes only the three approved Marine tables", () => {
  const admission = runner.loadAdmission(dryRun, canary);
  const sql = runner.batchSql(admission.rows.slice(0, 100), admission.source, true, 1);
  const tables = [...sql.matchAll(/insert into public\.([a-z_]+)/gi)].map((match) => match[1]);
  assert.deepEqual(tables, ["marine_organisms", "marine_organism_sources", "marine_organism_change_logs"]);
  assert.doesNotMatch(sql, /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\.fish_/i);
  assert.doesNotMatch(sql, /insert into public\.marine_organism_source_records/i);
  assert.equal((sql.match(/get diagnostics inserted_count = row_count/gi) || []).length, 3);
  assert.match(sql, /FULL_IMPORT_BATCH_PAYLOAD_VALIDATION_FAILED/);
  assert.match(sql, /\bbegin;/i);
  assert.match(sql, /\bcommit;/i);
});

test("public visibility probe stays read-only under anon", () => {
  const sql = runner.publicVisibilitySql();
  assert.match(sql, /begin read only/i);
  assert.match(sql, /set local role anon/i);
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate|create|alter|drop)\b/i);
});

test("saved full-import reports prove totals, security, Fish protection, and rerun", (context) => {
  const paths = {
    first: path.join(root, "reports", "mbris", "marine-organism-full-import-v1.json"),
    batches: path.join(root, "reports", "mbris", "marine-organism-full-import-batches-v1.json"),
    rerun: path.join(root, "reports", "mbris", "marine-organism-full-import-rerun-v1.json"),
    post: path.join(root, "reports", "mbris", "marine-organism-full-import-postcheck-v1.json"),
    cross: path.join(root, "reports", "mbris", "marine-organism-cross-domain-overlap-v1.json"),
  };
  if (Object.values(paths).some((file) => !fs.existsSync(file))) return context.skip("full import has not executed yet");
  const reports = Object.fromEntries(Object.entries(paths).map(([key, file]) => [key, JSON.parse(fs.readFileSync(file, "utf8"))]));
  assert.equal(reports.first.status, "FULL_MARINE_ORGANISM_IMPORT_PASS");
  assert.equal(reports.first.totalInserted, 9018);
  assert.equal(reports.batches.committed, 31);
  assert.equal(reports.rerun.status, "FULL_MARINE_ORGANISM_IMPORT_RERUN_PASS");
  assert.deepEqual(new Set(Object.values(reports.rerun.inserted)), new Set([0]));
  assert.deepEqual(reports.post.inventory, {sourceRecords: 1, organisms: 3016, sourceRelations: 3016, changeLogs: 3016, aliases: 0, slugAliases: 0});
  assert.equal(reports.post.publicVisible, 0);
  assert.equal(reports.post.auditVisible, 3016);
  assert.equal(reports.post.fishBefore.species, 1258);
  assert.equal(reports.post.fishChanged, false);
  assert.equal(reports.post.schemaRlsAclChanged, false);
  assert.equal(reports.cross.count, 3);
  assert.equal(reports.cross.rows.every((row) => row.status === "CROSS_DOMAIN_TRANSITIONAL_DUPLICATE" && row.imported && !row.fishChanged), true);
});

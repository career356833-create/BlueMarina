const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const expectedInternalIds = [
  "BM-SPECIES-000001", "BM-SPECIES-000030", "BM-SPECIES-000052", "BM-SPECIES-000063", "BM-SPECIES-000071",
  "BM-SPECIES-000072", "BM-SPECIES-000076", "BM-SPECIES-000077", "BM-SPECIES-000081", "BM-SPECIES-000087",
];

test("canary plan remains fixed to the approved ten species", () => {
  const plan = readJson("reports/mbris/mbris-canary-import-plan-v1_6.json");
  assert.equal(plan.selectedCount, 10);
  assert.deepEqual(plan.species.map((item) => item.internalId), expectedInternalIds);
  assert.equal(plan.gate, "CANARY_PLAN_APPROVED_AND_IMPORTED");
  assert.equal(plan.importExecuted, true);
});

test("first import and idempotent rerun have the exact row counts", () => {
  const first = readJson("reports/mbris/mbris-canary-import-v1.json");
  const rerun = readJson("reports/mbris/mbris-canary-import-rerun-v1.json");
  assert.equal(first.status, "CANARY_IMPORT_PASS");
  assert.deepEqual(first.inserted, {
    sourceInserted: 1,
    speciesInserted: 10,
    relationsInserted: 10,
    lineageInserted: 10,
  });
  assert.equal(rerun.status, "IDEMPOTENCY_PASS");
  assert.deepEqual(rerun.inserted, {
    sourceInserted: 0,
    lineageInserted: 0,
    speciesInserted: 0,
    relationsInserted: 0,
  });
  assert.equal(rerun.duplicateRows, 0);
});

test("postcheck preserves NIFS and keeps canary private and structurally isolated", () => {
  const post = readJson("reports/mbris/mbris-canary-postcheck-v1.json");
  assert.equal(post.status, "CANARY_POSTCHECK_PASS");
  assert.equal(post.totalSpecies, 18);
  assert.equal(post.nifsSpecies, 8);
  assert.equal(post.canarySpecies, 10);
  assert.equal(post.mbrisSourceRecords, 1);
  assert.equal(post.relations, 10);
  assert.equal(post.lineage, 10);
  assert.equal(post.publicCanaryVisibility, 0);
  assert.equal(post.auditCanaryVisibility, 10);
  assert.equal(post.allDraftPending, true);
  assert.equal(post.schemaChanged, false);
  assert.equal(post.rlsChanged, false);
  assert.equal(post.fullImportExecuted, false);
  assert.equal(post.remainingReadySpecies, 1104);
  assert.deepEqual(post.duplicates, { internalId: 0, slug: 0, relation: 0, lineage: 0 });
});

test("importer writes only the four approved Fish tables", () => {
  const source = fs.readFileSync(path.join(root, "tools/mbris/run-canary-import-v1.cjs"), "utf8");
  const tables = [...source.matchAll(/insert into public\.([a-z_]+)/gi)].map((match) => match[1]);
  assert.deepEqual(tables, ["fish_source_records", "fish_species", "fish_species_sources", "fish_change_logs"]);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const importer = require("./run-full-staging-import-v1.cjs");

const root = path.resolve(__dirname, "..", "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "reports/mbris/mbris-staging-import-manifest-v1.json"), "utf8"));
const canaryPlan = JSON.parse(fs.readFileSync(path.join(root, "reports/mbris/mbris-canary-import-plan-v1_6.json"), "utf8"));
const canaryPostcheck = JSON.parse(fs.readFileSync(path.join(root, "reports/mbris/mbris-canary-postcheck-v1.json"), "utf8"));

test("full admission is exactly 1,104 rows and excludes every blocked group", () => {
  const admission = importer.prepareAdmission(manifest, canaryPlan, canaryPostcheck);
  assert.equal(admission.remaining.length, 1104);
  assert.equal(admission.existingLinks.length, 2);
  assert.deepEqual(admission.exclusions, { review: 137, conflict: 1, nonfish: 145, malformed: 5 });
  const admitted = new Set(admission.remaining.map((item) => item.internalId));
  for (const group of [manifest.excluded.review, manifest.excluded.canonicalConflict, manifest.excluded.nonFish, manifest.excluded.malformedScientific]) {
    assert.equal(group.some((item) => admitted.has(item.internalId)), false);
  }
});

test("batch shape is eleven 100-row batches plus one 4-row batch", () => {
  const admission = importer.prepareAdmission(manifest, canaryPlan, canaryPostcheck);
  assert.deepEqual(importer.chunk(admission.remaining, 100).map((batch) => batch.length), [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 4]);
});

test("species batches preserve draft/pending and write only approved tables", () => {
  const admission = importer.prepareAdmission(manifest, canaryPlan, canaryPostcheck);
  const sql = importer.speciesBatchSql(admission.remaining.slice(0, 2), manifest.source);
  const targets = [...sql.matchAll(/insert into public\.([a-z_]+)/gi)].map((match) => match[1]);
  assert.deepEqual(targets, ["fish_species", "fish_species_sources", "fish_change_logs"]);
  assert.doesNotMatch(sql, /insert into public\.fish_source_records/i);
  assert.match(sql, /'pending','draft'/i);
  assert.match(sql, /publish_status<>'draft'/i);
  assert.match(sql, /fact_review_status<>'pending'/i);
});

test("existing exact links never insert species and remain secondary sources", () => {
  const sql = importer.existingLinksSql(manifest.existingSpeciesLinks, manifest.source);
  assert.doesNotMatch(sql, /insert into public\.fish_species\s*\(/i);
  assert.doesNotMatch(sql, /insert into public\.fish_source_records/i);
  assert.match(sql, /select i\."speciesId",src\.id,false/i);
});

test("full import artifacts record all committed batches and exact totals", () => {
  const first = JSON.parse(fs.readFileSync(path.join(root, "reports/mbris/mbris-full-import-v1.json"), "utf8"));
  const batches = JSON.parse(fs.readFileSync(path.join(root, "reports/mbris/mbris-full-import-batches-v1.json"), "utf8"));
  assert.equal(first.status, "FULL_MBRIS_IMPORT_PASS");
  assert.deepEqual(first.firstImport, {
    sourceInserted: 0,
    speciesInserted: 1104,
    relationsInserted: 1106,
    lineageInserted: 1106,
  });
  assert.equal(first.committedBatches, 12);
  assert.equal(first.failedBatches, 0);
  assert.equal(batches.status, "FULL_IMPORT_BATCHES_PASS");
  assert.deepEqual(batches.batches.map((batch) => batch.requested), [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 4]);
  assert.equal(batches.batches.every((batch) => batch.status === "COMMITTED" && batch.speciesInserted === batch.requested && batch.relationsInserted === batch.requested && batch.lineageInserted === batch.requested), true);
});

test("full rerun is idempotent and global postcheck remains private", () => {
  const rerun = JSON.parse(fs.readFileSync(path.join(root, "reports/mbris/mbris-full-import-rerun-v1.json"), "utf8"));
  const post = JSON.parse(fs.readFileSync(path.join(root, "reports/mbris/mbris-full-import-postcheck-v1.json"), "utf8"));
  assert.equal(rerun.status, "FULL_IMPORT_IDEMPOTENCY_PASS");
  assert.deepEqual(rerun.inserted, { sourceInserted: 0, speciesInserted: 0, relationsInserted: 0, lineageInserted: 0 });
  assert.deepEqual(rerun.existing2Inserted, { sourceInserted: 0, speciesInserted: 0, relationsInserted: 0, lineageInserted: 0 });
  assert.equal(post.status, "FULL_IMPORT_POSTCHECK_PASS");
  assert.equal(post.totalSpecies, 1122);
  assert.equal(post.nifsSpecies, 8);
  assert.equal(post.mbrisNewSpecies, 1114);
  assert.equal(post.mbrisRelations, 1116);
  assert.equal(post.mbrisLineage, 1116);
  assert.equal(post.publicVisibility, 0);
  assert.equal(post.auditVisibility, 1114);
  assert.equal(post.schemaChanged, false);
  assert.equal(post.rlsChanged, false);
  assert.deepEqual(post.duplicates, { speciesInternalId: 0, speciesSlug: 0, relations: 0, lineage: 0 });
  assert.equal(post.unexpectedSpecies, 0);
});

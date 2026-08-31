const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const importer = require("./run-review-ready-import-v1.cjs");

const root = path.resolve(__dirname, "../..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const reviewManifest = read("reports/mbris/mbris-review-ready-import-manifest-v1.json");
const promotion = read("reports/mbris/mbris-review-promotion-v2.json");
const legacy = read("reports/mbris/mbris-legacy-to-canonical-mapping-v2.json");
const blocked = read("reports/mbris/mbris-review-blocked-v1.json");
const baseManifest = read("reports/mbris/mbris-staging-import-manifest-v1.json");

function admission() {
  return importer.prepareAdmission(reviewManifest, promotion, legacy, blocked, baseManifest);
}

test("review admission is exactly the approved 136 legacy-linked species", () => {
  const result = admission();
  assert.equal(result.rows.length, 136);
  assert.equal(result.legacyMappings.length, 136);
  assert.equal(result.rows.every((row) => row.classification === "LINK_LEGACY_AND_PROMOTE_NEW"), true);
  assert.equal(result.rows.some((row) => row.koreanName === "참홍어" || row.scientificName === "Chaeturichthys jeoni"), false);
});

test("review import batch shape is 50, 50, 36", () => {
  assert.deepEqual(importer.chunk(admission().rows, importer.batchSize).map((batch) => batch.length), [50, 50, 36]);
});

test("review SQL writes only species, source relations, and change logs", () => {
  const result = admission();
  const sql = importer.reviewBatchSql(result.rows.slice(0, 2), result.source);
  const targets = [...sql.matchAll(/insert into public\.([a-z_]+)/gi)].map((match) => match[1]);
  assert.deepEqual(targets, ["fish_species", "fish_species_sources", "fish_change_logs"]);
  assert.doesNotMatch(sql, /insert into public\.fish_source_records/i);
  assert.match(sql, /'pending','draft'/i);
  assert.match(sql, new RegExp(importer.changeType));
  assert.match(sql, new RegExp(importer.importBatch));
});

test("review SQL has transaction, collision, and exact batch guards", () => {
  const result = admission();
  const sql = importer.reviewBatchSql(result.rows.slice(0, 2), result.source);
  assert.match(sql, /^\s*begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /REVIEW_IMPORT_SOURCE_NOT_EXACT/);
  assert.match(sql, /REVIEW_IMPORT_CROSS_IDENTITY_COLLISION/);
  assert.match(sql, /REVIEW_IMPORT_BATCH_TOTAL_VERIFY_FAILED/);
  assert.match(sql, /REVIEW_IMPORT_BATCH_STATE_VERIFY_FAILED/);
});

test("review import artifacts record the exact first-run and batch counts", () => {
  const first = read("reports/mbris/mbris-review-ready-import-v1.json");
  const batches = read("reports/mbris/mbris-review-ready-import-batches-v1.json");
  assert.equal(first.status, "MBRIS_REVIEW_READY_IMPORT_PASS");
  assert.deepEqual(first.firstImport, {
    sourceInserted: 0,
    speciesInserted: 136,
    relationsInserted: 136,
    lineageInserted: 136,
  });
  assert.equal(first.committedBatches, 3);
  assert.equal(first.failedBatches, 0);
  assert.equal(batches.status, "REVIEW_IMPORT_BATCHES_PASS");
  assert.deepEqual(batches.batchShape, [50, 50, 36]);
  assert.equal(batches.batches.every((batch) => batch.status === "COMMITTED" && batch.speciesInserted === batch.requested && batch.relationsInserted === batch.requested && batch.lineageInserted === batch.requested), true);
});

test("review rerun is idempotent and postcheck preserves security boundaries", () => {
  const rerun = read("reports/mbris/mbris-review-ready-import-rerun-v1.json");
  const post = read("reports/mbris/mbris-review-ready-import-postcheck-v1.json");
  assert.equal(rerun.status, "REVIEW_IMPORT_IDEMPOTENCY_PASS");
  assert.deepEqual(rerun.inserted, { sourceInserted: 0, speciesInserted: 0, relationsInserted: 0, lineageInserted: 0 });
  assert.deepEqual(rerun.existingSkipped, { source: 1, species: 136, relations: 136, lineage: 136 });
  assert.equal(post.status, "REVIEW_IMPORT_POSTCHECK_PASS");
  assert.equal(post.totalSpecies, 1258);
  assert.equal(post.nifsSpecies, 8);
  assert.equal(post.previousMbrisSpecies, 1114);
  assert.equal(post.reviewSpecies, 136);
  assert.equal(post.totalMbrisRelations, 1252);
  assert.equal(post.totalMbrisLineage, 1252);
  assert.equal(post.publicVisibility, 0);
  assert.equal(post.auditVisibility, 136);
  assert.equal(post.schemaChanged, false);
  assert.equal(post.rlsChanged, false);
  assert.equal(post.fishDataModified, false);
  assert.deepEqual(post.duplicates, { speciesInternalId: 0, speciesSlug: 0, relations: 0, lineage: 0 });
  assert.deepEqual(post.excludedWrites, { blockedKorean: 0, conflict: 0, nonFish: 0, malformed: 0 });
});

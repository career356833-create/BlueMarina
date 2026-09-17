const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const runtimePath = path.join(root, "src/data/fishing-spots.json");
const runtimeBefore = fs.readFileSync(runtimePath, "utf8");
const modulePromise = import(pathToFileURL(path.join(root, "tools/fishing-spots/verify-coordinate-lineage.mjs")));

test("traces all 1,405 source rows without mutating runtime data", async () => {
  const { buildAudit } = await modulePromise;
  const { report } = buildAudit();
  assert.equal(report.dataset.totalSpots, 1405);
  assert.equal(report.dataset.sourceRowsTraced, 1405);
  assert.equal(report.rowLineage.length, 1405);
  assert.equal(fs.readFileSync(runtimePath, "utf8"), runtimeBefore);
  assert.deepEqual(report.invariants, {
    coordinateMutation: 0,
    mergeDelete: 0,
    runtimeChanges: 0,
    databaseSupabaseChanges: 0,
    navigationEligibilityChanges: 0,
  });
});

test("reproduces the preserved recovery and partial lineage paths", async () => {
  const { buildAudit } = await modulePromise;
  const { report } = buildAudit();
  assert.equal(report.lineage.confirmed, 979);
  assert.equal(report.lineage.partial, 426);
  assert.equal(report.lineage.unresolved, 0);
  assert.equal(report.lineage.mismatch, 0);
  assert.equal(report.reproducibility.recoveredEpsg5179Path.withinTolerance, 979);
  assert.equal(report.reproducibility.recoveredEpsg5179Path.checksumChainVerified, true);
});

test("reproduces six exact groups, two cross-region groups, and one near pair", async () => {
  const { buildAudit } = await modulePromise;
  const { report } = buildAudit();
  assert.equal(report.duplicateSummary.groups, 6);
  assert.equal(report.duplicateSummary.spots, 13);
  assert.equal(report.duplicateSummary.crossRegionGroups, 2);
  assert.equal(report.duplicateSummary.crossRegionSpots, 4);
  assert.equal(report.nearDuplicates.length, 1);
  assert.deepEqual(report.nearDuplicates[0].spots, ["rock-151", "rock-265"]);
  assert.equal(report.duplicateSummary.transformationCollisions, 0);
});

test("keeps review candidates non-mutating and without invented coordinates", async () => {
  const { buildAudit } = await modulePromise;
  const first = buildAudit();
  const second = buildAudit();
  assert.deepEqual(first, second);
  assert.equal(first.report.repair.applied, false);
  assert.equal(first.review.candidates.every((candidate) => candidate.action === "REVIEW_ONLY"), true);
  assert.equal(first.review.candidates.every((candidate) => candidate.candidateCoordinate === null), true);
  assert.equal(first.review.candidates.some((candidate) => /^\d(?:\.\d+)?$/.test(candidate.confidence)), false);
});

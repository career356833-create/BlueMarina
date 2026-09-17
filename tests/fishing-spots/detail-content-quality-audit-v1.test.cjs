const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  APPROVED_ALIASES,
  auditFishingSpots,
  coordinateStatus,
  nameSimilarity,
} = require("../../tools/fishing-spots/audit-detail-content-quality.cjs");

const root = path.resolve(__dirname, "../..");
const sourceText = fs.readFileSync(path.join(root, "src/data/fishing-spots.json"), "utf8");
const spots = JSON.parse(sourceText);
const first = auditFishingSpots(spots);

test("audits the immutable 1,405 spot runtime source", () => {
  assert.equal(first.report.dataset.totalSpots, 1405);
  assert.equal(first.report.dataset.mutated, false);
  assert.equal(JSON.stringify(spots), JSON.stringify(JSON.parse(sourceText)));
});

test("reproduces 1,386 mapped and 19 unmapped spots", () => {
  assert.equal(first.report.species.mappedSpots, 1386);
  assert.equal(first.report.species.unmappedSpots, 19);
  assert.equal(first.report.species.mappedSpots + first.report.species.unmappedSpots, 1405);
});

test("preserves only the two approved aliases and forbids fuzzy mapping", () => {
  assert.deepEqual(APPROVED_ALIASES, { 광어: "넙치", 우럭: "조피볼락" });
  assert.equal(first.report.species.fuzzyMapping, false);
  assert.equal(first.report.species.mappingMode, "EXACT_PLUS_APPROVED_ALIAS_ONLY");
});

test("coordinate validation separates missing invalid outlier and valid", () => {
  assert.equal(coordinateStatus({ lat: "", lng: "127" }), "MISSING");
  assert.equal(coordinateStatus({ lat: "not-a-number", lng: "127" }), "INVALID");
  assert.equal(coordinateStatus({ lat: "127", lng: "35" }), "INVALID");
  assert.equal(coordinateStatus({ lat: "40", lng: "127" }), "OUTLIER_REVIEW");
  assert.equal(coordinateStatus({ lat: "35", lng: "127" }), "VALID");
});

test("detects exact coordinate groups without mutating or merging", () => {
  const fixture = [
    { ...spots[0], id: "fixture-1", name: "같은 점 A", lat: "35", lng: "127" },
    { ...spots[1], id: "fixture-2", name: "같은 점 B", lat: "35", lng: "127" },
  ];
  const audit = auditFishingSpots(fixture).report;
  assert.equal(audit.coordinates.duplicateCoordinateGroups, 1);
  assert.equal(audit.duplicates.sameCoordinateDifferentNameGroups.length, 1);
  assert.equal(audit.duplicates.automaticMergePerformed, false);
  assert.equal(audit.completeness.categories.REVIEW_REQUIRED, 2);
});

test("detects a near duplicate only as a review candidate", () => {
  assert.ok(nameSimilarity("구조라항 갯바위", "구조라항 갯바위 부근") >= 0.72);
  const fixture = [
    { ...spots[0], id: "near-1", name: "구조라항 갯바위", lat: "34.800000", lng: "128.690000" },
    { ...spots[1], id: "near-2", name: "구조라항 갯바위 부근", lat: "34.800300", lng: "128.690000" },
  ];
  const result = auditFishingSpots(fixture);
  assert.equal(result.report.duplicates.nearDuplicateCandidates.length, 1);
  assert.ok(result.reviewCandidates.every((candidate) => candidate.reasons.includes("NEAR_DUPLICATE_CANDIDATE")));
});

test("reports missing provenance and the minimum detail gate", () => {
  const fixture = [{ ...spots[0], id: "missing-source-1", sourceName: "", sourceUrl: "", sourceCheckedAt: "" }];
  const result = auditFishingSpots(fixture);
  assert.equal(result.report.provenance.missing, 1);
  assert.equal(result.report.minimumDetailGate.failed, 1);
  assert.ok(result.reviewCandidates[0].reasons.includes("MISSING_PROVENANCE"));
});

test("produces deterministic reports and does not mutate input", () => {
  const before = JSON.stringify(spots);
  const second = auditFishingSpots(spots);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(spots), before);
});

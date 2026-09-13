/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const tool = require(path.join(root, "tools/fishing-condition/build-preferred-temperature-deep-research-batch1.cjs"));
const data = tool.buildData();
const report = tool.buildReport(data);

function hash(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

test("contains exactly the three canonical batch species", () => {
  assert.deepEqual(data.species.map((item) => [item.speciesId, item.speciesName, item.scientificName]), [
    ["BM-SPECIES-000755", "참돔", "Pagrus major"],
    ["BM-SPECIES-000012", "조피볼락", "Sebastes schlegelii"],
    ["BM-SPECIES-000501", "방어", "Seriola quinqueradiata"],
  ]);
});

test("meets search-depth requirements without padding unrelated sources", () => {
  for (const item of report.species) {
    assert.ok(item.officialPublicSourceCount >= 2, item.speciesName);
    assert.ok(item.peerReviewedCandidateCount >= 5, item.speciesName);
    assert.equal(item.telemetryOrTaggingChecked, true, item.speciesName);
    assert.equal(item.japaneseLiteratureChecked, true, item.speciesName);
    assert.equal(item.koreanLiteratureChecked, true, item.speciesName);
  }
});

test("every evidence record has the required research contract", () => {
  for (const item of data.evidence) {
    for (const field of ["speciesId", "speciesName", "scientificName", "evidenceId", "sourceTitle", "authors", "year", "publisherOrJournal", "sourceType", "urlOrDoi", "accessDate", "geographicContext", "lifeStage", "wildCaptiveContext", "method", "temperature", "semanticClass", "sourceStatementSummary", "strictEligible", "rejectionReason", "limitations"])
      assert.ok(Object.hasOwn(item, field), `${item.evidenceId}:${field}`);
    assert.ok(tool.semanticClasses.includes(item.semanticClass), item.evidenceId);
    assert.equal(item.temperature.unit, "degC");
  }
});

test("juvenile, aquaculture, occurrence, modelled and observed evidence is never promoted", () => {
  const blockedClasses = new Set(["LAB_PREFERENCE", "JUVENILE_ONLY", "AQUACULTURE", "FIELD_OCCURRENCE", "MODELLED_DISTRIBUTION", "WILD_OBSERVED", "CAPTIVE"]);
  for (const item of data.evidence.filter((record) => blockedClasses.has(record.semanticClass))) assert.equal(item.strictEligible, false, item.evidenceId);
});

test("selected-habitat labels still require temperature-selection proof", () => {
  const selected = data.evidence.filter((item) => item.semanticClass === "WILD_SELECTED_HABITAT");
  assert.ok(selected.length >= 2);
  assert.equal(selected.every((item) => item.strictEligible === false && item.rejectionReason.length > 20), true);
});

test("strict criteria yield no direct expansion and preserve separate promotion review", () => {
  assert.equal(report.decision, "NO_STRICT_EXPANSION");
  assert.equal(report.strict.before, 1);
  assert.equal(report.strict.evidenceFoundCandidates, 0);
  assert.equal(report.species.every((item) => item.promotionDecision === "PROMISING_BUT_LIMITED"), true);
});

test("V2 and V3 remain byte-for-byte immutable", () => {
  for (const [name, [relativePath, expected]] of Object.entries(tool.IMMUTABLE)) {
    assert.equal(hash(relativePath), expected, name);
    assert.equal(report.immutableInputs[name], expected, name);
  }
});

test("research artifacts do not enable runtime, canonical promotion, or scoring", () => {
  assert.deepEqual(data.boundaries, { v2Modified: false, v3Modified: false, runtimeImport: false, canonicalPromotion: false, scoring: false });
  assert.equal(report.boundaries.runtimeChanges, false);
  assert.equal(report.boundaries.canonicalPromotion, false);
  assert.deepEqual(report.scoringBoundary, { normalization: "NORMALIZATION_NOT_JUSTIFIED", score: false, weight: false, probability: false, ranking: false, recommendation: false });
});

test("saved artifacts match deterministic builders", () => {
  const savedData = JSON.parse(fs.readFileSync(path.join(root, tool.DATA_PATH), "utf8"));
  const savedReport = JSON.parse(fs.readFileSync(path.join(root, tool.REPORT_PATH), "utf8"));
  assert.deepEqual(savedData, data);
  assert.deepEqual(savedReport, report);
  assert.deepEqual(tool.buildData(), tool.buildData());
  assert.deepEqual(tool.buildReport(tool.buildData()), tool.buildReport(tool.buildData()));
});

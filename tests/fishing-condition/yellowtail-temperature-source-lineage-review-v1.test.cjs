/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const reportPath = path.join(root, "reports/fishing-condition/yellowtail-temperature-source-lineage-review-v1.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

const validSourceTypes = new Set([
  "PRIMARY_EMPIRICAL",
  "PRIMARY_OBSERVATIONAL",
  "PRIMARY_EXPERIMENTAL",
  "REVIEW",
  "SECONDARY_SUMMARY",
  "TEXTBOOK",
  "INSTITUTIONAL_BACKGROUND",
  "UNCITED_STATEMENT",
  "UNKNOWN",
]);

function hash(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

test("preserves the canonical yellowtail identity and captures the starting claim", () => {
  assert.deepEqual(report.species, {
    speciesId: "BM-SPECIES-000501",
    koreanName: "방어",
    scientificName: "Seriola quinqueradiata",
  });
  assert.deepEqual(report.startingClaim.numericRange, {
    min: 10,
    max: 20,
    unit: "degC",
    precisionQualifier: "EXACT_IN_PRINT_NO_APPROXIMATION_QUALIFIER",
  });
  assert.match(report.startingClaim.exactWording, /selecting coastal waters/i);
});

test("structures every lineage node with a valid source classification", () => {
  assert.ok(report.citationChain.length > 0);
  for (const node of report.citationChain) {
    assert.ok(node.nodeId);
    assert.ok(validSourceTypes.has(node.sourceType), node.sourceType);
    assert.ok(Object.hasOwn(node, "nextUpstreamSource"));
    assert.ok(node.traceStatus);
  }
});

test("keeps semantics, life stage, field status, and range origin explicit", () => {
  assert.equal(report.semanticAnalysis.operativeTerm, "selecting");
  assert.equal(report.semanticAnalysis.validatedSemanticClass, "UNCITED_SELECTED_WORDING");
  assert.equal(report.applicability.adultApplicability, "NOT_ESTABLISHED");
  assert.equal(report.applicability.strictWildSelectionEvidence, false);
  assert.equal(report.rangeOrigin.min10Origin, "UNDOCUMENTED");
  assert.equal(report.rangeOrigin.max20Origin, "UNDOCUMENTED");
  assert.equal(report.rangeOrigin.selectedRangeFromAnalysis, false);
});

test("does not promote unresolved lineage", () => {
  assert.equal(report.finalLineageDecision, "LINEAGE_UNRESOLVED");
  assert.equal(report.strictEligibility.eligible, false);
  assert.ok(report.strictEligibility.blockers.length >= 5);
  assert.deepEqual(report.promotion, {
    performed: false,
    deferred: true,
    canonicalTemperatureChanged: false,
  });
});

test("keeps V2 and V3 byte-for-byte immutable", () => {
  assert.equal(hash("data/fishing-condition/species-environment/v2/species-environment-profiles.json"), report.immutableInputs.v2Sha256);
  assert.equal(hash("data/fishing-condition/species-environment/v3/species-environment-profiles.json"), report.immutableInputs.v3Sha256);
});

test("does not import runtime behavior or scoring", () => {
  assert.deepEqual(report.boundaries, {
    v2Modified: false,
    v3Modified: false,
    runtimeImport: false,
    databaseWrite: false,
    supabaseChange: false,
    canonicalPromotion: false,
  });
  assert.deepEqual(report.scoringBoundary, {
    normalization: "NORMALIZATION_NOT_JUSTIFIED",
    score: false,
    weight: false,
    probability: false,
    ranking: false,
    recommendation: false,
  });
});

test("preserves the unrelated yellowtail depth conflict", () => {
  assert.deepEqual(report.existingDepthConflict, {
    status: "CONFLICT_REVIEW_REQUIRED",
    mbrisMaxM: 200,
    fishBaseMaxM: 100,
    canonicalDepth: null,
    changed: false,
  });
});

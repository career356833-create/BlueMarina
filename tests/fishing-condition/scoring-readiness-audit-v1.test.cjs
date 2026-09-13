const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const tool = require(path.join(root, "tools/fishing-condition/audit-scoring-readiness.cjs"));
const reportPath = path.join(root, "reports/fishing-condition/scoring-readiness-audit-v1.json");
const profilePath = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const policyPath = path.join(root, "data/fishing-condition/source-policy/v1/source-policy.json");
const rulePath = path.join(root, "data/fishing-condition/suitability-rule/v1/suitability-rules.json");
const fixedAt = "2026-09-13T00:00:00.000Z";

function hash(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function build() { return tool.buildAudit({ root, generatedAt: fixedAt }); }
function keys(value, output = []) { if (!value || typeof value !== "object") return output; for (const [key, child] of Object.entries(value)) { output.push(key.toLowerCase()); keys(child, output); } return output; }

test("audits exactly ten canonical species and at least twelve variables", () => {
  const report = build();
  assert.equal(report.speciesCount, 10);
  assert.equal(report.species.length, 10);
  assert.equal(new Set(report.species.map((item) => item.speciesId)).size, 10);
  assert.equal(report.variableCount, 13);
});

test("temperature coverage separates strict, modelled, regional, captive and missing ranges", () => {
  const report = build();
  assert.equal(report.coverage.temperature, 9);
  assert.equal(report.candidateCounts.strictFields, 1);
  assert.equal(report.candidateCounts.speciesWithStrictCandidate, 1);
  assert.equal(report.species.find((item) => item.name === "고등어").temperatureReadiness, "SCORING_CANDIDATE");
  assert.equal(report.species.find((item) => item.name === "참돔").temperatureReadiness, "LIMITED_CANDIDATE");
  assert.equal(report.species.find((item) => item.name === "방어").temperatureReadiness, "NOT_READY");
  assert.equal(report.species.find((item) => item.name === "갈치").temperatureReadiness, "INSUFFICIENT_EVIDENCE");
});

test("salinity remains blocked for every species because the runtime unit gate is unresolved", () => {
  const report = build();
  assert.equal(report.variables.find((item) => item.variable === "salinity").readiness, "BLOCKED");
  assert.equal(report.species.every((item) => item.salinityReadiness === "BLOCKED"), true);
});

test("dissolved oxygen coverage is sparse and only one profile reaches limited comparison", () => {
  const report = build();
  const variable = report.variables.find((item) => item.variable === "dissolvedOxygen");
  assert.equal(report.coverage.dissolvedOxygen, 3);
  assert.equal(variable.comparatorAvailability, 1);
  assert.equal(report.species.filter((item) => item.dissolvedOxygenReadiness === "LIMITED_CANDIDATE").length, 1);
});

test("seasonality contexts remain categorical and activity remains time-context dependent", () => {
  const report = build();
  assert.equal(report.coverage.seasonalityMonthComparable, 6);
  assert.equal(report.coverage.activity, 4);
  assert.equal(report.variables.find((item) => item.variable === "seasonality").readiness, "NOT_READY");
  assert.ok(report.variables.find((item) => item.variable === "seasonality").limitations.includes("CONTEXTS_MUST_REMAIN_SEPARATE"));
  assert.ok(report.variables.find((item) => item.variable === "activity").limitations.includes("NO_RUNTIME_TIME_COMPARATOR"));
});

test("context-only and baseline-only variables are excluded from numeric candidacy", () => {
  const report = build();
  for (const name of ["habitat", "wave", "wind", "pressure", "currentSpeed", "tide"]) assert.equal(report.variables.find((item) => item.variable === name).readiness, "CONTEXT_ONLY");
  assert.equal(report.variables.find((item) => item.variable === "climatologyAnomaly").readiness, "BASELINE_ONLY");
  assert.equal(report.variables.find((item) => item.variable === "currentDirection").readiness, "BLOCKED");
});

test("the amberjack depth conflict remains visible and unresolved", () => {
  const amberjack = build().species.find((item) => item.name === "방어");
  assert.deepEqual(amberjack.unresolvedConflicts.map((item) => item.field), ["depth.observed"]);
  assert.equal(amberjack.unresolvedConflicts[0].status, "CONFLICT_REVIEW_REQUIRED");
});

test("report generation is deterministic for identical artifacts and timestamp", () => {
  assert.deepEqual(build(), build());
});

test("audit output has no numeric result, coefficient, probability, ordering, or advice fields", () => {
  const report = build();
  const allKeys = keys(report);
  for (const forbidden of ["score", "suitabilityscore", "fishingscore", "conditionscore", "probability", "ranking", "recommendation", "weight", "formula"]) assert.equal(allKeys.includes(forbidden), false);
  for (const value of Object.values(report.invariants)) assert.equal(value, false);
});

test("saved report matches deterministic content except its generation timestamp", () => {
  const saved = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const expected = build();
  expected.generatedAt = saved.generatedAt;
  assert.deepEqual(saved, expected);
});

test("audit generation does not mutate V2, Source Policy V1, or Suitability Rule V1 artifacts", () => {
  const before = [hash(profilePath), hash(policyPath), hash(rulePath)];
  build();
  assert.deepEqual([hash(profilePath), hash(policyPath), hash(rulePath)], before);
});

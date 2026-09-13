/* eslint-disable @typescript-eslint/no-require-imports, @next/next/no-assign-module-variable */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const toolPath = path.join(root, "tools/fishing-condition/experiment-temperature-relation-distance.cjs");
const reportPath = path.join(root, "reports/fishing-condition/temperature-relation-distance-experiment-v1.json");
const profilePath = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const policyPath = path.join(root, "data/fishing-condition/source-policy/v1/source-policy.json");
const rulePath = path.join(root, "data/fishing-condition/suitability-rule/v1/suitability-rules.json");
const comparatorPath = path.join(root, "src/lib/fishing-condition/comparator.ts");
const fixedAt = "2026-09-13T00:00:00.000Z";
const tool = require(toolPath);

function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const comparator = loadTs(comparatorPath);
function build() { return tool.buildExperiment({ root, generatedAt: fixedAt }); }
function hash(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function boundary(value) { return build().cases.find((item) => item.caseType === "SYNTHETIC_BOUNDARY" && item.observedValue === value); }
function allKeys(value, output = []) { if (!value || typeof value !== "object") return output; for (const [key, child] of Object.entries(value)) { output.push(key.toLowerCase()); allKeys(child, output); } return output; }

test("scope is exactly canonical mackerel temperature from explicit NIFS RISA", () => {
  const report = build();
  assert.equal(report.speciesId, "BM-SPECIES-000417");
  assert.equal(report.speciesName, "고등어");
  assert.equal(report.variable, "temperature");
  assert.equal(report.sourceId, "nifs-risa");
});

test("profile preserves the canonical Korean preferred range and evidence context", () => {
  const profile = build().profile;
  assert.deepEqual({ min: profile.min, max: profile.max, unit: profile.unit, rangeType: profile.rangeType }, { min: 15, max: 16, unit: "degC", rangeType: "PREFERRED" });
  assert.equal(profile.rangeContext, "PREFERRED_TEMPERATURE");
  assert.deepEqual(profile.evidenceRefs, ["mackerel-mbris"]);
  assert.equal(profile.evidence[0].evidenceType, "PREFERRED_TEMPERATURE_DEPTH_MIGRATION_FEEDING");
});

test("exact minimum, midpoint and maximum are within range with zero distance", () => {
  for (const value of [15, 15.5, 16]) {
    assert.deepEqual({ relation: boundary(value).relation, signed: boundary(value).signedDistanceToRange, absolute: boundary(value).absoluteDistanceToRange }, { relation: "WITHIN_RANGE", signed: 0, absolute: 0 });
  }
});

test("below-range cases preserve negative signed direction and absolute magnitude", () => {
  for (const [value, distance] of [[5, -10], [10, -5], [14, -1]]) {
    assert.equal(boundary(value).relation, "BELOW_RANGE");
    assert.equal(boundary(value).signedDistanceToRange, distance);
    assert.equal(boundary(value).absoluteDistanceToRange, Math.abs(distance));
  }
});

test("above-range cases preserve positive signed direction and absolute magnitude", () => {
  for (const [value, distance] of [[17, 1], [21, 5], [26, 10]]) {
    assert.equal(boundary(value).relation, "ABOVE_RANGE");
    assert.equal(boundary(value).signedDistanceToRange, distance);
    assert.equal(boundary(value).absoluteDistanceToRange, distance);
  }
});

test("range width and research ratio remain descriptive and unclamped", () => {
  const report = build();
  assert.equal(report.cases.every((item) => item.rangeWidth === 1), true);
  assert.equal(boundary(26).researchNormalizedDistance, 10);
  assert.equal(report.normalizationDecision, "NORMALIZATION_NOT_JUSTIFIED");
});

test("all cases agree with the existing comparator relation", () => {
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8")).profiles.find((item) => item.speciesId === "BM-SPECIES-000417");
  for (const item of build().cases) {
    const environment = { sourceId: "nifs-risa", provider: "NIFS", qualityClass: "OBSERVED", stationOrSiteId: "explicit", observedAt: "2026-09-10T00:00:00Z", freshness: "fresh", depthContext: "SURFACE", exactDepthM: null, stationWaterDepthM: null, temperature: { value: item.observedValue, unit: "degC" }, salinity: { value: null, unit: null }, dissolvedOxygen: { value: null, unit: null }, chlorophyllA: { value: null, unit: null } };
    assert.equal(comparator.compareFishingCondition(profile, environment).comparisons.temperature.relation, item.relation);
  }
});

test("source-backed RISA example retains explicit observation provenance", () => {
  const item = build().cases.find((candidate) => candidate.sourceObservation);
  assert.equal(item.observedValue, 25.5);
  assert.equal(item.relation, "ABOVE_RANGE");
  assert.equal(item.sourceContext.sourceId, "nifs-risa");
  assert.equal(item.sourceContext.depthContext, "SURFACE");
});

test("experiment is deterministic for identical inputs and timestamp", () => {
  assert.deepEqual(build(), build());
});

test("saved report matches deterministic output except generation time", () => {
  const saved = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const expected = build();
  expected.generatedAt = saved.generatedAt;
  assert.deepEqual(saved, expected);
});

test("artifact exposes no numeric assessment, probability, ordering or advice keys", () => {
  const keys = allKeys(build());
  for (const forbidden of ["score", "normalizedscore", "suitabilityscore", "conditionscore", "fishingscore", "probability", "ranking", "recommendation", "coefficient", "threshold", "grade"]) assert.equal(keys.includes(forbidden), false);
  assert.equal(build().productionApproved, false);
});

test("tool has no runtime, database, network, AI or curve integration", () => {
  const source = fs.readFileSync(toolPath, "utf8");
  assert.doesNotMatch(source, /createClient\(|postgres\(|fetch\(|https?\.request|openai|sigmoid|logistic|gaussian|bell curve|triangular membership/i);
  const search = require("node:child_process").spawnSync("rg", ["-l", "temperature-relation-distance-experiment-v1|experiment-temperature-relation-distance", "src"], { cwd: root, encoding: "utf8" });
  assert.equal(search.status, 1);
  assert.equal(search.stdout.trim(), "");
});

test("building does not mutate profile, source policy or suitability rule", () => {
  const before = [hash(profilePath), hash(policyPath), hash(rulePath)];
  build();
  assert.deepEqual([hash(profilePath), hash(policyPath), hash(rulePath)], before);
});

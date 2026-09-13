const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const servicePath = path.join(root, "src/lib/fishing-condition/suitability-rule.ts");
const artifactPath = path.join(root, "data/fishing-condition/suitability-rule/v1/suitability-rules.json");
const reportPath = path.join(root, "reports/fishing-condition/suitability-rule-v1-quality.json");
const multiPath = path.join(root, "src/lib/fishing-condition/multi-source-evidence.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/multi-source-evidence-server.ts");

function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const rules = loadTs(servicePath);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

function policy({
  variable = "temperature",
  sourceId = "nifs-risa",
  configuredAction = "COMPARISON_ALLOWED",
  action = configuredAction,
  requiredGates = ["UNIT_CONFIRMED", "SPECIES_PROFILE_SUPPORTED", "DEPTH_COMPATIBLE"],
  passedGates = requiredGates,
  failedGates = [],
  limitations = [],
} = {}) {
  return {
    variable, sourceId, sourceQualityClass: "OBSERVED", configuredAction, action, reason: "TEST",
    requiredGates, passedGates, failedGates, limitations, qualityClass: "DERIVED_SOURCE_POLICY",
  };
}

function evaluate(overrides = {}) {
  return rules.evaluateSuitabilityRule({
    variable: "temperature",
    relation: "WITHIN_RANGE",
    sourcePolicy: policy(),
    freshness: "fresh",
    depthStatus: "CATEGORY_MATCH",
    evidenceRefs: ["temperature-evidence"],
    ...overrides,
  });
}

test("temperature relations map deterministically without recalculation", () => {
  assert.equal(evaluate().ruleStatus, "INTERPRETABLE_MATCH");
  assert.equal(evaluate({ relation: "BELOW_RANGE" }).ruleStatus, "INTERPRETABLE_BELOW");
  assert.equal(evaluate({ relation: "ABOVE_RANGE" }).ruleStatus, "INTERPRETABLE_ABOVE");
  assert.deepEqual(evaluate(), evaluate());
});

test("limited source and stale freshness preserve the comparator relation", () => {
  const limitedPolicy = policy({ sourceId: "nifs-femo-sea", configuredAction: "COMPARISON_ALLOWED_WITH_LIMITS" });
  const periodic = evaluate({ sourcePolicy: limitedPolicy });
  const stale = evaluate({ freshness: "stale" });
  assert.equal(periodic.ruleStatus, "LIMITED_INTERPRETATION");
  assert.equal(periodic.relation, "WITHIN_RANGE");
  assert.equal(stale.ruleStatus, "LIMITED_INTERPRETATION");
  assert.equal(stale.relation, "WITHIN_RANGE");
  assert.ok(stale.limitations.includes("STALE_SOURCE"));
});

test("unavailable has highest constraint priority", () => {
  const blocked = policy({ configuredAction: "BLOCKED", action: "BLOCKED", failedGates: ["UNIT_CONFIRMED"] });
  const result = evaluate({ sourcePolicy: blocked, freshness: "unavailable" });
  assert.equal(result.ruleStatus, "UNAVAILABLE");
  assert.equal(result.relation, null);
});

test("explicit policy block differs from a comparison gate block", () => {
  const salinity = policy({ variable: "salinity", sourceId: "nifs-femo-sea", configuredAction: "BLOCKED", action: "BLOCKED", requiredGates: ["UNIT_CONFIRMED"], passedGates: [], failedGates: ["UNIT_CONFIRMED"], limitations: ["UNIT_UNVERIFIED"] });
  const gated = policy({ action: "BLOCKED", failedGates: ["DEPTH_COMPATIBLE"], passedGates: ["UNIT_CONFIRMED", "SPECIES_PROFILE_SUPPORTED"] });
  assert.equal(evaluate({ variable: "salinity", sourcePolicy: salinity }).ruleStatus, "BLOCKED_BY_POLICY");
  assert.equal(evaluate({ sourcePolicy: gated }).ruleStatus, "BLOCKED_BY_GATE");
});

test("unsupported profile, unresolved depth and unverified units cannot be interpreted", () => {
  assert.equal(evaluate({ relation: "UNSUPPORTED_PROFILE" }).ruleStatus, "UNSUPPORTED");
  assert.equal(evaluate({ relation: "DEPTH_CONTEXT_UNRESOLVED", depthStatus: "UNRESOLVED" }).ruleStatus, "BLOCKED_BY_GATE");
  assert.equal(evaluate({ relation: "UNIT_UNVERIFIED" }).ruleStatus, "BLOCKED_BY_GATE");
});

test("relation-based interpretation requires profile evidence and preserves references", () => {
  assert.equal(evaluate({ evidenceRefs: [] }).ruleStatus, "BLOCKED_BY_GATE");
  assert.deepEqual(evaluate({ evidenceRefs: ["a", "a", "b"] }).evidenceRefs, ["a", "b"]);
});

test("context-only weather, baseline history and blocked ROMS direction stay non-comparable", () => {
  const context = policy({ variable: "waveHeight", sourceId: "kma-marine-weather-observations", configuredAction: "CONTEXT_ONLY", requiredGates: [] });
  const baseline = policy({ variable: "historicalTemperatureBaseline", sourceId: "nifs-soo-climatology", configuredAction: "BASELINE_ONLY", requiredGates: [] });
  const direction = policy({ variable: "currentDirection", sourceId: "khoa-ocean-current-model", configuredAction: "BLOCKED", action: "BLOCKED", requiredGates: ["DIRECTION_CONVENTION_CONFIRMED"], passedGates: [], failedGates: ["DIRECTION_CONVENTION_CONFIRMED"] });
  assert.equal(evaluate({ variable: "waveHeight", relation: null, sourcePolicy: context }).ruleStatus, "CONTEXT_ONLY");
  assert.equal(evaluate({ variable: "historicalTemperatureBaseline", relation: null, sourcePolicy: baseline }).ruleStatus, "BASELINE_ONLY");
  assert.equal(evaluate({ variable: "currentDirection", relation: null, sourcePolicy: direction }).ruleStatus, "BLOCKED_BY_POLICY");
});

test("seasonality contexts retain match and mismatch independently", () => {
  const seasonPolicy = policy({ variable: "seasonality", requiredGates: ["SPECIES_PROFILE_SUPPORTED", "TIME_SEMANTIC_KNOWN"] });
  assert.equal(evaluate({ variable: "seasonality", relation: "MATCH", sourcePolicy: seasonPolicy, depthStatus: "NOT_APPLICABLE" }).ruleStatus, "INTERPRETABLE_MATCH");
  assert.equal(evaluate({ variable: "seasonality", relation: "MISMATCH", sourcePolicy: seasonPolicy, depthStatus: "NOT_APPLICABLE" }).ruleStatus, "INTERPRETABLE_MISMATCH");
});

test("activity requires explicit time context", () => {
  const activityPolicy = policy({ variable: "activity", requiredGates: ["SPECIES_PROFILE_SUPPORTED", "TIME_SEMANTIC_KNOWN"] });
  const result = evaluate({ variable: "activity", relation: "MATCH", sourcePolicy: activityPolicy, contextAvailable: false, depthStatus: "NOT_APPLICABLE" });
  assert.equal(result.ruleStatus, "MISSING_CONTEXT");
  assert.equal(result.relation, null);
});

test("branch helper creates field-only metadata for bounded mackerel source contexts", () => {
  const risa = policy();
  const risaRules = rules.buildBranchSuitabilityRules({
    sourcePolicy: [risa],
    comparison: { comparisons: { temperature: { relation: "WITHIN_RANGE", evidenceIds: ["mackerel-fishbase-temperature-v2"] } } },
    freshness: "fresh",
    depthStatus: "CATEGORY_MATCH",
  });
  const femoPolicies = [
    policy({ sourceId: "nifs-femo-sea", configuredAction: "COMPARISON_ALLOWED_WITH_LIMITS" }),
    policy({ variable: "salinity", sourceId: "nifs-femo-sea", configuredAction: "BLOCKED", action: "BLOCKED", requiredGates: ["UNIT_CONFIRMED"], passedGates: [], failedGates: ["UNIT_CONFIRMED"] }),
  ];
  const femoRules = rules.buildBranchSuitabilityRules({
    sourcePolicy: femoPolicies,
    comparison: { comparisons: { temperature: { relation: "WITHIN_RANGE", evidenceIds: ["mackerel-fishbase-temperature-v2"] }, salinity: { relation: "UNIT_UNVERIFIED", evidenceIds: [] } } },
    freshness: "fresh",
    depthStatus: "CATEGORY_MATCH",
  });
  assert.equal(risaRules[0].ruleStatus, "INTERPRETABLE_MATCH");
  assert.deepEqual(risaRules[0].evidenceRefs, ["mackerel-fishbase-temperature-v2"]);
  assert.equal(femoRules[0].ruleStatus, "LIMITED_INTERPRETATION");
  assert.equal(femoRules[1].ruleStatus, "BLOCKED_BY_POLICY");
});

function keys(value, output = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) { output.push(key.toLowerCase()); keys(child, output); }
  return output;
}

test("artifact covers the 12-variable rule matrix and documents constraint priority", () => {
  assert.equal(artifact.runtimeMeaning, "FIELD_RELATION_INTERPRETATION");
  assert.equal(artifact.qualityClass, "DERIVED_SUITABILITY_RULE");
  assert.equal(artifact.rules.length, 12);
  assert.deepEqual(new Set(artifact.rules.map((item) => item.variable)), new Set(["temperature", "salinity", "dissolvedOxygen", "seasonality", "activity", "habitat", "waveHeight", "windSpeed", "pressure", "currentSpeed", "currentDirection", "tide"]));
  assert.deepEqual(artifact.statusPriority.slice(0, 3), ["UNAVAILABLE", "BLOCKED_BY_POLICY", "BLOCKED_BY_GATE"]);
});

test("runtime contract has no composite decision, numeric assessment, probability, ordering or advice keys", () => {
  const output = evaluate();
  const allKeys = [...keys(output), ...keys(artifact)];
  for (const forbidden of ["score", "points", "percent", "rating", "grade", "weight", "catchprobability", "successprobability", "likelihood", "rank", "recommendation", "overallsuitability", "overallstatus", "overallmatch", "conditiongrade", "conditionlevel"]) {
    assert.equal(allKeys.includes(forbidden), false);
  }
  assert.doesNotMatch(JSON.stringify(output), /GOOD|BAD|FAVORABLE|UNFAVORABLE|OPTIMAL|POOR/);
});

test("orchestrator integration is additive and does not select, sort, average or remove branches", () => {
  const multi = fs.readFileSync(multiPath, "utf8");
  const server = fs.readFileSync(serverPath, "utf8");
  assert.match(multi, /interpretations: SuitabilityRuleResult\[\]/);
  assert.match(server, /buildBranchSuitabilityRules/);
  assert.match(server, /alignment\.sources\.map/);
  assert.doesNotMatch(server, /bestSource|preferredSource|fallbackSource|average|interpolat|weight|rank|recommendation/i);
});

test("quality report records rule coverage and all prohibited decision operations as disabled", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.status, "SUITABILITY_RULE_V1_PASS");
  assert.equal(report.rulesCount, 12);
  assert.equal(report.deterministicStability, true);
  assert.equal(report.forbiddenVocabularyScan, "PASS");
  assert.equal(report.forbiddenKeyScan, "PASS");
  for (const value of Object.values(report.invariants)) assert.equal(value, false);
  assert.equal(report.databaseWrites, 0);
  assert.equal(report.externalAiCalls, 0);
});

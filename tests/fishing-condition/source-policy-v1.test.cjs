const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const policyPath = path.join(root, "src/lib/fishing-condition/source-policy.ts");
const artifactPath = path.join(root, "data/fishing-condition/source-policy/v1/source-policy.json");
const orchestratorPath = path.join(root, "src/lib/fishing-condition/multi-source-evidence-server.ts");
const branchPath = path.join(root, "src/lib/fishing-condition/multi-source-evidence.ts");
const reportPath = path.join(root, "reports/fishing-condition/source-policy-v1-quality.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

function loadTs(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)((name) => mocks[name] ?? require(name), module, module.exports);
  return module.exports;
}

const policy = loadTs(policyPath, { "../../../data/fishing-condition/source-policy/v1/source-policy.json": artifact });
const comparisonGates = ["UNIT_CONFIRMED", "SPECIES_PROFILE_SUPPORTED", "DEPTH_COMPATIBLE", "STATION_MAPPED", "TIME_SEMANTIC_KNOWN"];

function evaluate(variable, sourceId, passedGates = []) {
  return policy.evaluateSourcePolicy({ variable, sourceId, context: { passedGates } });
}

test("policy artifact defines all twelve variables and eight source identities", () => {
  assert.equal(artifact.variables.length, 12);
  assert.deepEqual(artifact.variables.map((item) => item.variable), ["temperature", "salinity", "dissolvedOxygen", "chlorophyllA", "waveHeight", "windSpeed", "windDirection", "pressure", "currentSpeed", "currentDirection", "tide", "historicalTemperatureBaseline"]);
  assert.equal(new Set(artifact.variables.flatMap((item) => item.sources.map((source) => source.sourceId))).size, 8);
});

test("temperature from RISA is comparison allowed only when required gates pass", () => {
  const allowed = evaluate("temperature", "nifs-risa", comparisonGates);
  assert.equal(allowed.action, "COMPARISON_ALLOWED");
  assert.deepEqual(allowed.failedGates, []);
  const blocked = evaluate("temperature", "nifs-risa", comparisonGates.filter((gate) => gate !== "DEPTH_COMPATIBLE"));
  assert.equal(blocked.action, "BLOCKED");
  assert.deepEqual(blocked.failedGates, ["DEPTH_COMPATIBLE"]);
});

test("temperature from FEMO stays limited and never becomes unrestricted", () => {
  const result = evaluate("temperature", "nifs-femo-sea", comparisonGates);
  assert.equal(result.action, "COMPARISON_ALLOWED_WITH_LIMITS");
  assert.ok(result.limitations.includes("PERIODIC_SAMPLE"));
});

test("temperature from KMA observation is context only", () => {
  assert.equal(evaluate("temperature", "kma-marine-weather-observations").action, "CONTEXT_ONLY");
});

test("FEMO salinity is blocked by the unverified unit gate", () => {
  const result = evaluate("salinity", "nifs-femo-sea");
  assert.equal(result.action, "BLOCKED");
  assert.deepEqual(result.failedGates, ["UNIT_CONFIRMED"]);
  assert.ok(result.limitations.includes("UNIT_UNVERIFIED"));
});

test("FEMO dissolved oxygen is limited and requires species support", () => {
  const gates = ["UNIT_CONFIRMED", "SPECIES_PROFILE_SUPPORTED", "DEPTH_COMPATIBLE", "STATION_MAPPED"];
  assert.equal(evaluate("dissolvedOxygen", "nifs-femo-sea", gates).action, "COMPARISON_ALLOWED_WITH_LIMITS");
  assert.equal(evaluate("dissolvedOxygen", "nifs-femo-sea", gates.filter((gate) => gate !== "SPECIES_PROFILE_SUPPORTED")).action, "BLOCKED");
});

test("FEMO chlorophyll remains context only", () => {
  assert.equal(evaluate("chlorophyllA", "nifs-femo-sea").action, "CONTEXT_ONLY");
});

test("observed and forecast waves remain separate context-only sources", () => {
  assert.equal(evaluate("waveHeight", "kma-marine-weather-observations").action, "CONTEXT_ONLY");
  assert.equal(evaluate("waveHeight", "kma-marine-weather-forecast").action, "CONTEXT_ONLY");
});

test("ROMS speed is context only and direction remains blocked", () => {
  assert.equal(evaluate("currentSpeed", "khoa-ocean-current-model").action, "CONTEXT_ONLY");
  const direction = evaluate("currentDirection", "khoa-ocean-current-model");
  assert.equal(direction.action, "BLOCKED");
  assert.deepEqual(direction.failedGates, ["DIRECTION_CONVENTION_CONFIRMED"]);
});

test("tide prediction is context only and cannot become actual depth", () => {
  const result = evaluate("tide", "khoa-tide-prediction");
  assert.equal(result.action, "CONTEXT_ONLY");
  assert.ok(result.limitations.includes("ACTUAL_DEPTH_CALCULATION_PROHIBITED"));
});

test("climatology is baseline only and anomaly mapping remains gated", () => {
  const result = evaluate("historicalTemperatureBaseline", "nifs-soo-climatology");
  assert.equal(result.action, "BASELINE_ONLY");
  assert.ok(result.failedGates.includes("ANOMALY_MAPPING_AVAILABLE"));
  assert.ok(result.limitations.includes("ANOMALY_MAPPING_BLOCKED"));
});

test("unknown variables and sources are unsupported without fallback", () => {
  assert.equal(evaluate("unknownVariable", "nifs-risa").action, "UNSUPPORTED");
  assert.equal(evaluate("temperature", "unknown-source").action, "UNSUPPORTED");
});

function keys(value, output = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) { output.push(key); keys(child, output); }
  return output;
}

test("policy contract has no weighting, score, priority or rank fields", () => {
  const allKeys = keys(artifact).map((key) => key.toLowerCase());
  for (const forbidden of ["weight", "score", "priority", "rank"]) assert.equal(allKeys.includes(forbidden), false);
});

test("policy evaluation is deterministic and preserves supplied limitations", () => {
  const input = { variable: "temperature", sourceId: "nifs-risa", context: { passedGates: comparisonGates, limitations: ["STALE_SOURCE", "STALE_SOURCE"] } };
  assert.deepEqual(policy.evaluateSourcePolicy(input), policy.evaluateSourcePolicy(input));
  assert.equal(policy.evaluateSourcePolicy(input).limitations.filter((item) => item === "STALE_SOURCE").length, 1);
});

test("source class rules keep observations, forecasts, models and history distinct", () => {
  const classes = new Map(artifact.sourceClasses.map((item) => [item.qualityClass, item.allowedUse]));
  assert.equal(classes.get("OBSERVED"), "current_context_or_explicit_comparison");
  assert.equal(classes.get("FORECAST"), "future_context_only");
  assert.equal(classes.get("MODEL"), "model_context_only");
  assert.equal(classes.get("DERIVED_HISTORICAL_BASELINE"), "baseline_only");
});

test("orchestrator adds policy metadata without branch removal or source selection", () => {
  const server = fs.readFileSync(orchestratorPath, "utf8");
  const branch = fs.readFileSync(branchPath, "utf8");
  assert.match(server, /evaluateBranchPolicy/);
  assert.match(server, /sourcePolicyAllowsComparison\(temperaturePolicy\)/);
  assert.match(branch, /sourcePolicy: SourcePolicyEvaluation\[\]/);
  assert.match(server, /alignment\.sources\.map/);
  assert.doesNotMatch(server, /bestSource|preferredSource|fallbackSource|average|interpolat|weight|rank|recommendation/i);
});

test("quality report records the complete matrix and disabled decision operations", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const entries = artifact.variables.flatMap((item) => item.sources);
  const count = (action) => entries.filter((entry) => entry.action === action).length;
  assert.equal(report.status, "SOURCE_POLICY_V1_PASS");
  assert.equal(report.variables, 12);
  assert.equal(report.sources, 8);
  assert.equal(report.policyEntries, 25);
  assert.deepEqual(report.actionCounts, {
    comparisonAllowed: count("COMPARISON_ALLOWED"),
    comparisonAllowedWithLimits: count("COMPARISON_ALLOWED_WITH_LIMITS"),
    contextOnly: count("CONTEXT_ONLY"),
    baselineOnly: count("BASELINE_ONLY"),
    blocked: count("BLOCKED"),
  });
  for (const value of Object.values(report.invariants)) assert.equal(value, false);
  assert.equal(report.databaseWrites, 0);
  assert.equal(report.externalAiCalls, 0);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const comparatorPath = path.join(root, "src/lib/fishing-condition/comparator.ts");
const explanationPath = path.join(root, "src/lib/fishing-condition/explanation.ts");
const bundlePath = path.join(root, "src/lib/fishing-condition/evidence-bundle.ts");
const requestPath = path.join(root, "src/lib/fishing-condition/evidence-bundle-request.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/evidence-bundle-server.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/evidence-bundle/route.ts");
const reportPath = path.join(root, "reports/fishing-condition/evidence-bundle-v1-quality.json");

function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const comparator = loadTs(comparatorPath);
const explanation = loadTs(explanationPath);
const bundleModule = loadTs(bundlePath);
const requestModule = loadTs(requestPath);

function profile(overrides = {}) {
  return {
    speciesId: "BM-SPECIES-000417",
    koreanName: "고등어",
    scientificName: "Scomber japonicus",
    profileStatus: "EVIDENCE_ENRICHED",
    temperature: {
      canonicalPreferredMinC: 15,
      canonicalPreferredMaxC: 16,
      preferred: [{ minC: 15, maxC: 16, context: "PREFERRED_TEMPERATURE", lifeStage: "UNSPECIFIED", regionScope: "KOREA", evidenceIds: ["mackerel-mbris"] }],
      observed: [],
    },
    depth: { canonicalObservedMinM: 0, canonicalObservedMaxM: 300, observed: [{ minM: 0, maxM: 300, context: "OBSERVED_DEPTH", lifeStage: "UNSPECIFIED", regionScope: "GLOBAL", evidenceIds: ["mackerel-fishbase"] }] },
    salinity: { canonicalMin: 30, canonicalMax: 35, unit: "psu", ranges: [{ min: 30, max: 35, unit: "psu", context: "OBSERVED", regionScope: "GLOBAL", evidenceIds: ["salinity-source"] }] },
    dissolvedOxygen: { minimumMgL: 5, observations: [{ minMgL: 5, maxMgL: null, context: "THRESHOLD", regionScope: "GLOBAL", evidenceIds: ["do-source"] }] },
    spawning: [],
    migration: [{ months: [1, 2, 3, 9, 10, 11, 12], evidenceIds: ["mackerel-mbris"] }],
    seasonality: [],
    activityPeriod: "MIXED",
    conflicts: [],
    ...overrides,
  };
}

function environment(overrides = {}) {
  return {
    sourceId: "nifs-risa",
    provider: "NIFS",
    qualityClass: "OBSERVED",
    stationOrSiteId: "bgj8a",
    observedAt: "2026-09-10T12:00:00",
    freshness: "fresh",
    depthContext: "SURFACE",
    exactDepthM: 0,
    stationWaterDepthM: 10,
    temperature: { value: 15.5, unit: "degC" },
    salinity: { value: null, unit: null },
    dissolvedOxygen: { value: null, unit: null },
    chlorophyllA: { value: null, unit: null },
    ...overrides,
  };
}

function build(profileInput = profile(), environmentInput = environment(), contexts = { month: null, timeOfDay: null }) {
  const comparison = comparator.compareFishingCondition(profileInput, environmentInput);
  const explained = explanation.explainFishingCondition(comparison);
  return bundleModule.buildConditionEvidenceBundle(comparison, explained, contexts);
}

function allKeys(input, output = []) {
  if (!input || typeof input !== "object") return output;
  for (const [key, value] of Object.entries(input)) {
    output.push(key);
    allKeys(value, output);
  }
  return output;
}

test("temperature is supported without changing the Comparator relation", () => {
  const result = build();
  assert.equal(result.qualityClass, "DERIVED_EVIDENCE_BUNDLE");
  assert.equal(result.species.profileVersion, "v2");
  assert.equal(result.evidence.temperature.status, "SUPPORTED");
  assert.equal(result.evidence.temperature.relation, "WITHIN_RANGE");
  assert.equal(result.evidence.temperature.environmentValue, 15.5);
  assert.deepEqual(result.evidence.temperature.evidenceRefs, ["mackerel-mbris"]);
  assert.deepEqual(result.evidence.temperature.sourceLineage, ["nifs-risa", "DERIVED_COMPARISON", "DERIVED_EXPLANATION", "DERIVED_EVIDENCE_BUNDLE"]);
});

test("unsupported and missing temperature remain distinct", () => {
  const unsupported = profile({ temperature: { canonicalPreferredMinC: null, canonicalPreferredMaxC: null, preferred: [], observed: [] } });
  assert.equal(build(unsupported).evidence.temperature.status, "UNSUPPORTED_PROFILE");
  assert.equal(build(profile(), environment({ temperature: { value: null, unit: "degC" } })).evidence.temperature.status, "MISSING_ENVIRONMENT");
});

test("FEMO salinity stays blocked while documented DO retains its relation", () => {
  const result = build(profile(), environment({
    sourceId: "nifs-femo-sea",
    qualityClass: "OBSERVED_PERIODIC_ENVIRONMENT",
    stationOrSiteId: "nifs-femo-sea:test:site",
    freshness: "fresh",
    depthContext: "BOTTOM",
    exactDepthM: null,
    salinity: { value: 33, unit: "UNIT_NOT_DOCUMENTED" },
    dissolvedOxygen: { value: 6, unit: "mg/L" },
  }));
  assert.equal(result.evidence.salinity.status, "UNIT_UNVERIFIED");
  assert.equal(result.evidence.salinity.relation, null);
  assert.equal(result.evidence.dissolvedOxygen.status, "SUPPORTED");
  assert.equal(result.evidence.dissolvedOxygen.relation, "WITHIN_RANGE");
  assert.equal(result.summary.blockedCount, 1);
});

test("seasonality retains every source context and its independent relation", () => {
  const seasonal = profile({
    spawning: [{ months: [5, 6], evidenceIds: ["spawn-source"] }],
    migration: [{ months: [9, 10], evidenceIds: ["migration-source"] }],
  });
  const result = build(seasonal);
  assert.equal(result.evidence.seasonality.status, "SUPPORTED");
  assert.equal(result.evidence.seasonality.contexts.length, 2);
  assert.deepEqual(result.evidence.seasonality.contexts.map((item) => [item.context, item.relation]), [["SPAWNING", "MISMATCH"], ["MIGRATION", "MATCH"]]);
  assert.deepEqual(result.evidence.seasonality.evidenceRefs, ["spawn-source", "migration-source"]);
});

test("field conflict blocks only that evidence item", () => {
  const conflicted = profile({ conflicts: [{ field: "temperature.preferred", status: "CONFLICT_REVIEW_REQUIRED", evidenceIds: ["source-a", "source-b"] }] });
  const result = build(conflicted);
  assert.equal(result.evidence.temperature.status, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(result.evidence.temperature.relation, null);
  assert.equal(result.evidence.seasonality.status, "SUPPORTED");
  assert.equal(result.summary.blockedCount, 1);
});

test("stale observations retain relations and become LIMITED", () => {
  const result = build(profile(), environment({ freshness: "stale" }));
  assert.equal(result.evidence.temperature.status, "LIMITED");
  assert.equal(result.evidence.temperature.relation, "WITHIN_RANGE");
  assert.equal(result.evidence.temperature.freshness, "stale");
  assert.equal(result.evidence.seasonality.status, "LIMITED");
  assert.equal(result.evidence.seasonality.relation, "MATCH");
  assert.equal(result.summary.limitedCount, 2);
});

test("activity and habitat disclose absent comparison context", () => {
  const missing = build();
  assert.equal(missing.evidence.activity.status, "MISSING_ENVIRONMENT_CONTEXT");
  assert.equal(missing.evidence.activity.relation, null);
  assert.equal(missing.evidence.habitat.status, "UNSUPPORTED_ENVIRONMENT");
  const explicitTime = build(profile(), environment(), { month: 9, timeOfDay: "DAY" });
  assert.equal(explicitTime.evidence.activity.status, "UNSUPPORTED_ENVIRONMENT");
  assert.equal(explicitTime.evidence.activity.environmentValue, "DAY");
});

test("summary contains technical counts only and performs no majority logic", () => {
  const result = build();
  assert.deepEqual(result.summary, { supportedCount: 2, unsupportedCount: 4, blockedCount: 0, limitedCount: 0 });
  assert.equal("favorableCount" in result.summary, false);
  assert.equal("percentage" in result.summary, false);
  assert.doesNotMatch(JSON.stringify(result), /전반적으로|조건이 좋|출조하기 좋|추천|잘 잡힐 가능성|환경 적합도/);
});

test("request parser accepts one explicit source and rejects fallback or source mixing", () => {
  const valid = requestModule.parseConditionEvidenceBundleRequest({
    speciesId: "BM-SPECIES-000417",
    environment: { sourceId: "nifs-risa", stationId: "bgj8a", depthContext: "SURFACE" },
    contexts: { month: 9, timeOfDay: null },
  });
  assert.equal(valid.environment.sourceId, "nifs-risa");
  assert.equal(requestModule.parseConditionEvidenceBundleRequest({
    speciesId: "BM-SPECIES-000417",
    environment: { sourceId: "nifs-soo", stationId: "101", depthContext: "SURFACE" },
  }), null);
  assert.equal(requestModule.parseConditionEvidenceBundleRequest({
    speciesId: "BM-SPECIES-000417",
    environment: { sourceId: "nifs-risa", stationId: "bgj8a", siteId: "femo-site", depthContext: "SURFACE" },
  }), null);
});

test("bundle output is deterministic and has no score or recommendation keys", () => {
  const first = build();
  const second = build();
  assert.deepEqual(first, second);
  const keys = allKeys(first);
  for (const forbidden of ["score", "probability", "ranking", "recommendation", "rating", "grade"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

test("server orchestrates existing comparison and explanation once and route is read-only", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  assert.equal((server.match(/runFishingConditionComparison\(request\)/g) ?? []).length, 1);
  assert.equal((server.match(/explainFishingCondition\(comparison\)/g) ?? []).length, 1);
  assert.match(server, /buildConditionEvidenceBundle\(comparison, explanation/);
  assert.doesNotMatch(server, /fetch\(|supabase|insert\(|update\(|delete\(|openai|anthropic/i);
  assert.match(route, /export async function POST/);
  assert.match(route, /parseConditionEvidenceBundleRequest/);
  assert.match(route, /\{ ok: true, \.\.\.bundle \}/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /export async function (?:PUT|PATCH|DELETE)\b|supabase|prisma|drizzle/i);
});

test("quality report records gates, stability, and forbidden-output invariants", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.qualityClass, "DERIVED_EVIDENCE_BUNDLE");
  assert.equal(report.profileVersion, "v2");
  assert.deepEqual(report.environmentSources, ["nifs-risa", "nifs-femo-sea"]);
  assert.equal(report.stability.deterministic, true);
  assert.equal(report.gates.salinityRuntimeComparable, 0);
  assert.equal(report.outputFields.score, 0);
  assert.equal(report.outputFields.recommendation, 0);
  assert.equal(report.forbiddenPhraseScan.matches, 0);
  assert.equal(report.databaseWrites, 0);
});

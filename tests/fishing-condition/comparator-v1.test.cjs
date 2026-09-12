const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const comparatorPath = path.join(root, "src/lib/fishing-condition/comparator.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/comparator-server.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/compare/route.ts");
const reportPath = path.join(root, "reports/fishing-condition/comparator-v1-quality.json");

function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const comparator = loadTs(comparatorPath);

function profile(overrides = {}) {
  return {
    speciesId: "BM-SPECIES-000001",
    slug: "test-species",
    koreanName: "시험어",
    scientificName: "Piscis probatio",
    profileStatus: "PARTIAL",
    temperature: {
      canonicalPreferredMinC: 18,
      canonicalPreferredMaxC: 23,
      preferred: [{ minC: 18, maxC: 23, context: "PREFERRED_TEMPERATURE", lifeStage: "ADULT", regionScope: "KOREA", evidenceIds: ["temperature-preferred"] }],
      observed: [{ minC: 10, maxC: 27, context: "OBSERVED_OCCURRENCE", lifeStage: "UNSPECIFIED", regionScope: "GLOBAL", evidenceIds: ["temperature-observed"] }],
    },
    depth: { canonicalObservedMinM: 5, canonicalObservedMaxM: 50, observed: [{ minM: 5, maxM: 50, evidenceIds: ["depth-observed"] }] },
    salinity: { canonicalMin: 30, canonicalMax: 35, unit: "psu", ranges: [{ min: 30, max: 35, unit: "psu", evidenceIds: ["salinity"] }] },
    dissolvedOxygen: { minimumMgL: 5, observations: [{ minMgL: 5, maxMgL: null, evidenceIds: ["do"] }] },
    spawning: [{ months: [5, 6], evidenceIds: ["spawning"] }],
    migration: [],
    seasonality: [],
    activityPeriod: "DIURNAL",
    conflicts: [],
    ...overrides,
  };
}

function environment(overrides = {}) {
  return {
    sourceId: "nifs-risa",
    provider: "NIFS",
    qualityClass: "OBSERVED",
    stationOrSiteId: "A0001",
    observedAt: "2026-05-10T08:00:00",
    freshness: "fresh",
    depthContext: "SURFACE",
    exactDepthM: 5,
    stationWaterDepthM: 20,
    temperature: { value: 21.4, unit: "degC" },
    salinity: { value: null, unit: null },
    dissolvedOxygen: { value: null, unit: null },
    chlorophyllA: { value: null, unit: null },
    ...overrides,
  };
}

test("temperature returns within, below and above relations without semantic uplift", () => {
  assert.equal(comparator.compareFishingCondition(profile(), environment()).comparisons.temperature.relation, "WITHIN_RANGE");
  assert.equal(comparator.compareFishingCondition(profile(), environment({ temperature: { value: 16, unit: "degC" } })).comparisons.temperature.relation, "BELOW_RANGE");
  assert.equal(comparator.compareFishingCondition(profile(), environment({ temperature: { value: 25, unit: "degC" } })).comparisons.temperature.relation, "ABOVE_RANGE");
});

test("range boundaries are inclusive", () => {
  for (const value of [18, 23]) {
    assert.equal(comparator.compareFishingCondition(profile(), environment({ temperature: { value, unit: "degC" } })).comparisons.temperature.relation, "WITHIN_RANGE");
  }
});

test("preferred temperature range takes priority over observed fallback", () => {
  const preferred = comparator.compareFishingCondition(profile(), environment({ temperature: { value: 25, unit: "degC" } })).comparisons.temperature;
  assert.equal(preferred.rangeType, "PREFERRED");
  assert.equal(preferred.relation, "ABOVE_RANGE");
  const observedProfile = profile({ temperature: { canonicalPreferredMinC: null, canonicalPreferredMaxC: null, preferred: [], observed: [{ minC: 10, maxC: 27, context: "OBSERVED_OCCURRENCE", lifeStage: "UNSPECIFIED", regionScope: "GLOBAL", evidenceIds: ["temperature-observed"] }] } });
  const observed = comparator.compareFishingCondition(observedProfile, environment({ temperature: { value: 25, unit: "degC" } })).comparisons.temperature;
  assert.equal(observed.rangeType, "OBSERVED");
  assert.equal(observed.relation, "WITHIN_RANGE");
  assert.equal(observed.rangeContext, "OBSERVED_OCCURRENCE");
});

test("observed fallback preserves source context, life stage and region", () => {
  const observedProfile = profile({ temperature: {
    canonicalPreferredMinC: null,
    canonicalPreferredMaxC: null,
    preferred: [],
    observed: [{ minC: 21.5, maxC: 25, context: "CAPTIVE_REARING_CONDITIONS_NOT_WILD_PREFERENCE", lifeStage: "BROODSTOCK", regionScope: "REGIONAL_OTHER", evidenceIds: ["paper"] }],
  } });
  const result = comparator.compareFishingCondition(observedProfile, environment()).comparisons.temperature;
  assert.equal(result.rangeContext, "CAPTIVE_REARING_CONDITIONS_NOT_WILD_PREFERENCE");
  assert.equal(result.lifeStage, "BROODSTOCK");
  assert.equal(result.regionScope, "REGIONAL_OTHER");
});

test("missing profile, missing environment and units remain distinct", () => {
  const unsupported = profile({ temperature: { canonicalPreferredMinC: null, canonicalPreferredMaxC: null, preferred: [], observed: [] } });
  assert.equal(comparator.compareFishingCondition(unsupported, environment()).comparisons.temperature.relation, "UNSUPPORTED_PROFILE");
  assert.equal(comparator.compareFishingCondition(profile(), environment({ temperature: { value: null, unit: "degC" } })).comparisons.temperature.relation, "MISSING_ENVIRONMENT");
  assert.equal(comparator.compareFishingCondition(profile(), environment({ temperature: { value: 20, unit: null } })).comparisons.temperature.relation, "UNIT_UNVERIFIED");
  assert.equal(comparator.compareFishingCondition(profile(), environment({ temperature: { value: 20, unit: "degF" } })).comparisons.temperature.relation, "UNIT_MISMATCH");
});

test("stale observations retain relation but are technically limited", () => {
  const result = comparator.compareFishingCondition(profile(), environment({ freshness: "stale" }));
  assert.equal(result.comparisons.temperature.relation, "WITHIN_RANGE");
  assert.equal(result.comparisons.temperature.usability, "LIMITED");
  assert.equal(result.environment.freshnessWarning, true);
});

test("field-level conflict blocks only that field", () => {
  const conflicted = profile({ profileStatus: "CONFLICT_REVIEW_REQUIRED", conflicts: [{ field: "depth.observed", status: "CONFLICT_REVIEW_REQUIRED", evidenceIds: ["a", "b"] }] });
  const result = comparator.compareFishingCondition(conflicted, environment());
  assert.equal(result.comparisons.depth.relation, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(result.comparisons.temperature.relation, "WITHIN_RANGE");
});

test("FEMO salinity is unit-gated while documented DO can compare", () => {
  const result = comparator.compareFishingCondition(profile(), environment({
    sourceId: "nifs-femo-sea",
    qualityClass: "OBSERVED_PERIODIC_ENVIRONMENT",
    stationOrSiteId: "nifs-femo-sea:test:site",
    depthContext: "BOTTOM",
    exactDepthM: null,
    freshness: "stale",
    salinity: { value: 33, unit: "UNIT_NOT_DOCUMENTED" },
    dissolvedOxygen: { value: 6, unit: "mg/L" },
  }));
  assert.equal(result.comparisons.salinity.relation, "UNIT_UNVERIFIED");
  assert.equal(result.comparisons.dissolvedOxygen.relation, "WITHIN_RANGE");
  assert.equal(result.comparisons.dissolvedOxygen.usability, "LIMITED");
});

test("seasonality preserves context and activity does not invent clock rules", () => {
  const result = comparator.compareFishingCondition(profile(), environment());
  assert.equal(result.comparisons.seasonality.relation, "MATCH");
  assert.equal(result.comparisons.seasonality.contexts[0].context, "SPAWNING");
  assert.equal(result.comparisons.activity.relation, "UNSUPPORTED_ENVIRONMENT");
});

test("response preserves lineage, null interpretation and no composite score", () => {
  const result = comparator.compareFishingCondition(profile(), environment());
  assert.equal(result.qualityClass, "DERIVED_COMPARISON");
  assert.equal(result.sourceLineage.speciesProfileSource, "blue-marina-species-environment-v2");
  assert.equal(result.sourceLineage.environmentSource, "nifs-risa");
  assert.equal(result.interpretation, null);
  assert.equal("score" in result, false);
  assert.equal("recommendation" in result, false);
  assert.ok(comparator.FISHING_CONDITION_COMPARISON_FEATURE_REGISTRY.every((entry) => entry.scoring === false));
});

test("POST route requires explicit station or site and performs no mutation", () => {
  const route = fs.readFileSync(routePath, "utf8");
  const server = fs.readFileSync(serverPath, "utf8");
  assert.match(route, /export async function POST/);
  assert.match(route, /stationId/);
  assert.match(route, /siteId/);
  assert.match(route, /depthContext/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.match(server, /getNifsRealtimeFishingEnvironment/);
  assert.match(server, /getNifsFisheryEnvironment/);
  assert.doesNotMatch(server, /nearest|distance|latitude.*longitude|supabase|insert\(|update\(|delete\(/i);
  assert.doesNotMatch(route, /export async function (?:PUT|PATCH|DELETE)\b|supabase|prisma|drizzle/i);
});

test("quality report records coverage, gates and no-score invariant", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.schemaVersion, "1.0.0");
  assert.equal(report.supportedEnvironmentSources.length, 2);
  assert.equal(report.species.total, 10);
  assert.equal(report.comparability.temperature, 2);
  assert.equal(report.comparability.salinityRuntime, 0);
  assert.equal(report.comparability.dissolvedOxygen, 0);
  assert.equal(report.conflicts.species, 1);
  assert.equal(report.invariants.compositeScore, false);
  assert.equal(report.invariants.fishingProbability, false);
  assert.equal(report.invariants.recommendation, false);
});

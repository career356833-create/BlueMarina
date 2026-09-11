const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const comparatorPath = path.join(root, "src/lib/fishing-condition/comparator.ts");
const explanationPath = path.join(root, "src/lib/fishing-condition/explanation.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/explain/route.ts");
const reportPath = path.join(root, "reports/fishing-condition/explanation-layer-v1-quality.json");

function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const comparator = loadTs(comparatorPath);
const explanation = loadTs(explanationPath);

function profile(overrides = {}) {
  return {
    speciesId: "BM-SPECIES-000417",
    koreanName: "고등어",
    scientificName: "Scomber japonicus",
    profileStatus: "PARTIAL",
    temperature: {
      canonicalPreferredMinC: 15,
      canonicalPreferredMaxC: 16,
      preferred: [{ minC: 15, maxC: 16, context: "PREFERRED_TEMPERATURE", lifeStage: "UNSPECIFIED", regionScope: "KOREA", evidenceIds: ["mackerel-mbris"] }],
      observed: [],
    },
    depth: { canonicalObservedMinM: 0, canonicalObservedMaxM: 300, observed: [{ minM: 0, maxM: 300, context: "OBSERVED_DEPTH", lifeStage: "UNSPECIFIED", regionScope: "GLOBAL", evidenceIds: ["mackerel-fishbase"] }] },
    salinity: { canonicalMin: null, canonicalMax: null, unit: null, ranges: [] },
    dissolvedOxygen: { minimumMgL: null, observations: [] },
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

function explain(profileInput = profile(), environmentInput = environment()) {
  return explanation.explainFishingCondition(comparator.compareFishingCondition(profileInput, environmentInput));
}

function field(result, name) {
  return result.explanations.find((item) => item.field === name);
}

test("within range explanation states only the numeric relationship", () => {
  const item = field(explain(), "temperature");
  assert.equal(item.relation, "WITHIN_RANGE");
  assert.equal(item.summary, "현재 수온 15.5°C는 고등어의 문헌상 선호 수온 범위 15°C~16°C 안에 있습니다.");
});

test("below and above explanations use exact boundaries", () => {
  const below = field(explain(profile(), environment({ temperature: { value: 14.5, unit: "degC" } })), "temperature");
  const above = field(explain(profile(), environment({ temperature: { value: 25.5, unit: "degC" } })), "temperature");
  assert.match(below.summary, /하한 15°C보다 낮습니다/);
  assert.match(above.summary, /상한 16°C보다 높습니다/);
});

test("observed fallback is named and preserves its evidence context", () => {
  const webfoot = profile({
    speciesId: "BM-SPECIES-003107",
    koreanName: "주꾸미",
    scientificName: "Amphioctopus fangsiao",
    temperature: {
      canonicalPreferredMinC: null,
      canonicalPreferredMaxC: null,
      preferred: [],
      observed: [{ minC: 21.5, maxC: 25, context: "CAPTIVE_REARING_CONDITIONS_NOT_WILD_PREFERENCE", lifeStage: "BROODSTOCK_AND_HATCHLINGS", regionScope: "REGIONAL_OTHER", evidenceIds: ["webfoot-paper-2026"] }],
    },
  });
  const item = field(explain(webfoot, environment({ temperature: { value: 25.5, unit: "degC" } })), "temperature");
  assert.match(item.summary, /^선호 수온 범위 자료가 없어/);
  assert.match(item.summary, /관찰 수온 범위 상한 25°C보다 높습니다/);
  assert.ok(item.details.includes("근거 맥락: CAPTIVE_REARING_CONDITIONS_NOT_WILD_PREFERENCE"));
  assert.deepEqual(item.evidenceRefs, ["webfoot-paper-2026"]);
});

test("unsupported profile never fills a missing range", () => {
  const redSeabream = profile({ koreanName: "참돔", temperature: { canonicalPreferredMinC: null, canonicalPreferredMaxC: null, preferred: [], observed: [] } });
  const item = field(explain(redSeabream), "temperature");
  assert.equal(item.relation, "UNSUPPORTED_PROFILE");
  assert.match(item.summary, /비교 가능한 수온 범위 근거가 없습니다/);
  assert.match(item.limitationNote, /임의로 보완하지 않았습니다/);
});

test("missing environment and unit gates have distinct explanations", () => {
  const missing = field(explain(profile(), environment({ temperature: { value: null, unit: "degC" } })), "temperature");
  assert.equal(missing.relation, "MISSING_ENVIRONMENT");
  assert.match(missing.summary, /비교에 필요한 수온 값을 사용할 수 없습니다/);
  const femo = environment({
    sourceId: "nifs-femo-sea",
    qualityClass: "OBSERVED_PERIODIC_ENVIRONMENT",
    stationOrSiteId: "nifs-femo-sea:test:site",
    depthContext: "BOTTOM",
    exactDepthM: null,
    salinity: { value: 32, unit: "UNIT_NOT_DOCUMENTED" },
  });
  const salinity = field(explain(profile(), femo), "salinity");
  assert.equal(salinity.relation, "UNIT_UNVERIFIED");
  assert.match(salinity.summary, /단위 호환성을 공식적으로 확인할 수 없어/);
});

test("field conflict explains only the conflicted field and retains evidence", () => {
  const amberjack = profile({
    koreanName: "방어",
    profileStatus: "CONFLICT_REVIEW_REQUIRED",
    conflicts: [{ field: "depth.observed", status: "CONFLICT_REVIEW_REQUIRED", evidenceIds: ["amberjack-mbris", "amberjack-fishbase"] }],
  });
  const result = explain(amberjack);
  const depth = field(result, "depth");
  assert.equal(depth.relation, "CONFLICT_REVIEW_REQUIRED");
  assert.deepEqual(depth.evidenceRefs, ["amberjack-mbris", "amberjack-fishbase"]);
  assert.equal(field(result, "temperature").relation, "WITHIN_RANGE");
});

test("fresh and stale notes describe observation age without condition meaning", () => {
  assert.equal(field(explain(), "temperature").freshnessNote, "최근 관측값을 사용했습니다.");
  const stale = field(explain(profile(), environment({ freshness: "stale" })), "temperature");
  assert.match(stale.freshnessNote, /최신 관측으로 분류되지 않아 제한적으로 해석/);
});

test("seasonality match keeps its source context and does not infer catch outcome", () => {
  const item = field(explain(), "seasonality.migration");
  assert.equal(item.relation, "MATCH");
  assert.match(item.summary, /이동 시기 범위에 포함됩니다/);
  assert.deepEqual(item.evidenceRefs, ["mackerel-mbris"]);
});

test("habitat and activity explain unavailable environment categories", () => {
  assert.match(field(explain(), "habitat").summary, /서식지 유형 정보가 없어/);
  assert.match(field(explain(), "activity").summary, /시간대 분류가 없어/);
});

test("output is deterministic and retains comparator and explanation lineage", () => {
  const first = explain();
  const second = explain();
  assert.deepEqual(first, second);
  assert.equal(first.qualityClass, "DERIVED_EXPLANATION");
  assert.equal(first.comparison.qualityClass, "DERIVED_COMPARISON");
  assert.equal(first.explanationLineage.environment, "nifs-risa");
  assert.equal(first.explanationLineage.speciesProfile, "blue-marina-species-environment-v1");
});

test("runtime templates contain no score, probability, recommendation or uplift phrases", () => {
  const runtime = fs.readFileSync(explanationPath, "utf8");
  const rendered = JSON.stringify(explain());
  const forbiddenKorean = /조황이 좋|잘 잡|추천|확률|적합도|최적|유리|불리|대박|위험도/;
  const forbiddenEnglish = /FAVORABLE|UNFAVORABLE|\bGOOD\b|\bBAD\b|OPTIMAL|POOR|HIGH_CHANCE|LOW_CHANCE/;
  assert.doesNotMatch(runtime, forbiddenKorean);
  assert.doesNotMatch(runtime, forbiddenEnglish);
  assert.doesNotMatch(rendered, forbiddenKorean);
  assert.equal("score" in explain(), false);
  assert.equal("recommendation" in explain(), false);
});

test("explain route calls the existing comparator once and remains read-only without AI", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /export async function POST/);
  assert.equal((route.match(/runFishingConditionComparison\(parsed\)/g) ?? []).length, 1);
  assert.match(route, /explainFishingCondition\(comparison\)/);
  assert.doesNotMatch(route, /fetch\(|openai|anthropic|generateText|supabase|prisma|drizzle/i);
  assert.doesNotMatch(route, /export async function (?:PUT|PATCH|DELETE)\b/);
});

test("quality report records deterministic and forbidden-output invariants", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.qualityClass, "DERIVED_EXPLANATION");
  assert.equal(report.templates.temperature, 11);
  assert.equal(report.templates.seasonality, 3);
  assert.equal(report.stability.deterministic, true);
  assert.equal(report.forbiddenPhraseScan.runtimeTemplateMatches, 0);
  assert.equal(report.outputFields.score, 0);
  assert.equal(report.outputFields.recommendation, 0);
});

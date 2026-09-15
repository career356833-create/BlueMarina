const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const readModelPath = path.join(root, "src/lib/fishing-condition/read-model.ts");
const readModelServerPath = path.join(root, "src/lib/fishing-condition/read-model-server.ts");
const readModelRoutePath = path.join(root, "src/app/api/fishing-condition/read-model/route.ts");
const evidenceRoutePath = path.join(root, "src/app/api/fishing-condition/evidence-bundle/route.ts");
const bundlePath = path.join(root, "src/lib/fishing-condition/evidence-bundle.ts");
const runtimePath = path.join(root, "src/lib/fishing-condition/seasonality-runtime.ts");
const artifactPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const reportPath = path.join(root, "reports/fishing-condition/read-model-v1-quality.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

function transpile(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => id in mocks ? mocks[id] : require(id);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const readModel = transpile(readModelPath);
const bundleModule = transpile(bundlePath);
const runtime = transpile(runtimePath, { "../../../data/fishing-condition/seasonality/v1/species-seasonality.json": artifact });
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function item(field, overrides = {}) {
  return {
    field,
    status: field === "temperature" ? "SUPPORTED" : "UNSUPPORTED_ENVIRONMENT",
    relation: field === "temperature" ? "WITHIN_RANGE" : null,
    environmentValue: field === "temperature" ? 15.5 : null,
    profileReference: field === "temperature" ? { rangeType: "PREFERRED", min: 15, max: 16, unit: "degC" } : null,
    explanation: `${field} factual explanation`,
    evidenceRefs: field === "temperature" ? ["temperature-source"] : [],
    sourceLineage: ["nifs-risa", "DERIVED_COMPARISON", "DERIVED_EXPLANATION", "DERIVED_EVIDENCE_BUNDLE"],
    freshness: "fresh",
    ...overrides,
  };
}

function baseBundle(speciesId = "BM-SPECIES-000417", overrides = {}) {
  const names = {
    "BM-SPECIES-000417": ["고등어", "Scomber japonicus"],
    "BM-SPECIES-003107": ["주꾸미", "Amphioctopus fangsiao"],
    "BM-SPECIES-000755": ["참돔", "Pagrus major"],
  };
  const evidence = {
    temperature: item("temperature"),
    salinity: item("salinity"),
    dissolvedOxygen: item("dissolvedOxygen"),
    seasonality: item("seasonality", { status: "SUPPORTED", relation: "MATCH", environmentValue: 10 }),
    activity: item("activity"),
    habitat: item("habitat"),
  };
  return {
    species: { speciesId, koreanName: names[speciesId][0], scientificName: names[speciesId][1], profileVersion: "v2" },
    environmentContext: { sourceId: "nifs-risa", stationOrSiteId: "bgj8a", observedAt: "2026-09-10T12:00:00", freshness: "fresh", depthContext: "SURFACE" },
    requestedContexts: { month: null, timeOfDay: null },
    evidence,
    summary: { supportedCount: 2, unsupportedCount: 4, blockedCount: 0, limitedCount: 0 },
    qualityClass: "DERIVED_EVIDENCE_BUNDLE",
    ...overrides,
  };
}

function withMonth(speciesId, month, overrides = {}) {
  const base = baseBundle(speciesId, {
    requestedContexts: { month, timeOfDay: null },
    ...overrides,
  });
  return bundleModule.attachSeasonalityEvidence(base, runtime.getSpeciesSeasonality({ speciesId, month }));
}

function allKeys(input, output = []) {
  if (!input || typeof input !== "object") return output;
  for (const [key, value] of Object.entries(input)) {
    output.push(key);
    allKeys(value, output);
  }
  return output;
}

test("projects the read model quality class, species and request context", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-000417", 10));
  assert.equal(result.qualityClass, "DERIVED_FISHING_CONDITION_READ_MODEL");
  assert.deepEqual(result.species, { speciesId: "BM-SPECIES-000417", koreanName: "고등어", scientificName: "Scomber japonicus" });
  assert.equal(result.requestContext.month, 10);
  assert.equal(result.requestContext.environmentSource, "nifs-risa");
});

test("environment cards retain fixed order, raw values and relations", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-000417", 10));
  assert.deepEqual(Object.keys(result.environment), ["temperature", "salinity", "dissolvedOxygen", "activity", "habitat"]);
  assert.equal(result.environment.temperature.rawValue, 15.5);
  assert.equal(result.environment.temperature.displayValue, "15.5 °C");
  assert.equal(result.environment.temperature.relation, "WITHIN_RANGE");
  assert.equal(result.environment.temperature.displayStatus, "기준 범위 안");
});

test("temperature below and above labels are factual projections", () => {
  const below = baseBundle("BM-SPECIES-000417");
  below.evidence.temperature.relation = "BELOW_RANGE";
  const above = baseBundle("BM-SPECIES-000417");
  above.evidence.temperature.relation = "ABOVE_RANGE";
  assert.equal(readModel.buildFishingConditionReadModel(below).environment.temperature.displayStatus, "기준 범위보다 낮음");
  assert.equal(readModel.buildFishingConditionReadModel(above).environment.temperature.displayStatus, "기준 범위보다 높음");
});

test("salinity unit gate exposes raw value without inventing a relation", () => {
  const bundle = baseBundle();
  bundle.evidence.salinity = item("salinity", { status: "UNIT_UNVERIFIED", environmentValue: 33, profileReference: { rangeType: "OBSERVED", min: 30, max: 35, unit: "psu" } });
  const card = readModel.buildFishingConditionReadModel(bundle).environment.salinity;
  assert.equal(card.displayValue, "33");
  assert.equal(card.relation, null);
  assert.equal(card.displayStatus, null);
  assert.ok(card.limitations.includes("단위 미확인"));
});

test("dissolved oxygen limitations and lineage remain attached to its card", () => {
  const bundle = baseBundle();
  bundle.evidence.dissolvedOxygen = item("dissolvedOxygen", { status: "LIMITED", relation: "WITHIN_RANGE", environmentValue: 6, profileReference: { rangeType: "THRESHOLD", min: 5, max: null, unit: "mg/L" } });
  const card = readModel.buildFishingConditionReadModel(bundle).environment.dissolvedOxygen;
  assert.equal(card.displayValue, "6 mg/L");
  assert.ok(card.limitations.includes("제한된 근거"));
  assert.deepEqual(card.source.lineage, bundle.evidence.dissolvedOxygen.sourceLineage);
});

test("mackerel October projects independent migration cards and three occurrence rows", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-000417", 10));
  assert.deepEqual(result.seasonality.migration.cards.map((card) => [card.title, card.status]), [["북상 이동", "MISMATCH"], ["남하 이동", "MATCH"]]);
  const occurrence = result.seasonality.fisheryOccurrence.cards[0];
  assert.equal(occurrence.representation, "MONTHLY_RECORD_SERIES");
  assert.deepEqual(occurrence.yearlyRecords.map((row) => row.period), ["2023-10", "2024-10", "2025-10"]);
});

test("mackerel February keeps northward and southward results separate", () => {
  const cards = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-000417", 2)).seasonality.migration.cards;
  assert.deepEqual(cards.map((card) => [card.movement, card.status]), [["NORTHWARD", "MATCH"], ["SOUTHWARD", "MISMATCH"]]);
});

test("webfoot octopus January keeps spawning and occurrence in separate sections", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-003107", 1));
  assert.equal(result.seasonality.spawning.status, "MATCH");
  assert.equal(result.seasonality.spawning.cards.length, 1);
  assert.equal(result.seasonality.fisheryOccurrence.status, "RECORDED");
  assert.equal(result.seasonality.fisheryOccurrence.cards.length, 1);
});

test("webfoot octopus August preserves missing as a null factual row", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-003107", 8));
  const rows = result.seasonality.fisheryOccurrence.cards[0].yearlyRecords;
  assert.deepEqual(rows.map((row) => [row.period, row.status]), [["2023-08", "MISSING"], ["2024-08", "RECORDED"], ["2025-08", "RECORDED"]]);
  assert.equal(rows[0].value, null);
  assert.equal(rows[0].displayValue, null);
  assert.equal(rows[0].displayStatus, "원자료 행 없음");
  assert.ok(result.limitations.includes("CLOSED_SEASON_AFFECTED"));
  assert.doesNotMatch(JSON.stringify(rows[0]), /어획 없음|개체 없음/);
});

test("red seabream handles unsupported occurrence without suppressing biological evidence", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-000755", 5));
  assert.equal(result.seasonality.spawning.status, "MATCH");
  assert.equal(result.seasonality.migration.cards.length, 1);
  assert.equal(result.seasonality.fisheryOccurrence.status, "UNSUPPORTED");
  assert.equal(result.seasonality.fisheryOccurrence.cards.length, 0);
  assert.equal(result.environment.temperature.relation, "WITHIN_RANGE");
});

test("source panel preserves environment and seasonality lineages without selecting a source", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-000417", 10));
  assert.equal(result.sources[0].domain, "environment");
  assert.equal(result.sources[0].sourceId, "nifs-risa");
  assert.equal(result.sources[0].provider, null);
  const mbris = result.sources.find((source) => source.sourceType === "MBRIS");
  assert.equal(mbris.provider, null);
  const kosis = result.sources.find((source) => source.provider === "KOSIS");
  assert.equal(kosis.sourceId, "kosis-dt-1ew0004-110015-2023-2025");
  assert.equal(kosis.lineage.runtimeQualityClass, "DERIVED_SEASONALITY_CONTEXT");
});

test("limitations are exact-string deduplicated without combining meanings", () => {
  const result = readModel.buildFishingConditionReadModel(withMonth("BM-SPECIES-003107", 8));
  assert.equal(result.limitations.length, new Set(result.limitations).size);
  assert.ok(result.limitations.includes("EFFORT_UNKNOWN"));
  assert.ok(result.limitations.includes("REGULATION_AFFECTED"));
  assert.ok(result.limitations.includes("CLOSED_SEASON_AFFECTED"));
});

test("freshness status is preserved and only receives a display label", () => {
  const bundle = baseBundle();
  bundle.environmentContext.freshness = "stale";
  for (const field of ["temperature", "salinity", "dissolvedOxygen", "activity", "habitat"]) bundle.evidence[field].freshness = "stale";
  const result = readModel.buildFishingConditionReadModel(bundle);
  assert.deepEqual(result.freshness, { status: "stale", label: "오래된 관측", observedAt: "2026-09-10T12:00:00" });
  assert.equal(result.environment.temperature.relation, "WITHIN_RANGE");
});

test("month omission produces a projection with seasonality not requested", () => {
  const result = readModel.buildFishingConditionReadModel(baseBundle());
  assert.equal(result.quality.seasonalityClass, null);
  assert.equal(result.seasonality.requestedMonth, null);
  assert.equal(result.seasonality.spawning.status, "NOT_REQUESTED");
  assert.deepEqual(result.seasonality.fisheryOccurrence.cards, []);
});

test("output is deterministic and contains no decision or ordering keys", () => {
  const bundle = withMonth("BM-SPECIES-000417", 10);
  const first = readModel.buildFishingConditionReadModel(bundle);
  const second = readModel.buildFishingConditionReadModel(bundle);
  assert.deepEqual(first, second);
  const keys = allKeys(first);
  for (const forbidden of ["score", "overallCondition", "overallSuitability", "bestSeason", "bestMonth", "recommendedSpecies", "recommendedSpot", "catchProbability", "probability", "ranking", "recommendation"]) assert.equal(keys.includes(forbidden), false);
});

test("server composes the bundle directly once and the route remains read-only", async () => {
  const bundle = withMonth("BM-SPECIES-000417", 10);
  let calls = 0;
  const server = transpile(readModelServerPath, {
    "server-only": {},
    "./evidence-bundle-server": { runConditionEvidenceBundle: async () => { calls += 1; return bundle; } },
    "./read-model": readModel,
  });
  const result = await server.runFishingConditionReadModel({ fixture: true });
  assert.equal(calls, 1);
  assert.equal(result.qualityClass, "DERIVED_FISHING_CONDITION_READ_MODEL");
  const route = fs.readFileSync(readModelRoutePath, "utf8");
  assert.match(route, /export async function POST/);
  assert.match(route, /runFishingConditionReadModel\(parsed\)/);
  assert.doesNotMatch(route, /fetch\(|supabase|insert\(|update\(|delete\(|export async function (?:GET|PUT|PATCH|DELETE)\b/i);
});

test("existing evidence route contract remains unchanged and separate", () => {
  const route = fs.readFileSync(evidenceRoutePath, "utf8");
  assert.match(route, /runConditionEvidenceBundle\(parsed\)/);
  assert.match(route, /\{ ok: true, \.\.\.bundle \}/);
  assert.doesNotMatch(route, /read-model|runFishingConditionReadModel/);
});

test("approved production artifacts remain immutable", () => {
  assert.equal(hash(artifactPath), "8069306c5157c7c6ab9fd3e1bfdc849bf06b21869cb5860b22f29935e5d9b018");
  assert.equal(hash(v2Path), "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98");
  assert.equal(hash(v3Path), "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376");
});

test("quality report records projection coverage and disabled boundaries", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.decision, "FISHING_CONDITION_READ_MODEL_V1_READY");
  assert.equal(report.qualityClass, "DERIVED_FISHING_CONDITION_READ_MODEL");
  assert.deepEqual(report.speciesTested, ["고등어", "주꾸미", "참돔"]);
  assert.equal(report.missingHandling.missingBecomesZero, false);
  assert.equal(report.boundaries.newInference, false);
  assert.equal(report.boundaries.databaseWrite, false);
  assert.equal(report.forbiddenKeyScan.findings, 0);
});

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const bundlePath = path.join(root, "src/lib/fishing-condition/evidence-bundle.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/evidence-bundle-server.ts");
const requestPath = path.join(root, "src/lib/fishing-condition/evidence-bundle-request.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/evidence-bundle/route.ts");
const runtimePath = path.join(root, "src/lib/fishing-condition/seasonality-runtime.ts");
const artifactPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const qualityPath = path.join(root, "reports/fishing-condition/seasonality-evidence-bundle-integration-v1-quality.json");
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

const runtime = transpile(runtimePath, { "../../../data/fishing-condition/seasonality/v1/species-seasonality.json": artifact });
const bundleModule = transpile(bundlePath);
const requestModule = transpile(requestPath, {
  "./profile-registry": { isFishingConditionRuntimeSpeciesId: (speciesId) => /^BM-SPECIES-\d{6}$/.test(speciesId) },
});
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function evidenceItem(field) {
  return {
    field,
    status: field === "temperature" ? "SUPPORTED" : "UNSUPPORTED_ENVIRONMENT",
    relation: field === "temperature" ? "WITHIN_RANGE" : null,
    environmentValue: field === "temperature" ? 15.5 : null,
    profileReference: null,
    explanation: `${field} factual explanation`,
    evidenceRefs: field === "temperature" ? ["temperature-source"] : [],
    sourceLineage: ["nifs-risa", "DERIVED_COMPARISON", "DERIVED_EXPLANATION", "DERIVED_EVIDENCE_BUNDLE"],
    freshness: "fresh",
  };
}

function legacyBundle(speciesId = "BM-SPECIES-000417") {
  const evidence = {
    temperature: evidenceItem("temperature"),
    salinity: evidenceItem("salinity"),
    dissolvedOxygen: evidenceItem("dissolvedOxygen"),
    seasonality: { ...evidenceItem("seasonality"), status: "SUPPORTED", relation: "MATCH", contexts: [] },
    activity: evidenceItem("activity"),
    habitat: evidenceItem("habitat"),
  };
  return {
    species: { speciesId, koreanName: "fixture", scientificName: "Fixture species", profileVersion: "v2" },
    environmentContext: { sourceId: "nifs-risa", stationOrSiteId: "bgj8a", observedAt: "2026-09-10T12:00:00", freshness: "fresh", depthContext: "SURFACE" },
    requestedContexts: { month: null, timeOfDay: null },
    evidence,
    summary: { supportedCount: 2, unsupportedCount: 4, blockedCount: 0, limitedCount: 0 },
    qualityClass: "DERIVED_EVIDENCE_BUNDLE",
  };
}

function context(result, name) {
  return result.seasonalityEvidence.contexts.find((item) => item.context === name);
}

function allKeys(input, output = []) {
  if (!input || typeof input !== "object") return output;
  for (const [key, value] of Object.entries(input)) {
    output.push(key);
    allKeys(value, output);
  }
  return output;
}

test("month omission preserves the legacy bundle exactly and skips seasonality runtime", async () => {
  const base = legacyBundle();
  let seasonalityCalls = 0;
  const server = transpile(serverPath, {
    "server-only": {},
    "./comparator-server": { runFishingConditionComparison: async () => ({ fixture: true }) },
    "./explanation": { explainFishingCondition: () => ({ fixture: true }) },
    "./evidence-bundle": { buildConditionEvidenceBundle: () => base, attachSeasonalityEvidence: bundleModule.attachSeasonalityEvidence },
    "./seasonality-runtime": { getSpeciesSeasonality: () => { seasonalityCalls += 1; } },
  });
  const result = await server.runConditionEvidenceBundle({ speciesId: "BM-SPECIES-000417", environment: {}, contexts: { month: null, timeOfDay: null } });
  assert.strictEqual(result, base);
  assert.equal(seasonalityCalls, 0);
  assert.equal("seasonalityEvidence" in result, false);
  assert.equal("environmentEvidence" in result, false);
});

test("request keeps month optional and rejects invalid month values", () => {
  const base = { speciesId: "BM-SPECIES-000417", environment: { sourceId: "nifs-risa", stationId: "bgj8a", depthContext: "SURFACE" } };
  assert.equal(requestModule.parseConditionEvidenceBundleRequest(base).contexts.month, null);
  assert.equal(requestModule.parseConditionEvidenceBundleRequest({ ...base, contexts: { month: 10 } }).contexts.month, 10);
  for (const month of [0, 13, 1.5, "10"]) assert.equal(requestModule.parseConditionEvidenceBundleRequest({ ...base, contexts: { month } }), null);
});

test("month extension separates environment fields from production seasonality", () => {
  const base = legacyBundle();
  const seasonality = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 });
  const result = bundleModule.attachSeasonalityEvidence(base, seasonality);
  assert.equal(result.qualityClass, "DERIVED_EVIDENCE_BUNDLE");
  assert.equal(result.seasonalityEvidence.qualityClass, "DERIVED_SEASONALITY_CONTEXT");
  assert.deepEqual(Object.keys(result.environmentEvidence), ["temperature", "salinity", "dissolvedOxygen", "activity", "habitat"]);
  assert.strictEqual(result.evidence, base.evidence);
  assert.deepEqual(result.summary, base.summary);
  assert.equal("seasonality" in result.environmentEvidence, false);
});

test("mackerel October retains migration entries and three occurrence records", () => {
  const result = bundleModule.attachSeasonalityEvidence(legacyBundle(), runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 }));
  assert.deepEqual(context(result, "MIGRATION").evidence.map((item) => item.status), ["MISMATCH", "MATCH"]);
  assert.deepEqual(context(result, "FISHERY_OCCURRENCE").evidence[0].periods.map((item) => item.period), ["2023-10", "2024-10", "2025-10"]);
  assert.deepEqual(result.seasonalitySummary, { availableContexts: 2, unresolvedContexts: 1, unsupportedContexts: 0 });
});

test("mackerel February keeps northward and southward migration independent", () => {
  const result = bundleModule.attachSeasonalityEvidence(legacyBundle(), runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 2 }));
  assert.deepEqual(context(result, "MIGRATION").evidence.map((item) => [item.movement, item.status]), [["NORTHWARD", "MATCH"], ["SOUTHWARD", "MISMATCH"]]);
  assert.equal(result.environmentEvidence.temperature.environmentValue, 15.5);
});

test("webfoot octopus January preserves spawning and occurrence domains", () => {
  const result = bundleModule.attachSeasonalityEvidence(legacyBundle("BM-SPECIES-003107"), runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-003107", month: 1 }));
  assert.equal(context(result, "SPAWNING").status, "MATCH");
  assert.equal(context(result, "FISHERY_OCCURRENCE").status, "RECORDED");
});

test("webfoot octopus August preserves missing, later records and closed-season limitation", () => {
  const result = bundleModule.attachSeasonalityEvidence(legacyBundle("BM-SPECIES-003107"), runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-003107", month: 8 }));
  const occurrence = context(result, "FISHERY_OCCURRENCE");
  assert.deepEqual(occurrence.evidence[0].periods.map((item) => [item.period, item.status]), [["2023-08", "MISSING"], ["2024-08", "RECORDED"], ["2025-08", "RECORDED"]]);
  assert.equal(occurrence.evidence[0].periods[0].record, null);
  assert.ok(occurrence.limitations.includes("CLOSED_SEASON_AFFECTED"));
  assert.equal(occurrence.evidence[0].periods.some((item) => item.status === "MISSING" && item.record?.value === 0), false);
});

test("unsupported occurrence does not suppress other seasonality or environment evidence", () => {
  const result = bundleModule.attachSeasonalityEvidence(legacyBundle("BM-SPECIES-000755"), runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000755", month: 5 }));
  assert.equal(context(result, "SPAWNING").status, "MATCH");
  assert.equal(context(result, "FISHERY_OCCURRENCE").status, "UNSUPPORTED");
  assert.equal(result.environmentEvidence.temperature.status, "SUPPORTED");
});

test("occurrence values, limitations and separate lineage pass through without aggregation", () => {
  const result = bundleModule.attachSeasonalityEvidence(legacyBundle(), runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 }));
  const occurrence = context(result, "FISHERY_OCCURRENCE").evidence[0];
  assert.deepEqual(occurrence.periods.map((item) => item.record.value), [12649.223, 18174.9317, 9770.9942]);
  for (const key of ["average", "sum", "min", "max", "median", "trend", "peakMonth", "representativeValue"]) assert.equal(key in occurrence, false);
  assert.ok(occurrence.limitations.includes("EFFORT_UNKNOWN"));
  assert.ok(occurrence.limitations.includes("QUOTA_AFFECTED"));
  assert.deepEqual(result.environmentEvidence.temperature.sourceLineage, ["nifs-risa", "DERIVED_COMPARISON", "DERIVED_EXPLANATION", "DERIVED_EVIDENCE_BUNDLE"]);
  assert.equal(occurrence.lineage.runtimeQualityClass, "DERIVED_SEASONALITY_CONTEXT");
});

test("extension is deterministic and produces no cross-domain decision fields or wording", () => {
  const seasonality = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 });
  const first = bundleModule.attachSeasonalityEvidence(legacyBundle(), seasonality);
  const second = bundleModule.attachSeasonalityEvidence(legacyBundle(), seasonality);
  assert.deepEqual(first, second);
  const keys = allKeys(first);
  for (const forbidden of ["score", "suitabilityScore", "conditionScore", "catchProbability", "probability", "ranking", "recommendation", "bestMonth", "peakMonth", "seasonRating", "overallCondition", "overallMatch"]) assert.equal(keys.includes(forbidden), false);
  assert.doesNotMatch(JSON.stringify(first), /잘 잡힌다|많이 잡힌다|좋은 조황|최적기|추천|출조하기 좋다|확률이 높다|GOOD|BAD|FAVORABLE|UNFAVORABLE|OPTIMAL|POOR/);
});

test("server reuses the shared runtime once only when month is present", async () => {
  const base = legacyBundle();
  const seasonality = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 });
  let calls = 0;
  const server = transpile(serverPath, {
    "server-only": {},
    "./comparator-server": { runFishingConditionComparison: async () => ({ fixture: true }) },
    "./explanation": { explainFishingCondition: () => ({ fixture: true }) },
    "./evidence-bundle": { buildConditionEvidenceBundle: () => base, attachSeasonalityEvidence: bundleModule.attachSeasonalityEvidence },
    "./seasonality-runtime": { getSpeciesSeasonality: (query) => { calls += 1; assert.deepEqual(query, { speciesId: "BM-SPECIES-000417", month: 10 }); return seasonality; } },
  });
  const result = await server.runConditionEvidenceBundle({ speciesId: "BM-SPECIES-000417", environment: {}, contexts: { month: 10, timeOfDay: null } });
  assert.equal(calls, 1);
  assert.equal(result.seasonalityEvidence.requestedMonth, 10);
});

test("route remains one read-only POST and internal route-to-route HTTP is absent", () => {
  const route = fs.readFileSync(routePath, "utf8");
  const server = fs.readFileSync(serverPath, "utf8");
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function (?:GET|PUT|PATCH|DELETE)\b|supabase|insert\(|update\(|delete\(/i);
  assert.match(server, /getSpeciesSeasonality\(/);
  assert.doesNotMatch(server, /fetch\(|\/api\/fishing-condition\/seasonality|supabase|openai|anthropic/i);
});

test("production artifacts remain immutable", () => {
  assert.equal(hash(artifactPath), "8069306c5157c7c6ab9fd3e1bfdc849bf06b21869cb5860b22f29935e5d9b018");
  assert.equal(hash(v2Path), "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98");
  assert.equal(hash(v3Path), "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376");
});

test("quality report records compatibility, domain separation and disabled boundaries", () => {
  const report = JSON.parse(fs.readFileSync(qualityPath, "utf8"));
  assert.equal(report.decision, "SEASONALITY_EVIDENCE_BUNDLE_INTEGRATION_V1_READY");
  assert.equal(report.legacyRequestCompatibility, "PASS");
  assert.deepEqual(report.occurrenceRecords, { mackerel: 36, webfootOctopus: 35, preservedMissingPeriods: ["2023-08"] });
  assert.equal(report.checks.noAggregation, "PASS");
  assert.equal(report.checks.forbiddenFieldFindings, 0);
  assert.equal(report.checks.forbiddenWordingFindings, 0);
  assert.equal(report.checksums.seasonality, hash(artifactPath));
});

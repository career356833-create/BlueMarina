const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const servicePath = path.join(root, "src/lib/fishing-condition/seasonality-runtime.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/seasonality/route.ts");
const artifactPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const qualityPath = path.join(root, "reports/fishing-condition/seasonality-runtime-integration-v1-quality.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

function loadService() {
  const output = ts.transpileModule(fs.readFileSync(servicePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => id.includes("species-seasonality.json") ? artifact : require(id);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

function loadRoute() {
  const output = ts.transpileModule(fs.readFileSync(routePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id === "next/server") return { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: init.headers ?? {} }) } };
    if (id === "@/lib/fishing-condition/seasonality-runtime") return runtime;
    return require(id);
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const runtime = loadService();
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const context = (result, name) => result.contexts.find((item) => item.context === name);

test("requires a canonical species id and explicit integer month", () => {
  assert.throws(() => runtime.getSpeciesSeasonality({ speciesId: "고등어", month: 10 }), { code: "INVALID_SPECIES_ID" });
  for (const month of [0, 13, 1.5, undefined]) {
    assert.throws(() => runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month }), { code: "INVALID_MONTH" });
  }
  assert.throws(() => runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-999999", month: 10 }), { code: "SPECIES_NOT_FOUND" });
});

test("spawning returns context-local MATCH, MISMATCH and MONTH_UNRESOLVED", () => {
  const match = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000755", month: 5, context: "SPAWNING" }), "SPAWNING");
  const mismatch = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000755", month: 9, context: "SPAWNING" }), "SPAWNING");
  const unresolved = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000188", month: 11, context: "SPAWNING" }), "SPAWNING");
  assert.equal(match.evidence[0].status, "MATCH");
  assert.equal(mismatch.evidence[0].status, "MISMATCH");
  assert.equal(unresolved.status, "MONTH_UNRESOLVED");
  assert.match(match.explanation, /5~6월/);
});

test("migration evidence remains independent including a cross-year range", () => {
  const february = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 2, context: "MIGRATION" }), "MIGRATION");
  const october = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10, context: "MIGRATION" }), "MIGRATION");
  assert.deepEqual(february.evidence.map((item) => item.status), ["MATCH", "MISMATCH"]);
  assert.deepEqual(october.evidence.map((item) => item.status), ["MISMATCH", "MATCH"]);
  assert.equal(february.status, "EVIDENCE_EVALUATED");
  assert.equal(october.status, "EVIDENCE_EVALUATED");
  assert.equal(october.evidence[1].crossesYearBoundary, true);
  assert.deepEqual(october.evidence[1].months, [9, 10, 11, 12, 1]);
});

test("mackerel October returns three unaggregated KOSIS records", () => {
  const result = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 });
  const occurrence = context(result, "FISHERY_OCCURRENCE");
  assert.equal(result.qualityClass, "DERIVED_SEASONALITY_CONTEXT");
  assert.equal(occurrence.status, "RECORDED");
  assert.deepEqual(occurrence.evidence[0].periods.map((item) => item.period), ["2023-10", "2024-10", "2025-10"]);
  assert.deepEqual(occurrence.evidence[0].periods.map((item) => item.record.value), [12649.223, 18174.9317, 9770.9942]);
  for (const key of ["average", "max", "min", "trend", "peak", "sum"]) assert.equal(key in occurrence.evidence[0], false);
});

test("webfoot octopus January keeps spawning and occurrence separate", () => {
  const result = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-003107", month: 1 });
  assert.equal(context(result, "SPAWNING").status, "MATCH");
  assert.equal(context(result, "FISHERY_OCCURRENCE").status, "RECORDED");
});

test("webfoot octopus August preserves 2023 missing beside later records", () => {
  const occurrence = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-003107", month: 8, context: "FISHERY_OCCURRENCE" }), "FISHERY_OCCURRENCE");
  const periods = occurrence.evidence[0].periods;
  assert.deepEqual(periods.map((item) => [item.period, item.status]), [
    ["2023-08", "MISSING"], ["2024-08", "RECORDED"], ["2025-08", "RECORDED"],
  ]);
  assert.equal(periods[0].record, null);
  assert.notEqual(periods[1].record.value, 0);
  assert.ok(occurrence.limitations.includes("CLOSED_SEASON_AFFECTED"));
  assert.match(periods[0].explanation, /missing/);
});

test("an explicit zero remains a record while an absent row does not become zero", () => {
  const synthetic = structuredClone(artifact);
  const entry = synthetic.species.find((item) => item.speciesId === "BM-SPECIES-003107").entries.find((item) => item.context === "FISHERY_OCCURRENCE");
  entry.records.push({ ...entry.records[0], period: "2023-08", value: 0 });
  entry.missingPeriods = [];
  const original = artifact.species.find((item) => item.speciesId === "BM-SPECIES-003107").entries.find((item) => item.context === "FISHERY_OCCURRENCE");
  assert.equal(original.records.some((item) => item.period === "2023-08"), false);
  assert.equal(original.missingPeriods.includes("2023-08"), true);
  assert.equal(entry.records.find((item) => item.period === "2023-08").value, 0);
});

test("unsupported occurrence does not affect available biological contexts", () => {
  const result = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000755", month: 5 });
  assert.equal(context(result, "SPAWNING").status, "MATCH");
  assert.equal(context(result, "FISHERY_OCCURRENCE").status, "UNSUPPORTED");
});

test("limitations, region, life stage and lineage remain explicit", () => {
  const redSeaBream = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000755", month: 5, context: "MIGRATION" }), "MIGRATION");
  assert.deepEqual(redSeaBream.geographicContexts, ["NORTHWEST_PACIFIC"]);
  assert.deepEqual(redSeaBream.lifeStages, ["ADULT"]);
  assert.ok(redSeaBream.limitations.includes("LIFE_STAGE_ADULT"));
  const occurrence = context(runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10, context: "FISHERY_OCCURRENCE" }), "FISHERY_OCCURRENCE");
  assert.equal(occurrence.evidence[0].lineage.provider, "KOSIS");
  assert.equal(occurrence.evidence[0].lineage.runtimeQualityClass, "DERIVED_SEASONALITY_CONTEXT");
});

test("results are deterministic and contain no uplift fields or product wording", () => {
  const first = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 });
  const second = runtime.getSpeciesSeasonality({ speciesId: "BM-SPECIES-000417", month: 10 });
  assert.deepEqual(first, second);
  const serialized = JSON.stringify(first);
  for (const field of ["score", "catchProbability", "normalization", "weight", "ranking", "recommendation", "bestMonth", "peakMonth", "seasonRating"]) {
    assert.equal(serialized.includes(`\"${field}\"`), false);
  }
  assert.doesNotMatch(serialized, /잘 잡힌다|많이 잡힌다|조황이 좋다|최적기|추천 시기|출조 추천|확률이 높다|적합하다/);
});

test("production artifacts remain byte-identical", () => {
  assert.equal(hash(artifactPath), "8069306c5157c7c6ab9fd3e1bfdc849bf06b21869cb5860b22f29935e5d9b018");
  assert.equal(hash(v2Path), "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98");
  assert.equal(hash(v3Path), "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376");
});

test("quality report records runtime coverage, integrity and disabled decision boundaries", () => {
  const report = JSON.parse(fs.readFileSync(qualityPath, "utf8"));
  assert.equal(report.decision, "SEASONALITY_RUNTIME_INTEGRATION_V1_READY");
  assert.equal(report.productionArtifact.speciesLoaded, 10);
  assert.deepEqual(report.productionArtifact.contexts, { SPAWNING: 7, MIGRATION: 13, FISHERY_OCCURRENCE: 2 });
  assert.deepEqual([report.occurrenceRecordIntegrity.mackerelRecords, report.occurrenceRecordIntegrity.webfootOctopusRecords], [36, 35]);
  assert.deepEqual(report.occurrenceRecordIntegrity.preservedMissingPeriods, ["2023-08"]);
  assert.equal(report.occurrenceRecordIntegrity.recordAggregation, false);
  assert.equal(report.checks.forbiddenWordingFindings, 0);
  assert.equal(report.immutability.seasonalitySha256, hash(artifactPath));
  for (const boundary of ["numericScoring", "probability", "ranking", "recommendation", "databaseWrite", "supabase", "externalAi"]) {
    assert.equal(report.boundaries[boundary], false);
  }
});

test("GET route requires month and remains read-only", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /export async function GET/);
  assert.match(route, /MONTH_REQUIRED/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)|supabase|insert\(|update\(|delete\(/i);
  assert.doesNotMatch(fs.readFileSync(servicePath, "utf8"), /supabase|fetch\(|openai|INSERT INTO|UPDATE public|DELETE FROM/i);
});

test("GET route returns 400 for month errors and 404 for an unknown species", async () => {
  const route = loadRoute();
  const request = (query) => ({ nextUrl: { searchParams: new URLSearchParams(query) } });
  const missing = await route.GET(request({ speciesId: "BM-SPECIES-000417" }));
  const invalid = await route.GET(request({ speciesId: "BM-SPECIES-000417", month: "13" }));
  const unknown = await route.GET(request({ speciesId: "BM-SPECIES-999999", month: "10" }));
  const valid = await route.GET(request({ speciesId: "BM-SPECIES-000417", month: "10" }));
  assert.deepEqual([missing.status, missing.body.code], [400, "MONTH_REQUIRED"]);
  assert.deepEqual([invalid.status, invalid.body.code], [400, "INVALID_MONTH"]);
  assert.deepEqual([unknown.status, unknown.body.code], [404, "SPECIES_NOT_FOUND"]);
  assert.equal(valid.status, 200);
  assert.equal(valid.body.seasonality.requestedMonth, 10);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const contractPath = path.join(root, "src/lib/fishing-condition/source-alignment.ts");
const requestPath = path.join(root, "src/lib/fishing-condition/source-alignment-request.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/source-alignment-server.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/source-alignment/route.ts");
const reportPath = path.join(root, "reports/fishing-condition/source-alignment-v1-quality.json");

function loadTs(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => mocks[name] ?? require(name);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const alignment = loadTs(contractPath);
const request = loadTs(requestPath, { "./source-alignment": alignment });

const validRequest = {
  target: { latitude: 35.1, longitude: 129.1, requestedAt: "2026-09-13T00:00:00Z", depthContext: "SURFACE" },
  bindings: {
    "nifs-risa": { stationId: "bgj8a" },
    "nifs-femo-sea": { siteId: "nifs-femo-sea:test:1" },
    "kma-marine-weather-observations": { stationId: "22101" },
    "kma-marine-weather-forecast": { zoneId: "12:3", issueAt: "2026091300", validAt: "2026091303" },
    "khoa-ocean-current-model": { latitude: 35.1, longitude: 129.1, validAt: "2026-09-13 00:00:00" },
  },
};

test("explicit target and source bindings are required", () => {
  assert.ok(request.parseSourceAlignmentRequest(validRequest));
  assert.equal(request.parseSourceAlignmentRequest({ ...validRequest, bindings: {} }), null);
  assert.equal(request.parseSourceAlignmentRequest({ bindings: validRequest.bindings }), null);
});

test("unsupported sources and mixed implicit binding fields are rejected", () => {
  assert.equal(request.parseSourceAlignmentRequest({ ...validRequest, bindings: { "nifs-soo": { stationId: "x" } } }), null);
  assert.equal(request.parseSourceAlignmentRequest({ ...validRequest, bindings: { "nifs-risa": { stationId: "x", latitude: 35 } } }), null);
});

test("distance uses Haversine and is deterministic", () => {
  assert.equal(alignment.haversineDistanceMeters({ latitude: 35, longitude: 129 }, { latitude: 35, longitude: 129 }), 0);
  const first = alignment.haversineDistanceMeters({ latitude: 35, longitude: 129 }, { latitude: 35.1, longitude: 129.1 });
  assert.equal(first, alignment.haversineDistanceMeters({ latitude: 35, longitude: 129 }, { latitude: 35.1, longitude: 129.1 }));
  assert.ok(first > 14000 && first < 15000);
});

test("time offsets are signed only for documented timezone", () => {
  assert.deepEqual(alignment.timeOffsets("2026-09-13T01:30:00Z", "2026-09-13T00:00:00Z", "UTC"), { timeOffsetMinutes: 90, absoluteTimeOffsetMinutes: 90 });
  assert.deepEqual(alignment.timeOffsets("2026-09-13T01:30:00", "2026-09-13T00:00:00Z", "UNSPECIFIED_BY_NIFS"), { timeOffsetMinutes: null, absoluteTimeOffsetMinutes: null });
});

test("depth category matches but exact depth is not inferred from SURFACE", () => {
  assert.equal(alignment.depthMatch("SURFACE", "SURFACE"), "CATEGORY_MATCH");
  assert.equal(alignment.depthMatch({ exactDepthM: 0 }, "SURFACE"), "UNRESOLVED");
  assert.equal(alignment.depthMatch({ exactDepthM: 10 }, "EXACT", 10), "EXACT");
  assert.equal(alignment.depthMatch("SURFACE", null), "NOT_APPLICABLE");
});

function source(sourceId, qualityClass, status = "ALIGNED", limitations = []) {
  return {
    sourceId, provider: "TEST", qualityClass, status, sourceBindingId: sourceId,
    sourceLocation: { latitude: 35.1, longitude: 129.1 }, distanceMeters: 0,
    observedOrValidAt: "2026-09-13T00:00:00Z", timeSemantic: "OBSERVED_AT", sourceTimezone: "UTC",
    timeOffsetMinutes: 0, absoluteTimeOffsetMinutes: 0, freshness: "fresh", depthContext: null,
    depthMatchStatus: "NOT_APPLICABLE", values: { [`${sourceId}.value`]: alignment.value(1, "unit") }, limitations,
  };
}

test("all five source classes stay separate and summary is technical only", () => {
  const sources = [source("nifs-risa", "OBSERVED"), source("nifs-femo-sea", "OBSERVED_PERIODIC_ENVIRONMENT", "UNIT_UNVERIFIED", ["UNIT_UNVERIFIED"]), source("kma-marine-weather-observations", "OBSERVED"), source("kma-marine-weather-forecast", "FORECAST"), source("khoa-ocean-current-model", "MODEL", "PARTIAL")];
  const result = alignment.buildAlignmentContext(validRequest.target, sources);
  assert.deepEqual(result.summary, { requestedSources: 5, alignedSources: 3, unavailableSources: 0, partialSources: 2 });
  assert.equal(result.qualityClass, "DERIVED_SOURCE_ALIGNMENT");
  assert.deepEqual(result.sources.map((item) => item.qualityClass), ["OBSERVED", "OBSERVED_PERIODIC_ENVIRONMENT", "OBSERVED", "FORECAST", "MODEL"]);
  assert.equal(result.sources[1].values["nifs-femo-sea.value"].unitStatus, "CONFIRMED");
});

test("partial source failure remains isolated", () => {
  const unavailable = source("khoa-ocean-current-model", "MODEL", "UNAVAILABLE", ["UPSTREAM_TIMEOUT"]);
  const result = alignment.buildAlignmentContext(validRequest.target, [source("nifs-risa", "OBSERVED"), unavailable]);
  assert.deepEqual(result.summary, { requestedSources: 2, alignedSources: 1, unavailableSources: 1, partialSources: 0 });
});

test("result has no averaging, interpolation, weighting, score, probability, ranking or recommendation", () => {
  const result = alignment.buildAlignmentContext(validRequest.target, [source("nifs-risa", "OBSERVED"), source("kma-marine-weather-forecast", "FORECAST")]);
  assert.deepEqual(result, alignment.buildAlignmentContext(validRequest.target, [source("nifs-risa", "OBSERVED"), source("kma-marine-weather-forecast", "FORECAST")]));
  const serialized = JSON.stringify(result);
  for (const forbidden of ["average", "interpolation", "weight", "score", "probability", "ranking", "recommendation", "bestSource"]) assert.doesNotMatch(serialized, new RegExp(forbidden, "i"));
});

test("server reuses existing normalized readers and contains five explicit adapters", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  for (const sourceId of alignment.SOURCE_ALIGNMENT_SOURCE_IDS) assert.match(server, new RegExp(`"${sourceId}"`));
  assert.match(server, /getNifsRealtimeFishingEnvironment/);
  assert.match(server, /getNifsFisheryEnvironment/);
  assert.match(server, /getKmaMarineObservationSnapshot/);
  assert.match(server, /parseKmaMarineForecastCsv/);
  assert.match(server, /normalizeKhoaRomsRows/);
  assert.doesNotMatch(server, /nearest|average|interpolat|weight|score|probability|recommendation/i);
});

test("read-only route exposes POST only and does not invoke downstream decision layers", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /export async function POST/);
  assert.match(route, /parseSourceAlignmentRequest/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /export async function (GET|PUT|PATCH|DELETE)|supabase|insert\(|update\(|delete\(|Comparator|EvidenceBundle/i);
});

test("quality report preserves the V1 gates", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.qualityClass, "DERIVED_SOURCE_ALIGNMENT");
  assert.equal(report.supportedSources.length, 5);
  assert.equal(report.invariants.automaticNearest, false);
  assert.equal(report.invariants.averaging, false);
  assert.equal(report.invariants.interpolation, false);
  assert.equal(report.invariants.weighting, false);
  assert.equal(report.invariants.score, false);
  assert.equal(report.databaseWrites, 0);
});

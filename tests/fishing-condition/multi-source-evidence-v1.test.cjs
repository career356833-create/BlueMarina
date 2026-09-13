const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const paths = {
  comparator: path.join(root, "src/lib/fishing-condition/comparator.ts"),
  explanation: path.join(root, "src/lib/fishing-condition/explanation.ts"),
  evidence: path.join(root, "src/lib/fishing-condition/evidence-bundle.ts"),
  alignment: path.join(root, "src/lib/fishing-condition/source-alignment.ts"),
  alignmentRequest: path.join(root, "src/lib/fishing-condition/source-alignment-request.ts"),
  multi: path.join(root, "src/lib/fishing-condition/multi-source-evidence.ts"),
  request: path.join(root, "src/lib/fishing-condition/multi-source-evidence-request.ts"),
  server: path.join(root, "src/lib/fishing-condition/multi-source-evidence-server.ts"),
  route: path.join(root, "src/app/api/fishing-condition/multi-source-evidence/route.ts"),
  report: path.join(root, "reports/fishing-condition/multi-source-evidence-v1-quality.json"),
};

function loadTs(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)((name) => mocks[name] ?? require(name), module, module.exports);
  return module.exports;
}

const comparator = loadTs(paths.comparator);
const explanation = loadTs(paths.explanation);
const evidence = loadTs(paths.evidence);
const alignment = loadTs(paths.alignment);
const alignmentRequest = loadTs(paths.alignmentRequest, { "./source-alignment": alignment });
const multi = loadTs(paths.multi);
const request = loadTs(paths.request, { "./source-alignment-request": alignmentRequest });

function profile() {
  return {
    speciesId: "BM-SPECIES-000417", koreanName: "고등어", scientificName: "Scomber japonicus", profileStatus: "EVIDENCE_ENRICHED",
    temperature: { canonicalPreferredMinC: 15, canonicalPreferredMaxC: 22, preferred: [{ minC: 15, maxC: 22, context: "PREFERRED_TEMPERATURE", lifeStage: "UNSPECIFIED", regionScope: "KOREA", evidenceIds: ["temp-evidence"] }], observed: [] },
    depth: { canonicalObservedMinM: 0, canonicalObservedMaxM: 300, observed: [{ minM: 0, maxM: 300, context: "OBSERVED_DEPTH", lifeStage: "UNSPECIFIED", regionScope: "GLOBAL", evidenceIds: ["depth-evidence"] }] },
    salinity: { canonicalMin: 30, canonicalMax: 35, unit: "psu", ranges: [{ min: 30, max: 35, unit: "psu", context: "OBSERVED", regionScope: "GLOBAL", evidenceIds: ["salinity-evidence"] }] },
    dissolvedOxygen: { minimumMgL: 5, observations: [{ minMgL: 5, maxMgL: null, context: "THRESHOLD", regionScope: "GLOBAL", evidenceIds: ["do-evidence"] }] },
    spawning: [], migration: [], seasonality: [], activityPeriod: "MIXED", conflicts: [],
  };
}

function environment(sourceId = "nifs-risa") {
  return {
    sourceId, provider: "NIFS", qualityClass: sourceId === "nifs-risa" ? "OBSERVED" : "OBSERVED_PERIODIC_ENVIRONMENT",
    stationOrSiteId: "explicit-source", observedAt: "2026-09-13T00:00:00Z", freshness: "fresh", depthContext: "SURFACE",
    exactDepthM: 5, stationWaterDepthM: 30, temperature: { value: 20, unit: "degC" },
    salinity: { value: sourceId === "nifs-femo-sea" ? 33 : null, unit: sourceId === "nifs-femo-sea" ? "UNIT_NOT_DOCUMENTED" : null },
    dissolvedOxygen: { value: sourceId === "nifs-femo-sea" ? 6 : null, unit: sourceId === "nifs-femo-sea" ? "mg/L" : null }, chlorophyllA: { value: null, unit: null },
  };
}

function aligned(sourceId, qualityClass, status = "ALIGNED") {
  return {
    sourceId, provider: sourceId.startsWith("nifs") ? "NIFS" : sourceId.startsWith("kma") ? "KMA" : "KHOA", qualityClass, status,
    sourceBindingId: `binding:${sourceId}`, sourceLocation: { latitude: 35.1, longitude: 129.1 }, distanceMeters: 1234,
    observedOrValidAt: "2026-09-13T00:00:00Z", timeSemantic: qualityClass === "FORECAST" ? "FORECAST_AT" : qualityClass === "MODEL" ? "UNKNOWN" : "OBSERVED_AT",
    sourceTimezone: qualityClass === "MODEL" ? "UNSPECIFIED" : "UTC", timeOffsetMinutes: qualityClass === "MODEL" ? null : 0,
    absoluteTimeOffsetMinutes: qualityClass === "MODEL" ? null : 0, freshness: "fresh", depthContext: "SURFACE", depthMatchStatus: qualityClass === "MODEL" ? "NOT_APPLICABLE" : "CATEGORY_MATCH",
    values: { [`${sourceId}.temperature`]: { value: 20, unit: "degC", unitStatus: "CONFIRMED" } }, limitations: qualityClass === "MODEL" ? ["DIRECTION_CONVENTION_UNVERIFIED"] : [],
  };
}

function derived(sourceId) {
  const comparison = comparator.compareFishingCondition(profile(), environment(sourceId));
  const described = explanation.explainFishingCondition(comparison);
  return { comparison, explanation: described, evidenceBundle: evidence.buildConditionEvidenceBundle(comparison, described, { month: null, timeOfDay: null }) };
}

test("request requires species and the complete explicit alignment contract", () => {
  const valid = { speciesId: "BM-SPECIES-000417", alignment: { target: { latitude: 35.1, longitude: 129.1, requestedAt: "2026-09-13T00:00:00Z", depthContext: "SURFACE" }, bindings: { "nifs-risa": { stationId: "bgj8a" } } } };
  assert.ok(request.parseMultiSourceEvidenceRequest(valid));
  assert.equal(request.parseMultiSourceEvidenceRequest({ ...valid, speciesId: "invalid" }), null);
  assert.equal(request.parseMultiSourceEvidenceRequest({ speciesId: valid.speciesId, alignment: { ...valid.alignment, bindings: {} } }), null);
});

test("RISA and FEMO produce independent comparable branches with existing evidence logic", () => {
  const risa = multi.buildMultiSourceBranch(aligned("nifs-risa", "OBSERVED", "PARTIAL"), derived("nifs-risa"));
  const femoSource = aligned("nifs-femo-sea", "OBSERVED_PERIODIC_ENVIRONMENT", "UNIT_UNVERIFIED");
  femoSource.limitations = ["UNIT_UNVERIFIED"];
  const femo = multi.buildMultiSourceBranch(femoSource, derived("nifs-femo-sea"));
  assert.equal(risa.branchMode, "COMPARABLE");
  assert.equal(risa.comparison.comparisons.temperature.relation, "WITHIN_RANGE");
  assert.equal(risa.explanations[0].qualityClass, "DERIVED_EXPLANATION");
  assert.equal(risa.evidenceBundle.qualityClass, "DERIVED_EVIDENCE_BUNDLE");
  assert.deepEqual(risa.evidenceBundle.evidence.temperature.evidenceRefs, ["temp-evidence"]);
  assert.equal(femo.branchMode, "COMPARABLE");
  assert.equal(femo.comparison.comparisons.salinity.relation, "UNIT_UNVERIFIED");
  assert.equal(femo.comparison.comparisons.dissolvedOxygen.relation, "WITHIN_RANGE");
  assert.ok(femo.limitations.includes("UNIT_UNVERIFIED"));
});

test("KMA observation, KMA forecast and ROMS remain context-only", () => {
  const sources = [aligned("kma-marine-weather-observations", "OBSERVED"), aligned("kma-marine-weather-forecast", "FORECAST"), aligned("khoa-ocean-current-model", "MODEL", "PARTIAL")];
  const branches = sources.map((source) => multi.buildMultiSourceBranch(source, null));
  assert.deepEqual(branches.map((branch) => branch.branchMode), ["CONTEXT_ONLY", "CONTEXT_ONLY", "CONTEXT_ONLY"]);
  for (const branch of branches) { assert.equal(branch.comparison, null); assert.deepEqual(branch.explanations, []); assert.equal(branch.evidenceBundle, null); assert.equal(branch.spatial.distanceMeters, 1234); }
  assert.equal(branches[1].temporal.timeSemantic, "FORECAST_AT");
  assert.equal(branches[2].temporal.timeOffsetMinutes, null);
  assert.deepEqual(branches[2].limitations, ["DIRECTION_CONVENTION_UNVERIFIED"]);
});

test("unavailable source is isolated and branch metadata remains intact", () => {
  const source = aligned("kma-marine-weather-forecast", "FORECAST", "UNAVAILABLE"); source.limitations = ["CSV_HEADER_NOT_FOUND"];
  const branch = multi.buildMultiSourceBranch(source, null);
  assert.equal(branch.branchMode, "UNAVAILABLE");
  assert.equal(branch.temporal.freshness, "fresh");
  assert.deepEqual(branch.limitations, ["CSV_HEADER_NOT_FOUND"]);
});

test("lineage differs only by comparable processing path", () => {
  const comparable = multi.buildMultiSourceBranch(aligned("nifs-risa", "OBSERVED"), derived("nifs-risa"));
  const context = multi.buildMultiSourceBranch(aligned("kma-marine-weather-observations", "OBSERVED"), null);
  assert.deepEqual(comparable.lineage, ["nifs-risa", "DERIVED_SOURCE_ALIGNMENT", "DERIVED_COMPARISON", "DERIVED_EXPLANATION", "DERIVED_EVIDENCE_BUNDLE", "DERIVED_MULTI_SOURCE_EVIDENCE"]);
  assert.deepEqual(context.lineage, ["kma-marine-weather-observations", "DERIVED_SOURCE_ALIGNMENT", "DERIVED_MULTI_SOURCE_EVIDENCE"]);
});

test("summary is branch-count metadata and keeps source values separate", () => {
  const sources = [aligned("nifs-risa", "OBSERVED", "PARTIAL"), aligned("nifs-femo-sea", "OBSERVED_PERIODIC_ENVIRONMENT", "UNIT_UNVERIFIED"), aligned("kma-marine-weather-observations", "OBSERVED"), aligned("kma-marine-weather-forecast", "FORECAST", "UNAVAILABLE"), aligned("khoa-ocean-current-model", "MODEL", "PARTIAL")];
  const branches = [multi.buildMultiSourceBranch(sources[0], derived("nifs-risa")), multi.buildMultiSourceBranch(sources[1], derived("nifs-femo-sea")), ...sources.slice(2).map((source) => multi.buildMultiSourceBranch(source, null))];
  const alignedContext = alignment.buildAlignmentContext({ latitude: 35.1, longitude: 129.1, requestedAt: "2026-09-13T00:00:00Z", depthContext: "SURFACE" }, sources);
  const result = multi.buildMultiSourceEvidenceResult({ speciesId: "BM-SPECIES-000417", koreanName: "고등어", scientificName: "Scomber japonicus", profileVersion: "v2" }, alignedContext, branches);
  assert.deepEqual(result.summary, { sourceCount: 5, comparableBranches: 2, contextOnlyBranches: 2, unavailableBranches: 1, limitedBranches: 3 });
  assert.equal(result.qualityClass, "DERIVED_MULTI_SOURCE_EVIDENCE");
  assert.notEqual(result.branches[0].values, result.branches[1].values);
  assert.deepEqual(result, multi.buildMultiSourceEvidenceResult(result.species, alignedContext, branches));
});

function keys(value, output = []) { if (!value || typeof value !== "object") return output; for (const [key, child] of Object.entries(value)) { output.push(key); keys(child, output); } return output; }

test("output has no composite decision or source-selection keys", () => {
  const branch = multi.buildMultiSourceBranch(aligned("nifs-risa", "OBSERVED"), derived("nifs-risa"));
  const allKeys = keys(branch).map((key) => key.toLowerCase());
  for (const forbidden of ["score", "probability", "ranking", "recommendation", "overallcondition", "representativetemperature", "preferredsource", "weight"]) assert.equal(allKeys.includes(forbidden), false);
});

test("server executes alignment once and reuses comparator, explanation and bundle functions directly", () => {
  const server = fs.readFileSync(paths.server, "utf8");
  assert.equal((server.match(/runSourceAlignment\(request\.alignment\)/g) ?? []).length, 1);
  assert.match(server, /runFishingConditionComparisonForEnvironment/);
  assert.match(server, /explainFishingCondition\(comparison\)/);
  assert.match(server, /buildConditionEvidenceBundle\(comparison, explanation/);
  assert.doesNotMatch(server, /fetch\(|nearest|average|interpolat|weight|score|probability|ranking|recommendation|supabase/i);
});

test("route is read-only POST and performs no internal HTTP or mutation", () => {
  const route = fs.readFileSync(paths.route, "utf8");
  assert.match(route, /export async function POST/);
  assert.match(route, /runMultiSourceEvidence/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /export async function (GET|PUT|PATCH|DELETE)|fetch\(|supabase|insert\(|update\(|delete\(/i);
});

test("quality report records branch coverage and all prohibited operations as disabled", () => {
  const report = JSON.parse(fs.readFileSync(paths.report, "utf8"));
  assert.equal(report.qualityClass, "DERIVED_MULTI_SOURCE_EVIDENCE");
  assert.deepEqual(report.comparableSources, ["nifs-risa", "nifs-femo-sea"]);
  assert.equal(report.contextOnlySources.length, 3);
  for (const value of Object.values(report.invariants)) assert.equal(value, false);
  assert.equal(report.databaseWrites, 0);
  assert.equal(report.externalAiCalls, 0);
});

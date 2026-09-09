const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const cache = new Map();
function loadTs(file) {
  const resolved = path.resolve(file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const output = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  cache.set(resolved, module);
  const localRequire = (specifier) => specifier.startsWith(".") ? loadTs(fs.existsSync(path.resolve(path.dirname(resolved), specifier)) ? path.resolve(path.dirname(resolved), specifier) : path.resolve(path.dirname(resolved), `${specifier}.ts`)) : require(specifier);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const modulePath = path.join(root, "src/lib/fishing-condition/nifs-ocean-section-climatology.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/nifs-ocean-section-climatology-server.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/climatology/ocean-section/route.ts");
const manifestPath = path.join(root, "data/nifs/fishing-condition/ocean-section/climatology/v1/manifest.json");
const reportPath = path.join(root, "reports/nifs/ocean-section-climatology-quality-v1.json");
const climatology = loadTs(modulePath);

function profile(year, value, overrides = {}) {
  const stationId = overrides.stationId ?? "204-06";
  const depthValue = overrides.depthValue ?? 0;
  return {
    profileId: `nifs-soo:E:${stationId}:${year}-02-15T09:00:00`, stationId, regionCode: "E", regionName: "동해",
    lineCode: stationId.split("-")[0], stationCode: stationId.split("-")[1], observedAt: `${year}-02-15T09:00:00`, rawObservedAt: `${year}-02-15 09:00`,
    sourceTimezone: "UNSPECIFIED_BY_NIFS", latitude: 37, longitude: 129, metadataLatitude: 37, metadataLongitude: 129,
    coordinateStatus: "MATCH", vesselName: null, provider: "NIFS", sourceId: "nifs-soo", qualityClass: "HISTORICAL_OCEANOGRAPHIC_PROFILE",
    samples: [{
      depth: { value: depthValue, unit: "UNIT_NOT_DOCUMENTED" },
      waterTemperature: { value, unit: "UNIT_NOT_DOCUMENTED", qcRaw: Object.prototype.hasOwnProperty.call(overrides, "qcRaw") ? overrides.qcRaw : "2" },
      salinity: { value: null, unit: "UNIT_NOT_DOCUMENTED", qcRaw: null }, dissolvedOxygen: { value: null, unit: "UNIT_NOT_DOCUMENTED", qcRaw: null },
      phosphateP: { value: null, unit: "UNIT_NOT_DOCUMENTED" }, nitriteN: { value: null, unit: "UNIT_NOT_DOCUMENTED" }, nitrateN: { value: null, unit: "UNIT_NOT_DOCUMENTED" },
      silicateSi: { value: null, unit: "UNIT_NOT_DOCUMENTED" }, ph: { value: null, unit: "UNIT_NOT_DOCUMENTED" }, transparency: { value: null, unit: "UNIT_NOT_DOCUMENTED" }, pressure: { value: null, unit: "UNIT_NOT_DOCUMENTED" },
    }],
  };
}

test("calendar month, exact station and exact zero depth form the climatology key", () => {
  const result = climatology.buildOceanSectionTemperatureClimatology([profile(2021, 10), profile(2022, 12), profile(2023, 14)]);
  assert.equal(result.cells.length, 1);
  assert.equal(result.cells[0].stationId, "204-06");
  assert.equal(result.cells[0].month, 2);
  assert.equal(result.cells[0].depthValue, 0);
  assert.equal(result.cells[0].depthUnit, "UNIT_NOT_DOCUMENTED");
});

test("mean median min max and sample standard deviation use source-scale values", () => {
  const cell = climatology.buildOceanSectionTemperatureClimatology([profile(2021, 10), profile(2022, 12), profile(2023, 14)]).cells[0];
  assert.equal(cell.mean, 12);
  assert.equal(cell.median, 12);
  assert.equal(cell.min, 10);
  assert.equal(cell.max, 14);
  assert.equal(cell.standardDeviation, 2);
  assert.equal(cell.sampleCount, 3);
  assert.equal(cell.yearCount, 3);
});

test("cells below the three-event gate are unavailable", () => {
  const result = climatology.buildOceanSectionTemperatureClimatology([profile(2021, 10), profile(2022, 12)]);
  assert.equal(result.cells.length, 0);
  assert.equal(result.quality.excludedLowSampleCells, 1);
});

test("stations and exact source depths never merge", () => {
  const rows = [profile(2021, 10), profile(2022, 11), profile(2023, 12), profile(2021, 20, { stationId: "204-07" }), profile(2022, 21, { stationId: "204-07" }), profile(2023, 22, { stationId: "204-07" }), profile(2021, 5, { depthValue: 10 }), profile(2022, 6, { depthValue: 10 }), profile(2023, 7, { depthValue: 10 })];
  const result = climatology.buildOceanSectionTemperatureClimatology(rows);
  assert.equal(result.cells.length, 3);
  assert.deepEqual(result.quality.depthValues, [0, 10]);
  assert.equal(result.quality.stations, 2);
});

test("duplicate observations dedupe exactly and conflicting values are disclosed", () => {
  const original = profile(2021, 10);
  const result = climatology.buildOceanSectionTemperatureClimatology([original, structuredClone(original), profile(2021, 11), profile(2022, 12), profile(2023, 14)]);
  assert.equal(result.quality.exactDuplicateSamples, 1);
  assert.equal(result.quality.conflictingDuplicateSamples, 1);
  assert.equal(result.cells[0].sampleCount, 3);
});

test("QC distributions are retained but never used as a filter", () => {
  const result = climatology.buildOceanSectionTemperatureClimatology([profile(2021, 10, { qcRaw: "1" }), profile(2022, 12, { qcRaw: "2" }), profile(2023, 14, { qcRaw: null })]);
  const cell = result.cells[0];
  assert.deepEqual(cell.qcRawDistribution, { "1": 1, "2": 1, MISSING: 1 });
  assert.deepEqual(result.quality.inputQcRawDistribution, { "1": 1, "2": 1, MISSING: 1 });
});

test("anomaly calculation is blocked unless station depth and unit gates all pass", () => {
  const baseline = climatology.buildOceanSectionTemperatureClimatology([profile(2021, 10), profile(2022, 12), profile(2023, 14)]).cells[0];
  assert.throws(() => climatology.calculateTemperatureAnomaly({ currentValue: 15, baseline, currentSourceId: "nifs-risa", gate: { stationMapping: "ANOMALY_MAPPING_BLOCKED", depthMapping: "DEPTH_MAPPING_BLOCKED", unitCompatibility: "UNIT_COMPATIBILITY_BLOCKED" } }), /ANOMALY_MAPPING_BLOCKED/);
  const allowed = climatology.calculateTemperatureAnomaly({ currentValue: 15, baseline, currentSourceId: "verified-source", gate: { stationMapping: "VERIFIED_OFFICIAL", depthMapping: "VERIFIED_EXACT", unitCompatibility: "VERIFIED_SAME_UNIT" } });
  assert.equal(allowed.anomaly, 3);
  assert.equal(allowed.qualityClass, "DERIVED_ENVIRONMENT_FEATURE");
});

test("feature registry connects baseline and keeps anomaly blocked", () => {
  assert.deepEqual(climatology.FISHING_CONDITION_CLIMATOLOGY_FEATURE_REGISTRY.map((entry) => entry.status), ["CONNECTED", "ANOMALY_MAPPING_BLOCKED"]);
});

test("artifact manifest and quality report preserve lineage and no-score boundaries", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const reportText = fs.readFileSync(reportPath, "utf8");
  const report = JSON.parse(reportText);
  assert.equal(manifest.source.derivedFrom, "nifs-soo");
  assert.equal(manifest.source.qualityClass, "DERIVED_HISTORICAL_BASELINE");
  assert.equal(manifest.files.length, 12);
  assert.ok(manifest.cellCount > 0);
  assert.equal(report.mapping.anomalyEnabled, false);
  assert.equal(report.build.scoreImplemented, false);
  assert.ok(report.climatology.inputQcRawDistribution);
  assert.doesNotMatch(reportText, /api[_-]?key|authorization|bearer\s|[?&]key=/i);
});

test("runtime route is bounded, artifact-only and has no anomaly endpoint", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(server, /import "server-only"/);
  assert.match(server, /MAX_LIMIT = 500/);
  assert.match(server, /ARTIFACT_ROOT/);
  assert.doesNotMatch(server, /fetch\(|NIFS_SOO_API_KEY|supabase/i);
  assert.match(route, /stationId/);
  assert.match(route, /month/);
  assert.match(route, /depth/);
  assert.doesNotMatch(route, /score|probability|ranking|recommendation/i);
  assert.equal(fs.existsSync(path.join(root, "src/app/api/fishing-condition/environment/anomaly/temperature/route.ts")), false);
});

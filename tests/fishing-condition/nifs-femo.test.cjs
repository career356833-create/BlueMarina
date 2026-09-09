const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const parserPath = path.join(root, "src/lib/fishing-condition/nifs-fishery-environment.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/nifs-fishery-environment-server.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/environment/fishery/route.ts");
const parser = loadTs(parserPath);

function row(overrides = {}) {
  return {
    FISHERY: "테스트 어장", LOCATION_POINT: "1", LATITUDE: "35°09´54˝", LONGITUDE: "126°17´32˝", KIND: "어류",
    DATE_Y: "2026", DATE_M: "8", DATE_D: "1", TIME_H: "9", TIME_I: "5", WEATHER: "맑음", DEPTH: "14",
    TEMP_S: "0", TEMP_B: "18.11", SAL_S: "30.66", SAL_B: "30.62", PH_S: "7.86", PH_B: "7.85",
    DO_S: "7.47", DO_B: "7.30", COD_S: "4.13", COD_B: "8.51", NH4_N_S: "0.007", NH4_N_B: "0.005",
    NO3_N_S: "0.348", NO3_N_B: "0.315", NO2_N_S: "0.005", NO2_N_B: "0.003", DIN_S: "0.361", DIN_B: "0.324",
    TN_S: "0.497", TN_B: "0.452", DIP_S: "0.041", DIP_B: "0.037", TP_S: "0.139", TP_B: "0.115",
    SIL_S: "1.535", SIL_B: "1.361", CHL_S: "2.95", CHL_B: "3.99", SS_S: "199.00", SS_B: "0", M: "0",
    ...overrides,
  };
}

test("coordinate and timestamp parsers preserve official composite identity inputs", () => {
  assert.equal(parser.parseNifsFemoCoordinate("35°09´54˝", "latitude").toFixed(6), "35.165000");
  assert.equal(parser.parseNifsFemoCoordinate("126°17´32˝", "longitude").toFixed(6), "126.292222");
  assert.equal(parser.parseNifsFemoCoordinate("bad", "latitude"), null);
  assert.equal(parser.parseNifsFemoTimestamp(row()), "2026-08-01T09:05:00");
  assert.equal(parser.parseNifsFemoTimestamp(row({ DATE_D: "32" })), null);
});

test("surface and bottom measurements keep source depth semantics and official units", () => {
  const result = parser.buildNifsFemoEnvironment([row()], "2026-08-01T00:10:00.000Z", "2026-08-01T09:10:00");
  const sample = result.samples[0];
  assert.equal(sample.depthContext.kind, "SURFACE_BOTTOM_PAIR");
  assert.equal(sample.depthContext.waterDepthM, 14);
  assert.deepEqual(sample.measurements.waterTemperature, { surface: 0, bottom: 18.11, unit: "degC" });
  assert.deepEqual(sample.measurements.salinity, { surface: 30.66, bottom: 30.62, unit: "UNIT_NOT_DOCUMENTED" });
  assert.equal(sample.measurements.dissolvedOxygen.unit, "mg/L");
  assert.equal(sample.measurements.chlorophyllA.unit, "ug/L");
  assert.equal(sample.measurements.ph.unit, "pH");
});

test("nutrients, chlorophyll, DO and suspended solids remain raw observed features", () => {
  const sample = parser.buildNifsFemoEnvironment([row()], "2026-08-01T00:10:00.000Z", "2026-08-01T09:10:00").samples[0];
  assert.equal(sample.measurements.ammoniaNitrogen.surface, 0.007);
  assert.equal(sample.measurements.nitrateNitrogen.bottom, 0.315);
  assert.equal(sample.measurements.nitriteNitrogen.surface, 0.005);
  assert.equal(sample.measurements.dissolvedInorganicNitrogen.bottom, 0.324);
  assert.equal(sample.measurements.dissolvedInorganicPhosphorus.surface, 0.041);
  assert.equal(sample.measurements.silicateSilicon.bottom, 1.361);
  assert.equal(sample.measurements.suspendedSolids.bottom, 0);
  assert.equal(sample.transparency.value, 0);
});

test("only blank and null are missing while zero and unobserved sentinel-like numbers remain", () => {
  assert.equal(parser.normalizeNifsFemoNumber(""), null);
  assert.equal(parser.normalizeNifsFemoNumber(null), null);
  assert.equal(parser.normalizeNifsFemoNumber("0"), 0);
  assert.equal(parser.normalizeNifsFemoNumber("-99"), -99);
  assert.equal(parser.NIFS_FEMO_OBSERVED_SENTINELS.size, 0);
});

test("exact duplicates are disclosed and removed without fuzzy site matching", () => {
  const original = row();
  const exactDuplicate = { ...original };
  const conflictingDuplicate = row({ TEMP_S: "17" });
  const otherSite = row({ LOCATION_POINT: "2", LATITUDE: "35°09´55˝" });
  const result = parser.buildNifsFemoEnvironment([original, exactDuplicate, conflictingDuplicate, otherSite], "2026-08-01T00:10:00.000Z", "2026-08-01T09:10:00");
  assert.equal(result.samples.length, 2);
  assert.equal(result.quality.exactDuplicateRows, 1);
  assert.equal(result.quality.conflictingDuplicateRows, 1);
  assert.equal(result.quality.uniqueSites, 2);
  assert.match(result.samples[0].siteId, /^nifs-femo-sea:/);
});

test("periodic freshness is independent from the realtime source policy", () => {
  assert.equal(parser.deriveNifsFemoFreshness("2026-05-01T00:00:00", "2026-08-01T00:00:00"), "fresh");
  assert.equal(parser.deriveNifsFemoFreshness("2026-01-01T00:00:00", "2026-08-01T00:00:00"), "stale");
  assert.equal(parser.deriveNifsFemoFreshness("2025-01-01T00:00:00", "2026-08-01T00:00:00"), "unavailable");
});

test("feature registry records lineage without implementing a score", () => {
  assert.equal(parser.FISHING_CONDITION_FISHERY_INPUT_REGISTRY.length, 15);
  assert.ok(parser.FISHING_CONDITION_FISHERY_INPUT_REGISTRY.every((entry) => entry.provider === "NIFS" && entry.sourceId === "nifs-femo-sea"));
  assert.ok(parser.FISHING_CONDITION_FISHERY_INPUT_REGISTRY.every((entry) => entry.qualityClass === "OBSERVED_PERIODIC_ENVIRONMENT"));
});

test("server boundary uses one dedicated seawater source and remains isolated", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(server, /import "server-only"/);
  assert.match(server, /NIFS_FEMO_API_KEY/);
  assert.match(server, /NIFS_FEMO_SEA_URL/);
  assert.doesNotMatch(server, /NIFS_API_KEY|FEMO_RIVER|KMA_|KHOA_|NEXT_PUBLIC_/);
  assert.match(server, /NIFS_FEMO_CACHE_SECONDS = 24 \* 60 \* 60/);
  assert.match(server, /NIFS_FEMO_STALE_FALLBACK_SECONDS = 7 \* 24 \* 60 \* 60/);
  assert.match(server, /conflictingDuplicateRows > 0/);
  assert.match(route, /fishing-condition/);
  assert.doesNotMatch(route, /sea-info|score|probability|ranking|recommend/);
});

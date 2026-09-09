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

const parserPath = path.join(root, "src/lib/fishing-condition/nifs-ocean-section.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/nifs-ocean-section-server.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/environment/ocean-section/route.ts");
const reportPath = path.join(root, "reports/nifs/ocean-section-quality-v1.json");
const parser = loadTs(parserPath);

function station(overrides = {}) {
  return { gru_nam: "East Sea", sln_cde: "102", sta_cde: "01", bld_dat: "19610129", end_dat: "", lat: "37.5", lon: "129.5", zoo_dep: "0", bot_dep: "200", ...overrides };
}

function profile(overrides = {}) {
  return {
    gru_nam: "E", sln_cde: "102", sta_cde: "01", lat: "37.5", lon: "129.5", obs_dtm: "2026-06-20 09:05", wtr_dep: "0",
    wtr_tmp: "0", qc_wtr: "2", sal: "33.1", qc_sal: "2", dox: "7.2", qc_dox: "2", nut_po4_p: "", nut_no2_n: "0",
    nut_no3_n: "1.4", nut_sio2_si: "2.1", nut_ph: "", wtr_trn: "", atm: "", res_vsl_nm: "탐구호", ...overrides,
  };
}

test("station metadata uses exact line and station composite identity", () => {
  const result = parser.buildNifsOceanSectionStations({ E: [station()] });
  assert.equal(result.stations[0].stationId, "102-01");
  assert.equal(result.stations[0].lifecycle, "END_DATE_UNSET");
  assert.equal(result.stations[0].bottomDepth.unit, "UNIT_NOT_DOCUMENTED");
  assert.equal(result.regionCounts.E, 1);
});

test("profiles group same observation by depth and preserve depth zero", () => {
  const result = parser.buildNifsOceanSectionDataset({ E: [station()] }, [profile(), profile({ wtr_dep: "10", wtr_tmp: "14.2" })]);
  assert.equal(result.profiles.length, 1);
  assert.equal(result.profiles[0].samples.length, 2);
  assert.equal(result.profiles[0].samples[0].depth.value, 0);
  assert.equal(result.profiles[0].samples[0].waterTemperature.value, 0);
  assert.equal(result.quality.depthZeroRows, 1);
});

test("raw QC is retained without an invented quality label", () => {
  const sample = parser.buildNifsOceanSectionDataset({ E: [station()] }, [profile()]).profiles[0].samples[0];
  assert.equal(sample.waterTemperature.qcRaw, "2");
  assert.equal(sample.salinity.qcRaw, "2");
  assert.equal(sample.dissolvedOxygen.qcRaw, "2");
  assert.equal(sample.waterTemperature.qualityLabel, undefined);
});

test("only blank and null are missing while zero remains data", () => {
  assert.equal(parser.normalizeNifsOceanSectionNumber(""), null);
  assert.equal(parser.normalizeNifsOceanSectionNumber(null), null);
  assert.equal(parser.normalizeNifsOceanSectionNumber("0"), 0);
  const sample = parser.buildNifsOceanSectionDataset({ E: [station()] }, [profile()]).profiles[0].samples[0];
  assert.equal(sample.phosphateP.value, null);
  assert.equal(sample.nitriteN.value, 0);
});

test("exact duplicates dedupe and conflicting depth rows are disclosed", () => {
  const original = profile();
  const result = parser.buildNifsOceanSectionDataset({ E: [station()] }, [original, { ...original }, profile({ wtr_tmp: "1" })]);
  assert.equal(result.profiles[0].samples.length, 1);
  assert.equal(result.quality.exactDuplicateRows, 1);
  assert.equal(result.quality.conflictingDuplicateRows, 1);
});

test("coordinates are compared without overwriting historical profile coordinates", () => {
  const result = parser.buildNifsOceanSectionDataset({ E: [station()] }, [profile({ lat: "37.6" })]);
  assert.equal(result.profiles[0].coordinateStatus, "DRIFT");
  assert.equal(result.profiles[0].latitude, 37.6);
  assert.equal(result.profiles[0].metadataLatitude, 37.5);
});

test("timestamp keeps source-local wall clock with unspecified timezone", () => {
  assert.equal(parser.parseNifsOceanSectionTimestamp("2026-06-20 09:05"), "2026-06-20T09:05:00");
  assert.equal(parser.parseNifsOceanSectionTimestamp("2026-02-30 09:05"), null);
  assert.equal(parser.NIFS_OCEAN_SECTION_TIMEZONE, "UNSPECIFIED_BY_NIFS");
});

test("feature registry connects historical inputs without enabling scores", () => {
  assert.equal(parser.FISHING_CONDITION_OCEAN_SECTION_INPUT_REGISTRY.length, 7);
  assert.ok(parser.FISHING_CONDITION_OCEAN_SECTION_INPUT_REGISTRY.every((entry) => entry.sourceId === "nifs-soo"));
  assert.ok(parser.FISHING_CONDITION_OCEAN_SECTION_INPUT_REGISTRY.every((entry) => entry.engineUse === "NOT_ENABLED"));
});

test("server enforces dedicated credentials, one-year cap and isolated route", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(server, /import "server-only"/);
  assert.match(server, /NIFS_SOO_API_KEY/);
  assert.doesNotMatch(server, /NIFS_API_KEY|NIFS_RISA_API_KEY|NIFS_FEMO_API_KEY|KMA_|KHOA_|NEXT_PUBLIC_/);
  assert.match(server, /MAX_PROFILE_ROWS = 10_000/);
  assert.match(server, /MAX_NORMALIZED_RESPONSE_BYTES = 15_000_000/);
  assert.match(server, /NIFS_OCEAN_SECTION_METADATA_CACHE_SECONDS = 24 \* 60 \* 60/);
  assert.match(server, /conflictingDuplicateRows > 0/);
  assert.match(route, /ocean-section/);
  assert.doesNotMatch(route, /score|probability|ranking|recommend/);
});

test("query validation rejects invalid regions and windows over one year", () => {
  const source = fs.readFileSync(serverPath, "utf8");
  assert.match(source, /dateMs\(endDate\) - dateMs\(startDate\) > 365 \* 86_400_000/);
  assert.match(source, /isNifsOceanSectionRegion/);
  assert.match(routePath, /ocean-section/);
});

test("live quality report is secret-safe and records the bounded profile audit", () => {
  const raw = fs.readFileSync(reportPath, "utf8");
  const report = JSON.parse(raw);
  assert.equal(report.status, "CONNECTED_HISTORICAL_PROFILE_SOURCE");
  assert.equal(report.stations.uniqueCompositeIds, 358);
  assert.equal(report.profiles.groupedProfiles, 1417);
  assert.equal(report.profiles.depthZeroRows, 947);
  assert.equal(report.profiles.conflictingDuplicates, 0);
  assert.equal(report.qc.dictionaryConfirmed, false);
  assert.equal(report.boundaries.climatologyGenerated, false);
  assert.equal(report.boundaries.predictionScoreImplemented, false);
  assert.doesNotMatch(raw, /api[_-]?key|service[_-]?key|authorization|bearer\s|https?:\/\/[^\s"']*[?&]key=/i);
});

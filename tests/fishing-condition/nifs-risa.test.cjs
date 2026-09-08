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

const parserPath = path.join(root, "src/lib/fishing-condition/nifs-realtime-fishing.ts");
const serverPath = path.join(root, "src/lib/fishing-condition/nifs-realtime-fishing-server.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/environment/realtime/route.ts");
const parser = loadTs(parserPath);

const stationRows = [
  { sta_cde: "A0001", sta_nam_kor: "정확 관측소", lat: "35.1", lon: "129.2", gru_nam: "남해", sur_dep: "0", mid_dep: "5", bot_dep: "10", end_dat: null },
  { sta_cde: "A0002", sta_nam_kor: "동명이 아닌 관측소", lat: "bad", lon: "129.3", gru_nam: "남해", sur_dep: "2", mid_dep: null, bot_dep: null, end_dat: null },
];

test("station parser preserves exact source IDs, zero depth and nullable coordinates", () => {
  const stations = parser.parseNifsRisaStations(stationRows);
  assert.equal(stations.length, 2);
  assert.equal(stations[0].id, "A0001");
  assert.equal(stations[0].depthMeters.surface, 0);
  assert.equal(stations[1].latitude, null);
  assert.equal(stations[1].longitude, null);
  assert.equal(stations[0].source, "NIFS");
});

test("observation parser maps depth rows and preserves zero without guessing sentinels", () => {
  const rows = parser.parseNifsRisaObservations([
    { sta_cde: "A0001", sta_nam_kor: "정확 관측소", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "1", wtr_tmp: "0", repair_gbn: "1", rpr_yn: "N" },
    { sta_cde: "A0001", sta_nam_kor: "정확 관측소", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "2", wtr_tmp: "", repair_gbn: "2", rpr_yn: "Y" },
    { sta_cde: "A0001", sta_nam_kor: "정확 관측소", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "3", wtr_tmp: "-99", repair_gbn: "1" },
  ]);
  assert.deepEqual(rows.map((row) => row.depthContext), ["SURFACE", "MIDDLE", "BOTTOM"]);
  assert.equal(rows[0].waterTemperatureC, 0);
  assert.equal(rows[1].waterTemperatureC, null);
  assert.equal(rows[2].waterTemperatureC, -99);
  assert.equal(rows[1].repairStatus, "MAINTENANCE");
  assert.equal(rows[1].repairRequested, true);
  assert.equal(parser.NIFS_RISA_OBSERVED_TEMPERATURE_SENTINELS.size, 0);
  assert.deepEqual(parser.FISHING_CONDITION_REALTIME_INPUT_REGISTRY.map((entry) => entry.depthContext), ["SURFACE", "MIDDLE", "BOTTOM"]);
});

test("timestamp is source-local without an invented timezone", () => {
  assert.equal(parser.parseNifsRisaTimestamp("2026-09-09", "00:30:00"), "2026-09-09T00:30:00");
  assert.equal(parser.parseNifsRisaTimestamp("2026-02-30", "00:30:00"), null);
  assert.equal(parser.parseNifsRisaTimestamp("bad", "00:30:00"), null);
});

test("freshness follows 45 minute and 2 hour source-local thresholds", () => {
  const now = "2026-09-09T01:00:00";
  assert.equal(parser.deriveNifsRisaFreshness("2026-09-09T00:30:00", now), "fresh");
  assert.equal(parser.deriveNifsRisaFreshness("2026-09-08T23:30:00", now), "stale");
  assert.equal(parser.deriveNifsRisaFreshness("2026-09-08T22:00:00", now), "unavailable");
});

test("multi-depth grouping joins only by station ID and keeps latest snapshot", () => {
  const observations = [
    { sta_cde: "A0001", sta_nam_kor: "이름이 달라도 ID 우선", obs_dat: "2026-09-08", obs_tim: "23:30:00", obs_lay: "1", wtr_tmp: "20", repair_gbn: "1" },
    { sta_cde: "A0001", sta_nam_kor: "이름이 달라도 ID 우선", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "1", wtr_tmp: "21", repair_gbn: "1" },
    { sta_cde: "A0001", sta_nam_kor: "이름이 달라도 ID 우선", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "2", wtr_tmp: "19", repair_gbn: "1" },
    { sta_cde: "A0001", sta_nam_kor: "이름이 달라도 ID 우선", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "3", wtr_tmp: "18", repair_gbn: "1" },
    { sta_cde: "MISSING", sta_nam_kor: "미등록", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "1", wtr_tmp: "17", repair_gbn: "1" },
  ];
  const result = parser.buildNifsRisaEnvironment(stationRows, observations, "2026-09-08T15:10:00.000Z", "2026-09-09T00:10:00");
  const station = result.stations.find((row) => row.stationId === "A0001");
  assert.equal(station.stationName, "정확 관측소");
  assert.deepEqual(station.waterTemperature, { surfaceC: 21, middleC: 19, bottomC: 18, unknownDepthC: [], unit: "degC" });
  assert.equal(station.observedAt, "2026-09-09T00:00:00");
  assert.equal(station.sourceTimezone, "UNSPECIFIED_BY_NIFS");
  assert.equal(result.quality.exactStationJoins, 1);
  assert.deepEqual(result.quality.observationsWithoutMetadata, ["MISSING"]);
  assert.equal(result.quality.stationNameMismatches, 1);
  assert.equal(result.quality.normalRows, 5);
  assert.equal(result.quality.maintenanceRows, 0);
});

test("duplicate station/time/layer rows are disclosed", () => {
  const duplicate = { sta_cde: "A0001", sta_nam_kor: "정확 관측소", obs_dat: "2026-09-09", obs_tim: "00:00:00", obs_lay: "1", wtr_tmp: "20", repair_gbn: "1" };
  const result = parser.buildNifsRisaEnvironment(stationRows, [duplicate, { ...duplicate, wtr_tmp: "21" }], "2026-09-08T15:10:00.000Z", "2026-09-09T00:10:00");
  assert.equal(result.quality.duplicateStationTimestampLayers, 1);
  assert.equal(result.stations[0].waterTemperature.surfaceC, 20);
});

test("server boundary is dedicated, cached, server-only and isolated from navigation", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(server, /import "server-only"/);
  assert.match(server, /NIFS_RISA_API_KEY/);
  assert.doesNotMatch(server, /process\.env\.NIFS_API_KEY|KMA_|KHOA_|NEXT_PUBLIC_/);
  assert.match(server, /NIFS_RISA_CACHE_SECONDS = 10 \* 60/);
  assert.match(server, /NIFS_RISA_STALE_SECONDS = 2 \* 60 \* 60/);
  assert.match(route, /fishing-condition/);
  assert.doesNotMatch(route, /sea-info/);
  assert.doesNotMatch(route, /조황점수|확률|추천 어종/);
});

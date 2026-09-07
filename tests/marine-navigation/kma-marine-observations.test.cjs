const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
function loadTs(file, aliases = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => aliases[id] ?? require(id);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const parserPath = path.join(root, "src/lib/sea-info/kma-marine-observation.ts");
const adapterPath = path.join(root, "src/lib/marine-navigation/adapters/kma-marine-observations.ts");
const serverPath = path.join(root, "src/lib/sea-info/kma-marine-observation-server.ts");
const routePath = path.join(root, "src/app/api/sea-info/marine-observations/[stationId]/route.ts");
const mapPath = path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx");
const controlPath = path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx");
const detailsPath = path.join(root, "src/components/boat/navigation/MarineObservationDetails.tsx");
const parser = loadTs(parserPath);
const adapter = loadTs(adapterPath);

test("station parser keeps exact IDs and rejects duplicates or invalid coordinates", () => {
  const result = parser.parseKmaMarineStations([
    "22101 126.03 33.08 B 84 50110 마라도 MARADO 11B00000",
    "22101 126.04 33.09 B 84 50110 마라도 MARADO 11B00000",
    "99999 0 0 B 0 00000 무효 INVALID 00X00000",
  ].join("\n"));
  assert.equal(result.quality.total, 3);
  assert.equal(result.quality.duplicateIds, 1);
  assert.equal(result.quality.sameIdDifferentCoordinates, 1);
  assert.equal(result.quality.invalidCoordinates, 1);
  assert.equal(result.stations.length, 1);
  assert.equal(result.stations[0].id, "22101");
});

test("comprehensive parser preserves zero while normalizing only observed sentinels", () => {
  const rows = parser.parseKmaMarineObservations([
    "B,202609070600,22101,마라도,126.03,33.08,0,0,0,-99.0,25.1,24.0,1009.8,81,",
    "B,202609070630,22102,거문도,127.50,34.00,,180,4.2,5.1,-99,23.0,1010.2,76,",
  ].join("\n"), "2026-09-07T00:00:00.000Z");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].observedAt, "2026-09-07T06:00:00+09:00");
  assert.equal(rows[0].significantWaveHeightM, 0);
  assert.equal(rows[0].windDirectionDeg, 0);
  assert.equal(rows[0].windSpeedMs, 0);
  assert.equal(rows[0].gustSpeedMs, null);
  assert.equal(rows[1].significantWaveHeightM, null);
  assert.equal(rows[1].seaTemperatureC, null);
});

test("buoy parser retains separate wind sensors and normalizes -99 sentinels", () => {
  const [row] = parser.parseKmaBuoyDetailObservations("202609070600 22101 0 0.0 -99.0 275 3.8 5.6 1008.1 83 24.1 25.0 1.2 0.7 0.4 5.8 -99");
  assert.equal(row.windDirectionSensor1Deg, 0);
  assert.equal(row.windSpeedSensor1Ms, 0);
  assert.equal(row.gustSensor1Ms, null);
  assert.equal(row.windDirectionSensor2Deg, 275);
  assert.equal(row.maximumWaveHeightM, 1.2);
  assert.equal(row.waveDirectionDeg, null);
});

test("KST timestamps reject invalid calendar values", () => {
  assert.equal(parser.parseKmaKstTimestamp("202609070630"), "2026-09-07T06:30:00+09:00");
  assert.equal(parser.parseKmaKstTimestamp("202602300630"), null);
  assert.equal(parser.parseKmaKstTimestamp("bad"), null);
});

test("joins use station IDs only and expose unmatched IDs", () => {
  const stations = [
    { id: "1", koreanName: "같은이름", latitude: 35, longitude: 129, source: "KMA" },
    { id: "2", koreanName: "같은이름", latitude: 36, longitude: 128, source: "KMA" },
  ];
  const observations = [{ stationId: "1", observedAt: "2026-09-07T06:00:00+09:00" }, { stationId: "3", observedAt: "2026-09-07T06:00:00+09:00" }];
  const quality = parser.summarizeKmaObservationJoin(stations, observations, []);
  assert.equal(quality.metadataToSeaObservation, 1);
  assert.deepEqual(quality.seaObservationWithoutMetadata, ["3"]);
});

test("freshness is based on observation age, not fetch time", () => {
  const now = Date.parse("2026-09-07T00:30:00.000Z");
  assert.equal(parser.deriveKmaObservationFreshness("2026-09-07T09:15:00+09:00", now), "fresh");
  assert.equal(parser.deriveKmaObservationFreshness("2026-09-07T08:45:00+09:00", now), "stale");
  assert.equal(parser.deriveKmaObservationFreshness("2026-09-07T07:00:00+09:00", now), "unavailable");
});

test("observation layer is distinct, restrained and defaults off", () => {
  const config = adapter.createKmaMarineObservationsLayerConfig({ type: "FeatureCollection", features: [] });
  assert.equal(config.id, "kma-marine-weather-observations");
  assert.equal(config.visible, false);
  assert.equal(config.order, 70);
  assert.deepEqual(config.layers.map((layer) => layer.type), ["circle"]);
  assert.equal(adapter.parseKmaMarineStationFeatureProperties({ id: "1", koreanName: "관측소", latitude: 35, longitude: 129, elevationM: null, source: "KMA" }).elevationM, null);
});

test("server boundary uses three dedicated server-only keys with isolated caches", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(server, /KMA_MARINE_STATION_API_KEY/);
  assert.match(server, /KMA_MARINE_OBSERVATION_API_KEY/);
  assert.match(server, /KMA_MARINE_BUOY_API_KEY/);
  assert.doesNotMatch(server, /KMA_APIHUB_KEY|NEXT_PUBLIC_/);
  assert.match(server, /STATION_FRESH_MS = 24 \* 60 \* 60/);
  assert.match(server, /OBSERVATION_FRESH_MS = 10 \* 60/);
  assert.match(route, /Promise\.allSettled/);
});

test("MapLibre control and detail panel keep observation separate from forecast", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const control = fs.readFileSync(controlPath, "utf8");
  const details = fs.readFileSync(detailsPath, "utf8");
  assert.match(map, /KMA_MARINE_OBSERVATIONS_LAYER_ID/);
  assert.match(map, /onMarineObservationsStateChange\("failed"\)/);
  assert.match(control, /label="해양기상 예보"/);
  assert.match(control, /label="해양기상 관측"/);
  assert.match(control, /KMA 실측 관측소 · 기본 OFF/);
  assert.match(details, /KMA OBSERVATION/);
  assert.match(details, /KMA_MARINE_OBSERVATION_SAFETY_NOTICE/);
  assert.doesNotMatch(details, /출항 가능|안전 점수|safe routing|reroute/i);
});

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

const dataPath = path.join(root, "src/data/khoa-tide-stations.ts");
const contractPath = path.join(root, "src/lib/marine-navigation/adapters/khoa-tide-stations.ts");
const routePath = path.join(root, "src/app/api/sea-info/tide/route.ts");
const stationRoutePath = path.join(root, "src/app/api/sea-info/tide/stations/route.ts");
const mapPath = path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx");
const controlPath = path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx");
const detailsPath = path.join(root, "src/components/boat/navigation/TideStationDetails.tsx");
const data = loadTs(dataPath);
const contract = loadTs(contractPath, { "@/data/khoa-tide-stations": data });

test("audited station snapshot contains 27 unique valid KHOA stations", () => {
  const quality = contract.summarizeKhoaTideStationQuality(data.khoaTideStationSnapshots);
  assert.deepEqual(quality, { stationTotal: 27, validCoordinates: 27, invalidCoordinates: 0, duplicateStationIds: 0, missingStationNames: 0, datumStatus: "DATUM_NOT_DOCUMENTED" });
});

test("normalization rejects invalid coordinates and duplicate station IDs", () => {
  const input = [
    { stationId: "DT_A", name: "정상", region: "부산", latitude: 35.1, longitude: 129.1 },
    { stationId: "DT_A", name: "중복", region: "부산", latitude: 35.2, longitude: 129.2 },
    { stationId: "DT_B", name: "좌표오류", region: "기타", latitude: 0, longitude: 0 },
  ];
  assert.deepEqual(contract.normalizeKhoaTideStations(input).map((station) => station.name), ["정상"]);
});

test("station GeoJSON uses WGS84 longitude-latitude point order", () => {
  const stations = contract.normalizeKhoaTideStations(data.khoaTideStationSnapshots.slice(0, 1));
  const geoJson = contract.toKhoaTideStationsGeoJson(stations);
  assert.deepEqual(geoJson.features[0].geometry.coordinates, [126.59222, 37.45194]);
  assert.equal(contract.parseKhoaTideStationFeatureProperties(geoJson.features[0].properties).stationId, "DT_0001");
  assert.equal(contract.parseKhoaTideStationFeatureProperties({ ...geoJson.features[0].properties, source: "OTHER" }), null);
});

test("station layer is restrained, unclustered, above warnings, and defaults off", () => {
  const config = contract.createKhoaTideStationsLayerConfig({ type: "FeatureCollection", features: [] });
  assert.equal(config.id, "khoa-tide-stations");
  assert.equal(config.visible, false);
  assert.equal(config.order, 50);
  assert.equal(config.source.cluster, undefined);
  assert.deepEqual(config.layers.map((layer) => layer.type), ["circle"]);
});

test("server boundaries keep station metadata long-lived and predictions fresh/stale", () => {
  const stationRoute = fs.readFileSync(stationRoutePath, "utf8");
  const tideRoute = fs.readFileSync(routePath, "utf8");
  assert.match(stationRoute, /revalidate = 86_400/);
  assert.doesNotMatch(stationRoute, /KHOA_API_KEY|serviceKey/i);
  assert.match(tideRoute, /FRESH_CACHE_MS/);
  assert.match(tideRoute, /STALE_CACHE_MS/);
  assert.match(tideRoute, /freshness: "stale"/);
  assert.match(tideRoute, /parseKhoaTidePayload/);
});

test("MapLibre and controls wire an isolated default-off tide layer", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const control = fs.readFileSync(controlPath, "utf8");
  assert.match(map, /KHOA_TIDE_STATIONS_DATA_URL/);
  assert.match(map, /onTideStationsStateChange\("failed"\)/);
  assert.doesNotMatch(map, /serviceKey|KHOA_API_KEY/i);
  assert.match(control, /label="조석 관측소"/);
  assert.match(control, /기본 OFF/);
});

test("detail panel separates unavailable observations from official predictions", () => {
  const details = fs.readFileSync(detailsPath, "utf8");
  assert.match(details, /최근 실측 조위/);
  assert.match(details, /현재 연결된 공식 계약에서 제공하지 않음/);
  assert.match(details, /공식 고·저조 예측/);
  assert.match(details, /원문값/);
  assert.match(details, /KHOA_TIDE_STATION_DATUM_STATUS/);
  assert.equal(contract.KHOA_TIDE_STATION_DATUM_STATUS, "DATUM_NOT_DOCUMENTED");
  assert.match(details, /KHOA_TIDE_STATION_SAFETY_NOTICE/);
  assert.match(contract.KHOA_TIDE_STATION_SAFETY_NOTICE, /실제 항해 수심/);
  assert.doesNotMatch(details, /actual depth|under-keel|safe routing/i);
});

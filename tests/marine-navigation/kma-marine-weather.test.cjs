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

const zonePath = path.join(root, "src/lib/sea-info/kma-marine-zone.ts");
const contractPath = path.join(root, "src/lib/marine-navigation/adapters/kma-marine-weather.ts");
const forecastPath = path.join(root, "src/lib/sea-info/kma-marine-forecast.ts");
const routePath = path.join(root, "src/app/api/sea-info/marine-forecast/route.ts");
const mapPath = path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx");
const controlPath = path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx");
const detailsPath = path.join(root, "src/components/boat/navigation/MarineWeatherDetails.tsx");
const largeZones = require(path.join(root, "src/data/kma-marine-large-zones.json"));
const zone = loadTs(zonePath, { "../../data/kma-marine-large-zones.json": largeZones });
const contract = loadTs(contractPath, { "@/lib/sea-info/kma-marine-zone": zone });
const forecastContract = loadTs(forecastPath, { "./kma-marine-zone.ts": zone });

test("forecast parser accepts the current uppercase whitespace response as well as CSV", () => {
  const parsed = forecastContract.parseKmaMarineForecastCsv([
    "# TMA_FC TMA_EF LZONE SZONE LAT_LB LON_LB LAT_LT LON_LT LAT_RT LON_RT LAT_RB LON_RB WH_SIG WVPRD_MAX WVDR WS WD VS RAIN TW SWELL",
    "2026090700 2026090700 98 5 34.1667 128.1667 34.3333 128.1667 34.3333 128.3333 34.1667 128.3333 0.8 5.2 210 6.4 275 12000 -999.0 22.4 -999.0",
  ].join("\n"), 98, 5);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.status, "ready");
  assert.equal(parsed.data.forecast.significantWaveHeightM, 0.8);
  assert.equal(parsed.data.forecast.windSpeedMps, 6.4);
  assert.equal(parsed.data.forecast.precipitationMm, null);
});

test("official KMA large-zone table produces unique valid representative forecast points", () => {
  const quality = contract.summarizeKmaMarineWeatherZoneQuality();
  assert.equal(quality.sourceRows, 1331);
  assert.equal(quality.uniqueLargeZones, 1330);
  assert.equal(quality.representativeZones, 1329);
  assert.equal(quality.validCoordinates, 1329);
  assert.equal(quality.invalidCoordinates, 0);
  assert.equal(quality.duplicateZoneIds, 0);
  assert.equal(quality.excludedAmbiguousLargeZones, 1);
});

test("weather GeoJSON preserves longitude-latitude order and forecast/model identity", () => {
  const feature = contract.toKmaMarineWeatherGeoJson().features[0];
  assert.deepEqual(feature.geometry.coordinates, [feature.properties.longitude, feature.properties.latitude]);
  assert.equal(contract.parseKmaMarineWeatherFeatureProperties(feature.properties).dataKind, "FORECAST_MODEL");
  assert.equal(contract.parseKmaMarineWeatherFeatureProperties({ ...feature.properties, source: "OTHER" }), null);
  assert.equal(contract.parseKmaMarineWeatherFeatureProperties({ ...feature.properties, latitude: 0, longitude: 0 }), null);
});

test("weather layer is restrained, ordered above tide and defaults off", () => {
  const config = contract.createKmaMarineWeatherLayerConfig({ type: "FeatureCollection", features: [] });
  assert.equal(config.id, "kma-marine-weather-forecast-zones");
  assert.equal(config.visible, false);
  assert.equal(config.order, 60);
  assert.deepEqual(config.layers.map((layer) => layer.type), ["circle"]);
  assert.ok(config.layers[0].paint["circle-opacity"] < 0.8);
});

test("forecast freshness uses separate fresh, stale and unavailable states", () => {
  const now = Date.parse("2026-09-07T12:00:00.000Z");
  assert.equal(contract.deriveKmaMarineWeatherFreshness("2026-09-07T00:00:00.000Z", now), "fresh");
  assert.equal(contract.deriveKmaMarineWeatherFreshness("2026-09-06T12:00:00.000Z", now), "stale");
  assert.equal(contract.deriveKmaMarineWeatherFreshness("2026-09-05T12:00:00.000Z", now), "unavailable");
  assert.equal(contract.deriveKmaMarineWeatherFreshness(null, now), "unavailable");
});

test("wind compass label is derived without replacing source degrees", () => {
  assert.equal(contract.windDirectionToCompass16(0), "N");
  assert.equal(contract.windDirectionToCompass16(275), "W");
  assert.equal(contract.windDirectionToCompass16(null), null);
});

test("existing KMA forecast route remains server-only and adds bounded cache/stale fallback", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /process\.env\.KMA_APIHUB_KEY/);
  assert.match(route, /marine_small_zone\.php/);
  assert.match(route, /FRESH_CACHE_MS = 30 \* 60/);
  assert.match(route, /STALE_CACHE_MS = 18 \* 60 \* 60/);
  assert.match(route, /freshness: "stale"/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_|KHOA_API_KEY/);
});

test("MapLibre and controls wire an isolated default-off weather forecast layer", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const control = fs.readFileSync(controlPath, "utf8");
  assert.match(map, /KMA_MARINE_WEATHER_LAYER_ID/);
  assert.match(map, /onMarineWeatherStateChange\("failed"\)/);
  assert.doesNotMatch(map, /KMA_APIHUB_KEY|authKey/);
  assert.match(control, /label="해양기상 예보"/);
  assert.match(control, /KMA 소해구 모델 예측 · 기본 OFF/);
});

test("detail panel labels model forecast, official units, timestamps and safety limits", () => {
  const details = fs.readFileSync(detailsPath, "utf8");
  const adapter = fs.readFileSync(contractPath, "utf8");
  assert.match(details, /KMA FORECAST MODEL/);
  assert.match(details, /유의파고/);
  assert.match(details, /m\/s/);
  assert.match(details, /발표 \/ 발효 시각/);
  assert.match(details, /관측값이 아닌 수치모델 예측/);
  assert.match(details, /KMA_MARINE_WEATHER_SAFETY_NOTICE/);
  assert.match(adapter, /해양기상 정보는 공식 관측·예측 자료의 참고 표시/);
  assert.doesNotMatch(details, /출항 가능|안전 점수|safe routing|reroute/i);
});

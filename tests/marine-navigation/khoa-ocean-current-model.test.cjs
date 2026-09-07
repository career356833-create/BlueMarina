const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
function loadTs(file, aliases = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)((id) => aliases[id] ?? require(id), module, module.exports);
  return module.exports;
}

const parserPath = path.join(root, "src/lib/sea-info/khoa-roms.ts");
const adapterPath = path.join(root, "src/lib/marine-navigation/adapters/khoa-ocean-current-model.ts");
const routePath = path.join(root, "src/app/api/sea-info/ocean-current/route.ts");
const mapPath = path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx");
const controlPath = path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx");
const detailsPath = path.join(root, "src/components/boat/navigation/OceanCurrentModelDetails.tsx");
const parser = loadTs(parserPath);
const adapter = loadTs(adapterPath, { "@/lib/sea-info/khoa-roms": parser });

const sample = (overrides = {}) => ({ predcDt: "2026-09-08 03:00:00", lat: "34.1", lot: "128.2", crdir: "331.21", crsp: "0.54", wtem: "28.18", ...overrides });

test("ROMS item parser preserves source speed, raw direction, temperature, coordinate, and time values", () => {
  const point = parser.parseKhoaRomsItem(sample(), "2026-09-08T00:00:00.000Z");
  assert.equal(point.currentSpeedMps, 0.54);
  assert.equal(point.currentDirectionDegreesRaw, 331.21);
  assert.equal(point.modelWaterTemperatureCelsius, 28.18);
  assert.equal(point.directionConvention, "UNKNOWN");
  assert.equal(parser.parseKhoaRomsItem(sample({ crsp: "" }), "x"), null);
  assert.equal(parser.parseKhoaRomsItem(sample({ lat: "999" }), "x"), null);
});

test("bbox validation enforces valid coordinates and the official one-degree cap", () => {
  assert.deepEqual(parser.parseKhoaRomsBbox(new URLSearchParams("ymin=34&ymax=34.1&xmin=123.2&xmax=123.3")), { ymin: 34, ymax: 34.1, xmin: 123.2, xmax: 123.3 });
  assert.equal(parser.parseKhoaRomsBbox(new URLSearchParams("ymin=34&ymax=35.01&xmin=123&xmax=124")), null);
  assert.equal(parser.parseKhoaRomsBbox(new URLSearchParams("ymin=34&ymax=33&xmin=123&xmax=124")), null);
  const sampled = parser.buildViewportSampleBbox(129.0756, 35.1796);
  assert.ok(sampled.ymax - sampled.ymin <= 0.100001);
  assert.ok(sampled.xmax - sampled.xmin <= 0.100001);
});

test("normalization selects one raw valid time and deduplicates coordinates", () => {
  const normalized = parser.normalizeKhoaRomsRows([sample(), sample(), sample({ predcDt: "2026-09-08 04:00:00" })], "2026-09-08T00:00:00.000Z", "2026-09-08 04:00:00");
  assert.deepEqual(normalized.validTimes, ["2026-09-08 03:00:00", "2026-09-08 04:00:00"]);
  assert.equal(normalized.selectedValidAt, "2026-09-08 04:00:00");
  assert.equal(normalized.points.length, 1);
  assert.match(parser.buildKhoaRomsCacheKey({ ymin: 34, ymax: 34.1, xmin: 123.2, xmax: 123.3 }, normalized.selectedValidAt), /2026-09-08 04:00:00/);
});

test("scalar GeoJSON layer defaults off, has a zoom gate, and contains no arrows", () => {
  const config = adapter.createKhoaRomsLayerConfig();
  assert.equal(config.id, "khoa-ocean-current-model");
  assert.equal(config.visible, false);
  assert.equal(config.layers[0].type, "circle");
  assert.equal(config.layers[0].minzoom, 8);
  assert.equal(parser.KHOA_ROMS_DIRECTION_CONVENTION, "UNKNOWN");
  assert.doesNotMatch(JSON.stringify(config), /symbol|icon-rotate|arrow/i);
});

test("server boundary is dedicated-key, bounded, cached, paginated, and fail isolated", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /KHOA_ROMS_API_KEY/);
  assert.match(route, /KHOA_ROMS_ENABLED/);
  assert.doesNotMatch(route, /process\.env\.KHOA_API_KEY/);
  assert.match(route, /KHOA_ROMS_MAX_PAGES/);
  assert.match(route, /MAX_RAW_RESPONSE_BYTES/);
  assert.match(route, /FRESH_CACHE_MS = 30 \* 60/);
  assert.match(route, /STALE_CACHE_MS/);
  assert.match(route, /freshness: "stale"/);
  assert.match(route, /UPSTREAM_TIMEOUT/);
});

test("MapLibre wiring is default-off, quota bounded, and direction-limited", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const control = fs.readFileSync(controlPath, "utf8");
  const details = fs.readFileSync(detailsPath, "utf8");
  const adapterSource = fs.readFileSync(adapterPath, "utf8");
  assert.match(map, /buildViewportSampleBbox/);
  assert.match(map, /KHOA_OCEAN_CURRENT_MODEL_MIN_ZOOM/);
  assert.match(map, /Date\.now\(\) - lastRequestAt < 15_000/);
  assert.match(map, /유효 시각 원문/);
  assert.match(map, /params\.set\("validAt"/);
  assert.match(control, /ROMS 해류 모델/);
  assert.match(control, /기본 OFF/);
  assert.match(details, /KHOA ROMS MODEL/);
  assert.match(details, /방향 기준 정의 미확인/);
  assert.match(adapterSource, /실제 현장 관측값 또는 공식 항법장비/);
  assert.doesNotMatch(details, /current-aware routing|drift prediction/i);
});

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

const adapterPath = path.join(root, "src/lib/marine-navigation/adapters/kma-marine-weather-warnings.ts");
const serverPath = path.join(root, "src/lib/sea-info/kma-marine-weather-warning-server.ts");
const routePath = path.join(root, "src/app/api/sea-info/weather-warnings/route.ts");
const controlPath = path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx");
const navigationPath = path.join(root, "src/components/boat/navigation/MarineNavigation.tsx");
const adapter = loadTs(adapterPath);

test("current parser maps source labels and lifecycle without inventing geometry", () => {
  const rows = adapter.parseKmaCurrentWarnings([{ REG_UP: "S1130000", REG_ID: "S1132110", REG_KO: "동해남부남쪽안쪽먼바다", TM_FC: "202609071600", TM_EF: "202609071600", WRN: "풍랑", LVL: "주의", CMD: "연장", ED_TM: "11일 새벽" }], "2026-09-07T07:01:00.000Z", Date.parse("2026-09-07T17:00:00+09:00"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].warningCode, "V");
  assert.equal(rows[0].warningLevelCode, "2");
  assert.equal(rows[0].commandCode, "5");
  assert.equal(rows[0].status, "ACTIVE");
  assert.equal(rows[0].geometry, null);
});

test("history parser uses the documented first eight columns", () => {
  const rows = adapter.parseKmaWarningHistory("202609070900,202609070900,202609070847,159,L1082200,W,2,3,00,4,101");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].regionId, "L1082200");
  assert.equal(rows[0].warningCode, "W");
  assert.equal(rows[0].commandCode, "3");
});

test("zone parser classifies official S/L code families without name matching", () => {
  const zones = adapter.parseKmaWarningZones("S1132110 200507010000 210012310000 00000001 S1130000 동해남부남쪽안쪽먼바다     동해남부 남쪽 안쪽 먼바다\nL1000000 200507010000 210012310000 00000001 00000000 전국     전국");
  assert.equal(zones.length, 2);
  assert.equal(zones[0].isMarine, true);
  assert.equal(zones[1].isMarine, false);
});

test("marine filter keeps V and only official marine W/T zones", () => {
  const fetchedAt = "2026-09-07T07:01:00.000Z";
  const current = adapter.parseKmaCurrentWarnings([
    { REG_ID: "S1132110", WRN: "풍랑", LVL: "주의", CMD: "발표", TM_FC: "202609071600", TM_EF: "202609071600" },
    { REG_ID: "S1132111", WRN: "강풍", LVL: "주의", CMD: "발표", TM_FC: "202609071600", TM_EF: "202609071600" },
    { REG_ID: "L1082200", WRN: "강풍", LVL: "주의", CMD: "발표", TM_FC: "202609071600", TM_EF: "202609071600" },
  ], fetchedAt);
  const filtered = adapter.normalizeKmaMarineWeatherWarnings(current, [], []);
  assert.deepEqual(filtered.map((row) => row.regionId), ["S1132110", "S1132111"]);
});

test("official command lifecycle supports upcoming, active, ended and unknown", () => {
  const now = Date.parse("2026-09-07T17:00:00+09:00");
  assert.equal(adapter.deriveKmaWarningLifecycle("1", "2026-09-07T18:00:00+09:00", now), "UPCOMING");
  assert.equal(adapter.deriveKmaWarningLifecycle("6", "2026-09-07T16:00:00+09:00", now), "ACTIVE");
  assert.equal(adapter.deriveKmaWarningLifecycle("3", null, now), "ENDED");
  assert.equal(adapter.deriveKmaWarningLifecycle("", null, now), "UNKNOWN");
});

test("server boundary keeps sources, caches and failures isolated", () => {
  const server = fs.readFileSync(serverPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(server, /KMA_MARINE_WARNING_API_KEY/);
  assert.match(server, /CURRENT_FRESH_MS = 5 \* 60/);
  assert.match(server, /HISTORY_FRESH_MS = 20 \* 60/);
  assert.match(server, /ZONE_FRESH_MS = 24 \* 60 \* 60/);
  assert.match(server, /Promise\.all/);
  assert.doesNotMatch(server, /KHOA_NAVIGATION_WARNING_API_KEY|KMA_MARINE_OBSERVATION_API_KEY|NEXT_PUBLIC_/);
  assert.match(route, /KMA 해상특보/);
});

test("panel-only logical layer defaults off and remains independent", () => {
  const adapterSource = fs.readFileSync(adapterPath, "utf8");
  const control = fs.readFileSync(controlPath, "utf8");
  const navigation = fs.readFileSync(navigationPath, "utf8");
  assert.match(adapterSource, /kma-marine-weather-warnings/);
  assert.match(control, /KMA WEATHER WARNING/);
  assert.match(control, /패널 전용 · 기본 OFF/);
  assert.match(control, /현재 발효중인 해상특보 없음/);
  assert.match(adapterSource, /실제 출항·운항 가능 여부를 자동 판정하지 않습니다/);
  assert.match(navigation, /useState\(false\)/);
  assert.match(navigation, /weatherWarningsState/);
  assert.match(navigation, /navigationWarningsState/);
  assert.match(navigation, /marineObservationsState/);
  assert.match(navigation, /marineWeatherState/);
  assert.doesNotMatch(adapterSource, /severityScore|safeRouting|reroute|departureJudgement/);
});

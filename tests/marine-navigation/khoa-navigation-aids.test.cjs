const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");

function loadTs(file) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const contractPath = path.join(root, "src/lib/marine-navigation/adapters/khoa-navigation-aids.ts");
const routePath = path.join(root, "src/app/api/sea-info/navigation-aids/route.ts");
const mapPath = path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx");
const controlPath = path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx");
const providerPath = path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts");
const auditToolPath = path.join(root, "tools/khoa-navigation-aids/audit-live.cjs");
const contract = loadTs(contractPath);

function responseXml(items, overrides = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <response>
    <header><resultCode>${overrides.resultCode ?? "00"}</resultCode><resultMsg>${overrides.resultMsg ?? "NORMAL SERVICE"}</resultMsg></header>
    <body><items>${items}</items><numOfRows>10</numOfRows><pageNo>1</pageNo><totalCount>2</totalCount></body>
  </response>`;
}

const validItem = `<item>
  <blfrNo>1270</blfrNo><buoyKr>천부항 방파제등대</buoyKr><buoyEn>Cheonbu Hang</buoyEn>
  <buoyNm>고정표지</buoyNm><kindCd>좌현표지</kindCd><seaNm>남해안</seaNm><lgt_property>Fl G 4s 9.1m 8M</lgt_property>
  <remark>점검 완료</remark><wgs84North>37.5403333N</wgs84North><wgs84East>130.8694444E</wgs84East>
</item>`;

test("official request category codes are preserved without invented detailed types", () => {
  assert.deepEqual(Object.keys(contract.KHOA_NAVIGATION_AID_CATEGORY_LABELS), ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09"]);
  assert.equal(contract.KHOA_NAVIGATION_AID_CATEGORY_LABELS.A01, "고정표지");
  assert.equal(contract.isKhoaNavigationAidCategoryCode("A09"), true);
  assert.equal(contract.isKhoaNavigationAidCategoryCode("LIGHTHOUSE"), false);
});

test("response parser preserves official names, coordinates and raw light characteristic", () => {
  const parsed = contract.parseKhoaNavigationAidsXml(responseXml(validItem), "A01");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.items.length, 1);
  assert.match(parsed.data.items[0].id, /^khoa-a01-1270-[a-f0-9]{8}$/);
  assert.deepEqual({ ...parsed.data.items[0], id: undefined }, {
    id: undefined,
    sourceRecordId: "1270",
    koreanName: "천부항 방파제등대",
    englishName: "Cheonbu Hang",
    aidCategoryCode: "A01",
    aidTypeLabelRaw: "고정표지",
    detailedTypeLabelRaw: "좌현표지",
    coastlineTypeRaw: "남해안",
    lightCharacteristicRaw: "Fl G 4s 9.1m 8M",
    latitude: 37.5403333,
    longitude: 130.8694444,
    remarks: "점검 완료",
    source: "국립해양조사원(KHOA)",
  });
});

test("exact duplicates are removed while distinct records sharing a source ID survive", () => {
  const distinct = validItem.replace("37.5403333N", "37.5410000N").replace("좌현표지", "우현표지");
  const parsed = contract.parseKhoaNavigationAidsXml(responseXml(`${validItem}${validItem}${distinct}`), "A01");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.items.length, 2);
  assert.deepEqual(parsed.data.quality.duplicateIds, ["1270"]);
});

test("directional decimal and DMS coordinates parse while invalid values are excluded", () => {
  const dms = validItem.replace("37.5403333N", "37-32-25.2N").replace("130.8694444E", "130-52-10.0E").replaceAll("1270", "1271");
  const invalid = validItem.replace("37.5403333N", "91N").replaceAll("1270", "bad-coordinate");
  const parsed = contract.parseKhoaNavigationAidsXml(responseXml(`${validItem}${dms}${invalid}`), "A01");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.items.length, 2);
  assert.ok(Math.abs(parsed.data.items[1].latitude - 37.540333333333336) < 1e-12);
  assert.equal(parsed.data.quality.invalidCoordinateCount, 1);
});

test("upstream error and malformed XML fail closed", () => {
  const upstreamError = contract.parseKhoaNavigationAidsXml(responseXml("", { resultCode: "20", resultMsg: "SERVICE ACCESS DENIED" }));
  assert.deepEqual(upstreamError, { ok: false, code: "UPSTREAM_ERROR", message: "SERVICE ACCESS DENIED" });
  assert.equal(contract.parseKhoaNavigationAidsXml("not xml").ok, false);
});

test("normalized records convert to longitude-latitude GeoJSON points", () => {
  const parsed = contract.parseKhoaNavigationAidsXml(responseXml(validItem), "A01");
  assert.equal(parsed.ok, true);
  const geoJson = contract.toKhoaNavigationAidsGeoJson(parsed.data);
  assert.equal(geoJson.type, "FeatureCollection");
  assert.deepEqual(geoJson.features[0].geometry.coordinates, [130.8694444, 37.5403333]);
  assert.equal(contract.parseKhoaNavigationAidsGeoJson(geoJson).features.length, 1);
});

test("clustered MapLibre layer is independent and defaults off", () => {
  const parsed = contract.parseKhoaNavigationAidsXml(responseXml(validItem), "A01");
  const layer = contract.createKhoaNavigationAidsLayerConfig(contract.toKhoaNavigationAidsGeoJson(parsed.data));
  assert.equal(layer.id, "khoa-navigation-aids");
  assert.equal(layer.visible, false);
  assert.equal(layer.source.cluster, true);
  assert.equal(layer.source.clusterMaxZoom, 10);
  assert.equal(layer.layers.find((candidate) => candidate.id === "markers").minzoom, 7);
});

test("server boundary aggregates official categories and never reuses the general KHOA key", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /KHOA_NAVIGATION_AIDS_ENABLED !== "true"/);
  assert.match(route, /process\.env\.KHOA_NAVIGATION_AIDS_API_KEY/);
  assert.doesNotMatch(route, /process\.env\.KHOA_API_KEY/);
  assert.match(route, /INVENTORY_ROWS = 5_000/);
  assert.match(route, /CATEGORY_CODES\.map/);
  assert.match(route, /combinePages/);
  assert.match(route, /AbortSignal\.timeout/);
});

test("navigation-aids failure is isolated and UI registration does not expose a key", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const control = fs.readFileSync(controlPath, "utf8");
  const provider = fs.readFileSync(providerPath, "utf8");
  assert.match(map, /KHOA_NAVIGATION_AIDS_DATA_URL/);
  assert.match(map, /onNavigationAidsStateChange\("failed"\)/);
  assert.doesNotMatch(map, /KHOA_NAVIGATION_AIDS_API_KEY|ServiceKey/);
  assert.match(control, /label="항행표지"/);
  assert.match(control, /기본 OFF/);
  assert.match(control, /공식 항법장비를 대체하지 않습니다/);
  assert.match(provider, /getClusterExpansionZoom/);
});

test("live audit persists a secret-safe quality report", () => {
  const auditTool = fs.readFileSync(auditToolPath, "utf8");
  assert.match(auditTool, /reports\/khoa\/navigation-aids-quality-v1\.json/);
  assert.match(auditTool, /credentialLogged: false/);
  assert.match(auditTool, /normalizedFeatureCount: exactSignatures\.size/);
  assert.match(auditTool, /sourceIdentityConflicts/);
  assert.match(auditTool, /writeFileSync\(REPORT_PATH/);
  assert.doesNotMatch(auditTool, /console\.log\([^\n]*serviceKey/i);
});

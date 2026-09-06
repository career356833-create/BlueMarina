const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const contractPath = path.join(root, "src/lib/marine-navigation/adapters/khoa-navigation-warnings.ts");
const routePath = path.join(root, "src/app/api/sea-info/navigation-warnings/route.ts");
const mapPath = path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx");
const controlPath = path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx");
const contract = loadTs(contractPath);

function responseXml(items, overrides = {}) {
  return `<response><header><resultCode>${overrides.code ?? "00"}</resultCode><resultMsg>${overrides.msg ?? "NORMAL SERVICE"}</resultMsg></header><body><items>${items}</items><numOfRows>100</numOfRows><pageNo>1</pageNo><totalCount>${overrides.total ?? 1}</totalCount></body></response>`;
}

const listItem = `<item><doc_num>26-292</doc_num><doc_type>상설</doc_type><gov_cd>합동참모본부</gov_cd><noti_cat>해상사격훈련</noti_cat><app_cat>접근금지</app_cat><title>훈련 알림</title><basic>공식 근거</basic><content>공식 내용</content><area>1,2</area></item>`;
const polygonPosition = `34-09-41N,128-00-00E&amp;#xD;\n34-18-01N,128-11-27E&amp;#xD;\n34-00-00N,128-35-00E`;
const detailItem = `<item><doc_num>26-292</doc_num><area>1</area><position_nm>대한해협</position_nm><position>${polygonPosition}</position><position_desc>해당 지점을 순차 연결한 선내 해역</position_desc><alarm_date>2026-09-01,</alarm_date><alarm_time>09:00 ~ 18:00,</alarm_time><sea_pos>2200</sea_pos></item>`;

test("list and detail XML preserve the live source field names", () => {
  const list = contract.parseKhoaNavigationWarningListXml(responseXml(listItem));
  const detail = contract.parseKhoaNavigationWarningDetailXml(responseXml(detailItem));
  assert.equal(list.ok, true);
  assert.equal(detail.ok, true);
  assert.deepEqual(list.data.items[0], { documentNumber: "26-292", documentType: "상설", governmentCode: "합동참모본부", noticeCategory: "해상사격훈련", applicationCategory: "접근금지", title: "훈련 알림", basic: "공식 근거", content: "공식 내용", area: "1,2" });
  assert.equal(detail.data.items[0].positionName, "대한해협");
  assert.equal(detail.data.items[0].alarmDate, "2026-09-01,");
});

test("auth errors and malformed XML fail closed", () => {
  assert.deepEqual(contract.parseKhoaNavigationWarningListXml(responseXml("", { code: "20", msg: "SERVICE ACCESS DENIED" })), { ok: false, code: "UPSTREAM_ERROR", message: "SERVICE ACCESS DENIED" });
  assert.equal(contract.parseKhoaNavigationWarningDetailXml("not xml").ok, false);
});

test("observed DMS coordinate sets parse in longitude-latitude order", () => {
  const parsed = contract.parseKhoaNavigationWarningPosition("34-53-00.0N,128-57-00.0E&#xD;\n35-32-51N,126-26-26E");
  assert.equal(parsed.malformed, false);
  assert.deepEqual(parsed.coordinates[0], [128.95, 34.88333333333333]);
  assert.equal(parsed.coordinates.length, 2);
});

test("point, line and source-described area map conservatively", () => {
  assert.equal(contract.toKhoaNavigationWarningGeometry("34-53-00N,128-57-00E", "좌표를 중심으로 반경 5NM").geometry.type, "Point");
  assert.equal(contract.toKhoaNavigationWarningGeometry("34-53-00N,128-57-00E\n35-00-00N,129-00-00E", "해당 지점을 순차 연결한 선").geometry.type, "LineString");
  const polygon = contract.toKhoaNavigationWarningGeometry("34-53-00N,128-57-00E\n35-00-00N,129-00-00E\n34-50-00N,129-05-00E", "해당 지점을 순차 연결한 선내 해역").geometry;
  assert.equal(polygon.type, "Polygon");
  assert.equal(polygon.coordinates[0].length, 4);
});

test("malformed or semantically ambiguous positions remain map-null", () => {
  assert.equal(contract.toKhoaNavigationWarningGeometry("위치 미상", "설명 없음").issue, "malformed");
  assert.equal(contract.toKhoaNavigationWarningGeometry("34-53-00N,128-57-00E\n35-00-00N,129-00-00E\n34-50-00N,129-05-00E", "참고 위치").issue, "ambiguous");
  assert.equal(contract.toKhoaNavigationWarningGeometry(null, null).issue, "missing");
});

test("normalization keeps lifecycle UNKNOWN and geometry-null records in the list", () => {
  const list = contract.parseKhoaNavigationWarningListXml(responseXml(listItem)).data.items;
  const detail = contract.parseKhoaNavigationWarningDetailXml(responseXml(detailItem)).data.items;
  const warnings = contract.normalizeKhoaNavigationWarnings([...list, { ...list[0], documentNumber: "26-999" }], detail, "2026-09-06T00:00:00.000Z");
  assert.equal(warnings.length, 2);
  assert.ok(warnings.every((warning) => warning.status === "UNKNOWN"));
  assert.equal(warnings[1].geometry, null);
  assert.equal(contract.toKhoaNavigationWarningsGeoJson(warnings).features.length, 1);
});

test("warning layer is separate, restrained and defaults off", () => {
  const config = contract.createKhoaNavigationWarningsLayerConfig({ type: "FeatureCollection", features: [] });
  assert.equal(config.id, "khoa-navigation-warnings");
  assert.equal(config.visible, false);
  assert.deepEqual(config.layers.map((layer) => layer.type), ["fill", "line", "line", "circle"]);
  assert.ok(config.layers[0].paint["fill-opacity"] <= 0.14);
});

test("server boundary is dedicated, bounded and failure isolated", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /KHOA_NAVIGATION_WARNING_ENABLED !== "true"/);
  assert.match(route, /process\.env\.KHOA_NAVIGATION_WARNING_API_KEY/);
  assert.doesNotMatch(route, /KHOA_API_KEY|KHOA_NAVIGATION_AIDS_API_KEY/);
  assert.match(route, /AbortSignal\.timeout/);
  assert.match(route, /MAX_RESPONSE_BYTES/);
  assert.match(route, /MAX_LIST_PAGES/);
  assert.match(route, /MAX_DETAIL_PAGES/);
  assert.match(route, /freshness: "stale"/);
  assert.match(route, /Math\.ceil\(firstList\.data\.totalCount \/ 100\)/);
  assert.match(route, /Math\.ceil\(first\.data\.totalCount \/ 100\)/);
});

test("MapLibre and controls register the default-off warning source without exposing a key", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const control = fs.readFileSync(controlPath, "utf8");
  assert.match(map, /KHOA_NAVIGATION_WARNINGS_DATA_URL/);
  assert.match(map, /onNavigationWarningsStateChange\("failed"\)/);
  assert.doesNotMatch(map, /ServiceKey|KHOA_NAVIGATION_WARNING_API_KEY/);
  assert.match(control, /label="항행경보"/);
  assert.match(control, /기본 OFF/);
  assert.match(control, /KHOA_NAVIGATION_WARNING_SAFETY_NOTICE/);
  assert.match(fs.readFileSync(contractPath, "utf8"), /실제 통항 가능 여부를 자동 판정하지 않습니다/);
});

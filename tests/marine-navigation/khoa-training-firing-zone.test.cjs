const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");

function loadTs(file, mocks = {}) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => mocks[specifier] ?? require(specifier);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const deepWaterContract = loadTs(path.join(root, "src/lib/marine-navigation/adapters/khoa-deep-water-route.ts"));
const contract = loadTs(path.join(root, "src/lib/marine-navigation/adapters/khoa-training-firing-zone.ts"), {
  "./khoa-deep-water-route": deepWaterContract,
});
const officialGeoJson = JSON.parse(fs.readFileSync(path.join(root, "public/data/khoa/navigation/khoa-maritime-training-firing-zone.geojson"), "utf8"));
const conversionReport = JSON.parse(fs.readFileSync(path.join(root, "data/khoa/navigation/training-firing-zone/derived/conversion-report.json"), "utf8"));

test("official KHOA training/firing-zone GeoJSON satisfies the polygon contract", () => {
  const parsed = contract.parseKhoaTrainingFiringZoneGeoJson(officialGeoJson);
  assert.equal(parsed.type, "FeatureCollection");
  assert.equal(parsed.features.length, 60);
  assert.ok(parsed.features.every((feature) => feature.geometry.type === "Polygon"));
  assert.ok(parsed.features.every((feature) => feature.properties.source === "국립해양조사원(KHOA)"));
  assert.equal(new Set(parsed.features.map((feature) => feature.properties.id)).size, 60);
  assert.equal(parsed.features[0].properties.name, "R-74");
  assert.equal(parsed.features[0].properties.locationName, "동해 포항북방근해");
});

test("training/firing-zone parser rejects invalid geometry and spoofed provenance", () => {
  const invalid = structuredClone(officialGeoJson);
  invalid.features[0].geometry.coordinates[0][0] = [181, 35];
  assert.throws(() => contract.parseKhoaTrainingFiringZoneGeoJson(invalid), /coordinates/);

  const spoofed = structuredClone(officialGeoJson);
  spoofed.features[0].properties.source = "unknown";
  assert.throws(() => contract.parseKhoaTrainingFiringZoneGeoJson(spoofed), /properties/);
});

test("MapLibre click properties preserve only mapped source-backed details", () => {
  const properties = { ...officialGeoJson.features[0].properties };
  delete properties.organization;
  const parsed = contract.parseKhoaTrainingFiringZoneFeatureProperties(properties);
  assert.equal(parsed.name, "R-74");
  assert.equal(parsed.locationName, "동해 포항북방근해");
  assert.equal(parsed.referenceChartNumber, "No.462");
  assert.equal(parsed.organization, null);
  assert.equal(contract.parseKhoaTrainingFiringZoneFeatureProperties({ ...properties, source: "unknown" }), null);
});

test("conversion artifact records immutable provenance and lossless polygonization", () => {
  assert.equal(conversionReport.rawSha256, "f0e10d29c1ac67746d2fcdde16b359200e215f0e118befb0d1fbe5d54d544d8a");
  assert.equal(conversionReport.sourceEpsg, 5179);
  assert.equal(conversionReport.targetCrs, "EPSG:4326");
  assert.equal(conversionReport.sourceEncoding, "UTF-8 (.cpg)");
  assert.equal(conversionReport.sourceGeometryType, "POLYLINE");
  assert.equal(conversionReport.derivedGeometryType, "Polygon");
  assert.equal(conversionReport.featureCount, 60);
  assert.equal(conversionReport.nullGeometryCount, 0);
  assert.equal(conversionReport.invalidGeometryCountAfterConversion, 0);
  assert.equal(conversionReport.duplicateSourceGeometryCount, 1);
  assert.equal(conversionReport.duplicateFeatureCount, 0);
  assert.equal(conversionReport.sourceVertexCount, conversionReport.derivedVertexCount);
  assert.equal(conversionReport.snappedClosureCount, 3);
  assert.ok(conversionReport.maximumClosureGapMeters < conversionReport.closureToleranceMeters);
  assert.equal(conversionReport.simplificationMeters, 0);
  assert.ok(conversionReport.derivedBytes < 300_000);
});

test("converter is checksum-bound and rejects inferred open boundaries", () => {
  const converter = fs.readFileSync(path.join(root, "tools/khoa/convert-training-firing-zone.py"), "utf8");
  assert.match(converter, /EXPECTED_RAW_SHA256/);
  assert.match(converter, /MAX_CLOSURE_GAP_METERS = 0\.01/);
  assert.match(converter, /Boundary closure gap exceeds/);
  assert.doesNotMatch(converter, /\.simplify\(/);
  assert.match(converter, /"name": "ZONE_NM"/);
  assert.match(converter, /"referenceChartNumber": "RFRNC_INFO"/);
});

test("training/firing-zone layer is ordered between harbor and deep-water overlays and defaults off", () => {
  const config = contract.createKhoaTrainingFiringZoneLayerConfig(contract.parseKhoaTrainingFiringZoneGeoJson(officialGeoJson));
  const deep = deepWaterContract.createKhoaDeepWaterRouteLayerConfig({ type: "FeatureCollection", features: [] });
  assert.equal(config.id, "khoa-maritime-training-firing-zone");
  assert.equal(config.visible, false);
  assert.ok(config.order > 10 && config.order < deep.order);
  assert.deepEqual(config.layers.map((layer) => layer.type), ["fill", "line"]);
  assert.ok(config.layers[0].paint["fill-opacity"] <= 0.12);
});

test("navigation UI registers an independent default-off static reference layer", () => {
  const navigation = fs.readFileSync(path.join(root, "src/components/boat/navigation/MarineNavigation.tsx"), "utf8");
  const map = fs.readFileSync(path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx"), "utf8");
  const control = fs.readFileSync(path.join(root, "src/components/boat/navigation/MarineLayerControl.tsx"), "utf8");
  assert.match(navigation, /trainingFiringZoneVisible, setTrainingFiringZoneVisible\] = useState\(false\)/);
  assert.match(map, /KHOA_TRAINING_FIRING_ZONE_LAYER_ID/);
  assert.match(map, /setMarineLayerVisibility\(KHOA_TRAINING_FIRING_ZONE_LAYER_ID, trainingFiringZoneVisible\)/);
  assert.match(control, /훈련·사격구역/);
  assert.match(control, /현재 활성 상태를 나타내지 않습니다/);
  assert.match(control, /KHOA_TRAINING_FIRING_ZONE_WARNING/);
  assert.equal(
    contract.KHOA_TRAINING_FIRING_ZONE_WARNING,
    "공식 공개 구역 경계 참고자료이며 현재 훈련·사격 실시 여부 또는 통항 가능 여부를 나타내지 않습니다. 출항 전 최신 항행경보와 관계기관 안내를 확인하세요.",
  );
  assert.doesNotMatch(control, /현재 사격 중/);
});

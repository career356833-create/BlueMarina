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
const contract = loadTs(path.join(root, "src/lib/marine-navigation/adapters/khoa-harbor-zone.ts"), {
  "./khoa-deep-water-route": deepWaterContract,
});
const officialGeoJson = JSON.parse(fs.readFileSync(path.join(root, "public/data/khoa/navigation/khoa-harbor-zone.geojson"), "utf8"));
const conversionReport = JSON.parse(fs.readFileSync(path.join(root, "data/khoa/navigation/harbor-zone/derived/conversion-report.json"), "utf8"));

test("official KHOA harbor-zone GeoJSON satisfies the runtime contract", () => {
  const parsed = contract.parseKhoaHarborZoneGeoJson(officialGeoJson);
  assert.equal(parsed.type, "FeatureCollection");
  assert.equal(parsed.features.length, 70);
  assert.ok(parsed.features.every((feature) => ["Polygon", "MultiPolygon"].includes(feature.geometry.type)));
  assert.ok(parsed.features.every((feature) => feature.properties.source === "국립해양조사원(KHOA)"));
  assert.equal(parsed.features[0].properties.name, "삼천포항");
});

test("harbor-zone parser rejects invalid coordinates and spoofed provenance", () => {
  const invalid = structuredClone(officialGeoJson);
  const geometry = invalid.features[0].geometry;
  const ring = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates[0][0];
  ring[0] = [181, 35];
  assert.throws(() => contract.parseKhoaHarborZoneGeoJson(invalid), /coordinates/);

  const spoofed = structuredClone(officialGeoJson);
  spoofed.features[0].properties.source = "unknown";
  assert.throws(() => contract.parseKhoaHarborZoneGeoJson(spoofed), /properties/);
});

test("MapLibre click properties preserve source-backed harbor details", () => {
  const properties = { ...officialGeoJson.features[0].properties, minimumScale: String(officialGeoJson.features[0].properties.minimumScale) };
  delete properties.statusCode;
  const parsed = contract.parseKhoaHarborZoneFeatureProperties(properties);
  assert.equal(parsed.name, "삼천포항");
  assert.equal(parsed.statusCode, null);
  assert.equal(parsed.minimumScale, 17999);
  assert.equal(contract.parseKhoaHarborZoneFeatureProperties({ ...properties, source: "unknown" }), null);
});

test("harbor conversion artifact records CRS, geometry validity and bounded payload", () => {
  assert.equal(conversionReport.sourceEpsg, 5179);
  assert.equal(conversionReport.targetCrs, "EPSG:4326");
  assert.equal(conversionReport.featureCount, 70);
  assert.equal(conversionReport.nullGeometryCount, 0);
  assert.equal(conversionReport.duplicateSourceGeometryCount, 0);
  assert.equal(conversionReport.invalidGeometryCountAfterConversion, 0);
  assert.equal(conversionReport.simplificationMeters, 25);
  assert.ok(conversionReport.derivedVertexCount < conversionReport.sourceVertexCount);
  assert.ok(conversionReport.derivedBytes < 1_100_000);
});

test("harbor layer is below the deep-water route and defaults hidden", () => {
  const harbor = contract.createKhoaHarborZoneLayerConfig(contract.parseKhoaHarborZoneGeoJson(officialGeoJson));
  const deep = deepWaterContract.createKhoaDeepWaterRouteLayerConfig({ type: "FeatureCollection", features: [] });
  assert.equal(harbor.id, "khoa-harbor-zone");
  assert.equal(harbor.visible, false);
  assert.ok(harbor.order < deep.order);
  assert.deepEqual(harbor.layers.map((layer) => layer.type), ["fill", "line"]);
  assert.ok(harbor.layers[0].paint["fill-opacity"] <= 0.15);
});

test("navigation UI registers independent harbor visibility without changing the core", () => {
  const navigation = fs.readFileSync(path.join(root, "src/components/boat/navigation/MarineNavigation.tsx"), "utf8");
  const map = fs.readFileSync(path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx"), "utf8");
  const provider = fs.readFileSync(path.join(root, "src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts"), "utf8");
  assert.match(navigation, /useState\(false\).*harborZone|harborZoneVisible, setHarborZoneVisible\] = useState\(false\)/s);
  assert.match(map, /KHOA_HARBOR_ZONE_LAYER_ID/);
  assert.match(map, /layerId === KHOA_HARBOR_ZONE_LAYER_ID/);
  assert.match(map, /setMarineLayerVisibility\(KHOA_HARBOR_ZONE_LAYER_ID, harborZoneVisible\)/);
  assert.match(provider, /navigation-accuracy-fill/);
  assert.match(provider, /marineFeatureSelectHandler\(config.id, \{ \.\.\.properties/);
  assert.match(provider, /setWorkerUrl\("\/maplibre\/maplibre-gl-worker\.mjs"\)/);
  const copyWorker = fs.readFileSync(path.join(root, "scripts/copy-maplibre-worker.mjs"), "utf8");
  assert.match(copyWorker, /maplibre-gl-worker\.mjs/);
  assert.match(copyWorker, /maplibre-gl-shared\.mjs/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");

function loadTs(file) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const contract = loadTs(path.join(root, "src/lib/marine-navigation/adapters/khoa-deep-water-route.ts"));
const officialGeoJson = JSON.parse(fs.readFileSync(path.join(root, "public/data/khoa/navigation/khoa-deep-water-route.geojson"), "utf8"));

test("official KHOA derived GeoJSON satisfies the runtime product contract", () => {
  const parsed = contract.parseKhoaDeepWaterRouteGeoJson(officialGeoJson);
  assert.equal(parsed.type, "FeatureCollection");
  assert.equal(parsed.features.length, 5);
  assert.ok(parsed.features.every((feature) => feature.geometry.type === "Polygon"));
  assert.ok(parsed.features.every((feature) => feature.properties.source === "국립해양조사원(KHOA)"));
});

test("KHOA parser rejects out-of-range coordinates", () => {
  const invalid = structuredClone(officialGeoJson);
  invalid.features[0].geometry.coordinates[0][0] = [181, 35];
  assert.throws(() => contract.parseKhoaDeepWaterRouteGeoJson(invalid), /coordinates/);
});

test("KHOA parser rejects spoofed or incomplete source properties", () => {
  const spoofed = structuredClone(officialGeoJson);
  spoofed.features[0].properties.source = "unknown";
  assert.throws(() => contract.parseKhoaDeepWaterRouteGeoJson(spoofed), /properties/);
  const incomplete = structuredClone(officialGeoJson);
  delete incomplete.features[0].properties.id;
  assert.throws(() => contract.parseKhoaDeepWaterRouteGeoJson(incomplete), /properties/);
});

test("KHOA MapLibre layer config uses a subtle polygon fill and outline", () => {
  const parsed = contract.parseKhoaDeepWaterRouteGeoJson(officialGeoJson);
  const config = contract.createKhoaDeepWaterRouteLayerConfig(parsed, false);
  assert.equal(config.id, "khoa-deep-water-route");
  assert.equal(config.order, 20);
  assert.equal(config.visible, false);
  assert.equal(config.source.type, "geojson");
  assert.deepEqual(config.layers.map((layer) => layer.type), ["fill", "line"]);
  assert.ok(config.layers[0].paint["fill-opacity"] <= 0.2);
});

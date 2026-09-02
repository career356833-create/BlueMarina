const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const cache = new Map();
function loadTs(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} }; cache.set(absolute, module);
  const source = fs.readFileSync(absolute, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return loadTs(path.join(root, "src", `${specifier.slice(2)}.ts`));
    if (specifier.startsWith(".")) return loadTs(path.resolve(path.dirname(absolute), `${specifier}.ts`));
    return require(specifier);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, module, module.exports, absolute, path.dirname(absolute));
  return module.exports;
}

const geo = loadTs(path.join(root, "src/lib/marine-navigation/geo.ts"));
const bearing = loadTs(path.join(root, "src/lib/marine-navigation/bearing.ts"));
const eta = loadTs(path.join(root, "src/lib/marine-navigation/eta.ts"));
const track = loadTs(path.join(root, "src/lib/marine-navigation/track.ts"));
const speed = loadTs(path.join(root, "src/lib/marine-navigation/speed.ts"));
const destination = loadTs(path.join(root, "src/lib/marine-navigation/adapters/navigation-destination-adapter.ts"));
const mapGeoJson = loadTs(path.join(root, "src/lib/marine-navigation/adapters/navigation-map-geojson.ts"));

const position = (latitude, longitude, timestamp = 0, accuracyMeters = 5) => ({ latitude, longitude, timestamp, accuracyMeters, source: "GPS_NATIVE", headingSource: "UNAVAILABLE", speedSource: "UNAVAILABLE" });

test("distance and nautical-mile conversion remain geodesic", () => {
  const meters = geo.distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
  assert.ok(meters > 111_000 && meters < 111_300); assert.equal(geo.metersToNauticalMiles(1_852), 1);
});
test("bearing normalization and compass direction are stable", () => {
  assert.ok(Math.abs(bearing.initialBearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 90) < 0.00001);
  assert.equal(bearing.normalizeDegrees(-10), 350); assert.equal(bearing.relativeBearingDegrees(10, 350), 20); assert.equal(bearing.compassDirection(225), "SW");
});
test("ETA and conservative accuracy-aware arrival policy", () => {
  assert.ok(Math.abs(eta.estimateEtaMinutes(1_852, 1) - 60) < 0.00001); assert.equal(eta.estimateEtaMinutes(1_852, 0.49), null);
  assert.equal(geo.hasArrived(60, 10, 75), true); assert.equal(geo.hasArrived(60, 20, 75), false); assert.equal(geo.hasArrived(60, undefined, 75), false);
});
test("track samples after ten seconds or ten meters", () => {
  const previous = position(35, 129); assert.equal(track.shouldAppendTrackPoint(previous, position(35, 129, 9_000)), false); assert.equal(track.shouldAppendTrackPoint(previous, position(35, 129, 10_000)), true); assert.equal(track.shouldAppendTrackPoint(previous, position(35.0001, 129, 1_000)), true);
});
test("derived movement requires bounded time and good accuracy", () => {
  assert.equal(speed.deriveMovement(position(35, 129, 0), position(35.0001, 129, 2_000)).heading != null, true);
  assert.deepEqual(speed.deriveMovement(position(35, 129, 0, 80), position(35.0001, 129, 2_000)), {});
});
test("destination query parser rejects manipulation and round-trips valid values", () => {
  const parsed = destination.parseNavigationDestinationQuery({ lat: "35.1", lng: "129.1", name: "테스트 항구", type: "port", sourceId: "p1" });
  assert.equal(parsed.error, null); assert.equal(parsed.destination.sourceType, "port"); assert.match(destination.buildNavigationHref(parsed.destination), /^\/sea\/navigation\?/);
  assert.equal(destination.parseNavigationDestinationQuery({ lat: "91", lng: "129", name: "x", type: "port" }).destination, null);
  assert.equal(destination.parseNavigationDestinationQuery({ lat: "35", lng: "129", name: "x", type: "unsafe" }).destination, null);
});
test("MapLibre presentation converts vessel, destination, and waypoints to GeoJSON", () => {
  const vessel = { ...position(35.1, 129.1), heading: 92 };
  const destinationPoint = { id: "destination", name: "목적지", latitude: 35.2, longitude: 129.2, sourceType: "manual" };
  const waypoint = { id: "waypoint", name: "웨이포인트", latitude: 35.15, longitude: 129.15, sourceType: "manual", createdAt: 1 };
  const points = mapGeoJson.toNavigationPointGeoJson({ vessel, destination: destinationPoint, waypoints: [waypoint] });
  assert.equal(points.features.length, 3);
  assert.deepEqual(points.features[0].geometry.coordinates, [129.1, 35.1]);
  assert.equal(points.features[0].properties.heading, 92);
});
test("MapLibre track and bearing GeoJSON preserve longitude-latitude order", () => {
  const vessel = position(35.1, 129.1);
  const destinationPoint = { id: "destination", name: "목적지", latitude: 35.2, longitude: 129.2, sourceType: "manual" };
  const trackLine = mapGeoJson.toTrackGeoJson([vessel, position(35.11, 129.12, 10_000)]);
  const bearingLine = mapGeoJson.toBearingGeoJson(vessel, destinationPoint);
  assert.deepEqual(trackLine.features[0].geometry.coordinates[1], [129.12, 35.11]);
  assert.deepEqual(bearingLine.features[0].geometry.coordinates, [[129.1, 35.1], [129.2, 35.2]]);
});
test("MapLibre GeoJSON conversion rejects invalid coordinates", () => {
  const invalid = position(95, 200);
  assert.equal(mapGeoJson.isValidMapPoint(invalid), false);
  assert.equal(mapGeoJson.toTrackGeoJson([position(35, 129), invalid]).features.length, 0);
  assert.equal(mapGeoJson.toBearingGeoJson(invalid, { id: "x", name: "x", latitude: 35, longitude: 129, sourceType: "manual" }).features.length, 0);
});

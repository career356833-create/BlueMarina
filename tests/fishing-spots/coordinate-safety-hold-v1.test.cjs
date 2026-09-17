/* eslint-disable @typescript-eslint/no-require-imports -- Node's existing .test.cjs suite uses CommonJS. */
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const sha256 = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();

const cache = new Map();
function loadTs(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} };
  cache.set(absolute, module);
  const source = fs.readFileSync(absolute, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return loadTs(path.join(root, "src", `${specifier.slice(2)}.ts`));
    if (specifier.startsWith(".")) return loadTs(path.resolve(path.dirname(absolute), `${specifier}.ts`));
    return require(specifier);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, module, module.exports, absolute, path.dirname(absolute));
  return module.exports;
}

const safety = loadTs(path.join(root, "src/lib/fishing-spots/coordinate-safety.ts"));
const navigation = loadTs(path.join(root, "src/lib/marine-navigation/adapters/navigation-destination-adapter.ts"));
const reviewHold = readJson("reports/fishing-spots/navigation-coordinate-hold-v1.json");
const quality = readJson("reports/fishing-spots/coordinate-safety-hold-v1-quality.json");
const detail = read("src/app/fishing-spots/[id]/page.tsx");
const mapView = read("src/components/sea/MapView.tsx");
const conditionsPage = read("src/app/fishing-spots/conditions/page.tsx");
const conditionsClient = read("src/app/fishing-spots/conditions/fishing-condition-client.tsx");

const heldIds = ["boat-60", "boat-128", "boat-129", "boat-321"];
const queryFor = (spotId, lat = "37.628583", lng = "125.680389") => ({
  lat,
  lng,
  name: spotId,
  type: "fishing_spot",
  sourceId: spotId,
});

test("runtime policy is an exact deterministic projection of the four review holds", () => {
  assert.deepEqual(Object.keys(safety.SPOT_COORDINATE_SAFETY_POLICIES), heldIds);
  assert.deepEqual(
    Object.values(safety.SPOT_COORDINATE_SAFETY_POLICIES).map(({ spotId, mapPolicy, navigationPolicy }) => ({ spotId, mapPolicy, navigationPolicy })),
    reviewHold.holds.map(({ spotId, mapPolicy, navigationPolicy }) => ({ spotId, mapPolicy, navigationPolicy })),
  );
});

test("boat-60 and boat-321 block map display and navigation", () => {
  for (const spotId of ["boat-60", "boat-321"]) {
    const policy = safety.getSpotCoordinateSafetyPolicy(spotId);
    assert.equal(policy.mapPolicy, "MAP_DISPLAY_BLOCKED");
    assert.equal(policy.navigationPolicy, "NAVIGATION_BLOCKED_PENDING_REVIEW");
    assert.equal(navigation.parseNavigationDestinationQuery(queryFor(spotId)).destination, null);
  }
});

test("boat-128 and boat-129 allow reference map display but block navigation", () => {
  for (const spotId of ["boat-128", "boat-129"]) {
    const policy = safety.getSpotCoordinateSafetyPolicy(spotId);
    assert.equal(policy.mapPolicy, "MAP_DISPLAY_WITH_WARNING");
    assert.equal(policy.navigationPolicy, "NAVIGATION_BLOCKED_PENDING_REVIEW");
    assert.match(navigation.parseNavigationDestinationQuery(queryFor(spotId)).error, /항법 목적지 사용이 보류/);
  }
});

test("normal spots and the distinct nearby rock-151 remain unrestricted", () => {
  for (const spotId of ["boat-1", "rock-151"]) {
    assert.deepEqual(safety.getSpotCoordinateSafetyPolicy(spotId), {
      spotId,
      mapPolicy: "MAP_DISPLAY_ALLOWED",
      navigationPolicy: "NAVIGATION_ALLOWED",
      reason: "",
    });
    assert.ok(navigation.parseNavigationDestinationQuery(queryFor(spotId)).destination);
  }
});

test("manual input with the same numeric coordinate is unaffected", () => {
  const parsed = navigation.parseNavigationDestinationQuery({
    lat: "37.628583",
    lng: "125.680389",
    name: "수동 목적지",
    type: "manual",
  });
  assert.equal(parsed.error, null);
  assert.equal(parsed.destination.sourceType, "manual");
});

test("detail page exposes held-state copy and accessible disabled controls", () => {
  assert.match(detail, /coordinatePolicy\.reason/);
  assert.match(detail, /mapPolicy === "MAP_DISPLAY_BLOCKED"/);
  assert.match(detail, /mapPolicy === "MAP_DISPLAY_WITH_WARNING"/);
  assert.match(detail, /aria-describedby="map-hold-reason"/);
  assert.match(detail, /aria-describedby="navigation-hold-reason"/);
});

test("sea map omits blocked markers, rejects blocked direct queries, and warns allowed review spots", () => {
  assert.match(mapView, /mapPolicy !== "MAP_DISPLAY_BLOCKED"/);
  assert.match(mapView, /coordinatePolicy\.mapPolicy === "MAP_DISPLAY_BLOCKED"/);
  assert.match(mapView, /setDirectQueryNotice\(MAP_BLOCKED_NOTICE\)/);
  assert.match(mapView, /MAP_DISPLAY_WITH_WARNING/);
  assert.match(mapView, /좌표 검토 중/);
});

test("conditions remain accessible with backlink and no automatic source or station selection", () => {
  assert.match(conditionsPage, /spot \? \{/);
  assert.match(conditionsClient, /상세로 돌아가기/);
  assert.match(conditionsClient, /포인트 위치와 해양 관측 정점은 별도입니다/);
  assert.match(conditionsClient, /const \[sourceId, setSourceId\] = useState<FishingConditionSourceId \| "">\(""\)/);
  assert.match(conditionsClient, /const \[locationId, setLocationId\] = useState\(""\)/);
});

test("canonical and source coordinate artifacts retain their reviewed hashes", () => {
  assert.equal(sha256("src/data/fishing-spots.json"), "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA");
  assert.equal(sha256("work/fishing-spots-boat-raw.csv"), "5AE7CFB4280214667583724B8C0531A7018B0ABDE47CB82C60F6C491B9DFA20D");
  assert.equal(sha256("work/fishing-spots-rock-raw.csv"), "E19E4D62ABCAC286FD65CC6658B428EC0A38B7EF8477A2BF37398063F73192AC");
});

test("quality report records exact counts and regression outcomes", () => {
  assert.equal(quality.decision, "COORDINATE_SAFETY_HOLD_ACTIVE");
  assert.equal(quality.counts.heldSpots, 4);
  assert.equal(quality.counts.mapBlocked, 2);
  assert.equal(quality.counts.mapWarning, 2);
  assert.equal(quality.counts.navigationBlocked, 4);
  assert.equal(quality.directQueryDefense.status, "PASS");
  assert.equal(quality.normalSpotRegression.status, "PASS");
  assert.equal(quality.conditionsRegression.status, "PASS");
});

test("user-facing safety copy avoids claims beyond the review evidence", () => {
  const runtimeCopy = [
    read("src/lib/fishing-spots/coordinate-safety.ts"),
    detail,
    mapView,
    conditionsClient,
  ].join("\n");
  for (const forbidden of ["위험한 장소", "사고 위험", "안전하지 않음"]) {
    assert.equal(runtimeCopy.includes(forbidden), false);
  }
});

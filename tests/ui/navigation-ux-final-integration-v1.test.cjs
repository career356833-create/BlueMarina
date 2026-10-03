const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const navigation = read("src/components/boat/navigation/MarineNavigation.tsx");
const report = JSON.parse(read("reports/platform/user-flow-navigation-ux-final-v1.json"));

test("spot destination handoff keeps source ID and coordinate safety hold", () => {
  const adapter = read("src/lib/marine-navigation/adapters/navigation-destination-adapter.ts");
  const detail = read("src/app/fishing-spots/[id]/page.tsx");
  const conditions = read("src/app/fishing-spots/conditions/page.tsx");
  assert.match(adapter, /params\.set\("sourceId", destination\.sourceId\)/);
  assert.match(adapter, /NAVIGATION_BLOCKED_PENDING_REVIEW/);
  assert.match(detail, /buildNavigationHref\(navigationDestinationFromFishingSpot\(spot\)\)/);
  assert.match(conditions, /buildNavigationHref\(navigationDestinationFromFishingSpot\(spot\)\)/);
  assert.match(navigation, /\/fishing-spots\/\$\{encodeURIComponent\(destination\.sourceId\)\}/);
});

test("navigation has map-first top bar, accessible on-demand controls, and no site BottomNav", () => {
  assert.match(navigation, /data-navigation-immersive="true"/);
  assert.match(navigation, /destination\?\.name \?\? "해양 항법 보조"/);
  assert.match(navigation, /aria-controls="navigation-layer-drawer"/);
  assert.match(navigation, /aria-expanded=\{layersOpen\}/);
  assert.match(navigation, /aria-controls="navigation-details-content"/);
  assert.match(navigation, /hidden=\{!detailsOpen\}/);
  assert.doesNotMatch(navigation, /<BottomNav|<NavigationHUD/);
  const css = read("src/app/sea/navigation/navigation-map.css");
  assert.match(css, /body:has\(\[data-navigation-immersive="true"\]\) > header/);
  assert.match(css, /blue-captain-widget/);
});

test("source states stay inside the layer drawer and preserve current-warning uncertainty", () => {
  const layer = read("src/components/boat/navigation/MarineLayerControl.tsx");
  assert.match(navigation, /\{layersOpen \? <div id="navigation-layer-drawer"/);
  assert.match(layer, /CURRENT STATUS UNAVAILABLE/);
  assert.match(layer, /SNAPSHOT/);
  assert.match(layer, /PARTIAL/);
  assert.match(layer, /STALE/);
});

test("offshore destination focus retains coastline context without changing coordinates", () => {
  const provider = read("src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts");
  assert.match(provider, /center: \[points\[0\]\.longitude, points\[0\]\.latitude\], zoom: 12/);
  assert.doesNotMatch(provider, /safeRoute|avoidance|collision/i);
});

test("straight bearing never claims safe routing or AIS avoidance", () => {
  assert.match(navigation, /직선 방위·거리는 안전항로가 아닙니다/);
  assert.match(navigation, /육지·암초·수심 회피, AIS 충돌회피, 자동 항로 생성을 제공하지 않으며/);
  assert.match(navigation, /공식 항법장비를 대체하지 않습니다/);
  assert.equal(report.boundaries.apiChange, 0);
  assert.equal(report.boundaries.databaseMutation, 0);
  assert.equal(report.boundaries.safeRouteInference, 0);
});

test("auth entry paths retain internal return destinations for supply flows", () => {
  for (const [file, destination] of [
    ["src/app/charters/onboarding/onboarding-client.tsx", "%2Fcharters%2Fonboarding"],
    ["src/app/market/new/listing-form.tsx", "%2Fmarket%2Fnew"],
    ["src/app/community/new/community-post-form.tsx", "%2Fcommunity%2Fnew"],
  ]) assert.ok(read(file).includes(destination), file);
  assert.match(read("src/app/account/login/page.tsx"), /safeAuthReturnTo/);
  assert.match(read("src/app/account/account-client.tsx"), /<Link href=\{item\.href\}/);
});

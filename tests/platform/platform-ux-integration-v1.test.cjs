const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));

function loadTs(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 }
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", output)(module, module.exports);
  return module.exports;
}

const navigation = loadTs("src/lib/platform/navigation.ts");
const report = json("reports/platform/platform-ux-integration-v1.json");

test("records the platform decision with backend limitations", () => {
  assert.equal(report.decision, "PLATFORM_UX_V1_READY_WITH_LIMITATIONS");
});

test("desktop navigation has the exact six authority entries", () => {
  assert.deepEqual(navigation.desktopNavigation.map(({ label, href }) => [label, href]), [["HOME", "/"], ["SEA", "/sea"], ["FISHING", "/fishing-spots"], ["FISH", "/fish"], ["MARKET", "/market"], ["GUIDE", "/license-guide"]]);
});

test("mobile navigation has the exact five authority entries", () => {
  assert.deepEqual(navigation.mobileNavigation.map(({ label, href }) => [label, href]), [["홈", "/"], ["바다", "/sea"], ["출조", "/charters"], ["어종", "/fish"], ["가이드", "/license-guide"]]);
});

test("navigation IDs and hrefs are unique", () => {
  for (const items of [navigation.desktopNavigation, navigation.mobileNavigation]) {
    assert.equal(new Set(items.map((item) => item.id)).size, items.length);
    assert.equal(new Set(items.map((item) => item.href)).size, items.length);
  }
});

test("home active state is exact", () => {
  const home = navigation.desktopNavigation.find((item) => item.id === "home");
  assert.equal(navigation.isPlatformNavItemActive("/", home), true);
  assert.equal(navigation.isPlatformNavItemActive("/market", home), false);
});

test("sea navigation owns sea and today sea", () => {
  const sea = navigation.desktopNavigation.find((item) => item.id === "sea");
  assert.equal(navigation.isPlatformNavItemActive("/sea/navigation", sea), true);
  assert.equal(navigation.isPlatformNavItemActive("/today-sea", sea), true);
});

test("desktop fishing owns spot charter and reservation flows", () => {
  const fishing = navigation.desktopNavigation.find((item) => item.id === "fishing");
  for (const route of ["/fishing-spots/boat-1", "/fishing-spots/conditions", "/charters/charter-1", "/reservations"]) assert.equal(navigation.isPlatformNavItemActive(route, fishing), true);
});

test("mobile charter is active for nested charter and inquiry routes", () => {
  const charter = navigation.mobileNavigation.find((item) => item.id === "charter");
  assert.equal(navigation.isPlatformNavItemActive("/charters/demo", charter), true);
  assert.equal(navigation.isPlatformNavItemActive("/reservations", charter), true);
});

test("mobile fish is active for fish descendants", () => {
  const fish = navigation.mobileNavigation.find((item) => item.id === "fish");
  assert.equal(navigation.isPlatformNavItemActive("/fish/species", fish), true);
});

test("guide active state covers the retained learning journey", () => {
  const guide = navigation.mobileNavigation.find((item) => item.id === "guide");
  for (const route of ["/license-guide", "/theory/safety", "/practice/course", "/exam"]) assert.equal(navigation.isPlatformNavItemActive(route, guide), true);
});

test("fishing spots are not forced into the mobile charter tab", () => {
  const charter = navigation.mobileNavigation.find((item) => item.id === "charter");
  assert.equal(navigation.isPlatformNavItemActive("/fishing-spots", charter), false);
});

test("home has six exact primary service entries", () => {
  assert.deepEqual(navigation.platformServiceEntries.filter((item) => item.priority === "PRIMARY").map((item) => item.href), ["/today-sea", "/sea", "/fishing-spots", "/charters", "/fish", "/market"]);
});

test("home keeps community and guide as secondary entries", () => {
  assert.deepEqual(navigation.platformServiceEntries.filter((item) => item.priority === "SECONDARY").map((item) => item.href), ["/community", "/license-guide"]);
});

test("service entries have unique IDs and hrefs without badges", () => {
  const items = navigation.platformServiceEntries;
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.equal(new Set(items.map((item) => item.href)).size, items.length);
  assert.equal(items.some((item) => Object.hasOwn(item, "badge")), false);
});

test("all primary route page files exist", () => {
  for (const file of ["src/app/page.tsx", "src/app/today-sea/page.tsx", "src/app/sea/page.tsx", "src/app/sea/navigation/page.tsx", "src/app/fishing-spots/page.tsx", "src/app/fishing-spots/[id]/page.tsx", "src/app/fishing-spots/conditions/page.tsx", "src/app/fish/page.tsx", "src/app/charters/page.tsx", "src/app/charters/[id]/page.tsx", "src/app/market/page.tsx", "src/app/market/[id]/page.tsx", "src/app/community/page.tsx", "src/app/community/[id]/page.tsx", "src/app/license-guide/page.tsx"]) assert.equal(fs.existsSync(path.join(root, file)), true, file);
});

test("draft onboarding and inquiry route files exist", () => {
  for (const file of ["src/app/charters/onboarding/page.tsx", "src/app/reservations/page.tsx", "src/app/market/new/page.tsx", "src/app/community/new/page.tsx"]) assert.equal(fs.existsSync(path.join(root, file)), true, file);
});

test("home preserves MarineVideoHero as the brand entry", () => {
  assert.match(read("src/components/boat/home/HomeLanding.tsx"), /<MarineVideoHero\s*\/>/);
});

test("home renders the shared service contract without restoring long feature sections", () => {
  const home = read("src/components/boat/home/HomeLanding.tsx");
  assert.match(home, /platformServiceEntries/);
  assert.doesNotMatch(home, /ExploreSeaSection|FishingExperienceSection|FishEncyclopediaSection|TodaysSeaExperience/);
});

test("home hero uses live Market route through shared navigation", () => {
  const hero = read("src/components/boat/home/MarineVideoHero.tsx");
  assert.match(hero, /desktopNavigation/);
  assert.doesNotMatch(hero, /coming-soon/);
});

test("AppFrame delegates desktop navigation and exposes active semantics", () => {
  assert.match(read("src/components/boat/AppFrame.tsx"), /<PlatformDesktopNav\s*\/>/);
  assert.match(read("src/components/boat/home/ExploreSeaSection.tsx"), /<PlatformDesktopNav\s*\/>/);
  const nav = read("src/components/platform/PlatformDesktopNav.tsx");
  assert.match(nav, /aria-current/);
  assert.match(nav, /focus-visible/);
});

test("BottomNav uses shared nested matching and keeps safe area", () => {
  const bottom = read("src/components/boat/BottomNav.tsx");
  assert.match(bottom, /mobileNavigation/);
  assert.match(bottom, /isPlatformNavItemActive/);
  assert.match(bottom, /safe-area-inset-bottom/);
  assert.match(bottom, /aria-current/);
});

test("Fishing hub links conditions charter and community", () => {
  const source = read("src/app/fishing-spots/fishing-spots-client.tsx");
  for (const href of ["/fishing-spots/conditions", "/charters", "/community"]) assert.match(source, new RegExp(`href=\"${href.replaceAll("/", "\\/")}\"`));
});

test("Charter empty state links fish conditions spots and sea", () => {
  const source = read("src/app/charters/page.tsx");
  for (const href of ["/fishing-spots", "/fishing-spots/conditions", "/fish", "/sea"]) assert.match(source, new RegExp(href.replaceAll("/", "\\/")));
  assert.match(source, /업체용 출조 정보 등록 안내/);
});

test("Market empty state offers Community as contextual entry", () => {
  assert.match(read("src/app/market/page.tsx"), /href="\/community"/);
});

test("Community empty state offers local draft and Fishing entries", () => {
  const source = read("src/app/community/page.tsx");
  assert.match(source, /href="\/community\/new"/);
  assert.match(source, /href="\/fishing-spots"/);
  assert.match(source, /로컬 초안/);
});

test("production-empty services retain honest exact messages", () => {
  assert.match(read("src/app/charters/page.tsx"), /등록된 출조 정보가 없습니다/);
  assert.match(read("src/app/market/page.tsx"), /등록된 판매글이 없습니다/);
  assert.match(read("src/app/community/page.tsx"), /등록된 커뮤니티 글이 없습니다/);
});

test("global loading and not-found states provide semantic next actions", () => {
  assert.match(read("src/app/loading.tsx"), /aria-busy="true"/);
  const missing = read("src/app/not-found.tsx");
  assert.match(missing, /href="\/"/);
  assert.match(missing, /href="\/sea"/);
});

test("report protects runtime data and database boundaries", () => {
  assert.equal(report.emptyStates.demoData, 0);
  assert.equal(report.emptyStates.fakeSuccess, 0);
  assert.equal(report.protectedBoundaries.seaMapViewMutation, 0);
  assert.equal(report.protectedBoundaries.conditionRegistryMutation, 0);
  assert.equal(report.protectedBoundaries.fishCanonicalMutation, 0);
  assert.equal(report.protectedBoundaries.databaseMigration, 0);
  assert.equal(report.protectedBoundaries.databaseApply, 0);
});

test("legacy learning routes remain present", () => {
  for (const route of ["study", "theory", "exam", "random", "wrong", "progress", "analysis", "practice", "past"]) assert.equal(fs.existsSync(path.join(root, "src/app", route, "page.tsx")), true, route);
});

test("documentation records authority and non-goals", () => {
  const docs = read("docs/BLUE_MARINA_PLATFORM_UX_INTEGRATION_V1.md");
  assert.match(docs, /HOME \/ SEA \/ FISHING \/ FISH \/ MARKET \/ GUIDE/);
  assert.match(docs, /홈 \/ 바다 \/ 출조 \/ 어종 \/ 가이드/);
  assert.match(docs, /SeaMapView 변경은 이 작업에 포함하지 않는다/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function routes(dir = path.join(root, "src/app")) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routes(full);
    if (entry.name !== "page.tsx") return [];
    const relative = path.relative(path.join(root, "src/app"), dir).split(path.sep).join("/");
    return [relative ? `/${relative}` : "/"];
  }).sort();
}

test("V2 inventory preserves all 63 page templates and reduces remaining public work", () => {
  const map = read("docs/BLUE_MARINA_UI_MIGRATION_MAP_V2.md");
  const entries = [...map.matchAll(/^\| `([^`]+)` \| `(MIGRATED|SHARED_SHELL_MIGRATED|IMMERSIVE_EXCEPTION|ADMIN_PRIVATE|REMAINING)` \|[^\n]*\|$/gm)];
  assert.equal(entries.length, 63);
  assert.deepEqual(entries.map((entry) => entry[1]).sort(), routes());
  const counts = Object.fromEntries([...new Set(entries.map((entry) => entry[2]))].map((status) => [status, entries.filter((entry) => entry[2] === status).length]));
  assert.deepEqual(counts, { MIGRATED: 27, SHARED_SHELL_MIGRATED: 6, ADMIN_PRIVATE: 16, REMAINING: 11, IMMERSIVE_EXCEPTION: 3 });
  assert.equal(routes().includes("/fish/[id]"), false);
});

test("detail pages retain real-record guards and coordinate safety", () => {
  for (const route of ["fishing-spots", "charters", "market", "community"]) {
    const page = read(`src/app/${route}/[id]/page.tsx`);
    assert.match(page, /DetailFrame/, route);
    assert.match(page, /notFound\(\)/, route);
  }
  const spot = read("src/app/fishing-spots/[id]/page.tsx");
  assert.match(spot, /getSpotCoordinateSafetyPolicy/);
  assert.match(spot, /navigationBlocked \? null/);
  assert.match(spot, /MAP_WARNING_NOTICE/);
  assert.match(spot, /NAVIGATION_HOLD_NOTICE/);
  for (const route of ["charters", "market", "community"]) {
    assert.match(read(`src/app/${route}/[id]/not-found.tsx`), /DetailUnavailable/);
  }
  assert.match(read("src/app/market/[id]/page.tsx"), /listing\.status !== "ACTIVE"/);
});

test("learning shell reaches all target pages without changing answer ownership", () => {
  const pages = ["study", "theory", "theory/[tag]", "exam", "random", "wrong", "progress", "analysis", "practice", "practice/videos", "practice/checklist", "practice/course", "practice/fail-items", "past"];
  for (const route of pages) assert.match(read(`src/app/${route}/page.tsx`), /<LearningFrame>/, route);
  assert.match(read("src/components/boat/portal/PortalShell.tsx"), /<LearningNav \/>/);
  assert.match(read("src/components/boat/QuestionCard.tsx"), /recordAnswer\(question, correct\)/);
  assert.match(read("src/components/boat/QuestionCard.tsx"), /aria-pressed=/);
  assert.match(read("src/app/exam/page.tsx"), /scoreExam\(/);
});

test("form family keeps private and staged flows separate", () => {
  for (const route of ["charters/onboarding", "charters/partners", "market/new", "community/new", "account/profile", "account/saved", "account/activity"]) {
    assert.match(read(`src/app/${route}/page.tsx`), /<FormFrame/, route);
  }
  assert.match(read("src/app/account/login/page.tsx"), /family="utility"/);
  assert.match(read("src/app/charters/onboarding/onboarding-client.tsx"), /partnerConsent/);
  assert.match(read("src/app/market/new/listing-form.tsx"), /REVIEW_REQUIRED/);
});

test("content companion cannot cover mobile actions or BottomNav", () => {
  const widget = read("src/components/boat/ai-captain/BlueMarinaCaptainWidget.tsx");
  const css = read("src/app/globals.css");
  assert.match(widget, /pathname !== "\/sea" && pathname !== "\/sea\/navigation"/);
  assert.match(widget, /!usesContentSafeArea && isFollowMode && lurePosition/);
  assert.match(css, /\.blue-captain-widget\[data-safe-area="true"\] \{\s*position: relative/);
  assert.match(css, /margin: 16px 16px calc\(var\(--bm-bottom-nav-height\) \+ env\(safe-area-inset-bottom\) \+ 16px\)/);
  assert.match(css, /\.bm-form-page :is\(button, a, input, select, textarea\):focus-visible/);
});

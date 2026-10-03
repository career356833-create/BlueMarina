const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const remainingV2 = [...read("docs/BLUE_MARINA_UI_MIGRATION_MAP_V2.md").matchAll(/^\| `([^`]+)` \| `REMAINING`/gm)].map((match) => match[1]);

function routes(dir = path.join(root, "src/app")) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routes(full);
    if (entry.name !== "page.tsx") return [];
    const relative = path.relative(path.join(root, "src/app"), dir).split(path.sep).join("/");
    return [relative ? `/${relative}` : "/"];
  }).filter(route => route !== "/admin/operations/moderation").sort();
}

test("V3 reconciles the same 63 templates and migrates all eleven V2 remainder routes", () => {
  const map = read("docs/BLUE_MARINA_UI_MIGRATION_MAP_V3.md");
  const rows = [...map.matchAll(/^\| `([^`]+)` \| `(MIGRATED|SHARED_SHELL_MIGRATED|IMMERSIVE_EXCEPTION|ADMIN_PRIVATE|REMAINING)` \|/gm)];
  assert.equal(rows.length, 63);
  assert.deepEqual(rows.map((row) => row[1]).sort(), routes());
  assert.equal(remainingV2.length, 11);
  for (const route of remainingV2) assert.ok(rows.some((row) => row[1] === route && row[2] === "MIGRATED"), route);
  const counts = Object.fromEntries([...new Set(rows.map((row) => row[2]))].map((status) => [status, rows.filter((row) => row[2] === status).length]));
  assert.deepEqual(counts, { MIGRATED: 38, ADMIN_PRIVATE: 16, SHARED_SHELL_MIGRATED: 6, IMMERSIVE_EXCEPTION: 3 });
});

test("public discovery/content routes use semantic surfaces and accessible controls", () => {
  for (const route of ["boatpedia", "dictionary", "faq", "fishing-safety", "marine-knowledge", "sea-info"]) {
    const page = read(`src/app/${route}/page.tsx`);
    assert.match(page, /bm-page-hero/, route);
    assert.match(page, /bm-v3-public/, route);
    assert.doesNotMatch(page, /border-sky-100 bg-white|bg-\[#0F2D52\]/, route);
  }
  for (const route of ["boatpedia", "dictionary", "faq", "marine-knowledge"]) {
    const page = read(`src/app/${route}/page.tsx`);
    assert.match(page, /aria-pressed=\{/, route);
  }
  for (const route of ["boatpedia", "faq", "marine-knowledge"]) assert.match(read(`src/app/${route}/page.tsx`), /aria-expanded=\{isOpen\}/, route);
  assert.match(read("src/app/globals.css"), /\.bm-v3-public :is\(button, a, input, select, textarea\):focus-visible/);
});

test("documents and unavailable state reuse detail family without adding routes", () => {
  for (const route of ["coming-soon", "contact", "privacy", "terms"]) assert.match(read(`src/app/${route}/page.tsx`), /DetailFrame/, route);
  assert.match(read("src/app/fishing-spots/conditions/fishing-condition-client.tsx"), /AppFrame family="content"/);
  assert.match(read("src/app/fishing-spots/conditions/page.tsx"), /getSpotCoordinateSafetyPolicy/);
  assert.match(read("src/app/fishing-spots/conditions/page.tsx"), /NAVIGATION_HOLD_NOTICE/);
});

test("login presentation retains Kakao priority, email fallback, and policy links", () => {
  const login = read("src/app/account/login/page.tsx");
  assert.ok(login.indexOf("카카오로 계속하기") < login.indexOf("이메일로 계속하기"));
  assert.match(login, /safeAuthReturnTo/);
  assert.match(login, /href="\/terms"/);
  assert.match(login, /href="\/privacy"/);
  assert.match(login, /type="email"/);
  assert.match(login, /type="password"/);
});

test("zero-data registries and immersive routing retain their truthful boundaries", () => {
  assert.match(read("src/lib/charters/registry.ts"), /charters: \[\], schedules: \[\]/);
  assert.match(read("src/lib/market/registry.ts"), /listings: \[\]/);
  assert.match(read("src/lib/community/registry.ts"), /posts: \[\]/);
  for (const route of ["charters", "market", "community"]) assert.match(read(`src/app/${route}/[id]/page.tsx`), /notFound\(\)/, route);
  for (const route of ["today-sea", "sea", "sea/navigation"]) assert.ok(routes().includes(`/${route}`));
});

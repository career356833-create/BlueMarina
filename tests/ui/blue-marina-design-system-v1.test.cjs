const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function pageRoutes(dir = path.join(root, "src/app")) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...pageRoutes(full));
    else if (entry.name === "page.tsx") {
      const relative = path.relative(path.join(root, "src/app"), dir).split(path.sep).join("/");
      found.push(relative ? `/${relative}` : "/");
    }
  }
  return found.sort();
}

test("migration map accounts for every route template exactly once", () => {
  const map = read("docs/BLUE_MARINA_UI_MIGRATION_MAP_V1.md");
  const entries = [...map.matchAll(/^\| `([^`]+)` \| `(MIGRATED|READY_BY_SHARED_SHELL|NEEDS_PAGE_WORK|IMMERSIVE_EXCEPTION|ADMIN\/PRIVATE)` \|$/gm)];
  const listed = entries.map((entry) => entry[1]).sort();
  assert.equal(listed.length, 63);
  assert.equal(new Set(listed).size, listed.length);
  assert.deepEqual(listed, pageRoutes());
  const counts = Object.fromEntries([...new Set(entries.map((entry) => entry[2]))].map((status) => [status, entries.filter((entry) => entry[2] === status).length]));
  assert.deepEqual(counts, {
    MIGRATED: 8,
    "ADMIN/PRIVATE": 16,
    NEEDS_PAGE_WORK: 30,
    READY_BY_SHARED_SHELL: 6,
    IMMERSIVE_EXCEPTION: 3
  });
});

test("representative routes share the intended page grammar", () => {
  for (const file of ["src/app/fishing-spots/fishing-spots-client.tsx", "src/app/fish/page.tsx", "src/app/charters/page.tsx", "src/app/market/page.tsx", "src/app/community/page.tsx"]) {
    assert.match(read(file), /family="discovery"/, file);
  }
  assert.match(read("src/components/boat/portal/PortalShell.tsx"), /family="content"/);
  assert.match(read("src/app/account/page.tsx"), /family="utility"/);
  assert.match(read("src/components/boat/home/HomeLanding.tsx"), /data-page-family="brand"/);
});

test("semantic tokens and accessible mobile chrome remain available", () => {
  const css = read("src/app/globals.css");
  for (const token of ["background", "surface", "surface-elevated", "surface-muted", "foreground", "foreground-muted", "border", "brand", "brand-accent", "success", "warning", "danger", "header-height", "bottom-nav-height"]) {
    assert.match(css, new RegExp(`--bm-${token}:`), token);
  }
  const nav = read("src/components/boat/BottomNav.tsx");
  assert.match(nav, /mobileNavigation\.map/);
  assert.match(nav, /aria-current/);
  assert.match(nav, /safe-area-inset-bottom/);
  assert.match(nav, /min-h-11/);
});

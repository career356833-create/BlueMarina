const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const context = { exports: {}, ...globals };
  vm.runInNewContext(code, context);
  return context.exports;
}

function sdk() {
  const script = new EventTarget();
  script.remove = () => {};
  const window = { kakao: { maps: {} } };
  let callback;
  window.kakao.maps.load = fn => { callback = fn; };
  const { loadKakaoMaps } = load("src/lib/sea/kakao-maps.ts", {
    window, document: { getElementById: () => script }, setTimeout, clearTimeout
  });
  return { window, loadKakaoMaps, complete: () => callback() };
}

test("Kakao bootstrap namespace alone is not a drawable map; concurrent consumers await the same SDK callback", async () => {
  const { window, loadKakaoMaps, complete } = sdk();
  const pending = loadKakaoMaps("test");
  assert.equal(loadKakaoMaps("test"), pending);
  let resolved = false;
  pending.then(() => { resolved = true; });
  await Promise.resolve();
  assert.equal(resolved, false);
  const maps = window.kakao.maps;
  for (const key of ["Map", "LatLng", "Marker", "MarkerImage", "Size", "Point"]) maps[key] = class {};
  maps.event = { addListener() {}, removeListener() {} };
  complete();
  await pending;
});

test("an incomplete SDK callback rejects and releases the pending loader for retry", async () => {
  const { window, loadKakaoMaps, complete } = sdk();
  const pending = loadKakaoMaps("test");
  complete();
  await assert.rejects(pending, /unavailable/);
  assert.equal(window.__blueMarinaKakaoMapPromise, undefined);
});

test("domain review screens require the corresponding domain role for both list and detail", () => {
  const { canAccessAdminPath } = load("src/lib/operations/moderation-access.ts");
  for (const [domain,path] of [["charter","/charters/admin/submissions"],["market","/market/admin/listings"]]) {
    for (const route of [path, path + "/record"]) {
      assert.equal(canAccessAdminPath(route, {}), false);
      assert.equal(canAccessAdminPath(route, { operations_role: "operations_admin" }), false);
      assert.equal(canAccessAdminPath(route, { [domain + "_role"]: domain + "_admin" }), true);
    }
  }
});

test("public listing reads distinguish missing, private and unavailable records", async () => {
  const { MarketBackendError } = load("src/lib/market/backend/types.ts");
  const unavailable = new Error("upstream unavailable");
  let result;
  const service = { async get() { if (result instanceof Error || result instanceof MarketBackendError) throw result; return result; } };
  const dependencies = {
    "server-only": {}, "../filters": {}, "../registry": {}, "./types": { MarketBackendError },
    "./server": { marketBackend: () => ({ service }) }
  };
  const { readPublicMarketListing } = load("src/lib/market/backend/public-reader.ts", {
    require: name => { assert.ok(name in dependencies, name); return dependencies[name]; }
  });
  const id = "01234567-89ab-4cde-8f01-23456789abcd";
  result = unavailable;
  assert.equal(await readPublicMarketListing("invalid"), null);
  await assert.rejects(readPublicMarketListing(id), error => error === unavailable);
  result = new MarketBackendError("LISTING_NOT_FOUND", 404);
  assert.equal(await readPublicMarketListing(id), null);
  result = { listing: { id, status: "SUBMITTED" } };
  assert.equal(await readPublicMarketListing(id), null);
  result = { listing: { id, status: "ACTIVE", contact: { phone: "private" } } };
  const active = await readPublicMarketListing(id);
  assert.equal(active.id, id);
  assert.equal(active.contact, null);
});

test("browser audit covers the current route tree and has clicked round trips for active public templates", () => {
  const path = require("node:path");
  const report = JSON.parse(fs.readFileSync("reports/platform/platform-wide-ui-engine-audit-v1.json", "utf8"));
  const templates = fs.readdirSync("src/app", { recursive: true })
    .filter(file => path.basename(file) === "page.tsx")
    .map(file => path.dirname(file) === "." ? "/" : "/" + path.dirname(file).split(path.sep).join("/"))
    .sort();
  assert.deepEqual(report.inventory.map(row => row.route).sort(), templates);
  const reachable = new Set(["/"]);
  for (let previous = -1; previous !== reachable.size;) {
    previous = reachable.size;
    for (const [source, target] of report.clickedGraph.edges) {
      if (reachable.has(source)) reachable.add(target);
    }
  }
  for (const row of report.inventory.filter(item => item.publicInventory47)) {
    if (row.homeEntry !== "NO_PUBLIC_RECORD") assert.ok(reachable.has(row.route), row.route);
    for (const width of [390, 1280]) {
      const sample = row.viewports.find(view => view.width === width);
      assert.equal(sample?.homeClick, true, row.route + " at " + width);
      assert.equal(sample.applicationError, false);
    }
  }
});

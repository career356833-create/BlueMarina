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

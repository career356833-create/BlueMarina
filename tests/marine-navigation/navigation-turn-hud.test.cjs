const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
function loadTs(file) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require });
  return module.exports;
}

const guidance = loadTs(path.join(root, "src/lib/marine-navigation/turn-guidance.ts"));

test("turn HUD describes port starboard and aligned headings", () => {
  assert.deepEqual({ ...guidance.getTurnGuidance(-18) }, { direction: "port", angleDegrees: 18, label: "좌현으로 18° 정렬" });
  assert.deepEqual({ ...guidance.getTurnGuidance(12.4) }, { direction: "starboard", angleDegrees: 12, label: "우현으로 12° 정렬" });
  assert.deepEqual({ ...guidance.getTurnGuidance(4.9) }, { direction: "aligned", angleDegrees: 5, label: "침로 유지" });
});

test("marine navigation mounts a translucent persistent map HUD with an independent toggle", () => {
  const navigation = fs.readFileSync(path.join(root, "src/components/boat/navigation/MarineNavigation.tsx"), "utf8");
  const hud = fs.readFileSync(path.join(root, "src/components/boat/navigation/NavigationTurnHUD.tsx"), "utf8");
  assert.match(navigation, /hudVisibilityStorage/);
  assert.match(navigation, /aria-pressed=\{hudVisible\}/);
  assert.match(navigation, /aria-expanded=\{mobileLayersOpen\}/);
  assert.match(navigation, /hidden sm:block/);
  assert.match(navigation, /<NavigationTurnHUD navigation=\{navigation\} vessel=\{effectiveVessel\}/);
  assert.match(hud, /pointer-events-none/);
  assert.doesNotMatch(hud, /bg-\[/);
  assert.match(hud, /<svg viewBox="0 0 360 200"/);
  assert.match(hud, /DIRECT BEARING AID/);
  assert.match(hud, /circle cx="180" cy="108"/);
});

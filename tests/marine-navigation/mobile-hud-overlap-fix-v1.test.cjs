const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const navigation = read('src/components/boat/navigation/MarineNavigation.tsx');
const css = read('src/app/sea/navigation/navigation-map.css');

test('mobile map controls keep the MapLibre right rail while HUD and layers occupy the left', () => {
  assert.match(navigation, /absolute left-3 top-3 z-\[520\] flex gap-2/);
  assert.match(navigation, /onClick=\{toggleHud\}/);
  assert.match(navigation, /aria-controls="navigation-layer-drawer"/);
  assert.match(read('src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts'), /new NavigationControl\(\{ showCompass: true, showZoom: true \}\), "top-right"/);
});

test('expanded layer drawer clears the top controls and remains bounded on mobile', () => {
  assert.match(css, /#navigation-layer-drawer > div/);
  assert.match(css, /top: 4\.25rem/);
  assert.match(css, /max-height: calc\(100dvh - 12rem - env\(safe-area-inset-bottom\)\)/);
  assert.match(navigation, /aria-expanded=\{layersOpen\}/);
  assert.match(navigation, /해양 레이어 닫기/);
});

test('desktop leaves the map full width and keeps details on demand', () => {
  assert.match(navigation, /relative min-h-0 flex-1/);
  assert.match(navigation, /lg:w-\[min\(560px,60vw\)\]/);
  assert.match(navigation, /hidden=\{!detailsOpen\}/);
});

test('HUD remains transparent to map input while toggles have accessible touch targets', () => {
  assert.match(read('src/components/boat/navigation/NavigationTurnHUD.tsx'), /pointer-events-none/);
  assert.match(navigation, /aria-pressed=\{hudVisible\}/);
  assert.match(navigation, /min-h-11/);
  assert.match(navigation, /focus-visible:outline-2/);
});

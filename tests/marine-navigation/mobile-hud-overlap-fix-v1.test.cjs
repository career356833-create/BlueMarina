const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/components/boat/navigation', file), 'utf8');
const navigation = read('MarineNavigation.tsx');
const hudButton = navigation.split('<button').find((part) => part.includes('onClick={toggleHud}')).split('</button>')[0];
const layerButton = navigation.split('<button').find((part) => part.includes('aria-expanded={mobileLayersOpen}')).split('</button>')[0];

test('mobile HUD and layer controls reserve the unchanged MapLibre right rail', () => {
  for (const control of [hudButton, layerButton]) {
    assert.ok(control.includes('right-[calc(3.5rem+env(safe-area-inset-right))]'));
    assert.ok(control.includes('env(safe-area-inset-top)'));
  }
  assert.ok(hudButton.includes('top-[max(0.75rem,env(safe-area-inset-top))]'));
  assert.ok(layerButton.includes('+3.25rem)'));
  assert.match(read('adapters/MapLibreNavigationProvider.ts'), /new NavigationControl\(\{ showCompass: true, showZoom: true \}\), "top-right"/);
});

test('expanded mobile layer panel also clears both button rows and map rail', () => {
  const panel = read('MarineLayerControl.tsx');
  assert.ok(panel.includes('right-[calc(3.5rem+env(safe-area-inset-right))]'));
  assert.ok(panel.includes('+6.75rem)'));
  assert.ok(panel.includes('calc(100%-4.25rem-env(safe-area-inset-right))'));
  assert.ok(navigation.includes('max-w-[calc(100%-10rem-env(safe-area-inset-right))]'));
});

test('desktop overrides preserve original placement and title width', () => {
  assert.ok(hudButton.includes('sm:right-3 sm:top-3'));
  assert.ok(layerButton.includes('sm:hidden'));
  assert.ok(read('MarineLayerControl.tsx').includes('sm:right-3 sm:top-14 sm:w-[min(292px,calc(100vw-24px))]'));
  assert.ok(navigation.includes('sm:max-w-[calc(100%-96px)]'));
});

test('HUD remains transparent to map input while toggles have accessible touch targets', () => {
  assert.match(read('NavigationTurnHUD.tsx'), /pointer-events-none/);
  for (const control of [hudButton, layerButton]) {
    assert.ok(control.includes('pointer-events-auto'));
    assert.ok(control.includes('aria-label='));
    assert.ok(control.includes('focus-visible:outline-2'));
  }
  assert.ok(hudButton.includes('min-h-11 min-w-11'));
  assert.ok(layerButton.includes('size-11'));
});

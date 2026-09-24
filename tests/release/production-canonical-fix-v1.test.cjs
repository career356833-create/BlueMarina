const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const origin = 'https://blue-marina.vercel.app';
const env = { NEXT_PUBLIC_SITE_URL: origin, VERCEL_ENV: 'production' };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const spots = JSON.parse(read('src/data/fishing-spots.json'));

// Execute real exported metadata while replacing UI imports (not rendered here).
function metadataModule(file, environment = env) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const req = (id) => {
    if (id === '@/lib/release/site-url') return metadataModule('src/lib/release/site-url.ts', environment);
    if (id === '@/data/fishing-spots') return { fishingSpots: spots };
    if (id === '@/lib/fishing-condition/fishing-spot-integration') return { findFishingSpot: id => spots.find(spot => spot.id === id) };
    if (id === 'next/navigation') return { notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); } };
    if (id === 'next/font/google') return { Inter: () => ({ className: 'test-font' }) };
    return {};
  };
  new Function('require', 'module', 'exports', 'process', code)(req, module, module.exports, { env: environment });
  return module.exports;
}
const routes = {
  '/': 'src/app/page.tsx',
  '/today-sea': 'src/app/today-sea/page.tsx',
  '/sea': 'src/app/sea/page.tsx',
  '/sea/navigation': 'src/app/sea/navigation/page.tsx',
  '/fishing-spots': 'src/app/fishing-spots/page.tsx',
  '/fishing-spots/conditions': 'src/app/fishing-spots/conditions/page.tsx',
  '/fish': 'src/app/fish/layout.tsx',
  '/charters': 'src/app/charters/page.tsx',
  '/market': 'src/app/market/page.tsx',
  '/community': 'src/app/community/page.tsx',
  '/license-guide': 'src/app/license-guide/page.tsx',
};
for (const [route, file] of Object.entries(routes)) {
  test(`real metadata export self-canonical: ${route}`, () => {
    assert.equal(metadataModule(file).metadata.alternates.canonical, origin + route);
    assert.equal(metadataModule(file, { ...env, VERCEL_ENV: 'preview' }).metadata.alternates, undefined);
  });
}
test('root layout keeps metadataBase without spreading home canonical to descendants', () => {
  const metadata = metadataModule('src/app/layout.tsx').metadata;
  assert.equal(metadata.metadataBase.origin, origin);
  assert.equal(metadata.alternates, undefined);
});
test('origin validation rejects malformed, local, insecure, path, credential and Preview inputs', () => {
  for (const value of ['', 'not-a-url', 'http://blue-marina.vercel.app', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://dev.localhost', `${origin}/sea`, `${origin}?x=1`, `${origin}#x`, 'https://user:pass@blue-marina.vercel.app', 'https://blue-marina.vercel.app:3000', 'https://blue-marina-btoin4yw9-chiweon.vercel.app', 'https://blue-marina-git-main-chiweon.vercel.app']) {
    assert.equal(metadataModule('src/lib/release/site-url.ts', { NEXT_PUBLIC_SITE_URL: value }).getPublicSiteUrl(), null, value);
  }
  assert.equal(metadataModule('src/lib/release/site-url.ts', { NEXT_PUBLIC_SITE_URL: `${origin}/` }).getPublicSiteUrl().href, `${origin}/`);
});
test('canonical helper rejects external or query-bearing paths', () => {
  const helper = metadataModule('src/lib/release/site-url.ts');
  for (const value of ['https://elsewhere.example', '//elsewhere.example', '/\\elsewhere.example', '/sea?x=1', '/sea#map']) assert.deepEqual(helper.canonicalMetadata(value), {});
});
for (const id of ['boat-1', 'boat-128', 'boat-60']) {
  test(`dynamic metadata for actual normal/held spot ${id}`, async () => {
    assert.ok(spots.some(spot => spot.id === id));
    const result = await metadataModule('src/app/fishing-spots/[id]/page.tsx').generateMetadata({ params: Promise.resolve({ id }) });
    assert.equal(result.alternates.canonical, `${origin}/fishing-spots/${id}`);
  });
}
test('invalid spot has no canonical and preserves noindex with either fallback contract', async () => {
  const outcome = await metadataModule('src/app/fishing-spots/[id]/page.tsx').generateMetadata({ params: Promise.resolve({ id: 'not-a-real-spot' }) })
    .then(metadata => ({ metadata }), error => ({ error }));
  if (outcome.error) assert.match(outcome.error.message, /NEXT_HTTP_ERROR_FALLBACK;404/);
  else {
    assert.equal(outcome.metadata.alternates, undefined);
    assert.deepEqual(outcome.metadata.robots, { index: false, follow: false });
  }
  assert.deepEqual(metadataModule('src/app/not-found.tsx').metadata.robots, { index: false, follow: false });
});
test('private and write metadata retain noindex and inherit no canonical from root', () => {
  for (const file of ['account/layout.tsx', 'charters/admin/layout.tsx', 'market/admin/layout.tsx', 'charters/onboarding/page.tsx', 'market/new/page.tsx', 'community/new/page.tsx', 'reservations/page.tsx']) {
    const metadata = metadataModule(`src/app/${file}`).metadata;
    assert.equal(metadata.robots.index, false, file);
    assert.equal(metadata.alternates, undefined, file);
  }
});
test('production sitemap and robots retain public URLs and private exclusions', () => {
  const urls = metadataModule('src/app/sitemap.ts').default().map(item => item.url);
  assert.equal(urls.length, 1424);
  assert.equal(new Set(urls).size, 1424);
  assert.equal(urls.filter(url => /\/fishing-spots\/(boat|rock)-/.test(url)).length, 1405);
  for (const url of urls) assert.equal(new URL(url).origin, origin);
  assert.deepEqual(metadataModule('src/app/sitemap.ts', { ...env, VERCEL_ENV: 'preview' }).default(), []);
  const robots = metadataModule('src/app/robots.ts').default();
  assert.ok(robots.rules[0].allow.includes('/'));
  for (const route of ['/api/', '/account/', '/market/admin/', '/charters/admin/', '/market/new', '/community/new', '/charters/onboarding', '/reservations']) assert.ok(robots.rules[0].disallow.includes(route));
});

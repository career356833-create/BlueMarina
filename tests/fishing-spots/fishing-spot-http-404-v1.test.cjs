const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const spots = require('../../src/data/fishing-spots.json');
const cache = new Map();
function load(file) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const req = (id) => {
    if (id === 'next/navigation') return { notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); } };
    if (id === 'next/link') return { __esModule: true, default: 'a' };
    if (id.startsWith('@/components/')) return new Proxy({}, { get: (_, name) => name });
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(file), id);
      return load([base, `${base}.ts`, `${base}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile()));
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', 'process', output)(req, module, module.exports, { env: { NEXT_PUBLIC_SITE_URL: 'https://blue-marina.vercel.app', VERCEL_ENV: 'production' } });
  return module.exports;
}
const page = load(path.join(root, 'src/app/fishing-spots/[id]/page.tsx'));
const props = id => ({ params: Promise.resolve({ id }) });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' && tree.props ? [tree, ...nodes(tree.props.children)] : [];

test('static route policy contains exactly all 1405 canonical IDs with no dynamic fallback', () => {
  assert.equal(page.dynamicParams, false);
  const ids = page.generateStaticParams().map(p => p.id);
  assert.equal(ids.length, 1405);
  assert.equal(new Set(ids).size, 1405);
  assert.deepEqual(ids, spots.map(s => s.id));
});

test('every known spot retains source-backed self canonical metadata', async () => {
  for (const spot of spots) {
    const metadata = await page.generateMetadata(props(spot.id));
    assert.equal(metadata.title, spot.name);
    assert.equal(metadata.alternates.canonical, `https://blue-marina.vercel.app/fishing-spots/${spot.id}`);
  }
});

test('invalid and already-decoded malformed IDs consistently notFound in page and metadata', async () => {
  for (const id of ['not-a-real-spot', 'boat-999999', '', ' ', '%', '%62oat-1', 'boat-1/extra', '../boat-1']) {
    await assert.rejects(page.generateMetadata(props(id)), /NEXT_HTTP_ERROR_FALLBACK;404/);
    await assert.rejects(page.default(props(id)), /NEXT_HTTP_ERROR_FALLBACK;404/);
  }
});

test('normal warning and blocked detail preserve journey CTAs and safety holds', async () => {
  for (const id of ['boat-1', 'boat-128', 'boat-60']) {
    const all = nodes(await page.default(props(id)));
    const links = all.filter(n => n.type === 'a').map(n => n.props.href);
    const conditions = links.filter(h => h.startsWith('/fishing-spots/conditions?'));
    assert.ok(conditions.length > 0);
    assert.ok(conditions.every(h => new URL(h, 'https://example.test').searchParams.get('spotId') === id));
    assert.equal(links.some(h => h.startsWith('/sea?')), id !== 'boat-60');
    assert.equal(links.some(h => h.startsWith('/sea/navigation?')), id === 'boat-1');
    assert.equal(all.some(n => n.props.id === 'navigation-hold-reason'), id !== 'boat-1');
    assert.equal(all.some(n => n.props.id === 'map-hold-reason'), id === 'boat-60');
  }
});

test('not-found metadata remains noindex without a canonical fallback', () => {
  const missing = load(path.join(root, 'src/app/not-found.tsx'));
  assert.deepEqual(missing.metadata.robots, { index: false, follow: false });
  assert.equal(missing.metadata.alternates, undefined);
});

test('sitemap contains 1424 real routes and excludes invalid IDs', () => {
  const entries = load(path.join(root, 'src/app/sitemap.ts')).default();
  assert.equal(entries.length, 1424);
  assert.equal(entries.filter(e => e.url.includes('/fishing-spots/') && !e.url.endsWith('/conditions')).length, 1405);
  assert.ok(!entries.some(e => e.url.includes('not-a-real-spot')));
});

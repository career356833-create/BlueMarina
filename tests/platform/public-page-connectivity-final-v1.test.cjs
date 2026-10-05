const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function load(file, mocks = {}) {
  const output = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', output)(module, module.exports, name => mocks[name] ?? require(name));
  return module.exports;
}
const links = load('src/lib/account/content-links.ts');
const home = load('src/lib/home/personalization.ts');
const auth = load('src/lib/account/auth-return.ts');

test('content links reject external, encoded authority, private and malformed paths', () => {
  for (const href of ['https://outside.example/a', '//outside.example', '/\\outside.example', '/%2Foutside.example', '/%5coutside.example', '/api/account', '/admin/operations', '/%61pi/account', '/fish/../../api/account', '/bad%zz', 'javascript:alert(1)']) assert.equal(links.safeContentHref(href), null, href);
  assert.equal(links.safeContentHref('/fishing-spots/rock-151?source=saved'), '/fishing-spots/rock-151?source=saved');
});
test('saved spot opens exactly its own entity and keeps context', () => {
  const item = { entityType: 'FISHING_SPOT', entityId: 'rock-151', href: '/fishing-spots/rock-151?source=saved' };
  assert.equal(links.savedContentTarget(item).href, item.href);
  assert.equal(links.savedContentTarget({ ...item, href: '/fishing-spots/rock-152' }).href, '/fishing-spots');
});
test('saved fish uses the existing Conditions identity route without inventing fish detail', () => {
  const item = { entityType: 'FISH', entityId: 'BM-SPECIES-000751', href: '/fishing-spots/conditions?speciesId=BM-SPECIES-000751&spotId=rock-151' };
  assert.equal(links.savedContentTarget(item).href, item.href);
  for (const href of ['/fish/BM-SPECIES-000751', '/fishing-spots/conditions?speciesId=OTHER', null]) {
    const result = links.savedContentTarget({ ...item, href });
    assert.equal(result.href, '/fish'); assert.ok(result.notice);
  }
});
test('dead or mismatched business saved links return to the correct parent', () => {
  for (const [entityType, parent] of [['CHARTER', '/charters'], ['MARKET_LISTING', '/market']]) {
    const result = links.savedContentTarget({ entityType, entityId: 'one', href: '/community/one' });
    assert.equal(result.href, parent); assert.ok(result.notice);
    // Publication is checked by the existing detail page, not assumed by this routing helper.
    assert.equal(links.savedContentTarget({ entityType, entityId: 'one', href: `${parent}/one` }).notice, null);
  }
});
test('nonpublic market activity goes to owner management rather than public detail', () => {
  assert.equal(links.marketActivityHref('one', 'ACTIVE'), '/market/one');
  for (const status of ['DRAFT', 'SUBMITTED', 'REJECTED', 'HIDDEN', 'SOLD']) assert.equal(links.marketActivityHref('one', status), '/market/new#listing-one');
});
test('home retains real Conditions fish bookmarks and filters obsolete or mismatched fish URLs', () => {
  const item = { id: 'one', entityType: 'FISH', entityId: 'BM-SPECIES-000751', href: '/fishing-spots/conditions?speciesId=BM-SPECIES-000751', label: '감성돔', savedAt: '2026-10-05T00:00:00Z', viewedAt: '2026-10-05T00:00:00Z' };
  assert.equal(home.getSavedHighlights([item])[0].items[0].href, item.href);
  assert.equal(home.getRecentHighlights([item])[0].href, item.href);
  for (const href of ['/fish/obsolete', '/fishing-spots/conditions?speciesId=OTHER', '//outside.example']) {
    assert.equal(home.getSavedHighlights([{ ...item, href }]).length, 0);
    assert.equal(home.getRecentHighlights([{ ...item, href }]).length, 0);
  }
});
test('auth returns to the selected private page and rejects external redirect attempts', () => {
  for (const href of ['/account/saved', '/account/activity', '/market/new', '/community/new', '/charters/onboarding']) assert.equal(auth.safeAuthReturnTo(href), href);
  for (const href of ['https://outside.example', '//outside.example', '/\\outside.example', '/account/../admin/operations']) assert.equal(auth.safeAuthReturnTo(href), '/account');
  assert.match(read('src/app/account/account-client.tsx'), /encodeURIComponent\(section === "overview"/);
});
function learningMarkup(license) {
  const { LearningNavigation } = load('src/components/platform/LearningNavigation.tsx', {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    'next/navigation': { usePathname: () => '/progress', useSearchParams: () => new URLSearchParams({ license }) },
  });
  return renderToStaticMarkup(React.createElement(LearningNavigation));
}
test('all eight learning actions retain yacht context and the active page', () => {
  const html = learningMarkup('yacht');
  for (const route of ['license-guide', 'study', 'theory', 'exam', 'wrong', 'progress', 'analysis', 'practice']) assert.ok(html.includes(`href="/${route}?license=yacht"`));
  assert.match(html, /href="\/progress\?license=yacht" aria-current="page"/);
});
test('invalid learning context falls back to the existing general license', () => {
  const html = learningMarkup('outside');
  assert.equal((html.match(/\?license=general/g) ?? []).length, 8);
  assert.doesNotMatch(html, /license=outside/);
});
test('fish handoff carries a name query, never invents a canonical identity', () => {
  const fish = read('src/app/fish/page.tsx');
  assert.match(fish, /encodeURIComponent\(item\.name\)/);
  assert.match(fish, /source=fish#spot-search/);
  assert.match(read('src/app/fishing-spots/fishing-spots-client.tsx'), /useState\(initialQuery\)/);
  assert.match(read('src/app/fishing-spots/page.tsx'), /slice\(0, 80\)/);
});
test('exam result next actions preserve license context without changing scoring', () => {
  const source = read('src/app/exam/page.tsx');
  for (const route of ['wrong', 'progress', 'analysis']) assert.ok(source.includes(`"/${route}"`));
  assert.ok(source.includes("`${href}?license=${licenseType}`"));
  assert.match(source, /scoreExam\(/);
});
test('public graph covers actual page templates and distinguishes gated templates', () => {
  const report = JSON.parse(read('reports/platform/public-page-connectivity-final-v1.json'));
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : e.name === 'page.tsx' ? [path.relative(path.join(root,'src/app'),dir).split(path.sep).join('/')] : []);
  const actual = walk(path.join(root,'src/app')).map(p => p ? `/${p}` : '/').sort();
  assert.deepEqual([...report.graph.map(r => r.route), ...report.excludedRoutes].sort(), actual);
  assert.equal(report.graph.length, 47);
  assert.equal(new Set(report.graph.map(r => r.route)).size, 47);
});
test('active public graph has no isolated page and unavailable business detail remains explicit', () => {
  const report = JSON.parse(read('reports/platform/public-page-connectivity-final-v1.json'));
  for (const row of report.graph) {
    assert.ok(row.backPath || row.outbound.length, row.route);
    assert.notEqual(row.after, 'ISOLATED', row.route);
    if (row.after === 'CONNECTED') assert.ok(row.inbound.length, row.route);
    else { assert.equal(row.after, 'WEAKLY_CONNECTED'); assert.ok(row.limitation); }
  }
  const reached = new Set(['/']);
  for (let changed = true; changed;) { changed = false; for (const row of report.graph.filter(r => reached.has(r.route))) for (const edge of row.outbound) if (!reached.has(edge.target)) { reached.add(edge.target); changed = true; } }
  for (const row of report.graph.filter(r => r.after === 'CONNECTED')) assert.ok(reached.has(row.route), `unreachable from Home: ${row.route}`);
  assert.deepEqual(report.graph.filter(r => r.after === 'WEAKLY_CONNECTED').map(r => r.route).sort(), ['/charters/[id]', '/community/[id]', '/market/[id]']);
});
test('informational links correspond to real source CTAs and no fake records are introduced', () => {
  const report = JSON.parse(read('reports/platform/public-page-connectivity-final-v1.json'));
  for (const proof of report.newLinkEvidence) assert.ok(read(proof.file).includes(proof.snippet), `${proof.file}: ${proof.snippet}`);
  for (const route of ['charters','market','community']) assert.match(read(`src/app/${route}/[id]/not-found.tsx`), /DetailUnavailable/);
  assert.equal(report.invariants.newDataRecords, 0);
  assert.equal(report.invariants.navigationEngineChanges, 0);
});

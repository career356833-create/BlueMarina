const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
function load(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(require, module, module.exports);
  return module.exports;
}
const core = load('src/lib/marine-navigation/reliability-v3.ts');
const now = Date.parse('2026-09-29T09:00:00.000Z');
function aidPage(categoryId, valid = true) {
  const item = { id: `khoa-${categoryId}`, sourceRecordId: categoryId, koreanName: categoryId, englishName: null, aidCategoryCode: categoryId, latitude: 35, longitude: 129, source: '국립해양조사원(KHOA)' };
  return { completeXml: valid, items: [item], rawItemCount: 1, pageNo: 1, numOfRows: 25, totalCount: 1, quality: { duplicateIds: [], invalidRecordCount: 0, invalidCoordinateCount: 0, missingNameCount: 0 } };
}
function freshAid(categoryId) { return core.buildAidSnapshot(categoryId, [aidPage(categoryId)], new Date(now).toISOString(), 25); }
function listStore(items, fetchedAt = new Date(now).toISOString()) {
  return { version: 3, snapshot: { source: '국립해양조사원(KHOA)', fetchedAt, itemCount: items.length, documentNumbers: [...new Set(items.map((item) => item.documentNumber))], payloadChecksum: core.checksum(items), items }, lastAttemptAt: fetchedAt, lastSuccessAt: fetchedAt, lastErrorClass: null };
}

test('incomplete or invalid aid pages can never become VALID snapshots', () => {
  assert.throws(() => core.buildAidSnapshot('A01', [aidPage('A01', false)], new Date(now).toISOString(), 25), /INVALID_CATEGORY_PAGE/);
  const invalidCoordinate = aidPage('A01');
  invalidCoordinate.items[0].latitude = 100;
  assert.throws(() => core.buildAidSnapshot('A01', [invalidCoordinate], new Date(now).toISOString(), 25), /INVALID_CATEGORY_PAGE/);
});

test('failed refresh preserves previously validated category and resume skips it', () => {
  const store = { version: 3, categories: {} };
  core.recordAidAttempt(store, 'A07', new Date(now).toISOString(), freshAid('A07'), null);
  assert.equal(core.shouldCollectAid(store, 'A07'), false);
  assert.equal(core.shouldCollectAid(store, 'A07', true), true);
  const before = store.categories.A07.snapshot.payloadChecksum;
  core.recordAidAttempt(store, 'A07', new Date(now + 1000).toISOString(), null, 'UPSTREAM_HTTP_503');
  assert.equal(store.categories.A07.snapshot.payloadChecksum, before);
  assert.equal(store.categories.A07.lastErrorClass, 'UPSTREAM_HTTP_503');
  assert.equal(store.categories.A07.attemptCount, 2);
});

test('all nine aid snapshots are needed for AVAILABLE, missing is PARTIAL, expired is STALE', () => {
  const store = { version: 3, categories: {} };
  for (const categoryId of core.AID_CATEGORY_IDS) core.recordAidAttempt(store, categoryId, new Date(now).toISOString(), freshAid(categoryId), null);
  assert.equal(core.evaluateAids(store, now).state, 'AVAILABLE');
  assert.equal(core.evaluateAids(store, now).complete, 9);
  assert.equal(core.evaluateAids(store, now + core.AID_REVIEW_INTERVAL_MS + 1).state, 'STALE');
  delete store.categories.A09;
  assert.equal(core.evaluateAids(store, now).state, 'PARTIAL');
  assert.equal(core.evaluateAids({ version: 3, categories: {} }, now).state, 'UNAVAILABLE');
});

test('a failed warning-list refresh never becomes an empty or current-warning claim', () => {
  const store = listStore([{ documentNumber: '26-327' }]);
  store.lastAttemptAt = new Date(now + 1000).toISOString();
  store.lastErrorClass = 'UPSTREAM_HTTP_503';
  const result = core.evaluateWarnings(store, { version: 3, documents: {} }, now + 2000);
  assert.equal(result.state, 'CURRENT_STATUS_UNAVAILABLE');
  assert.deepEqual(result.listItems, []);
  assert.equal(result.freshness, 'historical');
});

test('fresh zero warning list is AVAILABLE_EMPTY, incomplete details are PARTIAL', () => {
  const emptyPage = { totalCount: 0, pageNo: 1, numOfRows: 100, items: [] };
  assert.equal(core.validateWarningPage(emptyPage, false, 0, 1, 100), false);
  assert.equal(core.validateWarningPage(emptyPage, true, 0, 1, 100), true);
  assert.equal(core.validateWarningPage({ ...emptyPage, pageNo: 0 }, true, 0, 1, 100), false);
  assert.equal(core.evaluateWarnings(listStore([]), { version: 3, documents: {} }, now + 1000).state, 'AVAILABLE_EMPTY');
  const store = listStore([{ documentNumber: '26-327' }]);
  const partial = core.evaluateWarnings(store, { version: 3, documents: {} }, now + 1000);
  assert.equal(partial.state, 'PARTIAL');
  assert.deepEqual(partial.failedDocumentNumbers, ['26-327']);
  const emptyDetail = { documentNumber: '26-327', fetchedAt: new Date(now + 500).toISOString(), itemCount: 0, items: [], payloadChecksum: core.checksum([]) };
  assert.equal(core.evaluateWarnings(store, { version: 3, documents: { '26-327': { snapshot: emptyDetail } } }, now + 1000).state, 'PARTIAL');
  const detail = { documentNumber: '26-327', fetchedAt: new Date(now + 500).toISOString(), itemCount: 1, items: [{ documentNumber: '26-327' }] };
  detail.payloadChecksum = core.checksum(detail.items);
  const complete = core.evaluateWarnings(store, { version: 3, documents: { '26-327': { snapshot: detail } } }, now + 1000);
  assert.equal(complete.state, 'AVAILABLE');
  assert.equal(core.evaluateWarnings(store, { version: 3, documents: {} }, now + core.WARNING_CURRENT_WINDOW_MS + 1).state, 'CURRENT_STATUS_UNAVAILABLE');
});

test('Navigation reads packaged snapshots while live endpoints remain diagnostic', () => {
  const aidRoute = fs.readFileSync(path.join(root, 'src/app/api/sea-info/navigation-aids/snapshot/route.ts'), 'utf8');
  const warningRoute = fs.readFileSync(path.join(root, 'src/app/api/sea-info/navigation-warnings/snapshot/route.ts'), 'utf8');
  const aids = fs.readFileSync(path.join(root, 'src/lib/marine-navigation/adapters/khoa-navigation-aids.ts'), 'utf8');
  const warnings = fs.readFileSync(path.join(root, 'src/lib/marine-navigation/adapters/khoa-navigation-warnings.ts'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx'), 'utf8');
  const collector = fs.readFileSync(path.join(root, 'tools/marine-navigation/collect-reliability-v3.cjs'), 'utf8');
  assert.match(aids, /navigation-aids\/snapshot/);
  assert.match(warnings, /navigation-warnings\/snapshot/);
  assert.doesNotMatch(aidRoute + warningRoute, /fetch\(/);
  assert.match(collector, /atomicWrite/);
  assert.match(collector, /shouldCollectAid/);
  assert.match(map, /window\.setInterval\(\(\) => \{ void refresh\(\); \}, 60_000\)/);
  assert.match(map, /removeMarineLayer\(KHOA_NAVIGATION_WARNINGS_LAYER_ID\)/);
  assert.doesNotMatch(collector, /console\.log\([^\n]*serviceKey|console\.log\([^\n]*apiKey/);
});

test('V3 report reconciles each committed local snapshot without changing source data', () => {
  const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/platform/navigation-marine-reliability-layer-v3.json'), 'utf8'));
  const aids = JSON.parse(fs.readFileSync(path.join(root, 'src/data/marine-navigation/v3/navigation-aids.json'), 'utf8'));
  const warningList = JSON.parse(fs.readFileSync(path.join(root, 'src/data/marine-navigation/v3/navigation-warning-list.json'), 'utf8'));
  const warningDetails = JSON.parse(fs.readFileSync(path.join(root, 'src/data/marine-navigation/v3/navigation-warning-details.json'), 'utf8'));
  assert.equal(report.navigationAids.validCategories, core.evaluateAids(aids, Date.parse('2026-09-29T09:56:00Z')).present);
  assert.equal(report.navigationAids.itemCount, report.navigationAids.categories.reduce((count, category) => count + category.itemCount, 0));
  for (const category of report.navigationAids.categories) {
    const actual = aids.categories[category.categoryId];
    assert.equal(category.payloadChecksum, actual.snapshot?.payloadChecksum ?? null);
    assert.equal(category.lastSuccessAt, actual.lastSuccessAt);
    assert.equal(category.itemCount, actual.snapshot?.itemCount ?? 0);
  }
  assert.equal(report.navigationWarnings.listChecksum, warningList.snapshot.payloadChecksum);
  assert.equal(report.navigationWarnings.listDocuments, warningList.snapshot.documentNumbers.length);
  assert.equal(report.navigationWarnings.detailSuccess, Object.values(warningDetails.documents).filter((entry) => core.validWarningDetail(entry.snapshot, entry.snapshot?.documentNumber)).length);
  assert.equal(report.navigationWarnings.detailFailure, report.navigationWarnings.listDocuments - report.navigationWarnings.detailSuccess);
});

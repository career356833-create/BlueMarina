const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const report = json('reports/platform/blue-marina-v1-master-status.json');
const byId = (rows, id) => rows.find((row) => row.id === id);

test('every required surface is classified exactly once with a real route', () => {
  const expected = ['HOME', 'TODAY_SEA', 'SEA_MAP', 'NAVIGATION', 'FISHING_SPOTS', 'CONDITIONS', 'FISH', 'CHARTER', 'MARKET', 'COMMUNITY', 'GUIDE', 'ACCOUNT', 'OPERATIONS'];
  assert.deepEqual(report.featureMatrix.map((item) => item.surface).sort(), expected.sort());
  for (const item of report.featureMatrix) {
    assert.ok(report.classificationEnum.includes(item.classification), item.surface);
    assert.ok(item.routes.length > 0, item.surface);
    for (const route of item.routes) {
      const page = path.join(root, 'src/app', route.slice(1), 'page.tsx');
      if (!route.startsWith('/api/')) assert.ok(fs.existsSync(page), route);
    }
  }
});

test('committed data counts reconcile without calling empty products active', () => {
  assert.equal(json('src/data/fishing-spots.json').length, byId(report.dataMatrix, 'FISHING_SPOTS').count);
  assert.equal(json('data/fish-canonical/bulk/v1/canonical-inventory-v1.json').species.length, byId(report.dataMatrix, 'FISH_CANONICAL').count);
  const profiles = json('data/fishing-condition/profiles/v1/batch-a-19.json').profiles.length + json('data/fishing-condition/profiles/v1/batch-b-19.json').profiles.length;
  assert.equal(profiles, byId(report.dataMatrix, 'CONDITION_PROFILES').count);
  assert.equal(byId(report.dataMatrix, 'FISH_PUBLIC_GUIDE').count, json('reports/release/production-informational-release-v1.json').fishing.fishPublicLocalItems);
  for (const id of ['CHARTER_PUBLIC_OFFERS', 'MARKET_PUBLIC_LISTINGS', 'COMMUNITY_PUBLIC_POSTS']) assert.equal(byId(report.dataMatrix, id).count, 0);
  for (const surface of ['CHARTER', 'MARKET', 'COMMUNITY']) assert.equal(report.featureMatrix.find((item) => item.surface === surface).classification, 'CODE_READY_NOT_ACTIVATED');
});

test('source states distinguish live RISA, held families and historical map evidence', () => {
  assert.equal(report.sourceMatrix.length, 9);
  assert.equal(byId(report.sourceMatrix, 'RISA').productionState, 'ACTIVE');
  assert.equal(byId(report.dataMatrix, 'RISA_STATIONS').evidence.startsWith('LIVE_HTTP'), true);
  for (const id of ['FEMO', 'KMA_OBSERVATION', 'KMA_WARNING', 'KMA_FORECAST', 'KHOA_TIDE', 'KHOA_NAV_WARNING']) {
    assert.equal(byId(report.sourceMatrix, id).productionState, 'DISABLED', id);
    assert.equal(byId(report.sourceMatrix, id).programGate, 'HOLD', id);
  }
  for (const id of ['KAKAO_MAPS', 'MAPLIBRE_BASE_MAP']) assert.equal(byId(report.sourceMatrix, id).evidenceKind, 'HISTORICAL_AUDIT');
  assert.equal(report.previewReadySubfeatures.length, 2);
  assert.ok(report.previewReadySubfeatures.every((item) => item.productionGate === 'HOLD'));
});

test('backend readiness never equates a migration file to remote activation', () => {
  assert.equal(report.backendMatrix.length, 5);
  for (const [id, file] of [
    ['CHARTER', 'supabase/migrations/20260920103020_charter_supply_intake_backend_v1.sql'],
    ['MARKET', 'supabase/migrations/20260920115127_market_supply_backend_v1.sql'],
    ['ACCOUNT', 'supabase/migrations/20260923100000_blue_marina_account_v1.sql'],
  ]) {
    assert.ok(fs.existsSync(path.join(root, file)));
    const row = byId(report.backendMatrix, id);
    assert.equal(row.migrationExists, true);
    assert.match(row.remoteApply, /UNVERIFIED/);
    assert.equal(row.productionActivation, false);
    assert.equal(row.runtimeE2E, 'BLOCKED');
  }
  for (const id of ['OPERATIONS', 'COMMUNITY']) assert.equal(byId(report.backendMatrix, id).migrationExists, false);
});

test('release and QA claims retain their observed limits', () => {
  assert.equal(report.releaseSecurity.invalidSpotHttpStatus, 404);
  assert.equal(report.releaseSecurity.sitemapUrlCount, 1424);
  assert.equal(report.releaseSecurity.unsafeEvalAllowed, false);
  assert.equal(report.releaseSecurity.operationsUnauthenticatedHttpStatus, 404);
  assert.equal(report.qa.realDeviceGpsPwa, 'BLOCKED_NO_DEVICE');
  assert.equal(report.qa.authenticatedOperationsUi, 'BLOCKED_NO_AUTH_CONFIG_OR_OPERATOR');
  assert.equal(report.production.deploymentGitSha, null);
  assert.equal(report.production.environmentValuesRecorded, 0);
});

test('roadmap is value-ranked, bounded, and selects one primary priority', () => {
  assert.equal(report.decision, 'V1_PRODUCTION_CORE_READY_WITH_LIMITATIONS');
  assert.ok(report.roadmapIds.length > 0 && report.roadmapIds.length <= 5);
  assert.equal(new Set(report.roadmapIds).size, report.roadmapIds.length);
  assert.equal(report.nextPrimaryPriority, report.roadmapIds[0]);
  assert.equal(report.backlog.P0.length, 0);
  for (const priority of ['P0', 'P1', 'P2', 'P3', 'INFO']) assert.ok(Array.isArray(report.backlog[priority]));
  assert.match(read('docs/BLUE_MARINA_V1_NEXT_ROADMAP.md'), /Verified Charter supply and inquiry launch/);
});

test('audit artifacts make no fake deployment, activation or data-write claim', () => {
  assert.deepEqual(Object.values(report.invariants), [0, 0, 0, 0, 0]);
  assert.equal(report.git.staged, 0);
  assert.equal(report.git.commit, 0);
  assert.equal(report.git.push, 0);
  assert.equal(report.productValue.commercialTransactionsNow, 0);
  assert.match(read('docs/BLUE_MARINA_V1_MASTER_STATUS.md'), /remote database contents were inspected|remote database contents were not inspected/i);
});

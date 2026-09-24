const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/release/production-informational-release-v1.json'), 'utf8'));
const origin = 'https://blue-marina.vercel.app';
const http = route => report.http.find(row => row.path === route);
test('release is traceable to the exact pushed commit and remote Git build', () => {
  assert.match(report.phaseA.releaseHead, /^[a-f0-9]{40}$/);
  assert.equal(report.deployment.sha, report.phaseA.releaseHead);
  assert.equal(report.deployment.status, 'READY');
  assert.equal(report.phaseA.unrelatedIncluded, 0);
  assert.match(report.deployment.method, /remote build of exact commit/);
});
test('production HTTP evidence has self canonicals and no public noindex', () => {
  for (const route of ['/', '/today-sea', '/sea', '/sea/navigation', '/fishing-spots', '/fishing-spots/conditions', '/fish', '/charters', '/market', '/community', '/license-guide', '/fishing-spots/boat-1', '/fishing-spots/boat-128', '/fishing-spots/boat-60']) {
    const row = http(route);
    assert.equal(row.status, 200, route);
    assert.equal(row.canonical.length, 1, route);
    assert.equal(new URL(row.canonical[0]).href, new URL(route, origin).href, route);
    assert.equal(row.robots.some(value => value.includes('noindex')), false, route);
  }
});
test('private and invalid route evidence cannot inherit public canonical', () => {
  for (const route of ['/account', '/charters/onboarding', '/charters/admin/submissions', '/market/new', '/market/admin/listings', '/community/new', '/reservations', '/fishing-spots/not-a-real-spot']) {
    assert.ok(http(route).robots.some(value => value.includes('noindex')), route);
    assert.deepEqual(http(route).canonical, [], route);
  }
});
test('production sitemap and public robots evidence match informational scope', () => {
  assert.deepEqual(http('/sitemap.xml').sitemap, { total: 1424, unique: 1424, dynamic: 1405, allProduction: true });
  assert.match(http('/robots.txt').body, /Allow: \/\n/);
  for (const route of ['/account/', '/api/', '/market/new', '/community/new']) assert.ok(http('/robots.txt').body.includes(`Disallow: ${route}`));
});
test('SDK and responsive checks distinguish success from explicit limitations', () => {
  assert.ok(report.kakao.sdkHttpStatuses.length >= 1);
  assert.ok(report.kakao.sdkHttpStatuses.every(status => status === 200));
  assert.equal(report.kakao.windowKakaoMaps, true);
  for (const view of report.browser) {
    assert.equal(view.routes.length, 10);
    assert.ok(view.routes.every(row => !row.overflow));
    assert.deepEqual(view.pageErrors, []);
  }
  assert.equal(report.navigation.physicalPinch, 'NOT_TESTED');
  assert.equal(report.fishing.profileContextLive.startsWith('NOT_VERIFIED'), true);
  assert.ok(report.limitations.some(item => item.id === 'NAVIGATION_MOBILE_CONTROLS'));
});
test('informational release leaves transactional boundaries closed', () => {
  assert.equal(http('/api/account').status, 503);
  assert.match(http('/api/account').response, /ACCOUNT_BACKEND_DISABLED/);
  assert.equal(http('/api/charters/supply/submissions').status, 401);
  assert.deepEqual(JSON.parse(http('/api/market/listings').response).listings, []);
  assert.ok(Object.values(report.invariants).every(value => value === 0));
  assert.ok(Object.values(report.env.backendFlags).every(value => ['OFF_DEFAULT', 'LOCAL_ONLY'].includes(value)));
});
test('security and PWA checks record deployed evidence without claiming physical-device coverage', () => {
  assert.equal(http('/').headers['x-content-type-options'], 'nosniff');
  assert.equal(http('/').headers['x-frame-options'], 'SAMEORIGIN');
  assert.ok(http('/').headers['strict-transport-security']);
  assert.match(http('/api/account').headers['x-robots-tag'], /noindex/);
  assert.equal(http('/manifest.json').manifest.start_url, '/');
  assert.equal(http('/manifest.json').manifest.scope, '/');
  assert.equal(report.pwa.registration.state, 'activated');
  assert.equal(report.pwa.physicalDeviceInstallUpdateOffline, 'NOT_VERIFIED');
});

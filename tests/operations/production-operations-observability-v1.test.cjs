const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const report = JSON.parse(read('reports/operations/production-operations-observability-v1.json'));
const modelExports = {};
vm.runInNewContext(ts.transpileModule(read('src/lib/operations/model.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: modelExports });
const server = read('src/lib/operations/server.ts');
const api = read('src/app/api/operations/health/route.ts');
const page = read('src/app/admin/operations/page.tsx');
const ui = read('src/app/admin/operations/operations-dashboard.tsx');

test('operations route is private, noindex, nofollow and absent from sitemap', () => {
  const layout = read('src/app/admin/operations/layout.tsx');
  const middleware = read('src/middleware.ts');
  assert.match(layout, /index: false, follow: false/);
  assert.match(middleware, /matcher: \["\/admin\/operations\/:path\*"\]/);
  assert.match(middleware, /status: 404/);
  assert.match(middleware, /X-Robots-Tag": "noindex, nofollow"/);
  assert.match(read('src/app/robots.ts'), /"\/admin\/"/);
  assert.doesNotMatch(read('src/app/sitemap.ts'), /\/admin\/operations/);
  assert.match(page, /notFound\(\)/);
  assert.match(api, /X-Robots-Tag/);
  assert.match(api, /private, no-store/);
});

test('both page and health API require verified Supabase Auth app_metadata role', () => {
  const middleware = read('src/middleware.ts');
  assert.match(middleware, /auth\.getUser\(\)/);
  assert.match(middleware, /canAccessAdminPath\(request\.nextUrl\.pathname, data\.user\.app_metadata\)/);
  assert.match(page, /auth\.getUser\(\)/);
  assert.match(page, /app_metadata\?\.operations_role !== "operations_admin"/);
  assert.match(server, /auth\.getUser\(token\)/);
  assert.match(server, /app_metadata\?\.operations_role !== "operations_admin"/);
  assert.doesNotMatch(page + server, /user_metadata|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(report.implementation.authState, /FAIL_CLOSED/);
});

test('health and source states never imply marine safety', () => {
  assert.equal(modelExports.sourceHealth('AVAILABLE'), 'HEALTHY');
  assert.equal(modelExports.sourceHealth('STALE'), 'DEGRADED');
  assert.equal(modelExports.sourceHealth('DISABLED'), 'DISABLED');
  assert.equal(modelExports.pageHealth(200), 'HEALTHY');
  assert.equal(modelExports.pageHealth(503), 'ERROR');
  assert.equal(modelExports.partialPageHealth('HEALTHY', ['AVAILABLE', 'ERROR']), 'DEGRADED');
  assert.equal(modelExports.partialPageHealth('HEALTHY', ['AVAILABLE', 'DISABLED']), 'DEGRADED');
  assert.equal(modelExports.partialPageHealth('ERROR', ['AVAILABLE']), 'ERROR');
  assert.equal(report.implementation.safetyScoring, 0);
});

test('all requested service and source families have explicit status records', () => {
  for (const name of ['Home', 'Sea', 'Navigation', 'Fishing Spots', 'Conditions', 'Today Sea']) assert.ok(server.includes(`"${name}"`), name);
  for (const name of ['Kakao Maps', 'MapLibre/base map', 'RISA', 'FEMO', 'KMA observation', 'KMA warning', 'KMA forecast', 'KHOA tide', 'KHOA navigation warning']) assert.ok(server.includes(`"${name}"`), name);
  assert.equal(report.productionReadOnlySample.services.length, 6);
});

test('feature flags are only Boolean status and cannot be changed from the dashboard', () => {
  for (const name of ['RISA', 'FEMO', 'KMA_OBSERVATION', 'KMA_WARNING', 'CHARTER_BACKEND', 'MARKET_BACKEND', 'ACCOUNT_BACKEND', 'IMAGE_UPLOAD']) assert.ok(server.includes(`${name}:`), name);
  assert.match(server, /process\.env\[name\] === "true"/);
  assert.doesNotMatch(ui + api, /fetch\([^\n]+method:\s*"(?:POST|PATCH|PUT|DELETE)"/);
  assert.equal(report.implementation.flagMutationControls, 0);
});

test('failure isolation and bounded refresh use existing caches without a daemon', () => {
  assert.match(server, /Promise\.allSettled/);
  assert.match(server, /getNifsRealtimeFishingEnvironment\(\)/);
  assert.match(server, /SNAPSHOT_MS = 60_000/);
  assert.match(server, /PAGE_TIMEOUT_MS = 4_000/);
  assert.match(ui, /수동 새로고침/);
  assert.doesNotMatch(ui, /setInterval/);
  assert.equal(report.implementation.automaticPolling, false);
});

test('secrets and mutations stay out of the health contract', () => {
  assert.match(api, /authorizeOperationsToken\(token\)/);
  assert.match(api, /getOperationsSnapshot\(\)/);
  assert.equal(report.implementation.secretValuesExposed, 0);
  assert.equal(report.implementation.deploymentControls, 0);
  assert.deepEqual(Object.values(report.mutations), [0, 0, 0, 0, 0, 0]);
  assert.doesNotMatch(ui + api, /service_role|deploy --prod|env add|unsafe-eval/i);
});

test('snapshot distinguishes live samples, historical release evidence and unknown browser rendering', () => {
  assert.equal(report.productionReadOnlySample.sources.RISA.httpStatus, 200);
  assert.equal(report.productionReadOnlySample.sources.KMA_OBSERVATION.code, 'SOURCE_DISABLED');
  assert.equal(report.productionReadOnlySample.sources.KAKAO_MAPS.status, 'UNKNOWN');
  assert.equal(report.productionReadOnlySample.deploymentSha, null);
  assert.match(server, /HISTORICAL_AUDIT/);
  assert.match(server, /does not prove canvas rendering/);
  assert.match(ui, /loadKakaoMaps/);
});

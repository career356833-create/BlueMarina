const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function loader(env = {}, mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const module = { exports: {} }; cache.set(file, module.exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    function req(id) {
      if (id in mocks) return mocks[id];
      if (id === 'server-only') return {};
      if (id === 'next/server') return { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: init.headers }) } };
      const target = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(file), id);
      return load(fs.existsSync(target) ? target : target + '.ts');
    }
    new Function('require', 'module', 'exports', 'process', 'fetch', code)(req, module, module.exports, { env }, () => { throw Error('Unexpected upstream fetch'); });
    cache.set(file, module.exports); return module.exports;
  }
  return relative => load(path.join(root, relative));
}
const load = loader();
const registry = load('src/lib/fishing-condition/profile-registry.ts').FISHING_CONDITION_PROFILE_REGISTRY;
const service = load('src/lib/fishing-condition/profile-read-model-server.ts');
const request = { speciesId: registry[0].speciesId, contexts: { month: 9 } };
const liveRequest = { ...request, environment: { sourceId: 'nifs-risa', stationId: 'explicit-user-selection', depthContext: 'SURFACE' } };
class SourceError extends Error { constructor(code) { super(code); this.code = code; } }
const routeWith = run => loader({}, { '@/lib/fishing-condition/read-model-server': { FishingConditionReadModelError: SourceError, runFishingConditionReadModel: run } })('src/app/api/fishing-condition/read-model/route.ts');
test('both live adapters throw SOURCE_DISABLED before any network access by default', async () => {
  await assert.rejects(load('src/lib/fishing-condition/nifs-realtime-fishing-server.ts').getNifsRealtimeFishingEnvironment(), { code: 'SOURCE_DISABLED' });
  await assert.rejects(load('src/lib/fishing-condition/nifs-fishery-environment-server.ts').getNifsFisheryEnvironment(), { code: 'SOURCE_DISABLED' });
});
test('all 38 profiles remain available without station inference or fabricated live values', () => {
  assert.equal(registry.length, 38);
  for (const profile of registry) {
    const result = service.runStaticProfileReadModel(profile.speciesId, 9);
    assert.equal(result.availability, 'PARTIAL');
    assert.deepEqual(result.profileContext.temperature, profile.temperature);
    assert.deepEqual(result.profileContext.salinity, profile.salinity);
    assert.deepEqual(result.profileContext.limitations, profile.limitations);
    assert.equal(result.requestContext.stationOrSiteId, null);
    assert.equal(result.freshness.observedAt, null);
    for (const field of Object.values(result.environment)) { assert.equal(field.rawValue, null); assert.equal(field.displayValue, null); assert.equal(field.relation, null); }
  }
});
test('static request returns 200 partial without invoking a live provider', async () => {
  const response = await routeWith(() => { throw Error('live path called'); }).POST({ json: async () => request });
  assert.equal(response.status, 200); assert.equal(response.body.readModel.availability, 'PARTIAL');
  assert.ok(response.body.readModel.sourceStatus.every(s => s.reason === 'SOURCE_DISABLED'));
});
test('disabled, missing-key, timeout and upstream failures are isolated at the read model', async () => {
  for (const code of ['SOURCE_DISABLED', 'API_KEY_MISSING', 'UPSTREAM_TIMEOUT', 'UPSTREAM_ERROR']) {
    const response = await routeWith(async () => { throw new SourceError(code); }).POST({ json: async () => liveRequest });
    assert.equal(response.status, 200); assert.equal(response.body.readModel.sourceStatus[0].reason, code);
    assert.ok(response.body.readModel.limitations.includes('LIVE_ENVIRONMENT_UNAVAILABLE'));
  }
});
test('invalid locations and contract errors remain errors rather than false recovery', async () => {
  for (const [code, status] of [['ENVIRONMENT_LOCATION_NOT_FOUND', 404], ['UPSTREAM_CONTRACT_ERROR', 502]]) {
    const response = await routeWith(async () => { throw new SourceError(code); }).POST({ json: async () => liveRequest });
    assert.equal(response.status, status); assert.equal(response.body.ok, false);
  }
});
test('existing successful observed read model passes through unchanged', async () => {
  const expected = { sentinel: 'legacy result including UNKNOWN and UNIT_NOT_DOCUMENTED' };
  const response = await routeWith(async () => expected).POST({ json: async () => liveRequest });
  assert.equal(response.body.readModel, expected); assert.equal(response.status, 200);
});
test('static parser rejects unknown species, invalid month and incomplete environment requests', () => {
  for (const input of [null, [], {}, { ...request, speciesId: 'invented' }, { ...request, contexts: { month: 0 } }, { ...request, contexts: { month: '9' } }, { ...request, environment: {} }]) assert.equal(service.parseProfileReadModelRequest(input), null);
});
test('static seasonal evidence remains available independently with lineage', () => {
  const result = service.runStaticProfileReadModel('BM-SPECIES-000751', 9);
  assert.ok(result.seasonality.spawning.cards.length > 0);
  assert.ok(result.sources.some(s => s.domain === 'seasonality'));
});
test('configured sources are not claimed observed without a request; no decision keys', () => {
  const configured = loader({ NIFS_REALTIME_FISHING_ENABLED: 'true', NIFS_RISA_API_KEY: 'test-only' })('src/lib/fishing-condition/profile-read-model-server.ts').runStaticProfileReadModel(request.speciesId, 9);
  assert.equal(configured.sourceStatus[0].status, 'NOT_REQUESTED');
  function scan(value) { if (!value || typeof value !== 'object') return; for (const [key, child] of Object.entries(value)) { assert.ok(!/^(score|ranking|probability|recommendation|suitabilityVerdict)$/i.test(key), key); scan(child); } }
  scan(configured);
});

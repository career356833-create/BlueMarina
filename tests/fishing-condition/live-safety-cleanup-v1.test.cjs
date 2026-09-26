const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));

function loadTs(file, mocks = {}, env = {}, fetchMock = () => { throw Error('unexpected upstream request'); }) {
  const output = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', output)(id => {
    if (id === 'server-only') return {};
    if (id in mocks) return mocks[id];
    throw Error(`unmocked import: ${id}`);
  }, module, module.exports, { env }, fetchMock);
  return module.exports;
}

function payload(rows) {
  const bytes = new TextEncoder().encode(JSON.stringify({ header: { resultCode: '00' }, body: { item: rows } }));
  return { ok: true, arrayBuffer: async () => bytes.buffer };
}

test('the reviewed 38 profiles and legacy ten IDs remain intact without data mutation', () => {
  const profiles = [...json('data/fishing-condition/profiles/v1/batch-a-19.json').profiles, ...json('data/fishing-condition/profiles/v1/batch-b-19.json').profiles];
  const legacy = json('data/fishing-condition/species-environment/v2/species-environment-profiles.json').profiles;
  assert.equal(profiles.length, 38);
  assert.deepEqual(['PROFILE_READY', 'PROFILE_PARTIAL', 'PROFILE_LIMITED'].map(status => profiles.filter(p => p.profileReadiness === status).length), [5, 3, 30]);
  assert.equal(legacy.length, 10);
  assert.equal(legacy.filter(p => !profiles.some(reviewed => reviewed.speciesId === p.speciesId)).length, 1);
  assert.equal(legacy.find(p => !profiles.some(reviewed => reviewed.speciesId === p.speciesId)).speciesId, 'BM-SPECIES-000444');
  assert.ok(legacy.every(p => p.evidence.length > 0));
});

test('Conditions read-model does not call the historical comparator/bundle path', () => {
  const server = read('src/lib/fishing-condition/read-model-server.ts');
  assert.doesNotMatch(server, /runConditionEvidenceBundle|runFishingConditionComparison|buildFishingConditionReadModel|compareFishingCondition/);
  assert.match(server, /getFactualConditionProfile/);
  assert.match(server, /runStaticProfileReadModel/);
  assert.match(server, /observationContext/);
  assert.match(server, /seasonalityContext/);
});

test('RISA cold concurrent requests coalesce to two endpoints and preserve cache truth', async () => {
  let calls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const risa = loadTs('src/lib/fishing-condition/nifs-realtime-fishing-server.ts', {
    './nifs-realtime-fishing': {
      buildNifsRisaEnvironment: () => ({ stations: [{ stationId: 'A', observedAt: '2026-09-26T12:30:00', freshness: 'fresh' }], quality: { newestObservedAt: '2026-09-26T12:30:00' } }),
      deriveNifsRisaFreshness: () => 'fresh', formatAsiaSeoulWallClock: () => '2026-09-26T12:45:00',
      NIFS_RISA_PROVIDER: 'NIFS', NIFS_RISA_QUALITY_CLASS: 'OBSERVED', NIFS_RISA_SOURCE_ID: 'nifs-risa', NIFS_RISA_SOURCE_TIMEZONE: 'UNSPECIFIED_BY_NIFS', NIFS_RISA_UNIT: 'degC',
    },
  }, { NIFS_REALTIME_FISHING_ENABLED: 'true', NIFS_RISA_API_KEY: 'test-only' }, async () => { calls++; await gate; return payload([{}]); });
  const first = risa.getNifsRealtimeFishingEnvironment();
  const second = risa.getNifsRealtimeFishingEnvironment();
  assert.equal(calls, 2);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.cacheStatus, 'fresh_fetch');
  assert.equal(b.cacheStatus, 'fresh_fetch');
  const hit = await risa.getNifsRealtimeFishingEnvironment();
  assert.equal(hit.cacheStatus, 'cache_hit');
  assert.equal(hit.lastSuccessfulFetchAt, a.lastSuccessfulFetchAt);
  assert.equal(calls, 2);
});

test('FEMO cold concurrent requests coalesce to one endpoint', async () => {
  let calls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const femo = loadTs('src/lib/fishing-condition/nifs-fishery-environment-server.ts', {
    './nifs-fishery-environment': {
      buildNifsFemoEnvironment: () => ({ samples: [{ siteId: 'A', sampledAt: '2025-11-05T10:10:00', freshness: 'stale' }], quality: { conflictingDuplicateRows: 0, latestSampledAt: '2025-11-05T10:10:00' } }),
      deriveNifsFemoFreshness: () => 'stale', NIFS_FEMO_PROVIDER: 'NIFS', NIFS_FEMO_QUALITY_CLASS: 'OBSERVED_PERIODIC_ENVIRONMENT', NIFS_FEMO_SOURCE_ID: 'nifs-femo-sea', NIFS_FEMO_SOURCE_TIMEZONE: 'UNSPECIFIED_BY_NIFS',
    }, './nifs-realtime-fishing': { formatAsiaSeoulWallClock: () => '2026-09-26T12:45:00' },
  }, { NIFS_FISHERY_ENVIRONMENT_ENABLED: 'true', NIFS_FEMO_API_KEY: 'test-only' }, async () => { calls++; await gate; return payload([{}]); });
  const first = femo.getNifsFisheryEnvironment();
  const second = femo.getNifsFisheryEnvironment();
  assert.equal(calls, 1);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.freshness, 'stale');
  assert.equal(b.cacheStatus, 'fresh_fetch');
  assert.equal((await femo.getNifsFisheryEnvironment()).cacheStatus, 'cache_hit');
  assert.equal(calls, 1);
});

test('UI retains explicit station selection and keeps species changes from refetching locations', () => {
  const ui = read('src/app/fishing-spots/conditions/fishing-condition-client.tsx');
  assert.match(ui, /\[locationReloadKey, sourceId\]/);
  assert.match(ui, /sourceId && locationId && depth/);
  assert.match(ui, /observationContext/);
  assert.match(ui, /어종 참고 정보/);
  assert.doesNotMatch(ui, /NEXT_PUBLIC_NIFS|NIFS_RISA_API_KEY|NIFS_FEMO_API_KEY/);
});

test('RISA and FEMO are disabled by default, and observation-only failures remain explicit', () => {
  for (const [source, route] of [
    ['src/lib/fishing-condition/nifs-realtime-fishing-server.ts', 'src/app/api/fishing-condition/environment/realtime/route.ts'],
    ['src/lib/fishing-condition/nifs-fishery-environment-server.ts', 'src/app/api/fishing-condition/environment/fishery/route.ts'],
  ]) {
    assert.match(read(source), /!== "true"/);
    assert.match(read(route), /SOURCE_DISABLED.*API_KEY_MISSING.*503/);
  }
  assert.match(read('src/app/api/fishing-condition/read-model/route.ts'), /runStaticProfileReadModel\(parsed\.speciesId/);
});

test('disabled observation-only APIs return 503 without exposing key material', async () => {
  class Disabled extends Error { constructor() { super('SOURCE_DISABLED'); this.code = 'SOURCE_DISABLED'; } }
  const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } };
  for (const [routeFile, adapter, errorName] of [
    ['src/app/api/fishing-condition/environment/realtime/route.ts', '@/lib/fishing-condition/nifs-realtime-fishing-server', 'NifsRealtimeFishingSourceError'],
    ['src/app/api/fishing-condition/environment/fishery/route.ts', '@/lib/fishing-condition/nifs-fishery-environment-server', 'NifsFisheryEnvironmentSourceError'],
  ]) {
    const route = loadTs(routeFile, { 'next/server': next, [adapter]: { [errorName]: Disabled, getNifsRealtimeFishingEnvironment: async () => { throw new Disabled(); }, getNifsFisheryEnvironment: async () => { throw new Disabled(); } } });
    const response = await route.GET();
    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'SOURCE_DISABLED');
    assert.doesNotMatch(JSON.stringify(response.body), /test-only|API_KEY/);
  }
});

test('FEMO unit ambiguity and RISA timezone limitation survive the factual path', () => {
  assert.match(read('src/lib/fishing-condition/nifs-fishery-environment.ts'), /salinity:.*UNIT_NOT_DOCUMENTED/);
  assert.match(read('src/lib/fishing-condition/nifs-realtime-fishing.ts'), /UNSPECIFIED_BY_NIFS/);
  assert.match(read('src/lib/fishing-condition/read-model.ts'), /단위 미확인/);
  assert.match(read('src/lib/fishing-condition/read-model-server.ts'), /TIMEZONE_NOT_DOCUMENTED/);
});

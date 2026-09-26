const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function loadRisa(env, fetchMock) {
  const output = ts.transpileModule(read('src/lib/fishing-condition/nifs-realtime-fishing-server.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', output)((id) => {
    if (id === 'server-only') return {};
    if (id === './nifs-realtime-fishing') return {
      buildNifsRisaEnvironment: () => ({ stations: [{ stationId: 'bgj8a', observedAt: '2026-09-26T13:30:00', freshness: 'fresh' }], quality: { newestObservedAt: '2026-09-26T13:30:00' } }),
      deriveNifsRisaFreshness: () => 'fresh', formatAsiaSeoulWallClock: () => '2026-09-26T13:40:00',
      NIFS_RISA_PROVIDER: 'NIFS', NIFS_RISA_QUALITY_CLASS: 'OBSERVED', NIFS_RISA_SOURCE_ID: 'nifs-risa',
      NIFS_RISA_SOURCE_TIMEZONE: 'UNSPECIFIED_BY_NIFS', NIFS_RISA_UNIT: 'degC',
    };
    throw Error(`unexpected import: ${id}`);
  }, module, module.exports, { env }, fetchMock);
  return module.exports;
}

function payload() {
  const bytes = new TextEncoder().encode(JSON.stringify({ header: { resultCode: '00' }, body: { item: [{}] } }));
  return { ok: true, arrayBuffer: async () => bytes.buffer };
}

test('Preview debug events count two upstream endpoints, an in-flight join, and a warm hit without secrets', async () => {
  const secret = 'test-secret-must-never-appear';
  const events = [];
  const originalInfo = console.info;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  console.info = (line) => events.push(JSON.parse(line));
  try {
    const risa = loadRisa({ VERCEL_ENV: 'preview', RISA_OBSERVABILITY_DEBUG: 'true', NIFS_REALTIME_FISHING_ENABLED: 'true', NIFS_RISA_API_KEY: secret }, async () => {
      calls++;
      await gate;
      return payload();
    });
    const first = risa.getNifsRealtimeFishingEnvironment();
    const second = risa.getNifsRealtimeFishingEnvironment();
    assert.equal(calls, 2);
    release();
    await Promise.all([first, second]);
    assert.equal((await risa.getNifsRealtimeFishingEnvironment()).cacheStatus, 'cache_hit');
    assert.deepEqual(events.map((event) => event.event), [
      'RISA_CACHE_MISS', 'RISA_UPSTREAM_FETCH', 'RISA_UPSTREAM_FETCH', 'RISA_INFLIGHT_JOIN', 'RISA_CACHE_HIT',
    ]);
    assert.deepEqual(events.filter((event) => event.event === 'RISA_UPSTREAM_FETCH').map((event) => event.endpointKind).sort(), ['code', 'list']);
    assert.equal(new Set(events.filter((event) => event.loadId).map((event) => event.loadId)).size, 1);
    assert.equal(new Set(events.map((event) => event.instanceId)).size, 1);
    assert.doesNotMatch(JSON.stringify(events), new RegExp(secret));
    assert.ok(events.every((event) => !('url' in event) && !('apiKey' in event)));
  } finally {
    console.info = originalInfo;
  }
});

test('Production and debug-off Preview remain silent while the source still works', async () => {
  const originalInfo = console.info;
  const events = [];
  console.info = (line) => events.push(line);
  try {
    for (const env of [
      { VERCEL_ENV: 'production', RISA_OBSERVABILITY_DEBUG: 'true' },
      { VERCEL_ENV: 'preview', RISA_OBSERVABILITY_DEBUG: 'false' },
    ]) {
      const risa = loadRisa({ ...env, NIFS_REALTIME_FISHING_ENABLED: 'true', NIFS_RISA_API_KEY: 'test-only' }, async () => payload());
      assert.equal((await risa.getNifsRealtimeFishingEnvironment()).ok, true);
    }
    assert.equal(events.length, 0);
  } finally {
    console.info = originalInfo;
  }
});

test('observability stays server-only and does not add a public debug route or change factual Conditions', () => {
  const source = read('src/lib/fishing-condition/nifs-realtime-fishing-server.ts');
  const ui = read('src/app/fishing-spots/conditions/fishing-condition-client.tsx');
  const readModel = read('src/lib/fishing-condition/read-model-server.ts');
  assert.match(source, /import "server-only"/);
  assert.match(source, /VERCEL_ENV !== "preview"/);
  assert.match(source, /RISA_OBSERVABILITY_DEBUG !== "true"/);
  assert.doesNotMatch(ui, /RISA_OBSERVABILITY_DEBUG|NIFS_RISA_API_KEY|NEXT_PUBLIC_NIFS/);
  assert.doesNotMatch(readModel, /runConditionEvidenceBundle|runFishingConditionComparison|compareFishingCondition/);
  assert.equal(fs.existsSync(path.join(root, 'src/app/api/fishing-condition/debug')), false);
});

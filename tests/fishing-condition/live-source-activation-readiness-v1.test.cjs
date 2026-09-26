const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const report = JSON.parse(read('reports/fishing-condition/live-source-activation-readiness-v1.json'));

function pureModule(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
}

test('readiness remains HOLD without Preview credentials or smoke results', () => {
  assert.equal(report.decision, 'LIVE_SOURCE_ACTIVATION_HOLD');
  assert.equal(report.sources.risa.previewEnv, 'MISSING');
  assert.equal(report.sources.femo.previewEnv, 'MISSING');
  assert.deepEqual(report.preview.activatedSources, []);
  assert.equal(report.preview.apiResult, 'NOT_RUN');
  assert.equal(report.productionGate.flagEnabled, false);
});

test('both live adapters fail closed and keep keys server-side', () => {
  for (const [file, flag, key] of [
    ['src/lib/fishing-condition/nifs-realtime-fishing-server.ts', 'NIFS_REALTIME_FISHING_ENABLED', 'NIFS_RISA_API_KEY'],
    ['src/lib/fishing-condition/nifs-fishery-environment-server.ts', 'NIFS_FISHERY_ENVIRONMENT_ENABLED', 'NIFS_FEMO_API_KEY'],
  ]) {
    const source = read(file);
    assert.match(source, /import "server-only"/);
    assert.ok(source.indexOf(`process.env.${flag} !== "true"`) < source.indexOf(`process.env.${key}`));
    assert.match(source, /searchParams\.set\("key", apiKey\)/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_/);
  }
});

test('RISA normalizer preserves depth, source time ambiguity and missing values', () => {
  const risa = pureModule('src/lib/fishing-condition/nifs-realtime-fishing.ts');
  const stations = [{ sta_cde: 'A', sta_nam_kor: '정점 A', lat: '35', lon: '129', gru_nam: '동해' }];
  const rows = [
    { sta_cde: 'A', sta_nam_kor: '정점 A', obs_dat: '2026-09-26', obs_tim: '12:30:00', obs_lay: '1', wtr_tmp: '21.5' },
    { sta_cde: 'A', sta_nam_kor: '정점 A', obs_dat: '2026-09-26', obs_tim: '12:30:00', obs_lay: '2', wtr_tmp: '' },
    { sta_cde: 'A', sta_nam_kor: '정점 A', obs_dat: '2026-09-26', obs_tim: '12:30:00', obs_lay: '3', wtr_tmp: '18.2' },
  ];
  const normalized = risa.buildNifsRisaEnvironment(stations, rows, '2026-09-26T03:45:00Z', '2026-09-26T12:45:00');
  assert.equal(normalized.stations.length, 1);
  assert.equal(normalized.stations[0].waterTemperature.surfaceC, 21.5);
  assert.equal(normalized.stations[0].waterTemperature.middleC, null);
  assert.equal(normalized.stations[0].waterTemperature.bottomC, 18.2);
  assert.equal(normalized.stations[0].waterTemperature.unit, 'degC');
  assert.equal(normalized.stations[0].sourceTimezone, 'UNSPECIFIED_BY_NIFS');
});

test('FEMO normalizer keeps salinity unit unknown, official DO unit and old sample stale', () => {
  const femo = pureModule('src/lib/fishing-condition/nifs-fishery-environment.ts');
  const row = { FISHERY: '어장 A', LOCATION_POINT: '정점 1', DATE_Y: '2025', DATE_M: '11', DATE_D: '5', TIME_H: '10', TIME_I: '10', LATITUDE: '35', LONGITUDE: '129', TEMP_S: '20', TEMP_B: '19', SAL_S: '32', SAL_B: '33', DO_S: '7', DO_B: '6' };
  const normalized = femo.buildNifsFemoEnvironment([row], '2026-09-26T03:45:00Z', '2026-09-26T12:45:00');
  assert.equal(normalized.samples.length, 1);
  assert.equal(normalized.samples[0].freshness, 'stale');
  assert.equal(normalized.samples[0].measurements.salinity.unit, 'UNIT_NOT_DOCUMENTED');
  assert.equal(normalized.samples[0].measurements.dissolvedOxygen.unit, 'mg/L');
  assert.equal(normalized.samples[0].measurements.waterTemperature.unit, 'degC');
  assert.equal(normalized.samples[0].sourceTimezone, 'UNSPECIFIED_BY_NIFS');
  assert.equal(normalized.quality.latestSampledAt, '2025-11-05T10:10:00');
});

test('static read-model retains explicit source status and profile after recoverable failure', () => {
  const route = read('src/app/api/fishing-condition/read-model/route.ts');
  const staticModel = read('src/lib/fishing-condition/profile-read-model-server.ts');
  assert.match(route, /SOURCE_DISABLED.*API_KEY_MISSING.*UPSTREAM_TIMEOUT.*UPSTREAM_ERROR/);
  assert.match(route, /runStaticProfileReadModel\(parsed\.speciesId, parsed\.contexts\.month/);
  assert.match(staticModel, /"UNAVAILABLE" : "NOT_REQUESTED"/);
  assert.match(staticModel, /"OBSERVATIONS_NOT_REQUESTED"/);
  assert.ok(report.sourceContract.staticProfileOnFailure);
});

test('the interface requires source and explicit location, with no NIFS key in client code', () => {
  const client = read('src/app/fishing-spots/conditions/fishing-condition-client.tsx');
  const transport = read('src/lib/fishing-condition/read-model-client.ts');
  const comparator = read('src/lib/fishing-condition/comparator-server.ts');
  assert.match(client, /sourceId && locationId && depth/);
  assert.match(comparator, /!request\.environment\.stationId/);
  assert.match(comparator, /!request\.environment\.siteId/);
  assert.doesNotMatch(client + transport, /NIFS_(?:RISA|FEMO)_API_KEY|NEXT_PUBLIC_NIFS|www\.nifs\.go\.kr/);
});

test('HOLD records cold-call amplification and existing comparison policy gap', () => {
  assert.equal(report.requestVolume.initialPageViewUpstream, 0);
  assert.deepEqual(report.requestVolume.sourceSelectionColdInstanceUpstream, { risa: 2, femo: 1 });
  assert.equal(report.sources.risa.retryCount, 0);
  assert.equal(report.sources.femo.retryCount, 0);
  assert.ok(report.blockers.some(item => item.includes('legacy 10-species')));
  assert.match(read('src/lib/fishing-condition/comparator.ts'), /compareTemperature\(profile, environment\)/);
  for (const key of ['scoringAdded', 'rankingAdded', 'probabilityAdded', 'automaticComparisonAdded', 'productionActivation', 'previewActivation']) assert.equal(report.invariants[key], 0);
});

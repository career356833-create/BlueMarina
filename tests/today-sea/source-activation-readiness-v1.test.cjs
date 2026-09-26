const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const report = JSON.parse(read('reports/today-sea/source-activation-readiness-v1.json'));
const hub = read('src/components/boat/home/TodaySeaOperationalHub.tsx');
const byId = Object.fromEntries(report.sources.map((source) => [source.sourceId, source]));

test('inventory covers exactly the five requested disabled sources once', () => {
  assert.equal(report.sources.length, 5);
  assert.equal(new Set(report.sources.map((source) => source.sourceId)).size, 5);
  assert.deepEqual(Object.keys(byId).sort(), ['KHOA_NAVIGATION_WARNINGS', 'KHOA_TIDE_PREDICTION', 'KMA_MARINE_FORECAST', 'KMA_MARINE_OBSERVATIONS', 'KMA_MARINE_WARNINGS']);
  assert.ok(report.sources.every((source) => source.currentStatus === 'DISABLED'));
});

test('environment audit keeps Preview and Production separate and records no secret values', () => {
  for (const scope of ['preview', 'production']) {
    for (const source of report.sources) {
      const keys = Array.isArray(source.apiKeyEnv) ? source.apiKeyEnv : [source.apiKeyEnv];
      for (const key of keys) assert.equal(report.environmentAudit[scope][key], 'MISSING');
      if (source.envFlag) assert.equal(report.environmentAudit[scope][source.envFlag], 'DISABLED');
    }
  }
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /(?:authKey|ServiceKey)=[^\s"&]+/i);
  assert.doesNotMatch(serialized, /"(?:apiKeyValue|secretValue|credentialValue)"\s*:/i);
});

test('report contract tracks actual server-side env names and failure gates', () => {
  const pairs = [
    ['KMA_MARINE_FORECAST', 'src/app/api/sea-info/marine-forecast/route.ts'],
    ['KMA_MARINE_OBSERVATIONS', 'src/lib/sea-info/kma-marine-observation-server.ts'],
    ['KMA_MARINE_WARNINGS', 'src/lib/sea-info/kma-marine-weather-warning-server.ts'],
    ['KHOA_TIDE_PREDICTION', 'src/app/api/sea-info/tide/route.ts'],
    ['KHOA_NAVIGATION_WARNINGS', 'src/app/api/sea-info/navigation-warnings/route.ts'],
  ];
  for (const [id, file] of pairs) {
    const source = read(file);
    const keys = Array.isArray(byId[id].apiKeyEnv) ? byId[id].apiKeyEnv : [byId[id].apiKeyEnv];
    for (const key of keys) assert.ok(source.includes(`process.env.${key}`), `${id}: ${key}`);
    if (byId[id].envFlag) assert.ok(source.includes(`process.env.${byId[id].envFlag}`));
  }
});

test('forecast and observations remain distinct source kinds and explicit contexts', () => {
  assert.equal(byId.KMA_MARINE_FORECAST.kind, 'MODEL/FORECAST');
  assert.equal(byId.KMA_MARINE_OBSERVATIONS.kind, 'OBSERVED');
  assert.match(hub, /requestedZone \? `\/api\/sea-info\/marine-forecast/);
  assert.match(hub, /kmaStationId \? `\/api\/sea-info\/marine-observations/);
  assert.equal(report.safety.forecastAsObservation, false);
});

test('warning absence is not treated as safe and navigation lifecycle stays unknown', () => {
  assert.equal(report.liveChecks.local.warnings.recordCount, 0);
  assert.equal(report.safety.warningAbsenceImpliesSafety, false);
  assert.match(hub, /표시 건수 0도 안전 판정이 아닙니다/);
  assert.equal(byId.KHOA_NAVIGATION_WARNINGS.lifecycle, 'UNKNOWN');
  assert.match(read('src/lib/marine-navigation/adapters/khoa-navigation-warnings.ts'), /status: "UNKNOWN"/);
});

test('tide remains a dated prediction with documented unit and unknown datum', () => {
  const tide = byId.KHOA_TIDE_PREDICTION;
  assert.equal(tide.kind, 'PREDICTION');
  assert.equal(tide.unitFields.predcTdlvVl, 'cm');
  assert.equal(tide.unitFields.datum, 'DATUM_NOT_DOCUMENTED');
  assert.equal(report.safety.tideAsObservation, false);
  assert.equal(report.safety.tideDepthInference, 0);
  assert.match(hub, /조석 예측을 실제 관측이나 안전 수심으로 해석하지 않습니다/);
});

test('bounded live checks do not invent current timestamps from disabled routes', () => {
  const checks = report.liveChecks.production;
  assert.equal(checks.page.httpStatus, 200);
  for (const key of ['forecast', 'stations', 'observations', 'warnings', 'tide', 'navigationWarnings']) assert.equal(checks[key].httpStatus, 503);
  assert.equal(byId.KMA_MARINE_FORECAST.latestAvailableForecast, null);
  assert.equal(byId.KHOA_TIDE_PREDICTION.latestPrediction, null);
  assert.equal(byId.KHOA_NAVIGATION_WARNINGS.latestIssueTimestamp, null);
});

test('source failures stay within cards and key-bearing upstream URLs stay server-side', () => {
  assert.match(hub, /function useSource<T>\(url: string \| null\)/);
  assert.match(hub, /classifyTodaySeaSource<T>/);
  assert.match(read('src/lib/today-sea/source-state.ts'), /API_KEY_MISSING/);
  assert.doesNotMatch(hub, /apihub\.kma\.go\.kr|apis\.data\.go\.kr|process\.env|NEXT_PUBLIC_.*KEY|ServiceKey|authKey/);
  assert.equal(report.security.browserDirectUpstreamCalls, 0);
});

test('conditional candidates are bounded by readiness, value, risk and priority', () => {
  assert.ok(report.selectedActivationCandidates.length <= 2);
  assert.equal(new Set(report.priority).size, 5);
  assert.deepEqual(new Set(report.priority), new Set(report.sources.map((source) => source.sourceId)));
  for (const id of report.selectedActivationCandidates) {
    const source = byId[id];
    assert.ok(['READY', 'READY_WITH_LIMITATIONS'].includes(source.readiness));
    assert.ok(['HIGH', 'MEDIUM'].includes(source.operationalValue));
    assert.ok(['LOW', 'MEDIUM'].includes(source.activationRisk));
  }
  assert.equal(report.decision, 'TODAY_SEA_SOURCE_ACTIVATION_HOLD');
});

test('audit remains research-only and introduces no numeric safety or ranking system', () => {
  assert.deepEqual(report.mutations, { previewActivation: 0, productionActivation: 0, databaseApply: 0, supabaseApply: 0, staged: 0, commits: 0, pushes: 0 });
  for (const key of ['score', 'recommendation', 'nearestStationInference', 'tideDepthInference']) assert.equal(report.safety[key], 0);
  assert.equal(report.previewPlan.length, 4);
});

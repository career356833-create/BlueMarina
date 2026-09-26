const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const report = JSON.parse(read('reports/fishing-condition/risa-production-activation-v1.json'));

test('unverified Preview gates keep Production RISA fail-closed', () => {
  assert.equal(report.decision, 'RISA_PRODUCTION_ACTIVATION_BLOCKED');
  assert.equal(report.gate.passed, false);
  assert.ok(report.gate.blockers.length > 0);
  assert.equal(report.preview.risaSourceStatus, 'AVAILABLE');
  assert.equal(report.preview.femoSourceStatus, 'DISABLED');
  assert.equal(report.production.risaFlag, 'ABSENT_FAIL_CLOSED');
  assert.equal(report.production.risaKey, 'ABSENT');
  assert.equal(report.production.environmentChanged, false);
  assert.equal(report.production.deploymentCreated, false);
  assert.equal(report.safety.femoActivation, 0);
  assert.equal(report.safety.databaseApply, 0);
});

test('RISA stays server-only, explicit, and off by default', () => {
  const source = read('src/lib/fishing-condition/nifs-realtime-fishing-server.ts');
  const request = read('src/lib/fishing-condition/evidence-bundle-request.ts');
  const ui = read('src/app/fishing-spots/conditions/fishing-condition-client.tsx');
  assert.match(source, /import "server-only"/);
  assert.match(source, /NIFS_REALTIME_FISHING_ENABLED !== "true"/);
  assert.match(source, /process\.env\.NIFS_RISA_API_KEY/);
  assert.match(request, /stationId/);
  assert.match(request, /depthContext/);
  assert.doesNotMatch(ui, /NIFS_RISA_API_KEY|NEXT_PUBLIC_NIFS/);
  assert.equal(report.preview.secretExposureHtml, 0);
  assert.equal(report.preview.secretExposureClientScripts, 0);
});

test('a RISA upstream failure returns static profile and seasonality with a source error', async () => {
  const code = ts.transpileModule(read('src/app/api/fishing-condition/read-model/route.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  class SourceError extends Error { constructor() { super('UPSTREAM_ERROR'); this.code = 'UPSTREAM_ERROR'; } }
  const module = { exports: {} };
  const mocks = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    '@/lib/fishing-condition/evidence-bundle-request': { parseConditionEvidenceBundleRequest: () => ({
      speciesId: 'BM-SPECIES-000751', environment: { sourceId: 'nifs-risa', stationId: 'bgj8a', depthContext: 'SURFACE' }, contexts: { month: 9 },
    }) },
    '@/lib/fishing-condition/profile-read-model-server': {
      parseProfileReadModelRequest: () => null,
      runStaticProfileReadModel: (_speciesId, _month, failure) => ({
        availability: 'PARTIAL', profileContext: { speciesId: 'BM-SPECIES-000751' },
        seasonality: { month: 9 }, sourceStatus: [{ sourceId: failure.sourceId, status: 'ERROR', reason: failure.reason }],
      }),
    },
    '@/lib/fishing-condition/read-model-server': {
      FishingConditionReadModelError: SourceError,
      runFishingConditionReadModel: async () => { throw new SourceError(); },
    },
  };
  new Function('require', 'module', 'exports', code)((id) => {
    if (!(id in mocks)) throw Error(`unexpected import: ${id}`);
    return mocks[id];
  }, module, module.exports);
  const response = await module.exports.POST({ json: async () => ({}) });
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.readModel.availability, 'PARTIAL');
  assert.ok(response.body.readModel.profileContext);
  assert.ok(response.body.readModel.seasonality);
  assert.deepEqual(response.body.readModel.sourceStatus[0], {
    sourceId: 'nifs-risa', status: 'ERROR', reason: 'UPSTREAM_ERROR',
  });
});

test('38 reviewed profiles and the legacy ten stay present without automatic comparison', () => {
  const profiles = [
    ...JSON.parse(read('data/fishing-condition/profiles/v1/batch-a-19.json')).profiles,
    ...JSON.parse(read('data/fishing-condition/profiles/v1/batch-b-19.json')).profiles,
  ];
  const legacy = JSON.parse(read('data/fishing-condition/species-environment/v2/species-environment-profiles.json')).profiles;
  assert.equal(profiles.length, 38);
  assert.equal(new Set(profiles.map((profile) => profile.speciesId)).size, 38);
  assert.equal(legacy.length, 10);
  assert.equal(report.preview.selectorSpecies, 38);
  const server = read('src/lib/fishing-condition/read-model-server.ts');
  assert.doesNotMatch(server, /runConditionEvidenceBundle|runFishingConditionComparison|compareFishingCondition/);
  assert.deepEqual(['automaticComparator', 'scoring', 'ranking', 'probability', 'nearestStationInference'].map((key) => report.safety[key]), [0, 0, 0, 0, 0]);
});

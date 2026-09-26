const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const report = JSON.parse(read('reports/fishing-condition/risa-production-activation-final-v1.json'));
const docs = read('docs/FISHING_CONDITION_RISA_PRODUCTION_ACTIVATION_FINAL_V1.md');

test('Production activation evidence identifies the clean main deployment and exact env boundary', () => {
  assert.equal(report.decision, 'RISA_PRODUCTION_ACTIVATION_COMPLETE_WITH_LIMITATIONS');
  assert.equal(report.deployment.gitSha, '4fdfefea7cd22912feece1bad5c7d01da22e05f7');
  assert.equal(report.deployment.status, 'READY');
  assert.equal(report.deployment.cleanPushedMainShaMatched, true);
  assert.equal(report.branchIntegration.productionSafeRuntimeNeeded, 0);
  assert.equal(report.branchIntegration.runtimeCommitsToMain, 0);
  assert.equal(report.productionEnvironment.risaFlag, 'true');
  assert.equal(report.productionEnvironment.risaKey, 'PRESENT_SECRET_VALUE_NOT_READ_OR_RECORDED');
  assert.equal(report.productionEnvironment.femoFlag, 'ABSENT_FAIL_CLOSED');
  assert.equal(report.productionEnvironment.previewDebugFlag, 'ABSENT_IN_PRODUCTION');
  assert.equal(report.productionEnvironment.otherEnvironmentChanges, 0);
  assert.equal(report.security.keyValueRecorded, 0);
  assert.match(docs, /비밀값을 읽거나 기록하지 않았다/);
});

test('Live RISA smoke records factual stale observations and a partial read model', () => {
  assert.equal(report.risa.http, 200);
  assert.equal(report.risa.stations, 41);
  assert.equal(report.risa.observationRows, 65);
  assert.equal(report.risa.sourceStatus, 'STALE');
  assert.equal(report.risa.sourceTimezone, 'UNSPECIFIED_BY_NIFS');
  assert.equal(report.risa.sampleDepthContext, 'SURFACE');
  assert.equal(report.risa.sampleTemperature.unit, 'degC');
  assert.equal(report.readModel.http, 200);
  assert.equal(report.readModel.availability, 'PARTIAL');
  assert.equal(report.readModel.profileContext, 'PRESENT');
  assert.equal(report.readModel.seasonality, 'PRESENT');
  assert.equal(report.readModel.risaSourceStatus, 'STALE');
  assert.equal(report.readModel.femoSourceStatus, 'DISABLED');
  assert.deepEqual([report.femo.http, report.femo.code, report.femo.activation], [503, 'SOURCE_DISABLED', 0]);
  assert.equal(report.browser.selectorSpecies, 38);
  assert.equal(report.browser.mobileHorizontalOverflow, 0);
  assert.deepEqual([report.browser.consoleErrors, report.browser.consoleWarnings], [0, 0]);
});

test('Server-only source and read-model safety stay intact without Preview debug integration', () => {
  const source = read('src/lib/fishing-condition/nifs-realtime-fishing-server.ts');
  const readModel = read('src/lib/fishing-condition/read-model-server.ts');
  const ui = read('src/app/fishing-spots/conditions/fishing-condition-client.tsx');
  assert.match(source, /import "server-only"/);
  assert.match(source, /NIFS_REALTIME_FISHING_ENABLED !== "true"/);
  assert.match(source, /process\.env\.NIFS_RISA_API_KEY/);
  assert.doesNotMatch(source, /RISA_OBSERVABILITY_DEBUG|traceRisa/);
  assert.doesNotMatch(ui, /NIFS_RISA_API_KEY|NEXT_PUBLIC_NIFS/);
  assert.doesNotMatch(readModel, /runConditionEvidenceBundle|runFishingConditionComparison|compareFishingCondition/);
  for (const key of ['automaticComparator', 'scoring', 'ranking', 'probability', 'nearestStationInference', 'femoActivation', 'databaseApply']) {
    assert.equal(report.safety[key], 0, key);
  }
  assert.equal(report.readModel.upstreamFailureIsolation, 'PASS_IN_EXISTING_TEST_INJECTION; NOT_INJECTED_IN_PRODUCTION');
});

test('Observability limitations and rollback remain explicit', () => {
  assert.equal(report.observability.unexpected5xx, 0);
  assert.equal(report.observability.runtimeErrorRows, 0);
  assert.equal(report.observability.crossInstanceDedupe, 'NOT_GUARANTEED');
  assert.equal(report.observability.nifsQuota, 'QUOTA_UNKNOWN');
  assert.equal(report.observability.productionUpstreamFetchCount, 'NOT_INSTRUMENTED');
  assert.equal(report.observability.previewColdFiveRequests.actualNifsEndpointCalls, 8);
  assert.equal(report.rollback.triggered, false);
  assert.match(report.rollback.preparedMethod, /NIFS_REALTIME_FISHING_ENABLED=false/);
  assert.match(docs, /QUOTA_UNKNOWN/);
  assert.match(docs, /cross-instance/);
});

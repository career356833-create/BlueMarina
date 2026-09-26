const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/today-sea/kma-preview-activation-v1.json'), 'utf8'));
const docs = fs.readFileSync(path.join(root, 'docs/BLUE_MARINA_TODAY_SEA_KMA_PREVIEW_ACTIVATION_V1.md'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'src/components/boat/home/TodaySeaOperationalHub.tsx'), 'utf8');

test('Preview evidence identifies the clean deployed SHA and keeps Production off', () => {
  assert.equal(report.decision, 'KMA_PREVIEW_ACTIVATION_PASS_WITH_LIMITATIONS');
  assert.equal(report.phaseA.files, 3);
  assert.equal(report.phaseA.pushedToOriginMain, true);
  assert.equal(report.preview.sourceCommit, report.codeCommits.at(-1));
  assert.equal(report.preview.sourceWorktreeClean, true);
  assert.equal(report.preview.readyState, 'READY');
  assert.equal(report.environment.previewOnlyPresent.length, 5);
  assert.equal(report.environment.productionKmaVariablesPresent, 0);
  assert.equal(report.environment.productionObservationApiCode, 'SOURCE_DISABLED');
  assert.equal(report.environment.productionWarningApiCode, 'SOURCE_DISABLED');
  assert.equal(report.git.productionEnvironmentChanged, false);
});

test('observed source time and empty warning state cannot become safety claims', () => {
  assert.equal(report.observation.httpStatus, 200);
  assert.equal(report.observation.stationCount, 76);
  assert.equal(report.observation.recordCount, 138);
  assert.equal(report.observation.selectedStation.uiSourceStatus, 'STALE');
  assert.equal(report.observation.productionReadiness, 'KMA_OBSERVATION_PRODUCTION_HOLD');
  assert.equal(report.warning.httpStatus, 200);
  assert.equal(report.warning.recordCount, 0);
  assert.equal(report.warning.issuanceTime, null);
  assert.equal(report.warning.absenceMeansSafe, false);
  assert.equal(report.warning.productionReadiness, 'KMA_WARNING_PRODUCTION_HOLD');
  assert.match(hub, /observationCardState/);
  assert.match(hub, /표시 건수 0도 안전 판정이 아닙니다/);
});

test('unmeasured duplicate calls and live warning failure are recorded as limitations', () => {
  assert.equal(report.preview.todaySeaHttpStatus, 200);
  assert.equal(report.failureIsolation.wholePage503Observed, false);
  assert.match(report.failureIsolation.warningFailure, /not induced/);
  assert.equal(report.cacheAndCalls.inFlightDeduplication, false);
  assert.equal(report.cacheAndCalls.measuredBrowserRequestCount, null);
  assert.match(report.cacheAndCalls.duplicateCallVerdict, /NOT_VERIFIED/);
  assert.match(report.otherSources.kmaForecast, /API_KEY_MISSING/);
  assert.match(report.otherSources.khoaTide, /API_KEY_MISSING/);
  assert.equal(report.otherSources.khoaNavigationWarning, 'SOURCE_DISABLED');
});

test('security, viewport, and safety evidence remains limited to what was checked', () => {
  assert.equal(report.security.secretMatchesInJs, 0);
  assert.equal(report.security.secretMatchesInPreviewHtml, 0);
  assert.equal(report.security.keyValuesInReportOrDocs, 0);
  assert.equal(report.ui.horizontalOverflowPx, 0);
  assert.equal(report.ui.browserConsoleErrors, 0);
  for (const field of ['seaSafetyScore', 'recommendation', 'bestTime', 'fishingScore', 'riskScore', 'nearestStationInference']) assert.equal(report.safety[field], 0);
  assert.equal(report.safety.warningAbsenceMeansSafety, false);
  assert.match(docs, /KMA_OBSERVATION_PRODUCTION_HOLD/);
  assert.match(docs, /KMA_WARNING_PRODUCTION_HOLD/);
});

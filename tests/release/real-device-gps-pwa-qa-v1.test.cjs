const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/release/real-device-gps-pwa-qa-v1.json'), 'utf8'));
const doc = fs.readFileSync(path.join(root, 'docs/BLUE_MARINA_REAL_DEVICE_GPS_PWA_QA_V1.md'), 'utf8');

test('no real-device gate passes without a recorded device', () => {
  assert.equal(report.evidenceClasses.realDevice, 'NONE_AVAILABLE');
  assert.equal(report.decision, 'REAL_DEVICE_GPS_PWA_QA_BLOCKED');
  assert.equal(report.deviceMatrix.every(device => device.deviceModel === null && device.status === 'BLOCKED'), true);
  assert.equal(Object.values(report.gates).every(status => status === 'BLOCKED'), true);
  assert.equal(report.issues.P1.some(issue => issue.code === 'REAL_DEVICE_UNAVAILABLE' && issue.productDefectConfirmed === false), true);
});

test('browser emulation is explicitly separated from phone GPS and installation evidence', () => {
  assert.equal(report.evidenceClasses.browser.includes('not a real phone'), true);
  assert.equal(report.evidenceClasses.permission.includes('not an OS permission test'), true);
  assert.deepEqual(report.browserEvidence.viewportWidths, [360, 390, 430]);
  assert.equal(report.realDeviceChecks.allow, 'BLOCKED');
  assert.equal(report.realDeviceChecks.install, 'BLOCKED');
  assert.equal(report.realDeviceChecks.backgroundForeground, 'BLOCKED');
  assert.match(doc.replaceAll('*', ''), /not real-device evidence/i);
});

test('report keeps privacy, safety, and no-deployment boundaries explicit', () => {
  assert.equal(report.browserEvidence.serviceWorker.privateCachedPaths.length, 0);
  assert.equal(report.codeReview.track.includes('localStorage'), true);
  assert.equal(report.codeReview.serverLocationWrite.includes('still required'), true);
  assert.equal(report.safety.safeRouteInference, 0);
  assert.deepEqual([report.git.staged, report.git.commit, report.git.push], [0, 0, 0]);
});

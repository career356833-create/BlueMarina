const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const evidence = read('reports/platform/admin-ui-final-qa-v1.json');
const report = JSON.parse(evidence);
const docs = read('docs/BLUE_MARINA_ADMIN_UI_FINAL_QA_V1.md');
const prior = JSON.parse(read('reports/platform/auth-returnto-admin-final-e2e-v1.json'));

test('QA token closure preserves the exposure history and verifies no active credential remains', () => {
  assert.equal(report.tokenIncident.exposureType, 'TRANSIENT_TOOL_OUTPUT_ACCESS_JWT');
  assert.equal(report.tokenIncident.incidentDecision, 'QA_TOKEN_INCIDENT_CLOSED');
  assert.equal(report.tokenIncident.secretPersistedToRepo, false);
  assert.equal(report.tokenIncident.secretPersistedToDocs, false);
  assert.equal(report.tokenIncident.qaUserBanned, true);
  assert.equal(report.tokenIncident.adminRolesPresent, 0);
  assert.equal(report.tokenIncident.authSessions, 0);
  assert.equal(report.tokenIncident.refreshTokens, 0);
  assert.equal(report.tokenIncident.exposedJwtPastExpiryAtVerification, true);
  assert.equal(report.tokenIncident.explicitRevokeOperationThisRun, true);
  assert.equal(report.tokenIncident.sessionRevokedThisRun, true);
  assert.doesNotMatch(evidence + docs, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(evidence + docs, /[a-z0-9._%+-]+@(gmail|naver|daum)\.com/i);
});

test('Operations health evidence distinguishes the protected deployment host from six public routes', () => {
  assert.equal(report.operationsHealth.deploymentHostInitialHttp, 302);
  assert.equal(report.operationsHealth.redirectDestinationHost, 'vercel.com');
  assert.deepEqual(report.operationsHealth.publicDomainDirectHttp, [200, 200, 200, 200, 200, 200]);
  assert.equal(report.operationsHealth.productionAuthenticatedCardStates, 'PASS_6_HEALTHY_HTTP_200');
  assert.equal(report.operationsHealth.browserCanvasGpsPwaInferredFromHttp, false);
  assert.match(docs, /authenticated Operations health API passed/i);
});

test('prior audit history remains intact while final QA points to its follow-up', () => {
  assert.equal(prior.admin.desktop1280x900, 'NOT_TESTED_NO_APPROVED_ACTIVE_IDENTITY');
  assert.equal(prior.followUp20261004.originalAuditPreserved, true);
  assert.equal(prior.followUp20261004.finalEvidence, 'reports/platform/admin-ui-final-qa-v1.json');
  assert.equal(report.p1.remaining, 0);
  assert.equal(report.integrity.publicQaCommunityPosts, 0);
  assert.equal(report.integrity.publicQaMarketListings, 0);
});

test('legacy key closure requires signing-key revocation and a rejected mixed-header request', () => {
  assert.equal(report.keyIncident.legacyApiKeysDisabled, true);
  assert.equal(report.keyIncident.previousHs256SigningKeyRevoked, true);
  assert.equal(report.keyIncident.legacyServiceJwtWithModernPublishableKeyHttp, 401);
  assert.equal(report.keyIncident.temporaryCredentialFileDeleted, true);
  assert.equal(report.verification.modernKeyE2e.passed, true);
  assert.deepEqual(report.verification.modernKeyE2e.cleanup, {globalSignOut:true, deletedDisposableUser:true});
  assert.equal(report.security.qaCleanup.qaAdminRoles, 0);
  assert.equal(report.security.qaCleanup.qaSessions, 0);
  assert.equal(report.security.qaCleanup.qaRefreshTokens, 0);
  assert.equal(prior.followUp20261005.originalAuditPreserved, true);
  assert.equal(report.priorAudit20261004.dateKst, '2026-10-04');
  assert.doesNotMatch(evidence + docs, /sb_secret_[A-Za-z0-9_-]{16,}/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const report = JSON.parse(
  fs.readFileSync(path.join(root, "reports/release/public-informational-final-gate-v1.json"), "utf8"),
);

test("holds the public informational release on the still-ineffective Kakao authorization", () => {
  assert.equal(report.decision, "PREVIEW_DEPLOYMENT_READY_WITH_LIMITATIONS");
  assert.equal(report.publicInformationalRelease, "PUBLIC_INFORMATIONAL_RELEASE_HOLD");
  assert.equal(report.kakao.sdkRequest.status, 401);
  assert.equal(report.kakao.sdkRequest.domainMismatched, true);
  assert.equal(report.kakao.runtime.windowKakaoMaps, false);
  assert.equal(report.kakao.runtime.mapRender, false);
  assert.equal(report.kakao.runtime.fallbackVisible, true);
});

test("keeps MapLibre navigation and its non-routing safety boundary explicit", () => {
  assert.equal(report.navigation.status, "PASS");
  assert.equal(report.navigation.desktop1280x900.mapLibreCanvas, true);
  assert.equal(report.navigation.mobile390x844.collapsedLayerControl, true);
  assert.equal(report.navigation.safety.safeRouteInference, 0);
  assert.equal(report.navigation.safety.landAvoidance, 0);
  assert.equal(report.navigation.safety.reefAvoidance, 0);
  assert.equal(report.navigation.safety.depthAvoidance, 0);
});

test("records responsive, SSO, PWA, and production-candidate limitations without claiming a deploy", () => {
  assert.equal(report.responsive.mobile390x844.horizontalOverflow, false);
  assert.equal(report.security.status, "PASS_WITH_LIMITATIONS");
  assert.match(report.security.directPreviewHttpLimitation, /Vercel SSO HTTP 302/);
  assert.equal(report.pwa.status, "PASS_WITH_LIMITATIONS");
  assert.equal(report.productionDeploymentCandidate, "NOT_READY");
  assert.equal(report.preview.productionTouched, false);
});

test("keeps all Git, database, activation, and deployment actions out of the gate", () => {
  assert.equal(report.preview.dbApply, 0);
  assert.equal(report.preview.backendActivation, 0);
  assert.equal(report.preview.redeploy, 0);
  assert.equal(report.git.staged, 0);
  assert.equal(report.git.commit, 0);
  assert.equal(report.git.push, 0);
  assert.equal(report.issues.P0.length, 0);
});

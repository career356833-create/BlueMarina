const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("reports/release/kakao-sdk-root-cause-audit-v1.json"));

test("pins the live Kakao domain-mismatch response without exposing a key", () => {
  assert.equal(report.rootCause.confidence, "HIGH");
  assert.equal(report.rootCause.evidence.status, 401);
  assert.equal(report.rootCause.evidence.bodyClassification, "DOMAIN_MISMATCHED");
  assert.equal(report.rootCause.evidence.deployedScript.appkeyPresent, true);
  assert.equal(report.environment.valueExposed, false);
});

test("keeps the Vercel Preview environment and client key contract explicit", () => {
  assert.equal(report.environment.keyName, "NEXT_PUBLIC_KAKAO_MAP_APP_KEY");
  assert.equal(report.environment.clientExposed, true);
  assert.equal(report.environment.vercelPreviewPresence, "PRESENT");
  assert.equal(report.environment.vercelProductionPresence, "PRESENT");
  assert.deepEqual(report.environment.vercelScopes, ["Preview", "Production"]);
});

test("records the deterministic loader flow and rules out a code fix", () => {
  const loader = read("src/lib/sea/kakao-maps.ts");
  const mapView = read("src/components/sea/MapView.tsx");
  assert.match(loader, /autoload=false/);
  assert.match(loader, /window\.kakao\.maps\.load/);
  assert.match(loader, /__blueMarinaKakaoMapPromise/);
  assert.match(mapView, /"use client"/);
  assert.equal(report.fix.codeChanges, 0);
  assert.equal(report.fix.type, "EXTERNAL_CONSOLE_CONFIGURATION");
});

test("holds release while retaining safety and Git boundaries", () => {
  assert.equal(report.decision, "KAKAO_ROOT_CAUSE_IDENTIFIED_EXTERNAL_ACTION_REQUIRED");
  assert.equal(report.publicInformationalRelease, "PUBLIC_INFORMATIONAL_RELEASE_HOLD");
  assert.equal(report.preview.productionTouched, false);
  assert.equal(report.preview.dbApply, 0);
  assert.equal(report.git.staged, 0);
  assert.equal(report.git.commit, 0);
  assert.equal(report.git.push, 0);
});

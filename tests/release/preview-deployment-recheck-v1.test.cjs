const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("reports/release/preview-deployment-recheck-v1.json"));

test("records a preview-only recheck without deployment promotion or backend activation", () => {
  assert.equal(report.recheck.target, "preview");
  assert.equal(report.recheck.productionTouched, false);
  assert.equal(report.recheck.dbApply, 0);
  assert.equal(report.recheck.backendActivation, 0);
  assert.equal(report.git.phaseBStaged, 0);
  assert.equal(report.git.phaseBCommit, 0);
  assert.equal(report.git.phaseBPush, 0);
});

test("documents the Kakao exact-origin policy without exposing or bypassing the key", () => {
  assert.equal(report.kakao.environmentVariable, "NEXT_PUBLIC_KAKAO_MAP_APP_KEY");
  assert.equal(report.kakao.keyValueRead, false);
  assert.equal(report.kakao.consoleChanged, false);
  assert.equal(report.kakao.sourceBypass, false);
  assert.match(report.kakao.requiredConsoleAction, /https:\/\/blue-marina-btoin4yw9-chiweon\.vercel\.app/);
  assert.match(report.kakao.stablePreviewAssessment, /production deployment/);
});

test("preserves the safe Kakao failure path and missing-spot notFound contract", () => {
  const loader = read("src/lib/sea/kakao-maps.ts");
  const detail = read("src/app/fishing-spots/[id]/page.tsx");
  assert.match(loader, /Kakao Maps SDK load failed/);
  assert.match(loader, /dapi\.kakao\.com\/v2\/maps\/sdk\.js/);
  assert.match(detail, /if \(!spot\) notFound\(\)/);
  assert.equal(report.p2UnknownFishingSpot.previewHttpStatus, 200);
  assert.equal(report.p2UnknownFishingSpot.indexing, "noindex");
});

test("keeps public release held only on the unresolved map authorization blocker", () => {
  assert.equal(report.decision, "PREVIEW_DEPLOYMENT_READY_WITH_LIMITATIONS");
  assert.equal(report.publicInformationalRelease, "PUBLIC_INFORMATIONAL_RELEASE_HOLD");
  assert.equal(report.checks.kakaoMap, "BLOCKED");
  assert.equal(report.issues.P0.length, 0);
  assert.equal(report.issues.P1[0].id, "PREVIEW-RECHECK-001");
});

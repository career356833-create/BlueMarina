const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("reports/release/preview-deployment-rehearsal-v1.json"));

test("records a preview-only deployment without production or database activation", () => {
  assert.equal(report.deployment.target, "preview");
  assert.equal(report.deployment.productionTouched, false);
  assert.equal(report.deployment.dbApply, 0);
  assert.equal(report.deployment.backendActivation, 0);
  assert.match(report.deployment.url, /^https:\/\/blue-marina-[a-z0-9-]+-chiweon\.vercel\.app$/);
});

test("keeps preview indexing and backend boundaries explicit", () => {
  assert.equal(report.seo.previewXRobotsTag, "noindex");
  assert.equal(report.seo.canonical.includes("no localhost"), true);
  assert.equal(report.environment.NEXT_PUBLIC_SITE_URL, "MISSING");
  assert.equal(report.environment.backendFeatureFlags, "NOT_CONFIGURED_DEFAULT_OFF");
  assert.equal(report.headers.apiXRobotsTag, "noindex, nofollow");
});

test("protects invalid detail metadata and reservation response caching", () => {
  const detail = read("src/app/fishing-spots/[id]/page.tsx");
  const config = read("next.config.ts");
  assert.match(detail, /if \(!spot\) notFound\(\)/);
  assert.match(config, /source: "\/reservations"/);
  assert.match(config, /private, no-store, max-age=0, must-revalidate/);
});

test("keeps the known map and PWA limitations reviewable", () => {
  assert.equal(report.gates.map, "BLOCKED");
  assert.equal(report.issues.P1[0].id, "PREVIEW-001");
  assert.equal(report.pwa.registrationAndCacheStorage.startsWith("NOT_VERIFIED"), true);
});

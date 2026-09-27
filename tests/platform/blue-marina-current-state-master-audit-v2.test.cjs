const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const report = JSON.parse(read("reports/platform/blue-marina-current-state-master-audit-v2.json"));
const docs = read("docs/BLUE_MARINA_CURRENT_STATE_MASTER_AUDIT_V2.md");
const roadmap = read("docs/BLUE_MARINA_NEXT_PRIORITY_ROADMAP_V2.md");

test("feature classifications use the requested taxonomy exactly once", () => {
  const ids = ["HOME", "TODAY_SEA", "SEA_MAP", "NAVIGATION", "FISHING_SPOTS", "CONDITIONS", "FISH", "CHARTER", "MARKET", "COMMUNITY", "GUIDE", "ACCOUNT", "OPERATIONS"];
  assert.deepEqual(report.featureMatrix.map((x) => x.id), ids);
  assert.ok(report.featureMatrix.every((x) => report.featureStateEnum.includes(x.state)));
  for (const id of ["CHARTER", "MARKET", "COMMUNITY", "ACCOUNT", "OPERATIONS"]) {
    assert.equal(report.featureMatrix.find((x) => x.id === id).state, "BLOCKED");
  }
});

test("Production deployment is explicitly distinguished from Git and Preview", () => {
  assert.equal(report.git.head, report.git.originMain);
  assert.equal(report.production.deployedGitSha, report.git.head);
  assert.equal(report.production.status, "READY");
  assert.match(report.production.deploymentId, /^dpl_/);
  assert.equal(report.production.deployedThisAudit, false);
  assert.equal(report.preview.currentLiveQa, "NOT_RETESTED");
});

test("route inventory is complete and backed by current page source", () => {
  assert.equal(report.routeInventory.length, 36);
  assert.equal(new Set(report.routeInventory.map((x) => x.path)).size, 36);
  for (const route of report.routeInventory) {
    const sourcePath = path.join(root, "src/app", route.path === "/" ? "" : route.path, "page.tsx");
    assert.ok(fs.existsSync(sourcePath), sourcePath);
    assert.equal(route.sourceExists, true);
    assert.equal(route.buildExists, true);
  }
  assert.equal(report.fishingSpots.invalidIdHttp, 404);
  assert.equal(report.routeInventory.find((x) => x.path === "/admin/operations").productionHttp, 404);
});

test("dataset totals reconcile with versioned main artifacts rather than public page counts", () => {
  const spots = JSON.parse(read("src/data/fishing-spots.json"));
  const canonical = JSON.parse(read("data/fish-canonical/bulk/v1/canonical-inventory-v1.json"));
  const profiles = [
    ...JSON.parse(read("data/fishing-condition/profiles/v1/batch-a-19.json")).profiles,
    ...JSON.parse(read("data/fishing-condition/profiles/v1/batch-b-19.json")).profiles,
  ];
  assert.equal(spots.length, report.dataCounts.fishingSpots.total);
  assert.equal(spots.filter((x) => x.type === "boat-fishing-point").length, report.dataCounts.fishingSpots.boat);
  assert.equal(spots.filter((x) => x.type === "rock-fishing-point").length, report.dataCounts.fishingSpots.rock);
  assert.equal(canonical.species.length, report.dataCounts.fishCanonical.total);
  for (const [status, key] of [["VERIFIED", "verified"], ["PARTIAL", "partial"], ["CONFLICT", "conflict"]]) {
    assert.equal(canonical.species.filter((x) => x.identityStatus === status).length, report.dataCounts.fishCanonical[key]);
  }
  assert.equal(profiles.length, report.dataCounts.conditionProfiles.total);
  assert.equal(report.dataCounts.fishPublicGuide.total, 336);
  assert.notEqual(report.dataCounts.fishPublicGuide.total, report.dataCounts.fishCanonical.total);
});

test("Charter targets are not misreported as contacts or publication", () => {
  const tracker = read("data/charters/partners/v1/partner-outreach-tracker.csv").trim().split(/\r?\n/);
  assert.equal(tracker.length - 1, report.charter.outreachTargets);
  assert.ok(tracker.slice(1).every((row) => row.includes('"NOT_CONTACTED"') && row.endsWith('"PENDING"')));
  for (const k of ["contacted", "responses", "submissions", "approved", "published"]) assert.equal(report.charter[k], 0);
  assert.equal(report.charter.publicInfoReuseApproved.PENDING, 20);
  assert.equal(report.business.marketPublicListings, 0);
  assert.equal(report.business.communityPublicPosts, 0);
  assert.equal(report.business.marketSellers, "UNKNOWN");
});

test("remote DB status and private-user metrics remain unknown without credentials", () => {
  for (const domain of ["charter", "market", "account"]) {
    assert.ok(fs.existsSync(path.join(root, "supabase/migrations", report.database.domainMigrations[domain])));
    assert.equal(report.database.remoteApplied[domain], "UNKNOWN");
  }
  assert.equal(report.database.remoteProjectBinding, "UNIDENTIFIED");
  assert.equal(report.account.authenticatedUserCount, "UNKNOWN");
  assert.equal(report.operations.adminAccountExists, "UNKNOWN");
  assert.equal(report.flags.NEXT_PUBLIC_SUPABASE_URL, "ABSENT");
  assert.equal(report.invariants.dbApply, 0);
});

test("roadmap has one primary priority and at most five distinct actions", () => {
  assert.equal(report.nextPrimaryPriority, "VERIFIED_CHARTER_SUPPLY_AND_INQUIRY_LAUNCH");
  assert.equal(report.charterPriorityDecision, "KEEP_CHARTER_AS_PRIMARY");
  assert.equal((roadmap.match(/\| (?:\*\*1\*\*|[2-5]) \|/g) || []).length, 5);
  assert.equal((roadmap.match(/\[NEXT PRIMARY PRIORITY\]/g) || []).length, 1);
  assert.match(roadmap, /현재 실적 아님/);
});

test("audit retains non-activation and physical-device limitations", () => {
  assert.equal(report.qa.realDeviceGpsPwa, "BLOCKED_NO_DEVICE");
  assert.equal(report.productionSources.find((x) => x.id === "FEMO").productionState, "DISABLED");
  assert.equal(report.productionSources.find((x) => x.id === "RISA").productionState, "ACTIVE_WITH_LIMITATIONS");
  assert.equal(report.release.securityHeaders.unsafeEvalAllowed, false);
  for (const key of ["newFeature", "productionDeploy", "dbApply", "partnerContact", "productionPromotion", "stage", "commit", "push"]) {
    assert.equal(report.invariants[key], 0);
  }
  assert.match(docs, /실기기 GPS\/PWA PASS가 아니다/);
  assert.doesNotMatch(read("reports/platform/blue-marina-current-state-master-audit-v2.json"), /sk_[a-zA-Z0-9]{20,}/);
});

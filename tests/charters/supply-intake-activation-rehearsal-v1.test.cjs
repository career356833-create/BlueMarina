const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("reports/charters/supply-intake-activation-rehearsal-v1.json"));

test("records a blocked rehearsal without claiming a live environment", () => {
  assert.equal(report.decision, "SUPPLY_INTAKE_REHEARSAL_BLOCKED");
  assert.equal(report.environment.selected, null);
  assert.equal(report.environment.classification, "UNKNOWN");
  assert.equal(report.environment.local.available, false);
  assert.equal(report.environment.staging.identified, false);
});

test("preserves the required baseline identity", () => {
  const expected = "ac6f4bf18c633c6b4763a3186408e910d389980c";
  assert.equal(report.baseline.branch, "main");
  assert.equal(report.baseline.head, expected);
  assert.equal(report.baseline.originMain, expected);
  assert.equal(report.baseline.matched, true);
});

test("records no local or remote migration application", () => {
  assert.equal(report.migration.applied, false);
  assert.equal(report.migration.tablesExpected, 4);
  assert.equal(report.migration.tablesVerifiedLive, 0);
  assert.equal(report.environment.remoteApply, false);
  assert.equal(report.security.remoteProductionDatabaseApply, 0);
});

test("does not convert blocked checks into false live-pass claims", () => {
  for (const section of [
    "auth",
    "featureFlag",
    "submission",
    "validation",
    "adminReview",
    "bulkImport",
    "idempotency",
    "crosswalk",
    "promotionCandidate",
    "security",
    "auditLog"
  ]) assert.equal(report[section].result, "NOT_EXECUTED_ENVIRONMENT_BLOCKED", section);
  assert.equal(report.idempotency.duplicateSubmissions, null);
});

test("records zero production activation and crosswalk auto approval", () => {
  assert.equal(report.crosswalk.autoApproval, 0);
  assert.equal(report.promotionCandidate.productionActivated, 0);
  assert.equal(report.security.productionRegistryMutation, 0);
  assert.equal(report.environment.production.touched, false);
});

test("creates no rehearsal actors or rows when environment setup is blocked", () => {
  assert.equal(report.auth.normalUserCreated, false);
  assert.equal(report.auth.charterAdminCreated, false);
  assert.equal(report.cleanup.rehearsalActorsCreated, 0);
  assert.equal(report.cleanup.rehearsalRowsCreated, 0);
  assert.equal(report.cleanup.cleanupRequired, false);
});

test("keeps the target migration and its four-table RLS boundary intact", () => {
  const sql = read(report.migration.path);
  for (const table of [
    "charter_supply_submissions",
    "charter_supply_reviews",
    "charter_supply_promotion_candidates",
    "charter_supply_audit_logs"
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /revoke all .* anon, authenticated/s);
});

test("documents credentials, environment, and production boundaries", () => {
  const docs = read("docs/BLUE_MARINA_CHARTER_SUPPLY_INTAKE_ACTIVATION_REHEARSAL_V1.md");
  assert.match(docs, /SUPPLY_INTAKE_REHEARSAL_BLOCKED/);
  assert.match(docs, /Credentials policy/);
  assert.match(docs, /production was not touched/i);
  assert.match(docs, /NOT_EXECUTED_ENVIRONMENT_BLOCKED/);
});

test("leaves the production Charter registry empty", () => {
  assert.match(
    read("src/lib/charters/registry.ts"),
    /operators: \[\], boats: \[\], ports: \[\], charters: \[\], schedules: \[\]/
  );
});

test("records the completed repository verification and zero Git publication", () => {
  assert.deepEqual(report.verification.targeted, { passed: 10, total: 10 });
  assert.deepEqual(report.verification.allTests, { passed: 931, total: 931 });
  assert.equal(report.verification.typecheck, "PASS");
  assert.equal(report.verification.lint, "PASS");
  assert.equal(report.verification.build, "PASS");
  assert.equal(report.verification.diffCheck, "PASS");
  assert.deepEqual(
    { staged: report.git.staged, commits: report.git.commits, pushes: report.git.pushes },
    { staged: 0, commits: 0, pushes: 0 }
  );
});

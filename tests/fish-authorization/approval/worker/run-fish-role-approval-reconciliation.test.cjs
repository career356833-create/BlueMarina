const assert = require("node:assert/strict");
const test = require("node:test");
const { load } = require("../../worker/_load.cjs");

const { runFishRoleApprovalReconciliation, readFishRoleApprovalReconciliationWorkerEnabled } = load("src/server/fish-authorization/run-fish-role-approval-reconciliation.ts");
const { FakeFishRoleClock } = load("src/domain/fish-authorization/testing/fake-fish-role-clock.ts");
const { InMemoryFishRoleApprovalAuditLog } = load("src/domain/fish-authorization/testing/in-memory-fish-role-approval-audit-log.ts");
const { fishRoleApprovalReconciliationInventoryFixture } = load("src/domain/fish-authorization/testing/fish-role-approval-reconciliation-fixtures.ts");

test("feature flag defaults to false and dry-run does not require a writer", async () => {
  assert.equal(readFishRoleApprovalReconciliationWorkerEnabled({}), false);
  const audit = new InMemoryFishRoleApprovalAuditLog();
  const clock = new FakeFishRoleClock(new Date("2026-08-04T00:20:00.000Z"));
  const result = await runFishRoleApprovalReconciliation({
    batchSize: 10,
    workerId: "worker",
    maxRuntimeMs: 1000,
    inventory: fishRoleApprovalReconciliationInventoryFixture(),
  }, { audit, clock });
  assert.equal(result.mode, "dry_run");
  assert.equal(result.candidates, 1);
  assert.equal(audit.events[0].type, "approval_reconciliation_batch_started");
});

test("live execution requires the worker and enabled flag", async () => {
  await assert.rejects(() => runFishRoleApprovalReconciliation({
    batchSize: 10,
    workerId: "worker",
    maxRuntimeMs: 1000,
    dryRun: false,
    inventory: fishRoleApprovalReconciliationInventoryFixture(),
  }, {}), /FISH_ROLE_APPROVAL_RECONCILIATION_DISABLED|FISH_ROLE_APPROVAL_RECONCILIATION_DEPENDENCY_MISSING/);
});

test("live execution delegates to the worker", async () => {
  const audit = new InMemoryFishRoleApprovalAuditLog();
  const clock = new FakeFishRoleClock(new Date("2026-08-04T00:20:00.000Z"));
  const calls = [];
  const writer = {
    async consumeApproval() { calls.push("consume"); },
    async releaseApproval() { calls.push("release"); },
    async markExpired() { calls.push("expire"); },
    async markManualReview() { calls.push("manual"); },
  };
  const result = await runFishRoleApprovalReconciliation({
    batchSize: 10,
    workerId: "worker",
    maxRuntimeMs: 1000,
    dryRun: false,
    inventory: fishRoleApprovalReconciliationInventoryFixture(),
  }, { enabled: true, audit, clock, writer });
  assert.equal(result.mode, "execute");
  assert.equal(calls.includes("consume"), true);
});

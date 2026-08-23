const assert = require("node:assert/strict");
const test = require("node:test");
const { load } = require("../../worker/_load.cjs");

const { FishRoleApprovalReconciliationWorker } = load("src/domain/fish-authorization/approval/worker/fish-role-approval-reconciliation-worker.ts");
const { FakeFishRoleClock } = load("src/domain/fish-authorization/testing/fake-fish-role-clock.ts");
const { InMemoryFishRoleApprovalAuditLog } = load("src/domain/fish-authorization/testing/in-memory-fish-role-approval-audit-log.ts");
const { fishRoleApprovalReconciliationInventoryFixture, fishRoleApprovalReconciliationApproval, fishRoleApprovalReconciliationOperation, fishRoleApprovalReconciliationWriterFixture } = load("src/domain/fish-authorization/testing/fish-role-approval-reconciliation-fixtures.ts");

function workerWith(calls = []) {
  const audit = new InMemoryFishRoleApprovalAuditLog();
  const clock = new FakeFishRoleClock(new Date("2026-08-04T00:20:00.000Z"));
  const writer = {
    async consumeApproval(approvalId, operationId, expectedVersion) { calls.push(["consume", approvalId, operationId, expectedVersion]); },
    async releaseApproval(approvalId, operationId) { calls.push(["release", approvalId, operationId]); },
    async markExpired(approvalId, operationId) { calls.push(["expire", approvalId, operationId]); },
    async markManualReview(approvalId, operationId, reasonCode) { calls.push(["manual", approvalId, operationId, reasonCode]); },
  };
  return { audit, clock, writer, worker: new FishRoleApprovalReconciliationWorker({ audit, clock, writer }) };
}

test("dry-run classifies completed, failed, missing and binding-mismatch approvals", async () => {
  const { audit, clock, worker } = workerWith();
  const inventory = fishRoleApprovalReconciliationInventoryFixture({
    approvals: [
      fishRoleApprovalReconciliationApproval("APPROVAL-0001", { status: "consumption_pending", consumedByOperationId: "op-1" }),
      fishRoleApprovalReconciliationApproval("APPROVAL-0002", { approvalId: "approval-2", status: "consumption_pending", consumedByOperationId: "op-2", targetUserId: "target-2" }),
      fishRoleApprovalReconciliationApproval("APPROVAL-0003", { approvalId: "approval-3", status: "approved", targetUserId: "target-3", consumedByOperationId: null, expiresAt: "2026-08-04T00:10:00.000Z" }),
      fishRoleApprovalReconciliationApproval("APPROVAL-0004", { approvalId: "approval-4", status: "consumed", consumedByOperationId: "op-4", targetUserId: "target-4" }),
    ],
    operations: [
      fishRoleApprovalReconciliationOperation({ operationId: "op-1", approvalId: "approval-1", targetUserId: "target", status: "completed" }),
      fishRoleApprovalReconciliationOperation({ operationId: "op-2", approvalId: "approval-2", targetUserId: "target-2", status: "failed" }),
      fishRoleApprovalReconciliationOperation({ operationId: "op-4", approvalId: "approval-4", targetUserId: "target-4", status: "pending" }),
      fishRoleApprovalReconciliationOperation({ operationId: "op-5", approvalId: "approval-3", targetUserId: "target-9", status: "completed" }),
    ],
  });
  const result = await worker.run({ batchSize: 10, workerId: "worker-1", maxRuntimeMs: 1000, dryRun: true }, inventory);
  assert.equal(result.mode, "dry_run");
  assert.equal(result.consumed >= 1, true);
  assert.equal(result.released >= 1, true);
  assert.equal(result.manualReview >= 1, true);
  assert.equal(result.bindingMismatches >= 1, true);
  assert.equal(audit.events[0].type, "approval_reconciliation_batch_started");
  assert.equal(audit.events.some((event) => event.type === "approval_binding_mismatch_detected"), true);
  assert.equal(audit.events.at(-1).type, "approval_reconciliation_batch_finished");
  assert.equal(clock.now().toISOString(), "2026-08-04T00:20:00.000Z");
});

test("live execution consumes, releases and marks manual review without leaking raw approval references", async () => {
  const calls = [];
  const { audit, clock, writer, worker } = workerWith(calls);
  const inventory = fishRoleApprovalReconciliationInventoryFixture({
    approvals: [
      fishRoleApprovalReconciliationApproval("APPROVAL-0001", { status: "consumption_pending", consumedByOperationId: "op-1" }),
      fishRoleApprovalReconciliationApproval("APPROVAL-0002", { approvalId: "approval-2", status: "consumption_pending", consumedByOperationId: "op-2", targetUserId: "target-2" }),
      fishRoleApprovalReconciliationApproval("APPROVAL-0003", { approvalId: "approval-3", status: "approved", targetUserId: "target-3", consumedByOperationId: null }),
    ],
    operations: [
      fishRoleApprovalReconciliationOperation({ operationId: "op-1", approvalId: "approval-1", status: "completed" }),
      fishRoleApprovalReconciliationOperation({ operationId: "op-2", approvalId: "approval-2", targetUserId: "target-2", status: "failed" }),
      fishRoleApprovalReconciliationOperation({ operationId: "op-9", approvalId: "approval-3", targetUserId: "target-x", status: "completed" }),
    ],
  });
  const result = await worker.run({ batchSize: 10, workerId: "worker-2", maxRuntimeMs: 1000, dryRun: false }, inventory);
  assert.equal(result.mode, "execute");
  assert.equal(calls.some((call) => call[0] === "consume"), true);
  assert.equal(calls.some((call) => call[0] === "release"), true);
  assert.equal(calls.some((call) => call[0] === "manual"), true);
  assert.equal(JSON.stringify(audit.events).includes("APPROVAL-0001"), false);
  assert.equal(JSON.stringify(audit.events).includes("APPROVAL-0002"), false);
  assert.equal(JSON.stringify(audit.events).includes("APPROVAL-0003"), false);
  assert.equal(result.aborted, false);
});

test("multiple operations bound to one approval are manual review", async () => {
  const { worker } = workerWith([]);
  const inventory = fishRoleApprovalReconciliationInventoryFixture({
    approvals: [fishRoleApprovalReconciliationApproval("APPROVAL-0001", { status: "approved" })],
    operations: [
      fishRoleApprovalReconciliationOperation({ operationId: "op-1", approvalId: "approval-1" }),
      fishRoleApprovalReconciliationOperation({ operationId: "op-2", approvalId: "approval-1" }),
    ],
  });
  const result = await worker.run({ batchSize: 10, workerId: "worker-3", maxRuntimeMs: 1000, dryRun: true }, inventory);
  assert.equal(result.manualReview, 1);
  assert.equal(result.findings[0].reason, "multiple_operation_conflict");
});

import { createHash } from "node:crypto";
import type { FishRoleApprovalRecord } from "../approval/types";
import type { FishRoleApprovalReconciliationInventory, FishRoleApprovalReconciliationOperationSnapshot, FishRoleApprovalReconciliationWriter } from "../approval/worker";

export function fishRoleApprovalReconciliationApproval(reference = "APPROVAL-0001", changes: Partial<FishRoleApprovalRecord> = {}): FishRoleApprovalRecord {
  return {
    approvalId: "approval-1",
    referenceHash: createHash("sha256").update(reference).digest("hex"),
    action: "grant",
    targetUserId: "target",
    requestedRole: "fish_reviewer",
    targetIdentityType: "human_user",
    requestedBy: "requester",
    approvedBy: "approver",
    approvedAt: "2026-08-04T00:00:00.000Z",
    expiresAt: "2026-08-04T01:00:00.000Z",
    status: "consumption_pending",
    scope: "fish_role",
    version: 1,
    consumedByOperationId: "op-1",
    ...changes,
  };
}

export function fishRoleApprovalReconciliationOperation(changes: Partial<FishRoleApprovalReconciliationOperationSnapshot> = {}): FishRoleApprovalReconciliationOperationSnapshot {
  return {
    operationId: "op-1",
    approvalId: "approval-1",
    targetUserId: "target",
    action: "grant",
    requestedRole: "fish_reviewer",
    targetIdentityType: "human_user",
    status: "completed",
    version: 1,
    updatedAt: "2026-08-04T00:10:00.000Z",
    completedAt: "2026-08-04T00:10:00.000Z",
    consumedApprovalVersion: null,
    ...changes,
  };
}

export function fishRoleApprovalReconciliationInventoryFixture(changes: {
  approvals?: FishRoleApprovalRecord[];
  operations?: FishRoleApprovalReconciliationOperationSnapshot[];
} = {}): FishRoleApprovalReconciliationInventory {
  return {
    approvals: changes.approvals ?? [fishRoleApprovalReconciliationApproval()],
    operations: changes.operations ?? [fishRoleApprovalReconciliationOperation()],
  };
}

export function fishRoleApprovalReconciliationWriterFixture() {
  const calls: Array<{ type: string; approvalId: string; operationId: string | null; expectedVersion?: number; reasonCode?: string }> = [];
  const writer: FishRoleApprovalReconciliationWriter = {
    async consumeApproval(approvalId, operationId, expectedVersion) { calls.push({ type: "consume", approvalId, operationId, expectedVersion }); },
    async releaseApproval(approvalId, operationId) { calls.push({ type: "release", approvalId, operationId }); },
    async markExpired(approvalId, operationId) { calls.push({ type: "expire", approvalId, operationId }); },
    async markManualReview(approvalId, operationId, reasonCode) { calls.push({ type: "manual", approvalId, operationId, reasonCode }); },
  };
  return { writer, calls };
}

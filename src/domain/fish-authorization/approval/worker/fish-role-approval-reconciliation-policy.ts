import type { FishRoleApprovalRecord } from "../types";
import type { FishRoleApprovalReconciliationOperationSnapshot } from "./types";

const staleThresholdByRole: Record<string, number> = {
  fish_admin: 5 * 60_000,
  fish_reviewer: 30 * 60_000,
  fish_crawler: 15 * 60_000,
};

export function fishRoleApprovalReconciliationStaleAfterMs(record: FishRoleApprovalRecord) {
  return staleThresholdByRole[record.requestedRole ?? "fish_reviewer"] ?? 15 * 60_000;
}

export function isFishRoleApprovalReconciliationStale(record: FishRoleApprovalRecord, now: Date) {
  return new Date(record.approvedAt).getTime() + fishRoleApprovalReconciliationStaleAfterMs(record) <= now.getTime();
}

export function isFishRoleApprovalExpired(record: FishRoleApprovalRecord, now: Date) {
  return new Date(record.expiresAt).getTime() <= now.getTime();
}

export function isFishRoleApprovalBindingAligned(record: FishRoleApprovalRecord, operation: FishRoleApprovalReconciliationOperationSnapshot) {
  return record.targetUserId === operation.targetUserId && record.action === operation.action && record.requestedRole === operation.requestedRole && record.targetIdentityType === operation.targetIdentityType;
}

export function chooseOperationForApproval(record: FishRoleApprovalRecord, operations: FishRoleApprovalReconciliationOperationSnapshot[]) {
  const matching = operations.filter((operation) => operation.approvalId === record.approvalId || operation.operationId === record.consumedByOperationId);
  if (matching.length === 0) return { operation: null, conflict: false };
  if (matching.length > 1) return { operation: matching[0] ?? null, conflict: true };
  return { operation: matching[0] ?? null, conflict: false };
}

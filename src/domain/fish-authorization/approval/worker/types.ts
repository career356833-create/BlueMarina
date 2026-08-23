import type { FishRoleAction, FishRoleIdentityType } from "../../application/types";
import type { FishRoleOrNone } from "../../drafts/fish-role";
import type { FishRoleClock } from "../../ports/fish-role-clock";
import type { FishRoleApprovalRecord } from "../types";

export type FishRoleApprovalReconciliationOperationStatus = "pending" | "completed" | "failed" | "cancelled" | "unknown";

export type FishRoleApprovalReconciliationOperationSnapshot = {
  operationId: string;
  approvalId: string | null;
  targetUserId: string;
  action: FishRoleAction;
  requestedRole: FishRoleOrNone;
  targetIdentityType: FishRoleIdentityType;
  status: FishRoleApprovalReconciliationOperationStatus;
  version: number;
  updatedAt: string;
  completedAt: string | null;
  consumedApprovalVersion: number | null;
};

export type FishRoleApprovalReconciliationInventory = {
  approvals: FishRoleApprovalRecord[];
  operations: FishRoleApprovalReconciliationOperationSnapshot[];
};

export type FishRoleApprovalReconciliationFindingCode =
  | "approval_stale_pending_detected"
  | "approval_consumption_completed"
  | "approval_reservation_released"
  | "approval_marked_expired"
  | "approval_manual_review_required"
  | "approval_binding_mismatch_detected"
  | "approval_multiple_operation_conflict"
  | "approval_reconciliation_failed";

export type FishRoleApprovalReconciliationFinding = {
  code: FishRoleApprovalReconciliationFindingCode;
  approvalId: string | null;
  operationId: string | null;
  targetUserId: string;
  automatic: boolean;
  reason: string;
};

export type FishRoleApprovalReconciliationBatchResult = {
  mode: "dry_run" | "execute";
  candidates: number;
  inspected: number;
  consumed: number;
  released: number;
  expired: number;
  manualReview: number;
  bindingMismatches: number;
  skipped: number;
  durationMs: number;
  aborted: boolean;
  errorCode?: string;
  findings: FishRoleApprovalReconciliationFinding[];
};

export type FishRoleApprovalReconciliationAuditEvent = {
  type:
    | "approval_reconciliation_batch_started"
    | "approval_stale_pending_detected"
    | "approval_consumption_completed"
    | "approval_reservation_released"
    | "approval_marked_expired"
    | "approval_manual_review_required"
    | "approval_binding_mismatch_detected"
    | "approval_multiple_operation_conflict"
    | "approval_reconciliation_failed"
    | "approval_reconciliation_batch_finished";
  at: string;
  approvalId?: string | null;
  operationId?: string | null;
  targetUserId?: string | null;
  workerId?: string;
  errorCode?: string;
  reason?: string;
};

export interface FishRoleApprovalReconciliationAuditLog {
  append(event: FishRoleApprovalReconciliationAuditEvent): Promise<void>;
}

export type FishRoleApprovalReconciliationWriter = {
  consumeApproval(approvalId: string, operationId: string, expectedVersion: number): Promise<void>;
  releaseApproval(approvalId: string, operationId: string): Promise<void>;
  markExpired(approvalId: string, operationId: string): Promise<void>;
  markManualReview(approvalId: string, operationId: string | null, reasonCode: string): Promise<void>;
};

export type FishRoleApprovalReconciliationWorkerDependencies = {
  audit: FishRoleApprovalReconciliationAuditLog;
  clock: FishRoleClock;
  writer?: FishRoleApprovalReconciliationWriter;
};

import type { FishRoleApprovalRecord } from "../types";
import { FishRoleApprovalError } from "../fish-role-approval-errors";
import { chooseOperationForApproval, isFishRoleApprovalBindingAligned, isFishRoleApprovalExpired, isFishRoleApprovalReconciliationStale } from "./fish-role-approval-reconciliation-policy";
import { createFishRoleApprovalReconciliationBatchResult, pushFinding } from "./fish-role-approval-reconciliation-result";
import type {
  FishRoleApprovalReconciliationBatchResult,
  FishRoleApprovalReconciliationFinding,
  FishRoleApprovalReconciliationInventory,
  FishRoleApprovalReconciliationWorkerDependencies,
} from "./types";

export type FishRoleApprovalReconciliationWorkerInput = {
  batchSize: number;
  workerId: string;
  maxRuntimeMs: number;
  dryRun?: boolean;
};

type ReconciliationPlan = {
  approval: FishRoleApprovalRecord;
  operationId: string | null;
  action: "consume" | "release" | "expire" | "manual_review" | "skip";
  automatic: boolean;
  reason: string;
  errorCode?: string;
};

export class FishRoleApprovalReconciliationWorker {
  constructor(private readonly deps: FishRoleApprovalReconciliationWorkerDependencies) {}

  async run(input: FishRoleApprovalReconciliationWorkerInput, inventory: FishRoleApprovalReconciliationInventory): Promise<FishRoleApprovalReconciliationBatchResult> {
    const startedAt = this.deps.clock.now();
    const dryRun = input.dryRun ?? true;
    const result = createFishRoleApprovalReconciliationBatchResult(dryRun ? "dry_run" : "execute");
    await this.audit({
      type: "approval_reconciliation_batch_started",
      at: startedAt.toISOString(),
      workerId: input.workerId,
    });

    const approvals = [...inventory.approvals].sort((left, right) => {
      const leftAt = new Date(left.approvedAt).getTime();
      const rightAt = new Date(right.approvedAt).getTime();
      if (leftAt !== rightAt) return leftAt - rightAt;
      return left.approvalId.localeCompare(right.approvalId);
    }).slice(0, input.batchSize);
    result.candidates = approvals.length;
    const plans = approvals.map((approval) => this.planApproval(approval, inventory));

    for (const plan of plans) {
      if (this.deps.clock.now().getTime() - startedAt.getTime() >= input.maxRuntimeMs) {
        result.skipped += 1;
        continue;
      }
      result.inspected += 1;
      if (plan.action === "skip") {
        result.skipped += 1;
        continue;
      }
      const finding = this.planToFinding(plan);
      pushFinding(result, finding);
      await this.audit({
        type: finding.code,
        at: this.deps.clock.now().toISOString(),
        approvalId: finding.approvalId,
        operationId: finding.operationId,
        targetUserId: finding.targetUserId,
        workerId: input.workerId,
        reason: finding.reason,
      });
      if (dryRun) continue;
      try {
        await this.applyPlan(plan);
      } catch (cause) {
        result.aborted = true;
        result.errorCode = cause instanceof Error ? cause.name : "FISH_ROLE_APPROVAL_RECONCILIATION_FAILED";
        await this.audit({
          type: "approval_reconciliation_failed",
          at: this.deps.clock.now().toISOString(),
          approvalId: plan.approval.approvalId,
          operationId: plan.operationId,
          targetUserId: plan.approval.targetUserId,
          workerId: input.workerId,
          errorCode: result.errorCode,
          reason: plan.reason,
        });
        break;
      }
    }

    result.durationMs = Math.max(0, this.deps.clock.now().getTime() - startedAt.getTime());
    await this.audit({
      type: "approval_reconciliation_batch_finished",
      at: this.deps.clock.now().toISOString(),
      workerId: input.workerId,
      errorCode: result.errorCode,
    });
    return result;
  }

  private planApproval(approval: FishRoleApprovalRecord, inventory: FishRoleApprovalReconciliationInventory): ReconciliationPlan {
    const { operation, conflict } = chooseOperationForApproval(approval, inventory.operations);
    if (conflict) {
      return { approval, operationId: operation?.operationId ?? null, action: "manual_review", automatic: false, reason: "multiple_operation_conflict", errorCode: "FISH_ROLE_APPROVAL_MULTIPLE_OPERATION_CONFLICT" };
    }
    if (!operation) {
      if (approval.status === "approved" && isFishRoleApprovalExpired(approval, this.deps.clock.now())) return { approval, operationId: null, action: "expire", automatic: false, reason: "approval_expired_without_operation" };
      if (approval.status === "consumption_pending") return { approval, operationId: null, action: "manual_review", automatic: false, reason: "stale_pending_without_operation" };
      return { approval, operationId: null, action: "skip", automatic: true, reason: "no_operation_binding" };
    }
    if (!isFishRoleApprovalBindingAligned(approval, operation)) {
      return { approval, operationId: operation.operationId, action: "manual_review", automatic: false, reason: "binding_mismatch", errorCode: "FISH_ROLE_APPROVAL_BINDING_MISMATCH" };
    }
    if (approval.status === "consumption_pending") {
      if (operation.status === "completed") return { approval, operationId: operation.operationId, action: "consume", automatic: true, reason: "completed_operation" };
      if (operation.status === "failed" || operation.status === "cancelled") return { approval, operationId: operation.operationId, action: "release", automatic: true, reason: "operation_failed_or_cancelled" };
      if (isFishRoleApprovalReconciliationStale(approval, this.deps.clock.now())) return { approval, operationId: operation.operationId, action: "manual_review", automatic: false, reason: "stale_pending_operation_not_terminal" };
      return { approval, operationId: operation.operationId, action: "skip", automatic: true, reason: "operation_still_in_flight" };
    }
    if (approval.status === "approved") {
      if (operation.status === "completed") return { approval, operationId: operation.operationId, action: "consume", automatic: true, reason: "completed_operation_without_reservation" };
      if (operation.status === "failed" || operation.status === "cancelled") return { approval, operationId: operation.operationId, action: "skip", automatic: true, reason: "approved_operation_terminated" };
      if (isFishRoleApprovalReconciliationStale(approval, this.deps.clock.now())) return { approval, operationId: operation.operationId, action: "expire", automatic: false, reason: "approved_record_stale_without_completion" };
      return { approval, operationId: operation.operationId, action: "skip", automatic: true, reason: "approved_operation_in_flight" };
    }
    if (approval.status === "consumed") {
      if (operation.status !== "completed") return { approval, operationId: operation.operationId, action: "manual_review", automatic: false, reason: "consumed_without_completed_operation" };
      return { approval, operationId: operation.operationId, action: "skip", automatic: true, reason: "already_consumed" };
    }
    if (approval.status === "reconciliation_required") return { approval, operationId: operation.operationId, action: "manual_review", automatic: false, reason: "already_marked_for_reconciliation" };
    return { approval, operationId: operation.operationId, action: "skip", automatic: true, reason: "terminal_approval_state" };
  }

  private planToFinding(plan: ReconciliationPlan): FishRoleApprovalReconciliationFinding {
    const code =
      plan.action === "consume" ? "approval_consumption_completed" :
      plan.action === "release" ? "approval_reservation_released" :
      plan.action === "expire" ? "approval_marked_expired" :
      plan.action === "manual_review" ? (plan.errorCode === "FISH_ROLE_APPROVAL_BINDING_MISMATCH" ? "approval_binding_mismatch_detected" : "approval_manual_review_required") :
      "approval_stale_pending_detected";
    return {
      code,
      approvalId: plan.approval.approvalId,
      operationId: plan.operationId,
      targetUserId: plan.approval.targetUserId,
      automatic: plan.automatic,
      reason: plan.reason,
    };
  }

  private async applyPlan(plan: ReconciliationPlan) {
    if (!this.deps.writer) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_RECONCILIATION_REQUIRED", true, "high", "fishRoleApproval.reconciliationRequired");
    if (plan.action === "consume") {
      if (plan.approval.status === "approved") {
        await this.deps.writer.consumeApproval(plan.approval.approvalId, plan.operationId!, plan.approval.version);
      } else if (plan.approval.status === "consumption_pending") {
        await this.deps.writer.consumeApproval(plan.approval.approvalId, plan.operationId!, plan.approval.version);
      }
      return;
    }
    if (plan.action === "release") {
      await this.deps.writer.releaseApproval(plan.approval.approvalId, plan.operationId!);
      return;
    }
    if (plan.action === "expire") {
      await this.deps.writer.markExpired(plan.approval.approvalId, plan.operationId!);
      return;
    }
    if (plan.action === "manual_review") {
      await this.deps.writer.markManualReview(plan.approval.approvalId, plan.operationId, plan.errorCode ?? "FISH_ROLE_APPROVAL_RECONCILIATION_MANUAL_REVIEW");
      return;
    }
  }

  private async audit(event: Parameters<FishRoleApprovalReconciliationWorkerDependencies["audit"]["append"]>[0]) {
    await this.deps.audit.append(event);
  }
}

import type { FishRoleApprovalReconciliationBatchResult, FishRoleApprovalReconciliationFinding } from "./types";

export function createFishRoleApprovalReconciliationBatchResult(mode: "dry_run" | "execute"): FishRoleApprovalReconciliationBatchResult {
  return {
    mode,
    candidates: 0,
    inspected: 0,
    consumed: 0,
    released: 0,
    expired: 0,
    manualReview: 0,
    bindingMismatches: 0,
    skipped: 0,
    durationMs: 0,
    aborted: false,
    findings: [],
  };
}

export function pushFinding(result: FishRoleApprovalReconciliationBatchResult, finding: FishRoleApprovalReconciliationFinding) {
  result.findings.push(finding);
  if (finding.code === "approval_consumption_completed") result.consumed += 1;
  if (finding.code === "approval_reservation_released") result.released += 1;
  if (finding.code === "approval_marked_expired") result.expired += 1;
  if (finding.code === "approval_manual_review_required") result.manualReview += 1;
  if (finding.code === "approval_binding_mismatch_detected") result.bindingMismatches += 1;
}

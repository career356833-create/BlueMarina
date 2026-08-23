import "server-only";
import type { FishRoleRevocationAuditSink, FishRoleRevocationRecoveryFinding, FishRoleRevocationRecoveryInventory, FishRoleRevocationRecoveryWriter } from "../../domain/fish-authorization/worker/types";
export async function runFishRoleRevocationRecovery(input: { inventory: FishRoleRevocationRecoveryInventory; dryRun?: boolean }, deps: { writer?: FishRoleRevocationRecoveryWriter; audit?: FishRoleRevocationAuditSink; now?: () => Date } = {}) {
  const findings: FishRoleRevocationRecoveryFinding[] = []; const jobByOperation = new Map(input.inventory.jobs.map((job) => [job.operationId, job])); const projectionByUser = new Map(input.inventory.projections.map((projection) => [projection.targetUserId, projection]));
  for (const operation of input.inventory.operations) {
    const job = jobByOperation.get(operation.operationId); const projection = projectionByUser.get(operation.targetUserId);
    if (operation.status === "session_revocation_pending" && !job) findings.push({ code: "missing_queue_job", operationId: operation.operationId, targetUserId: operation.targetUserId, automatic: true });
    if (operation.status === "completed" && job?.status === "retry_wait") findings.push({ code: "completed_with_retry_job", operationId: operation.operationId, targetUserId: operation.targetUserId, automatic: true });
    if (job?.status === "dead_letter" && projection?.status === "active") findings.push({ code: "dead_letter_projection_active", operationId: operation.operationId, targetUserId: operation.targetUserId, automatic: false });
    if (projection?.status === "inactive" && operation.sessionRevocationStatus === "unknown") findings.push({ code: "revoked_role_session_unknown", operationId: operation.operationId, targetUserId: operation.targetUserId, automatic: false });
    if (job?.revocationType === "crawler_credential_revoked" && !input.inventory.crawlerRotationOperationIds.includes(operation.operationId)) findings.push({ code: "crawler_rotation_missing", operationId: operation.operationId, targetUserId: operation.targetUserId, automatic: false });
    if (job?.status === "claimed" && new Date(job.leaseExpiresAt ?? 0).getTime() <= (deps.now?.() ?? new Date()).getTime()) findings.push({ code: "stale_lease", operationId: operation.operationId, targetUserId: operation.targetUserId, automatic: true });
  }
  for (const mismatch of input.inventory.authProjectionMismatches ?? []) findings.push({ code: "auth_projection_mismatch", ...mismatch, automatic: false });
  for (const mismatch of input.inventory.lastAdminMismatches ?? []) findings.push({ code: "last_admin_mismatch", ...mismatch, automatic: false });
  if (input.dryRun ?? true) return { mode: "dry_run" as const, findings, recovered: 0, manualReview: findings.filter((item) => !item.automatic).length };
  if (!deps.writer || !deps.audit) throw new Error("FISH_ROLE_REVOCATION_RECOVERY_DEPENDENCY_MISSING");
  let recovered = 0; let manualReview = 0;
  for (const finding of findings) {
    await deps.audit.append({ type: "session_revocation_reconciliation_detected", at: (deps.now?.() ?? new Date()).toISOString(), operationId: finding.operationId, targetUserId: finding.targetUserId, errorCode: finding.code });
    const operation = input.inventory.operations.find((value) => value.operationId === finding.operationId)!; const job = jobByOperation.get(finding.operationId);
    if (finding.code === "missing_queue_job") await deps.writer.enqueueMissing(operation);
    else if (finding.code === "completed_with_retry_job" && job) await deps.writer.completeStaleJob(job);
    else if (finding.code === "stale_lease" && job) await deps.writer.releaseStaleLease(job);
    else { await deps.writer.markManualReview(finding); manualReview += 1; continue; }
    recovered += 1; await deps.audit.append({ type: "session_revocation_recovery_scheduled", at: (deps.now?.() ?? new Date()).toISOString(), operationId: finding.operationId, targetUserId: finding.targetUserId });
  }
  return { mode: "execute" as const, findings, recovered, manualReview };
}

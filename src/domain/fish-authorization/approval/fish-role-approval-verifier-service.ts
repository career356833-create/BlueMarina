import { createHash } from "node:crypto";
import type { FishRoleApprovalVerifier } from "../ports/fish-role-approval-verifier";
import type { FishRoleApprovalRepository } from "../ports/fish-role-approval-repository";
import type { FishRoleApprovalAuditLog } from "../ports/fish-role-approval-audit-log";
import type { FishRoleClock } from "../ports/fish-role-clock";
import type { FishRoleApprovalVerification, FishRoleApprovalVerificationInput } from "./types";
import { FishRoleApprovalError } from "./fish-role-approval-errors";
import { validateApproval } from "./fish-role-approval-policy";
export class FishRoleApprovalVerifierService implements FishRoleApprovalVerifier {
  constructor(private readonly enabled: boolean, private readonly repository: FishRoleApprovalRepository, private readonly audit: FishRoleApprovalAuditLog, private readonly clock: FishRoleClock) {}
  async verify(input: Parameters<FishRoleApprovalVerifier["verify"]>[0]): Promise<FishRoleApprovalVerification> {
    if (!this.enabled) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_FEATURE_DISABLED", false, "high", "fishRoleApproval.disabled");
    if (!/^[A-Za-z0-9._:-]{8,256}$/.test(input.approvalReference)) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_INVALID_FORMAT", false, "medium", "fishRoleApproval.invalidFormat");
    if (!input.targetIdentityType || !input.operationId) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_IDENTITY_MISMATCH", false, "high", "fishRoleApproval.incompleteContext");
    const fullInput = input as FishRoleApprovalVerificationInput; const referenceHash = createHash("sha256").update(input.approvalReference).digest("hex"); const record = await this.repository.findByReferenceHash(referenceHash);
    if (!record) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_NOT_FOUND", false, "high", "fishRoleApproval.notFound");
    return this.repository.withApprovalLock(record.approvalId, async () => { await this.audit.append({ event: "approval_verification_started", approvalId: record.approvalId, operationId: fullInput.operationId, actorUserId: fullInput.actorUserId, targetUserId: fullInput.targetUserId, action: fullInput.action, requestedRole: fullInput.requestedRole, result: "success", createdAt: this.clock.now().toISOString() }); try { validateApproval(record, fullInput, this.clock.now()); const pending = await this.repository.markConsumptionPending(record.approvalId, fullInput.operationId, record.version); await this.audit.append({ event: "approval_consumption_pending", approvalId: record.approvalId, operationId: fullInput.operationId, actorUserId: fullInput.actorUserId, targetUserId: fullInput.targetUserId, action: fullInput.action, requestedRole: fullInput.requestedRole, result: "success", createdAt: this.clock.now().toISOString() }); return { valid: true, approvalId: record.approvalId, approvalVersion: pending.version, approvedBy: record.approvedBy, approvedAt: record.approvedAt, expiresAt: record.expiresAt, scope: record.scope, consumptionRequired: true, warnings: [] }; } catch (error) { const code = error instanceof FishRoleApprovalError ? error.code : "FISH_ROLE_APPROVAL_CONCURRENCY_CONFLICT"; await this.audit.append({ event: code.includes("EXPIRED") ? "approval_expired" : code.includes("CONSUMED") ? "approval_reuse_blocked" : "approval_rejected", approvalId: record.approvalId, operationId: fullInput.operationId, actorUserId: fullInput.actorUserId, targetUserId: fullInput.targetUserId, action: fullInput.action, requestedRole: fullInput.requestedRole, result: "blocked", errorCode: code, createdAt: this.clock.now().toISOString() }); throw error; } });
  }
  async consume(approvalId: string, operationId: string, expectedVersion: number) { try { await this.repository.markConsumed(approvalId, operationId, expectedVersion); } catch { await this.repository.markReconciliationRequired(approvalId, operationId); throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_RECONCILIATION_REQUIRED", true, "high", "fishRoleApproval.reconciliationRequired"); } }
  async release(approvalId: string, operationId: string) { await this.repository.releaseConsumption(approvalId, operationId); }
}

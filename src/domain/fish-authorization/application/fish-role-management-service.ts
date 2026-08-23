import { createHash, randomUUID } from "node:crypto";
import { FishRoleManagementError } from "./errors";
import type { FishRoleAction, FishRoleActorContext, FishRoleAuditEvent, FishRoleChangeResult, GrantFishRoleInput, RevokeFishRoleInput } from "./types";
import type { FishRoleOrNone } from "../drafts/fish-role";
import type { FishRoleAdminProvider } from "../ports/fish-role-admin-provider";
import type { FishRoleApprovalVerifier } from "../ports/fish-role-approval-verifier";
import type { FishRoleAuditRepository } from "../ports/fish-role-audit-repository";
import type { FishRoleClock } from "../ports/fish-role-clock";
import type { FishRoleDirectory } from "../ports/fish-role-directory";
import type { FishRoleIdempotencyRepository } from "../ports/fish-role-idempotency-repository";
import type { FishRoleSessionRevoker } from "../ports/fish-role-session-revoker";

export type FishRoleManagementDependencies = {
  enabled: boolean; adminProvider: FishRoleAdminProvider; directory: FishRoleDirectory; auditRepository: FishRoleAuditRepository;
  idempotencyRepository: FishRoleIdempotencyRepository; sessionRevoker: FishRoleSessionRevoker; approvalVerifier: FishRoleApprovalVerifier; clock: FishRoleClock;
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const validKey = (value: string) => value.length >= 8 && value.length <= 128;

export class FishRoleManagementService {
  constructor(private readonly deps: FishRoleManagementDependencies) {}

  grant(input: GrantFishRoleInput, actor: FishRoleActorContext): Promise<FishRoleChangeResult> { return this.change("grant", input, actor); }
  revoke(input: RevokeFishRoleInput, actor: FishRoleActorContext): Promise<FishRoleChangeResult> { return this.change("revoke", input, actor); }

  private async change(action: FishRoleAction, input: GrantFishRoleInput | RevokeFishRoleInput, actor: FishRoleActorContext): Promise<FishRoleChangeResult> {
    this.assertEnabledAndActor(actor);
    this.assertInput(input, action);
    return this.deps.directory.withRoleChangeLock(input.targetUserId, async () => {
      if (!(await this.deps.directory.userExists(input.targetUserId))) throw new FishRoleManagementError("FISH_ROLE_TARGET_NOT_FOUND", false, "fishRole.targetNotFound", "medium");
      const identity = await this.deps.directory.getIdentityType(input.targetUserId);
      const requestedRole: FishRoleOrNone = action === "grant" ? (input as GrantFishRoleInput).role : null;
      this.assertIdentity(identity, requestedRole);
      if (action === "grant" && input.targetUserId === actor.actorUserId && (input as GrantFishRoleInput).role === "fish_admin") throw new FishRoleManagementError("FISH_ROLE_SELF_ESCALATION_BLOCKED", false, "fishRole.selfEscalationBlocked", "high");
      const approval = await this.deps.approvalVerifier.verify({ approvalReference: input.approvalReference, actorUserId: actor.actorUserId!, targetUserId: input.targetUserId, action, requestedRole, targetIdentityType: identity, operationId: actor.requestId });
      this.assertApproval(approval.valid, approval.expiresAt);
      const requestHash = hash([actor.actorUserId, input.targetUserId, action, requestedRole ?? "none", approval.approvalId ?? "", hash(input.reason)].join("|"));
      const existing = await this.deps.idempotencyRepository.find(input.idempotencyKey);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new FishRoleManagementError("FISH_ROLE_IDEMPOTENCY_CONFLICT", false, "fishRole.idempotencyConflict", "medium");
        return existing.result;
      }
      await this.deps.idempotencyRepository.savePending(input.idempotencyKey, requestHash);
      const previousRole = await this.deps.adminProvider.getUserRole(input.targetUserId);
      if (action === "grant" && previousRole === requestedRole) return this.finishNoop(action, input, actor, previousRole, requestHash);
      if (action === "revoke" && previousRole === null) return this.finishNoop(action, input, actor, null, requestHash);
      if (action === "revoke" && previousRole === "fish_admin" && (await this.deps.directory.countActiveAdmins()) <= 1) throw new FishRoleManagementError("FISH_ROLE_LAST_ADMIN_PROTECTED", false, "fishRole.lastAdminProtected", "high");
      await this.deps.adminProvider.setUserRole(input.targetUserId, requestedRole);
      let sessionStatus: FishRoleChangeResult["sessionRevocationStatus"] = "not_required";
      const warnings: string[] = [];
      if (action === "revoke") {
        try { await this.deps.sessionRevoker.revokeAllSessions(input.targetUserId); sessionStatus = "revoked"; }
        catch { await this.deps.sessionRevoker.markRevocationPending(input.targetUserId); sessionStatus = "pending"; warnings.push("ROLE_REVOCATION_PENDING_SESSION_INVALIDATION"); }
      }
      const result: FishRoleChangeResult = { requestId: actor.requestId, targetUserId: input.targetUserId, previousRole, newRole: requestedRole, action, changed: true, sessionRevocationRequired: action === "revoke", sessionRevocationStatus: sessionStatus, auditEventId: null, warnings };
      try {
        result.auditEventId = await this.deps.auditRepository.append(this.auditEvent(action, input, actor, previousRole, requestedRole, approval.approvalId!, sessionStatus, result.warnings.length ? "partial_failure" : "success"));
      } catch {
        warnings.push("ROLE_CHANGE_REQUIRES_EMERGENCY_AUDIT");
        throw new FishRoleManagementError("FISH_ROLE_AUDIT_WRITE_FAILED", true, "fishRole.auditWriteFailed", "high");
      }
      const lifecycle = this.deps.approvalVerifier as typeof this.deps.approvalVerifier & { consume?: (approvalId: string, operationId: string, expectedVersion: number) => Promise<void> };
      if (approval.consumptionRequired && approval.approvalId && approval.approvalVersion !== null && approval.approvalVersion !== undefined && lifecycle.consume) {
        await lifecycle.consume(approval.approvalId, actor.requestId, approval.approvalVersion);
      }
      await this.deps.idempotencyRepository.complete(input.idempotencyKey, { requestHash, result });
      return result;
    });
  }

  private assertEnabledAndActor(actor: FishRoleActorContext) {
    if (!this.deps.enabled) throw new FishRoleManagementError("FISH_ROLE_MANAGEMENT_DISABLED", false, "fishRole.disabled", "high");
    if (!actor.actorUserId) throw new FishRoleManagementError("FISH_ROLE_UNAUTHENTICATED", false, "fishRole.unauthenticated", "medium");
    if (actor.actorFishRole !== "fish_admin") throw new FishRoleManagementError("FISH_ROLE_ADMIN_REQUIRED", false, "fishRole.adminRequired", "high");
  }
  private assertInput(input: GrantFishRoleInput | RevokeFishRoleInput, action: FishRoleAction) {
    if (!input.targetUserId || !input.reason.trim() || input.reason.length > 500 || !input.approvalReference.trim()) throw new FishRoleManagementError("FISH_ROLE_APPROVAL_REQUIRED", false, "fishRole.invalidRequest", "medium");
    if (!validKey(input.idempotencyKey)) throw new FishRoleManagementError("FISH_ROLE_IDEMPOTENCY_CONFLICT", false, "fishRole.invalidIdempotencyKey", "medium");
    if (action === "grant" && !["fish_reviewer", "fish_admin", "fish_crawler"].includes((input as GrantFishRoleInput).role)) throw new FishRoleManagementError("FISH_ROLE_INVALID_ROLE", false, "fishRole.invalidRole", "medium");
  }
  private assertIdentity(identity: "human_user" | "service_identity", role: FishRoleOrNone) {
    if (role === "fish_crawler" && identity !== "service_identity") throw new FishRoleManagementError("FISH_ROLE_SERVICE_IDENTITY_REQUIRED", false, "fishRole.serviceIdentityRequired", "high");
    if (role !== null && role !== "fish_crawler" && identity !== "human_user") throw new FishRoleManagementError("FISH_ROLE_INVALID_ROLE", false, "fishRole.invalidIdentityRole", "high");
  }
  private assertApproval(valid: boolean, expiresAt: string | null) {
    if (!valid) throw new FishRoleManagementError("FISH_ROLE_APPROVAL_INVALID", false, "fishRole.approvalInvalid", "high");
    if (!expiresAt || new Date(expiresAt).getTime() <= this.deps.clock.now().getTime()) throw new FishRoleManagementError("FISH_ROLE_APPROVAL_EXPIRED", false, "fishRole.approvalExpired", "high");
  }
  private async finishNoop(action: FishRoleAction, input: GrantFishRoleInput | RevokeFishRoleInput, actor: FishRoleActorContext, previousRole: FishRoleOrNone, requestHash: string) {
    const result: FishRoleChangeResult = { requestId: actor.requestId, targetUserId: input.targetUserId, previousRole, newRole: previousRole, action, changed: false, sessionRevocationRequired: false, sessionRevocationStatus: "not_required", auditEventId: null, warnings: [] };
    await this.deps.idempotencyRepository.complete(input.idempotencyKey, { requestHash, result });
    return result;
  }
  private auditEvent(action: FishRoleAction, input: GrantFishRoleInput | RevokeFishRoleInput, actor: FishRoleActorContext, previousRole: FishRoleOrNone, newRole: FishRoleOrNone, approvalId: string, sessionRevocationStatus: FishRoleChangeResult["sessionRevocationStatus"], result: "success" | "partial_failure"): FishRoleAuditEvent {
    return { eventId: randomUUID(), actorUserId: actor.actorUserId!, targetUserId: input.targetUserId, action, previousRole, newRole, reasonCodeOrHash: hash(input.reason), approvalId, idempotencyKeyHash: hash(input.idempotencyKey), requestId: actor.requestId, result, sessionRevocationStatus, createdAt: this.deps.clock.now().toISOString() };
  }
}

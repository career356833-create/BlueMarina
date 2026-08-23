import type { FishRoleApprovalRecord, FishRoleApprovalVerificationInput } from "./types";
import { FishRoleApprovalError } from "./fish-role-approval-errors";
export const approvalTtlMs = (record: FishRoleApprovalRecord) => record.requestedRole === "fish_admin" ? 30 * 60_000 : record.requestedRole === "fish_crawler" ? 60 * 60_000 : 24 * 60 * 60_000;
export function validateApproval(record: FishRoleApprovalRecord, input: FishRoleApprovalVerificationInput, now: Date) {
  if (record.status === "revoked" || record.status === "rejected") throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_REVOKED", false, "high", "fishRoleApproval.revoked");
  if (record.status !== "approved" && !(record.status === "consumption_pending" && record.consumedByOperationId === input.operationId)) throw new FishRoleApprovalError(record.status === "consumed" ? "FISH_ROLE_APPROVAL_ALREADY_CONSUMED" : "FISH_ROLE_APPROVAL_NOT_APPROVED", false, "high", "fishRoleApproval.notApproved");
  const approvedAt = new Date(record.approvedAt).getTime(); const expiresAt = new Date(record.expiresAt).getTime();
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || approvedAt > now.getTime() || approvedAt >= expiresAt || expiresAt - approvedAt > approvalTtlMs(record) || expiresAt <= now.getTime()) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_EXPIRED", false, "high", "fishRoleApproval.expired");
  if (record.action !== input.action) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_ACTION_MISMATCH", false, "high", "fishRoleApproval.actionMismatch");
  if (record.targetUserId !== input.targetUserId) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_TARGET_MISMATCH", false, "high", "fishRoleApproval.targetMismatch");
  if (record.requestedRole !== input.requestedRole) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_ROLE_MISMATCH", false, "high", "fishRoleApproval.roleMismatch");
  if (record.targetIdentityType !== input.targetIdentityType) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_IDENTITY_MISMATCH", false, "high", "fishRoleApproval.identityMismatch");
  if (record.requestedBy !== input.actorUserId || record.approvedBy === input.actorUserId || record.approvedBy === input.targetUserId) throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_SEPARATION_REQUIRED", false, "high", "fishRoleApproval.separationRequired");
  if (record.requestedRole === "fish_admin" && record.scope !== "fish_admin_dual_control") throw new FishRoleApprovalError("FISH_ROLE_APPROVAL_SCOPE_MISMATCH", false, "high", "fishRoleApproval.scopeMismatch");
}

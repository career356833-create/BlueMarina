import { hasFishRole, isFishRole, type FishRole, type FishRoleOrNone, type FishRolePermission } from "./fish-role";
import type { FishRoleChangeAction, FishRoleChangeRequest, FishRoleChangeResult } from "./fish-role-change-contract";

export type FishRoleSubject = {
  userId: string;
  role: FishRoleOrNone;
};

export type FishRoleChangeContext = {
  action: FishRoleChangeAction;
  request: FishRoleChangeRequest;
  issuer: FishRoleSubject;
  targetCurrentRole: FishRoleOrNone;
  activeAdminCount: number;
  existingIdempotency?: { requestFingerprint: string; result: FishRoleChangeResult } | null;
};

export type FishRoleMatrixSubject = "anonymous" | FishRole;

export const FISH_ROLE_PERMISSION_MATRIX: Record<FishRoleMatrixSubject, Record<string, FishRolePermission>> = {
  anonymous: {
    published_species_read: "allow", unpublished_species_read: "deny", source_raw_read: "deny", species_review: "deny", media_review: "deny", regulation_review: "deny", user_observation_read: "deny", private_location_read: "deny", expert_confirmation: "deny", admin_override: "deny", crawler_source_write: "deny", user_photo_original_read: "deny", public_derivative_read: "allow", role_assign_revoke: "deny",
  },
  fish_reviewer: {
    published_species_read: "allow", unpublished_species_read: "scoped", source_raw_read: "scoped", species_review: "scoped", media_review: "scoped", regulation_review: "scoped", user_observation_read: "scoped", private_location_read: "deny", expert_confirmation: "allow", admin_override: "deny", crawler_source_write: "deny", user_photo_original_read: "deny", public_derivative_read: "allow", role_assign_revoke: "deny",
  },
  fish_admin: {
    published_species_read: "allow", unpublished_species_read: "allow", source_raw_read: "scoped", species_review: "allow", media_review: "allow", regulation_review: "allow", user_observation_read: "scoped", private_location_read: "scoped", expert_confirmation: "allow", admin_override: "allow", crawler_source_write: "scoped", user_photo_original_read: "scoped", public_derivative_read: "allow", role_assign_revoke: "allow",
  },
  fish_crawler: {
    published_species_read: "deny", unpublished_species_read: "deny", source_raw_read: "scoped", species_review: "deny", media_review: "deny", regulation_review: "deny", user_observation_read: "deny", private_location_read: "deny", expert_confirmation: "deny", admin_override: "deny", crawler_source_write: "service_only", user_photo_original_read: "deny", public_derivative_read: "deny", role_assign_revoke: "deny",
  },
};

export function fingerprintFishRoleChange(action: FishRoleChangeAction, request: FishRoleChangeRequest): string {
  return [action, request.targetUserId, request.role, request.requestedBy, request.idempotencyKey].join(":");
}

export function evaluateFishRoleChange(context: FishRoleChangeContext): FishRoleChangeResult {
  const { action, request, issuer, targetCurrentRole, activeAdminCount } = context;
  const newRole = action === "grant" ? request.role : null;
  const base = { action, targetUserId: request.targetUserId, previousRole: targetCurrentRole, newRole, requiresSessionRefresh: true as const, staleTokenRisk: action === "grant" ? "until_access_token_expiry" as const : "revocation_requires_session_invalidation" as const };
  const fingerprint = fingerprintFishRoleChange(action, request);

  if (context.existingIdempotency) {
    return context.existingIdempotency.requestFingerprint === fingerprint
      ? { ...context.existingIdempotency.result, status: "idempotent" }
      : { ...base, status: "blocked", blockReason: "idempotency_conflict" };
  }
  if (!isFishRole(request.role)) return { ...base, status: "blocked", blockReason: "invalid_role" };
  if (!request.reason.trim()) return { ...base, status: "blocked", blockReason: "missing_reason" };
  if (!request.approvalReference.trim()) return { ...base, status: "blocked", blockReason: "missing_approval_reference" };
  if (issuer.userId === request.targetUserId && action === "grant" && request.role === "fish_admin") return { ...base, status: "blocked", blockReason: "self_escalation" };
  if (!hasFishRole(issuer.role, "fish_admin")) return { ...base, status: "blocked", blockReason: "issuer_not_authorized" };
  if (action === "revoke" && targetCurrentRole === "fish_admin" && activeAdminCount <= 1) return { ...base, status: "blocked", blockReason: "last_admin_protected" };
  return { ...base, status: "applied" };
}

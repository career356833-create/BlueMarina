import type { FishRole, FishRoleOrNone } from "./fish-role";

export type FishRoleChangeAction = "grant" | "revoke";

export type FishRoleChangeRequest = {
  targetUserId: string;
  role: FishRole;
  reason: string;
  requestedBy: string;
  approvalReference: string;
  idempotencyKey: string;
};

export type GrantFishRoleRequest = FishRoleChangeRequest & { action: "grant" };
export type RevokeFishRoleRequest = FishRoleChangeRequest & { action: "revoke" };

export type FishRoleChangeAuditEntry = {
  actorUserId: string;
  targetUserId: string;
  previousRole: FishRoleOrNone;
  newRole: FishRoleOrNone;
  action: FishRoleChangeAction;
  reason: string;
  approvalReference: string;
  idempotencyKey: string;
  createdAt: string;
};

export type FishRoleChangeResult = {
  status: "applied" | "idempotent" | "blocked";
  action: FishRoleChangeAction;
  targetUserId: string;
  previousRole: FishRoleOrNone;
  newRole: FishRoleOrNone;
  requiresSessionRefresh: true;
  staleTokenRisk: "until_access_token_expiry" | "revocation_requires_session_invalidation";
  blockReason?: "invalid_role" | "missing_reason" | "missing_approval_reference" | "self_escalation" | "last_admin_protected" | "issuer_not_authorized" | "idempotency_conflict";
};

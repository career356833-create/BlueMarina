import type { FishRole, FishRoleOrNone } from "../drafts/fish-role";

export type FishRoleIdentityType = "human_user" | "service_identity";
export type FishRoleAction = "grant" | "revoke";
export type FishRoleSessionRevocationStatus = "not_required" | "revoked" | "pending";

export type FishRoleActorContext = {
  actorUserId: string | null;
  actorFishRole: FishRoleOrNone;
  requestId: string;
};

export type GrantFishRoleInput = {
  targetUserId: string;
  role: FishRole;
  reason: string;
  approvalReference: string;
  idempotencyKey: string;
};

export type RevokeFishRoleInput = Omit<GrantFishRoleInput, "role"> & { role?: never };

export type FishRoleChangeResult = {
  requestId: string;
  targetUserId: string;
  previousRole: FishRoleOrNone;
  newRole: FishRoleOrNone;
  action: FishRoleAction;
  changed: boolean;
  sessionRevocationRequired: boolean;
  sessionRevocationStatus: FishRoleSessionRevocationStatus;
  auditEventId: string | null;
  warnings: string[];
};

export type FishRoleApproval = {
  valid: boolean;
  approvalId: string | null;
  approvedBy: string | null;
  expiresAt: string | null;
  scope: string | null;
  approvalVersion?: number | null;
  approvedAt?: string | null;
  consumptionRequired?: boolean;
  warnings?: string[];
};

export type FishRoleAuditEvent = {
  eventId: string;
  actorUserId: string;
  targetUserId: string;
  action: FishRoleAction;
  previousRole: FishRoleOrNone;
  newRole: FishRoleOrNone;
  reasonCodeOrHash: string;
  approvalId: string;
  idempotencyKeyHash: string;
  requestId: string;
  result: "success" | "partial_failure";
  sessionRevocationStatus: FishRoleSessionRevocationStatus;
  createdAt: string;
};

export type FishRoleIdempotencyRecord = {
  requestHash: string;
  result: FishRoleChangeResult;
};

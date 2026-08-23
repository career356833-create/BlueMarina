export const FISH_ROLE_ERROR_CODES = [
  "FISH_ROLE_MANAGEMENT_DISABLED", "FISH_ROLE_UNAUTHENTICATED", "FISH_ROLE_ADMIN_REQUIRED",
  "FISH_ROLE_TARGET_NOT_FOUND", "FISH_ROLE_INVALID_ROLE", "FISH_ROLE_SELF_ESCALATION_BLOCKED",
  "FISH_ROLE_LAST_ADMIN_PROTECTED", "FISH_ROLE_APPROVAL_REQUIRED", "FISH_ROLE_APPROVAL_INVALID",
  "FISH_ROLE_APPROVAL_EXPIRED", "FISH_ROLE_ALREADY_ASSIGNED", "FISH_ROLE_NOT_ASSIGNED",
  "FISH_ROLE_IDEMPOTENCY_CONFLICT", "FISH_ROLE_CONCURRENCY_CONFLICT", "FISH_ROLE_SESSION_REVOCATION_FAILED",
  "FISH_ROLE_AUDIT_WRITE_FAILED", "FISH_ROLE_SERVICE_IDENTITY_REQUIRED", "FISH_ROLE_PARTIAL_FAILURE",
] as const;

export type FishRoleErrorCode = (typeof FISH_ROLE_ERROR_CODES)[number];

export class FishRoleManagementError extends Error {
  constructor(
    public readonly code: FishRoleErrorCode,
    public readonly retryable: boolean,
    public readonly publicMessageKey: string,
    public readonly severity: "low" | "medium" | "high",
    public readonly internalContext?: Record<string, string>,
  ) {
    super(code);
    this.name = "FishRoleManagementError";
  }
}

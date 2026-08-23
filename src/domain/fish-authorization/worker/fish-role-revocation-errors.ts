export const fishRoleRevocationErrorCodes = [
  "FISH_ROLE_REVOCATION_JOB_NOT_FOUND", "FISH_ROLE_REVOCATION_LEASE_CONFLICT", "FISH_ROLE_REVOCATION_LEASE_EXPIRED",
  "FISH_ROLE_REVOCATION_PROVIDER_TEMPORARY_FAILURE", "FISH_ROLE_REVOCATION_TARGET_NOT_FOUND", "FISH_ROLE_REVOCATION_OPERATION_MISMATCH",
  "FISH_ROLE_REVOCATION_RETRY_EXHAUSTED", "FISH_ROLE_REVOCATION_CREDENTIAL_ROTATION_REQUIRED", "FISH_ROLE_REVOCATION_RECONCILIATION_REQUIRED",
  "FISH_ROLE_REVOCATION_CIRCUIT_OPEN",
] as const;
export type FishRoleRevocationErrorCode = typeof fishRoleRevocationErrorCodes[number];
export type FishRoleRevocationSeverity = "low" | "medium" | "high" | "critical";
export class FishRoleRevocationError extends Error {
  constructor(
    readonly code: FishRoleRevocationErrorCode,
    readonly retryable: boolean,
    readonly publicMessageKey: string,
    readonly severity: FishRoleRevocationSeverity,
    readonly sanitizedContext: Record<string, string | number | boolean | null> = {},
    readonly providerSystemFailure = false,
  ) { super(code); this.name = "FishRoleRevocationError"; }
}
export function normalizeFishRoleRevocationError(error: unknown): FishRoleRevocationError {
  if (error instanceof FishRoleRevocationError) return error;
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "429", "RATE_LIMIT"].includes(code)) {
    return new FishRoleRevocationError("FISH_ROLE_REVOCATION_PROVIDER_TEMPORARY_FAILURE", true, "fishRole.revocationTemporaryFailure", "high", { providerCode: code || "temporary" }, true);
  }
  return new FishRoleRevocationError("FISH_ROLE_REVOCATION_RECONCILIATION_REQUIRED", true, "fishRole.revocationReconciliationRequired", "high", { failure: "sanitized_unknown" });
}

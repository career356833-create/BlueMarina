export const FISH_PRIVILEGED_ROLES = ["fish_reviewer", "fish_admin", "fish_crawler"] as const;

export type FishRole = (typeof FISH_PRIVILEGED_ROLES)[number];

export type FishRoleOrNone = FishRole | null;

export type FishRolePermission = "allow" | "deny" | "scoped" | "service_only";

export type FishRoleJwtClaim = {
  fish_role?: unknown;
};

export function isFishRole(value: unknown): value is FishRole {
  return typeof value === "string" && (FISH_PRIVILEGED_ROLES as readonly string[]).includes(value);
}

export function readFishRoleFromAppMetadata(claim: FishRoleJwtClaim | null | undefined): FishRoleOrNone {
  return isFishRole(claim?.fish_role) ? claim.fish_role : null;
}

export function hasFishRole(currentRole: FishRoleOrNone, requestedRole: FishRole): boolean {
  if (currentRole === "fish_admin") return requestedRole === "fish_admin" || requestedRole === "fish_reviewer";
  return currentRole === requestedRole;
}

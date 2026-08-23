import type { FishAuthAdminUser } from "../types";
export const fishRoleUser = (id: string, role?: string, identityType: "human_user" | "service_identity" = "human_user"): FishAuthAdminUser => ({ id, appMetadata: { retained: "keep", ...(role ? { fish_role: role } : {}) }, identityType, version: 1 });

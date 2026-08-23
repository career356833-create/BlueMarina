import type { FishRole, FishRoleOrNone } from "../../../domain/fish-authorization/drafts/fish-role";
export type FishAuthAdminUser = { id: string; appMetadata: Record<string, unknown> | null; identityType: "human_user" | "service_identity"; version: number };
export interface FishAuthAdminTransport { getUserById(userId: string): Promise<FishAuthAdminUser | null>; updateUserAppMetadata(userId: string, metadata: Record<string, unknown>): Promise<FishAuthAdminUser>; signOutUser(userId: string, scope: "global"): Promise<void>; }
export type FishRoleDbRow = Record<string, unknown>;
export interface FishRoleDatabaseClient { select(table: string, query: FishRoleDbRow): Promise<FishRoleDbRow[]>; insert(table: string, row: FishRoleDbRow): Promise<FishRoleDbRow>; update(table: string, patch: FishRoleDbRow, match: FishRoleDbRow): Promise<FishRoleDbRow | null>; withAdvisoryLock<T>(key: string, work: () => Promise<T>): Promise<T>; }
export type FishRoleSnapshot = { userId: string; role: FishRoleOrNone; identityType: "human_user" | "service_identity"; version: number };
export type FishRoleOperationStatus = "requested" | "locked" | "auth_update_pending" | "auth_updated" | "audit_pending" | "session_revocation_pending" | "completed" | "compensation_required" | "failed";
export type FishRoleAssignmentRow = { user_id: string; fish_role: FishRole | null; identity_type: "human_user" | "service_identity"; version: number; status: "active" | "inactive"; updated_at: string };

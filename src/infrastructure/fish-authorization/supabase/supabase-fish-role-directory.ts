import type { FishRoleDirectory } from "../../../domain/fish-authorization/ports/fish-role-directory";
import type { FishRoleIdentityType } from "../../../domain/fish-authorization/application/types";
import { SupabaseFishRoleError } from "./supabase-fish-role-errors";
import type { FishAuthAdminTransport, FishRoleDatabaseClient } from "./types";
export class SupabaseFishRoleDirectory implements FishRoleDirectory {
  constructor(private readonly client: FishRoleDatabaseClient, private readonly authTransport: FishAuthAdminTransport) {}
  async userExists(userId: string) { return (await this.authTransport.getUserById(userId)) !== null; }
  async getIdentityType(userId: string): Promise<FishRoleIdentityType> { const user = await this.authTransport.getUserById(userId); if (!user) throw new SupabaseFishRoleError("FISH_ROLE_PROVIDER_USER_NOT_FOUND"); return user.identityType; }
  async countActiveAdmins() { return (await this.client.select("fish_role_assignments", { fish_role: "fish_admin", status: "active" })).length; }
  async withRoleChangeLock<T>(targetUserId: string, operation: () => Promise<T>) { return this.client.withAdvisoryLock(`fish-role:${targetUserId}`, operation); }
  async withAdminChangeLock<T>(operation: () => Promise<T>) { return this.client.withAdvisoryLock("fish-role:active-admins", operation); }
  async updateProjection(input: { userId: string; role: string | null; identityType: FishRoleIdentityType; expectedVersion: number; actorUserId: string }) { const row = await this.client.update("fish_role_assignments", { fish_role: input.role, status: input.role ? "active" : "inactive", version: input.expectedVersion + 1, updated_at: new Date().toISOString(), assigned_by: input.actorUserId }, { user_id: input.userId, version: input.expectedVersion }); if (!row) throw new SupabaseFishRoleError("FISH_ROLE_DIRECTORY_OUT_OF_SYNC"); return row; }
}

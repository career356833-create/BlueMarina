import type { FishRoleOrNone } from "../../../domain/fish-authorization/drafts/fish-role";
import type { FishRoleAdminProvider } from "../../../domain/fish-authorization/ports/fish-role-admin-provider";
import { SupabaseFishRoleError } from "./supabase-fish-role-errors";
import { metadataWithRole, snapshotFromAuthUser } from "./supabase-fish-role-mappers";
import type { FishAuthAdminTransport, FishRoleSnapshot } from "./types";
export class SupabaseFishRoleAdminProvider implements FishRoleAdminProvider {
  constructor(private readonly transport: FishAuthAdminTransport) {}
  async getUserRole(userId: string) { return (await this.getRoleSnapshot(userId)).role; }
  async getRoleSnapshot(userId: string): Promise<FishRoleSnapshot> { const user = await this.transport.getUserById(userId); if (!user) throw new SupabaseFishRoleError("FISH_ROLE_PROVIDER_USER_NOT_FOUND"); return snapshotFromAuthUser(user); }
  async setUserRole(userId: string, role: FishRoleOrNone, expectedVersion?: number) { await this.setRole(userId, role, expectedVersion); }
  async setRole(userId: string, role: FishRoleOrNone, expectedVersion?: number): Promise<FishRoleSnapshot> { const user = await this.transport.getUserById(userId); if (!user) throw new SupabaseFishRoleError("FISH_ROLE_PROVIDER_USER_NOT_FOUND"); const snapshot = snapshotFromAuthUser(user); if (expectedVersion !== undefined && snapshot.version !== expectedVersion) throw new SupabaseFishRoleError("FISH_ROLE_VERSION_CONFLICT"); try { return snapshotFromAuthUser(await this.transport.updateUserAppMetadata(userId, metadataWithRole(user.appMetadata!, role))); } catch { throw new SupabaseFishRoleError("FISH_ROLE_PROVIDER_UPDATE_FAILED"); } }
}

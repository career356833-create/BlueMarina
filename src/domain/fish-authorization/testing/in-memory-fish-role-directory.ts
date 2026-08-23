import type { FishRoleIdentityType } from "../application/types";
import type { FishRoleDirectory } from "../ports/fish-role-directory";
export class InMemoryFishRoleDirectory implements FishRoleDirectory {
  readonly users = new Map<string, FishRoleIdentityType>(); activeAdmins = 2;
  async userExists(userId: string) { return this.users.has(userId); }
  async getIdentityType(userId: string) { return this.users.get(userId) ?? "human_user"; }
  async countActiveAdmins() { return this.activeAdmins; }
  async withRoleChangeLock<T>(_targetUserId: string, operation: () => Promise<T>) { return operation(); }
}

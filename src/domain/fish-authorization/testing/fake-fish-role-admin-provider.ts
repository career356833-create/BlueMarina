import type { FishRoleOrNone } from "../drafts/fish-role";
import type { FishRoleAdminProvider } from "../ports/fish-role-admin-provider";
export class FakeFishRoleAdminProvider implements FishRoleAdminProvider {
  readonly roles = new Map<string, FishRoleOrNone>(); calls = 0;
  async getUserRole(userId: string) { this.calls++; return this.roles.get(userId) ?? null; }
  async setUserRole(userId: string, role: FishRoleOrNone, expectedVersion?: number) { void expectedVersion; this.calls++; this.roles.set(userId, role); }
}

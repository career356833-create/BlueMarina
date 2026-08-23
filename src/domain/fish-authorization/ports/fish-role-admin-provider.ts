import type { FishRoleOrNone } from "../drafts/fish-role";
export interface FishRoleAdminProvider {
  getUserRole(targetUserId: string): Promise<FishRoleOrNone>;
  setUserRole(targetUserId: string, role: FishRoleOrNone, expectedVersion?: number): Promise<void>;
}

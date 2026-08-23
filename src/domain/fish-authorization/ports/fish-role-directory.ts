import type { FishRoleIdentityType } from "../application/types";
export interface FishRoleDirectory {
  userExists(userId: string): Promise<boolean>;
  getIdentityType(userId: string): Promise<FishRoleIdentityType>;
  countActiveAdmins(): Promise<number>;
  withRoleChangeLock<T>(targetUserId: string, operation: () => Promise<T>): Promise<T>;
}

export interface FishRoleSessionRevoker {
  revokeAllSessions(targetUserId: string): Promise<void>;
  markRevocationPending(targetUserId: string): Promise<void>;
}

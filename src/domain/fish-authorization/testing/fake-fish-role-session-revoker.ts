import type { FishRoleSessionRevoker } from "../ports/fish-role-session-revoker";
export class FakeFishRoleSessionRevoker implements FishRoleSessionRevoker {
  revoked: string[] = []; pending: string[] = []; fail = false;
  async revokeAllSessions(userId: string) { if (this.fail) throw new Error("session revocation unavailable"); this.revoked.push(userId); }
  async markRevocationPending(userId: string) { this.pending.push(userId); }
}

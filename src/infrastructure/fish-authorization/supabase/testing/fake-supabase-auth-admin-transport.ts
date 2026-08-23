import type { FishAuthAdminTransport, FishAuthAdminUser } from "../types";
export class FakeSupabaseAuthAdminTransport implements FishAuthAdminTransport {
  readonly users = new Map<string, FishAuthAdminUser>(); updates = 0; signOuts: string[] = []; failUpdate = false; failSignOut = false;
  async getUserById(userId: string) { return this.users.get(userId) ?? null; }
  async updateUserAppMetadata(userId: string, metadata: Record<string, unknown>) { if (this.failUpdate) throw new Error("update failed"); const user = this.users.get(userId); if (!user) throw new Error("not found"); const next = { ...user, appMetadata: { ...metadata }, version: user.version + 1 }; this.updates++; this.users.set(userId, next); return next; }
  async signOutUser(userId: string, scope: "global") { void scope; if (this.failSignOut) throw new Error("sign out failed"); this.signOuts.push(userId); }
}

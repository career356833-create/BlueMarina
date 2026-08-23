import type { FishRoleRevocationWorkerLock } from "../worker/types";
export class FakeFishRoleRevocationWorkerLock implements FishRoleRevocationWorkerLock {
  readonly active = new Set<string>();
  async withTargetLock<T>(targetUserId: string, work: () => Promise<T>): Promise<T> {
    if (this.active.has(targetUserId)) throw Object.assign(new Error("target lock conflict"), { code: "ECONNRESET" });
    this.active.add(targetUserId); try { return await work(); } finally { this.active.delete(targetUserId); }
  }
}

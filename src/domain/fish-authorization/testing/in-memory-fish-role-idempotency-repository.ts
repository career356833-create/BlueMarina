import type { FishRoleIdempotencyRecord } from "../application/types";
import type { FishRoleIdempotencyRepository } from "../ports/fish-role-idempotency-repository";
export class InMemoryFishRoleIdempotencyRepository implements FishRoleIdempotencyRepository {
  readonly records = new Map<string, FishRoleIdempotencyRecord>();
  async find(key: string) { return this.records.get(key) ?? null; }
  async savePending(key: string, requestHash: string) { void key; void requestHash; }
  async complete(key: string, record: FishRoleIdempotencyRecord) { this.records.set(key, record); }
}

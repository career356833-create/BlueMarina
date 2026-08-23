import type { FishRoleIdempotencyRecord } from "../application/types";
export interface FishRoleIdempotencyRepository {
  find(key: string): Promise<FishRoleIdempotencyRecord | null>;
  savePending(key: string, requestHash: string): Promise<void>;
  complete(key: string, record: FishRoleIdempotencyRecord): Promise<void>;
}

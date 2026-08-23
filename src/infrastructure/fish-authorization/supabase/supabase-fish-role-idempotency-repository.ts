import type { FishRoleIdempotencyRecord } from "../../../domain/fish-authorization/application/types";
import type { FishRoleIdempotencyRepository } from "../../../domain/fish-authorization/ports/fish-role-idempotency-repository";
import { SupabaseFishRoleError } from "./supabase-fish-role-errors";
import type { FishRoleDatabaseClient } from "./types";
export class SupabaseFishRoleIdempotencyRepository implements FishRoleIdempotencyRepository {
  constructor(private readonly client: FishRoleDatabaseClient) {}
  async find(key: string): Promise<FishRoleIdempotencyRecord | null> { const row = (await this.client.select("fish_role_idempotency_records", { idempotency_key_hash: key }))[0]; return row?.status === "completed" ? { requestHash: String(row.request_hash), result: row.sanitized_result as FishRoleIdempotencyRecord["result"] } : null; }
  async savePending(key: string, requestHash: string) { const existing = (await this.client.select("fish_role_idempotency_records", { idempotency_key_hash: key }))[0]; if (existing && existing.request_hash !== requestHash) throw new SupabaseFishRoleError("FISH_ROLE_OPERATION_CONFLICT"); if (!existing) await this.client.insert("fish_role_idempotency_records", { idempotency_key_hash: key, request_hash: requestHash, status: "pending", created_at: new Date().toISOString() }); }
  async complete(key: string, record: FishRoleIdempotencyRecord) { const row = await this.client.update("fish_role_idempotency_records", { status: "completed", sanitized_result: record.result }, { idempotency_key_hash: key, request_hash: record.requestHash }); if (!row) throw new SupabaseFishRoleError("FISH_ROLE_OPERATION_CONFLICT"); }
  async fail(key: string, requestHash: string, status: "failed" | "compensation_required") { await this.client.update("fish_role_idempotency_records", { status }, { idempotency_key_hash: key, request_hash: requestHash }); }
}

import type { FishMediaRepository } from "../../../domain/fish-observation/storage/ports/fish-media-repository";
import type { FishMediaCommandResult, FishMediaRecord, FishMediaUploadSession } from "../../../domain/fish-observation/storage/application/types";
import type { FishSupabaseClient } from "./types";
import { mediaFromRow, mediaToRow } from "./supabase-fish-media-mappers";

export class SupabaseFishMediaRepository implements FishMediaRepository {
  private idempotency = new Map<string, { fingerprint: string; result: FishMediaCommandResult }>();
  private locks = new Map<string, Promise<void>>();
  constructor(private readonly client: FishSupabaseClient) {}
  async find(id: string) { const row = (await this.client.select("fish_media", { id }))[0]; return row ? mediaFromRow(row) : null; }
  async findVariants(parentMediaId: string) { return (await this.client.select("fish_media", { referenced_source_media_id: parentMediaId })).map(mediaFromRow); }
  async create(record: FishMediaRecord) { return mediaFromRow(await this.client.insert("fish_media", mediaToRow(record))); }
  async compareAndSet(id: string, expectedVersion: number, patch: Partial<FishMediaRecord>) {
    const current = await this.find(id);
    if (!current || current.version !== expectedVersion) return null;
    const next = { ...current, ...patch, version: expectedVersion + 1 };
    const row = await this.client.update("fish_media", mediaToRow(next), { id });
    return row ? mediaFromRow(row) : null;
  }
  async createUploadSession(session: FishMediaUploadSession) {
    const row = await this.client.insert("fish_media_upload_sessions", {
      id: session.id,
      media_id: session.mediaId,
      observation_id: session.observationId,
      user_id: session.userId,
      idempotency_key: session.idempotencyKey,
      state: session.state,
      expires_at: session.gatewayExpiresAt,
      gateway_expires_at: session.gatewayExpiresAt,
      provider_expires_at: session.providerExpiresAt,
      created_at: session.createdAt,
    });
    return this.uploadSessionFromRow(row);
  }
  async findUploadSessionByMediaId(mediaId: string) { const row = (await this.client.select("fish_media_upload_sessions", { media_id: mediaId }))[0]; return row ? this.uploadSessionFromRow(row) : null; }
  async updateUploadSessionState(sessionId: string, state: FishMediaUploadSession["state"]) { await this.client.update("fish_media_upload_sessions", { state }, { id: sessionId }); }
  async findIdempotency(key: string) { return this.idempotency.get(key) ?? null; }
  async saveIdempotency(key: string, fingerprint: string, result: FishMediaCommandResult) { this.idempotency.set(key, { fingerprint, result }); }
  async withMediaLock<T>(id: string, work: () => Promise<T>) {
    const previous = this.locks.get(id) ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.locks.set(id, tail);
    await previous;
    try { return await work(); } finally { release(); if (this.locks.get(id) === tail) this.locks.delete(id); }
  }
  private uploadSessionFromRow(row: Record<string, unknown>): FishMediaUploadSession { return { id: String(row.id), mediaId: String(row.media_id), observationId: String(row.observation_id), userId: String(row.user_id), idempotencyKey: String(row.idempotency_key), state: String(row.state) as FishMediaUploadSession["state"], gatewayExpiresAt: String(row.gateway_expires_at ?? row.expires_at), providerExpiresAt: String(row.provider_expires_at), createdAt: String(row.created_at) }; }
}

import "server-only";
import type { FishStorageTransport } from "./types";

type StorageResult<T> = { data: T | null; error: { message?: string } | null };
type BucketClient = {
  createSignedUploadUrl(path: string, options?: { upsert?: boolean }): Promise<StorageResult<{ signedUrl: string; token: string }>>;
  createSignedUrl(path: string, expiresIn: number): Promise<StorageResult<{ signedUrl: string }>>;
  download(path: string): Promise<StorageResult<Blob>>;
  upload(path: string, body: Buffer, options: { contentType: string; upsert: boolean }): Promise<StorageResult<unknown>>;
  uploadToSignedUrl(path: string, token: string, body: Buffer, options: { contentType: string }): Promise<StorageResult<unknown>>;
  remove(paths: string[]): Promise<StorageResult<unknown>>;
};
export interface SupabaseJsStorageClient { storage: { from(bucket: string): BucketClient }; }

export class SupabaseJsFishStorageTransport implements FishStorageTransport {
  private uploadTokens = new Map<string, { bucket: string; path: string; token: string }>();
  constructor(private readonly client: SupabaseJsStorageClient) {}
  async createSignedUploadUrl(bucket: string, path: string, expiresIn: number) { void expiresIn; const result = await this.client.storage.from(bucket).createSignedUploadUrl(path, { upsert: false }); if (result.error || !result.data) throw new Error("SIGNED_URL_CREATION_FAILED"); this.uploadTokens.set(result.data.signedUrl, { bucket, path, token: result.data.token }); return result.data.signedUrl; }
  async uploadToIssuedSignedUrl(signedUrl: string, data: Buffer, mimeType: string) { const issued = this.uploadTokens.get(signedUrl); if (!issued) throw new Error("SIGNED_UPLOAD_TOKEN_NOT_ISSUED"); const result = await this.client.storage.from(issued.bucket).uploadToSignedUrl(issued.path, issued.token, data, { contentType: mimeType }); this.uploadTokens.delete(signedUrl); if (result.error) throw new Error("SIGNED_UPLOAD_FAILED"); }
  discardIssuedUrls() { this.uploadTokens.clear(); }
  async createSignedUrl(bucket: string, path: string, expiresIn: number) { const result = await this.client.storage.from(bucket).createSignedUrl(path, expiresIn); if (result.error || !result.data) throw new Error("SIGNED_READ_URL_CREATION_FAILED"); return result.data.signedUrl; }
  async exists(bucket: string, path: string) { return (await this.read(bucket, path)) !== null; }
  async read(bucket: string, path: string) { const result = await this.client.storage.from(bucket).download(path); if (result.error || !result.data) return null; return Buffer.from(await result.data.arrayBuffer()); }
  async upload(bucket: string, path: string, data: Buffer, mimeType: string) { const result = await this.client.storage.from(bucket).upload(path, data, { contentType: mimeType, upsert: false }); if (result.error) throw new Error("STORAGE_WRITE_FAILED"); }
  async remove(bucket: string, paths: string[]) { if (!paths.length) return; const result = await this.client.storage.from(bucket).remove(paths); if (result.error) throw new Error("STORAGE_DELETE_FAILED"); }
}

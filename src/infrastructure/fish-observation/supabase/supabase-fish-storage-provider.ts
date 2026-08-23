import { createHash } from "node:crypto";
import sharp from "sharp";
import type { FishStorageProvider } from "../../../domain/fish-observation/storage/ports/fish-storage-provider";
import { declaredMimeMatchesMagic } from "../image/image-magic-byte-validator";
import type { FishStorageTransport } from "./types";
import { SupabaseFishMediaError } from "./supabase-fish-media-errors";
const BUCKETS = new Set(["fish-observation-originals", "fish-observation-processed", "fish-observation-public"]);
export const SUPABASE_SIGNED_UPLOAD_PROVIDER_TTL_SECONDS = 7200;
export class SupabaseFishStorageProvider implements FishStorageProvider {
  constructor(private readonly transport: FishStorageTransport) {}
  private valid(bucket: string, path: string) { if (!BUCKETS.has(bucket) || !path || path.startsWith("/") || path.includes("..")) throw new SupabaseFishMediaError("ADAPTER_CONFIGURATION_ERROR"); }
  async issueUploadUrl(i: { bucket: "fish-observation-originals" | "fish-observation-processed" | "fish-observation-public"; storagePath: string; expiresAt: string }) { this.valid(i.bucket, i.storagePath); try { return { signedUploadUrl: await this.transport.createSignedUploadUrl(i.bucket, i.storagePath, SUPABASE_SIGNED_UPLOAD_PROVIDER_TTL_SECONDS), providerTtlSeconds: SUPABASE_SIGNED_UPLOAD_PROVIDER_TTL_SECONDS }; } catch { throw new SupabaseFishMediaError("SIGNED_URL_CREATION_FAILED"); } }
  async inspectObject(i: { bucket: "fish-observation-originals" | "fish-observation-processed" | "fish-observation-public"; storagePath: string }) {
    this.valid(i.bucket, i.storagePath);
    const buffer = await this.transport.read(i.bucket, i.storagePath);
    if (!buffer) return { exists: false, detectedMimeType: "", byteSize: 0, magicBytesValid: false, decodes: false, width: 0, height: 0, checksum: "" };
    const magic = declaredMimeMatchesMagic("image/jpeg", buffer);
    try {
      const info = await sharp(buffer, { animated: true }).metadata();
      return { exists: true, detectedMimeType: magic.detectedMimeType ?? "", byteSize: buffer.length, magicBytesValid: Boolean(magic.detectedMimeType), decodes: true, width: info.width ?? 0, height: info.height ?? 0, frameCount: info.pages ?? 1, checksum: createHash("sha256").update(buffer).digest("hex") };
    } catch {
      return { exists: true, detectedMimeType: magic.detectedMimeType ?? "", byteSize: buffer.length, magicBytesValid: Boolean(magic.detectedMimeType), decodes: false, width: 0, height: 0, checksum: createHash("sha256").update(buffer).digest("hex") };
    }
  }
  async revokePublicObject(i: { bucket: "fish-observation-originals" | "fish-observation-processed" | "fish-observation-public"; storagePath: string }) { this.valid(i.bucket, i.storagePath); if (i.bucket !== "fish-observation-public") return; try { await this.transport.remove(i.bucket, [i.storagePath]); } catch { throw new SupabaseFishMediaError("STORAGE_DELETE_FAILED"); } }
  async readObjectBuffer(bucket: string, path: string) { this.valid(bucket, path); const value = await this.transport.read(bucket, path); if (!value) throw new SupabaseFishMediaError("STORAGE_OBJECT_NOT_FOUND"); if (value.length > 20 * 1024 * 1024) throw new SupabaseFishMediaError("STORAGE_READ_FAILED", { reason: "buffer_limit" }); return value; }
}

import "server-only";
import { randomUUID } from "node:crypto";
import { buildFishObservationStoragePaths } from "../../../domain/fish-observation/storage/drafts/fish-observation-media-policy";
import type { FishImageProcessor, FishPrivateVariantResult } from "../../../domain/fish-observation/storage/ports/fish-image-processor";
import type { FishStorageTransport, FishSupabaseClient } from "../supabase/types";
import { SharpFishImageProcessor } from "./sharp-fish-image-processor";

export class StorageBackedSharpFishImageProcessor implements FishImageProcessor {
  constructor(
    private readonly storage: FishStorageTransport,
    private readonly database: FishSupabaseClient,
    private readonly sharpProcessor = new SharpFishImageProcessor(),
    private readonly createId: () => string = randomUUID,
  ) {}

  async sanitizeAndCreatePrivateVariants(input: Parameters<FishImageProcessor["sanitizeAndCreatePrivateVariants"]>[0], context?: Parameters<FishImageProcessor["sanitizeAndCreatePrivateVariants"]>[1]) {
    if (!context) throw new Error("FISH_MEDIA_PROCESSING_CONTEXT_REQUIRED");
    const source = await this.storage.read(context.media.bucket, context.media.storagePath);
    if (!source) throw new Error("STORAGE_OBJECT_NOT_FOUND");
    const processed = await this.sharpProcessor.process({ mediaId: context.media.id, sourceBuffer: source, declaredMimeType: input.detectedMimeType, expectedByteSize: input.byteSize, purpose: "user_original_upload" });
    const paths = buildFishObservationStoragePaths({ userId: context.media.ownerUserId, observationId: context.media.observationId, mediaId: context.media.id, extension: "jpg", variantType: "sanitized_master" });
    const pathByType = { processed_master: paths.sanitizedMasterPath, thumbnail: paths.thumbnailPath, ai_analysis: paths.aiAnalysisPath } as const;
    const createdRows: string[] = [], uploadedPaths: string[] = [];
    const variants: FishPrivateVariantResult[] = [];
    try {
      for (const variant of processed.variants) {
        const storagePath = pathByType[variant.variantType];
        await this.storage.upload("fish-observation-processed", storagePath, variant.buffer, variant.mimeType);
        uploadedPaths.push(storagePath);
        const mediaId = this.createId();
        await this.database.insert("fish_media", {
          id: mediaId,
          user_id: context.media.ownerUserId,
          observation_id: context.media.observationId,
          media_kind: variant.variantType === "thumbnail" ? "thumbnail" : "image",
          origin_type: "user_catch_photo",
          storage_bucket: "fish-observation-processed",
          storage_path: storagePath,
          referenced_source_media_id: context.media.id,
          image_hash: variant.sha256,
          usage_status: "ready",
          review_status: "pending",
          privacy: "private",
          exif_status: "stripped",
          deletion_status: "active",
          generation_metadata: { variantType: variant.variantType, parentMediaId: context.media.id, state: "ready_private", version: 1, byteSize: variant.byteSize, width: variant.width, height: variant.height, exifRemoved: true },
        });
        createdRows.push(mediaId);
        variants.push({ variantType: variant.variantType, mediaId, storagePath, sha256: variant.sha256, byteSize: variant.byteSize, width: variant.width, height: variant.height, exifRemoved: true });
      }
      return { exifRemoved: true, readyForAi: true, sourceHash: processed.sourceHash, hadGpsExif: processed.sourceMetadata.hadGpsExif, variants };
    } catch (error) {
      await this.storage.remove("fish-observation-processed", uploadedPaths).catch(() => undefined);
      if (this.database.delete) await Promise.all(createdRows.map((id) => this.database.delete!("fish_media", { id }).catch(() => 0)));
      throw error;
    }
  }

  async createPublicWatermarkedVariant() { return { created: false }; }
}

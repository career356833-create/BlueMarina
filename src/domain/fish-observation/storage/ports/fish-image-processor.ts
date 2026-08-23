import type { FishMediaRecord, UploadedObjectMetadata } from "../application/types";

export type FishPrivateVariantResult = {
  variantType: "processed_master" | "thumbnail" | "ai_analysis";
  mediaId: string;
  storagePath: string;
  sha256: string;
  byteSize: number;
  width: number;
  height: number;
  exifRemoved: true;
};

export interface FishImageProcessor {
  sanitizeAndCreatePrivateVariants(
    input: UploadedObjectMetadata,
    context?: { media: FishMediaRecord },
  ): Promise<{ exifRemoved: boolean; readyForAi: boolean; sourceHash?: string; hadGpsExif?: boolean; variants?: FishPrivateVariantResult[] }>;
  createPublicWatermarkedVariant(): Promise<{ created: boolean }>;
}

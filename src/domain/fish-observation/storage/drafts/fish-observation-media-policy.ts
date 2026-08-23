export const FISH_OBSERVATION_STORAGE_BUCKETS = {
  originals: "fish-observation-originals",
  processed: "fish-observation-processed",
  public: "fish-observation-public",
} as const;

export type FishObservationStorageBucket = (typeof FISH_OBSERVATION_STORAGE_BUCKETS)[keyof typeof FISH_OBSERVATION_STORAGE_BUCKETS];

export type FishObservationMediaVariantType =
  | "upload_original"
  | "sanitized_master"
  | "thumbnail"
  | "ai_analysis"
  | "review_preview"
  | "public_watermarked";

export type FishObservationUploadMimeType = "image/jpeg" | "image/png" | "image/webp";

export type FishObservationStoragePathInput = {
  userId: string;
  observationId: string;
  mediaId: string;
  extension: "jpg" | "jpeg" | "png" | "webp" | "heic" | "heif";
  variantType: FishObservationMediaVariantType;
};

export type FishObservationStoragePaths = {
  originalsPath: string;
  sanitizedMasterPath: string;
  thumbnailPath: string;
  aiAnalysisPath: string;
  reviewPreviewPath: string;
  publicWatermarkedPath: string;
};

export const FISH_OBSERVATION_MEDIA_POLICY = {
  acceptedUploadMimeTypes: ["image/jpeg", "image/png", "image/webp"] as FishObservationUploadMimeType[],
  conditionallySupportedMimeTypes: ["image/heic", "image/heif"],
  maxOriginalBytes: 20 * 1024 * 1024,
  minDimensionPx: 256,
  maxDimensionPx: 6000,
  maxPixelCount: 32_000_000,
  signedUploadTtlSeconds: 10 * 60,
  originalReadSignedUrlTtlSeconds: 60,
  personalPreviewSignedUrlTtlSeconds: 5 * 60,
  aiAnalysisSignedUrlTtlSeconds: 5 * 60,
  temporaryOriginalTtlHours: 24,
  publicDerivativeCacheSeconds: 5 * 60,
  dedupeScope: "same_user_only",
  trainingEligibleDefault: false,
  allowAnimation: false,
  retainOriginalExif: false,
} as const;

export type FishObservationFileValidationInput = {
  declaredMimeType: string;
  detectedMimeType: string;
  byteSize: number;
  width: number;
  height: number;
  frameCount?: number | null;
};

export type FishObservationFileValidationResult = {
  accepted: boolean;
  reasons: Array<"mime_not_allowed" | "mime_mismatch" | "file_too_large" | "dimension_out_of_range" | "pixel_count_exceeded" | "animated_image_not_allowed">;
};

export type FishObservationMediaDeletionPlan = {
  mediaId: string;
  storagePathsToSoftDelete: string[];
  storagePathsToHardDeleteAfterRetention: string[];
  removeEmbeddings: boolean;
  cancelPendingIdentification: boolean;
  revokePublicDerivatives: boolean;
};

export function buildFishObservationStoragePaths(input: FishObservationStoragePathInput): FishObservationStoragePaths {
  const base = `${input.userId}/${input.observationId}`;
  const fileName = `${input.mediaId}.${input.extension}`;

  return {
    originalsPath: `${base}/original/${fileName}`,
    sanitizedMasterPath: `${base}/processed/sanitized-master/${fileName}`,
    thumbnailPath: `${base}/processed/thumbnail/${fileName}`,
    aiAnalysisPath: `${base}/processed/ai-analysis/${fileName}`,
    reviewPreviewPath: `${base}/processed/review-preview/${fileName}`,
    publicWatermarkedPath: `${base}/public/public-watermarked/${fileName}`,
  };
}

export function validateFishObservationUploadFile(input: FishObservationFileValidationInput): FishObservationFileValidationResult {
  const reasons: FishObservationFileValidationResult["reasons"] = [];

  if (!FISH_OBSERVATION_MEDIA_POLICY.acceptedUploadMimeTypes.includes(input.declaredMimeType as FishObservationUploadMimeType)) {
    reasons.push("mime_not_allowed");
  }
  if (input.declaredMimeType !== input.detectedMimeType) reasons.push("mime_mismatch");
  if (input.byteSize > FISH_OBSERVATION_MEDIA_POLICY.maxOriginalBytes) reasons.push("file_too_large");
  if (
    input.width < FISH_OBSERVATION_MEDIA_POLICY.minDimensionPx ||
    input.height < FISH_OBSERVATION_MEDIA_POLICY.minDimensionPx ||
    input.width > FISH_OBSERVATION_MEDIA_POLICY.maxDimensionPx ||
    input.height > FISH_OBSERVATION_MEDIA_POLICY.maxDimensionPx
  ) {
    reasons.push("dimension_out_of_range");
  }
  if (input.width * input.height > FISH_OBSERVATION_MEDIA_POLICY.maxPixelCount) reasons.push("pixel_count_exceeded");
  if ((input.frameCount ?? 1) > 1) reasons.push("animated_image_not_allowed");

  return { accepted: reasons.length === 0, reasons };
}

export function isFishObservationPathOwnedByUser(storagePath: string, userId: string) {
  return storagePath.split("/")[0] === userId;
}

export function buildFishObservationMediaDeletionPlan(mediaId: string, paths: FishObservationStoragePaths): FishObservationMediaDeletionPlan {
  return {
    mediaId,
    storagePathsToSoftDelete: [paths.sanitizedMasterPath, paths.thumbnailPath, paths.aiAnalysisPath, paths.reviewPreviewPath, paths.publicWatermarkedPath],
    storagePathsToHardDeleteAfterRetention: [paths.originalsPath, paths.sanitizedMasterPath, paths.thumbnailPath, paths.aiAnalysisPath, paths.reviewPreviewPath, paths.publicWatermarkedPath],
    removeEmbeddings: true,
    cancelPendingIdentification: true,
    revokePublicDerivatives: true,
  };
}

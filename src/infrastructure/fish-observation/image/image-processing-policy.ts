export const FISH_IMAGE_PROCESSING_POLICY = {
  supportedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxSourceBytes: 20 * 1024 * 1024,
  minDimensionPx: 256,
  maxDimensionPx: 6000,
  maxPixelCount: 32_000_000,
  maxPages: 1,
  processedMasterMaxPx: 2048,
  thumbnailPx: 512,
  aiAnalysisMaxPx: 1280,
  outputMimeType: "image/jpeg" as const,
  outputQuality: 85,
} as const;

export type FishImageMimeType = (typeof FISH_IMAGE_PROCESSING_POLICY.supportedMimeTypes)[number];

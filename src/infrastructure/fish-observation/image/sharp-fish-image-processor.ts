// Server-only infrastructure adapter. It accepts bytes and returns bytes; it has
// no knowledge of Storage, user identity, bucket, path, or signed URLs.
import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { declaredMimeMatchesMagic } from "./image-magic-byte-validator";
import { FishImageProcessingError } from "./image-processing-errors";
import { FISH_IMAGE_PROCESSING_POLICY, type FishImageMimeType } from "./image-processing-policy";

export type FishImageProcessingInput = { mediaId: string; sourceBuffer: Buffer; declaredMimeType: string; expectedByteSize: number; purpose: "user_original_upload"; signal?: AbortSignal };
export type FishProcessedVariant = { variantType: "processed_master" | "thumbnail" | "ai_analysis"; buffer: Buffer; mimeType: "image/jpeg"; byteSize: number; width: number; height: number; sha256: string; exifRemoved: true; parentMediaId: string };
export type FishImageProcessingResult = { sourceHash: string; normalizedHash: string; sourceMetadata: { width: number; height: number; format: string; hadExif: boolean; hadGpsExif: boolean; orientation?: number }; variants: FishProcessedVariant[]; exifRemoved: true; readyForAi: true };

function hash(value: Buffer) { return createHash("sha256").update(value).digest("hex"); }
function assertNotAborted(signal?: AbortSignal) { if (signal?.aborted) throw new FishImageProcessingError("IMAGE_DECODE_FAILED", true, "media.processing_cancelled", "aborted"); }
function mimeForFormat(format?: string): FishImageMimeType | null { return format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : format === "webp" ? "image/webp" : null; }

export class SharpFishImageProcessor {
  async process(input: FishImageProcessingInput): Promise<FishImageProcessingResult> {
    assertNotAborted(input.signal);
    if (!input.sourceBuffer.length || input.sourceBuffer.length !== input.expectedByteSize) throw new FishImageProcessingError("HASH_MISMATCH", false, "media.size_mismatch");
    if (input.sourceBuffer.length > FISH_IMAGE_PROCESSING_POLICY.maxSourceBytes) throw new FishImageProcessingError("IMAGE_TOO_LARGE", false, "media.too_large");
    const magic = declaredMimeMatchesMagic(input.declaredMimeType, input.sourceBuffer);
    if (!magic.detectedMimeType) throw new FishImageProcessingError("UNSUPPORTED_IMAGE_FORMAT", false, "media.unsupported_format");
    if (!magic.matches) throw new FishImageProcessingError("MAGIC_BYTE_MISMATCH", false, "media.invalid_file");
    let metadata: Metadata;
    try { metadata = await sharp(input.sourceBuffer, { animated: true, limitInputPixels: FISH_IMAGE_PROCESSING_POLICY.maxPixelCount }).metadata(); } catch { throw new FishImageProcessingError("IMAGE_DECODE_FAILED", false, "media.invalid_file"); }
    const formatMime = mimeForFormat(metadata.format); if (!formatMime || formatMime !== magic.detectedMimeType) throw new FishImageProcessingError("UNSUPPORTED_IMAGE_FORMAT", false, "media.unsupported_format");
    const width = metadata.width ?? 0, height = metadata.height ?? 0, pages = metadata.pages ?? 1;
    if (pages > FISH_IMAGE_PROCESSING_POLICY.maxPages) throw new FishImageProcessingError("ANIMATED_IMAGE_NOT_ALLOWED", false, "media.animated_not_allowed");
    if (width < FISH_IMAGE_PROCESSING_POLICY.minDimensionPx || height < FISH_IMAGE_PROCESSING_POLICY.minDimensionPx) throw new FishImageProcessingError("IMAGE_DIMENSION_TOO_SMALL", false, "media.dimension_too_small");
    if (width > FISH_IMAGE_PROCESSING_POLICY.maxDimensionPx || height > FISH_IMAGE_PROCESSING_POLICY.maxDimensionPx || width * height > FISH_IMAGE_PROCESSING_POLICY.maxPixelCount) throw new FishImageProcessingError("PIXEL_LIMIT_EXCEEDED", false, "media.pixel_limit");
    assertNotAborted(input.signal);
    let normalized: Buffer;
    try { normalized = await sharp(input.sourceBuffer, { animated: false, limitInputPixels: FISH_IMAGE_PROCESSING_POLICY.maxPixelCount }).rotate().jpeg({ quality: FISH_IMAGE_PROCESSING_POLICY.outputQuality }).toBuffer(); } catch { throw new FishImageProcessingError("EXIF_PROCESSING_FAILED", true, "media.processing_failed"); }
    const build = async (variantType: FishProcessedVariant["variantType"], max: number, fit: "inside" | "contain") => { assertNotAborted(input.signal); const output = await sharp(normalized).resize({ width: max, height: max, fit, withoutEnlargement: true }).jpeg({ quality: FISH_IMAGE_PROCESSING_POLICY.outputQuality }).toBuffer({ resolveWithObject: true }); return { variantType, buffer: output.data, mimeType: "image/jpeg" as const, byteSize: output.data.length, width: output.info.width, height: output.info.height, sha256: hash(output.data), exifRemoved: true as const, parentMediaId: input.mediaId }; };
    try { const variants = [await build("processed_master", FISH_IMAGE_PROCESSING_POLICY.processedMasterMaxPx, "inside"), await build("thumbnail", FISH_IMAGE_PROCESSING_POLICY.thumbnailPx, "contain"), await build("ai_analysis", FISH_IMAGE_PROCESSING_POLICY.aiAnalysisMaxPx, "inside")]; return { sourceHash: hash(input.sourceBuffer), normalizedHash: hash(normalized), sourceMetadata: { width, height, format: metadata.format ?? "unknown", hadExif: Boolean(metadata.exif), hadGpsExif: Boolean(metadata.exif && /GPS/i.test(metadata.exif.toString("latin1"))), orientation: metadata.orientation }, variants, exifRemoved: true, readyForAi: true }; } catch (error) { if (error instanceof FishImageProcessingError) throw error; throw new FishImageProcessingError("EXIF_PROCESSING_FAILED", true, "media.processing_failed"); }
  }
}

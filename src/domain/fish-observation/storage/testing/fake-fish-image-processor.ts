import type { FishImageProcessor } from "../ports/fish-image-processor";
import type { UploadedObjectMetadata } from "../application/types";
export class FakeFishImageProcessor implements FishImageProcessor { exifRemoved = true; readyForAi = true; publicCreated = false; privateVariantCalls = 0; async sanitizeAndCreatePrivateVariants(input: UploadedObjectMetadata) { void input; this.privateVariantCalls++; return { exifRemoved: this.exifRemoved, readyForAi: this.readyForAi }; } async createPublicWatermarkedVariant() { this.publicCreated = true; return { created: true }; } }

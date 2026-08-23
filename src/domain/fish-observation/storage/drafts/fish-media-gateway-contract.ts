import type { FishObservationStorageBucket, FishObservationUploadMimeType } from "./fish-observation-media-policy";
import type { FishMediaState } from "./fish-media-state-machine";
import type { FishMediaErrorCode } from "./fish-media-error-codes";

export type FishMediaGatewayPurpose = "user_original_upload" | "private_thumbnail_read" | "ai_analysis" | "public_review" | "delete_media";

export type CreateObservationUploadRequest = {
  actorUserId: string;
  observationId: string;
  mediaId: string;
  purpose: "user_original_upload";
  expectedMimeType: FishObservationUploadMimeType | "image/heic" | "image/heif";
  expectedByteSize: number;
  idempotencyKey: string;
};

export type CreateObservationUploadResult = {
  uploadSessionId: string;
  state: "upload_url_issued";
  bucket: FishObservationStorageBucket;
  storagePath: string;
  signedUploadUrl: string;
  expiresAt: string;
};

export type FinalizeObservationUploadRequest = {
  actorUserId: string;
  observationId: string;
  mediaId: string;
  purpose: "user_original_upload";
  idempotencyKey: string;
  detectedMimeType: string;
  detectedByteSize: number;
  checksum: string;
};

export type FinalizeObservationUploadResult = {
  state: FishMediaState;
  accepted: boolean;
  canRequestAiIdentification: boolean;
  errorCode?: FishMediaErrorCode;
};

export type CreateProcessedVariantRequest = {
  actorUserId: string;
  observationId: string;
  mediaId: string;
  purpose: "ai_analysis" | "public_review";
  idempotencyKey: string;
};

export type CreateProcessedVariantResult = { state: FishMediaState; bucket: FishObservationStorageBucket; storagePath: string; variantType: "ai_analysis" | "public_watermarked" };

export type DeleteObservationMediaRequest = { actorUserId: string; observationId: string; mediaId: string; purpose: "delete_media"; idempotencyKey: string; reason?: string | null };
export type DeleteObservationMediaResult = { state: "delete_pending" | "deleted"; cleanupJobId: string; publicDerivativeRevoked: boolean };

export type FishMediaGatewayAuthorizationSnapshot = {
  observationOwnerUserId: string;
  observationDeletionStatus: "active" | "requested" | "deleted";
  mediaState: FishMediaState;
};

export function authorizeObservationMediaRequest(actorUserId: string, snapshot: FishMediaGatewayAuthorizationSnapshot) {
  if (snapshot.observationOwnerUserId !== actorUserId) return "OBSERVATION_NOT_OWNED" as const;
  if (snapshot.observationDeletionStatus !== "active" || snapshot.mediaState === "delete_pending" || snapshot.mediaState === "deleted") return "MEDIA_DELETE_PENDING" as const;
  return null;
}

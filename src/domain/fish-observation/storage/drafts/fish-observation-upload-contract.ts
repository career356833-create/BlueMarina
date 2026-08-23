import type {
  FishObservationMediaVariantType,
  FishObservationStorageBucket,
  FishObservationStoragePaths,
  FishObservationUploadMimeType,
} from "./fish-observation-media-policy";

export type CreateFishObservationUploadRequest = {
  observationId: string;
  originalFileName?: string | null;
  declaredMimeType: FishObservationUploadMimeType | "image/heic" | "image/heif";
  declaredByteSize: number;
  clientImageHash?: string | null;
  locationConsent: "do_not_store" | "store_private_exact";
  trainingEligible?: false;
};

export type CreateFishObservationUploadResult = {
  uploadSessionId: string;
  mediaId: string;
  bucket: FishObservationStorageBucket;
  storagePath: string;
  signedUploadUrl: string;
  expiresAt: string;
  maxByteSize: number;
  requiredHeaders: Record<string, string>;
  duplicateCandidateMediaId?: string | null;
  paths: Pick<FishObservationStoragePaths, "originalsPath">;
};

export type FinalizeFishObservationUpload = {
  uploadSessionId: string;
  observationId: string;
  mediaId: string;
  storagePath: string;
  detectedMimeType: FishObservationUploadMimeType;
  byteSize: number;
  width: number;
  height: number;
  frameCount?: number | null;
  imageHash: string;
  exifExtractedAt?: string | null;
  exactLocation?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
  } | null;
};

export type FinalizeFishObservationUploadResult = {
  accepted: boolean;
  mediaId?: string;
  mediaRecordState: "pending_processing" | "ready_for_ai" | "rejected";
  processedVariants?: FishObservationMediaVariantType[];
  imageHash?: string;
  exifStored: false;
  exactLocationStored: boolean;
  canRequestAiIdentification: boolean;
  rejectionReasons: string[];
};

export type FishObservationUploadSessionPolicy = {
  sessionOwnerUserId: string;
  observationId: string;
  mediaId: string;
  storagePath: string;
  expiresAt: string;
  status: "issued" | "uploaded" | "finalized" | "expired" | "rejected";
  singleUse: true;
  trainingEligible: false;
};

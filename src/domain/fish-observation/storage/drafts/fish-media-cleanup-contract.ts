import type { FishObservationStorageBucket } from "./fish-observation-media-policy";
import type { FishMediaErrorCode } from "./fish-media-error-codes";

export type FishMediaCleanupType = "expired_original_cleanup" | "orphan_storage_cleanup" | "abandoned_upload_cleanup" | "withdrawn_public_media_cleanup" | "deleted_observation_cleanup" | "training_consent_withdrawal_cleanup";
export type FishMediaCleanupStatus = "pending" | "leased" | "retry_scheduled" | "manual_review" | "completed" | "cancelled";

export type FishMediaCleanupJob = {
  jobId: string;
  mediaId?: string | null;
  bucket: FishObservationStorageBucket;
  storagePath: string;
  cleanupType: FishMediaCleanupType;
  attemptCount: number;
  nextAttemptAt: string;
  status: FishMediaCleanupStatus;
  leaseToken?: string | null;
  leaseExpiresAt?: string | null;
  lastErrorCode?: FishMediaErrorCode | null;
  createdAt: string;
  completedAt?: string | null;
};

export type FishMediaOrphanKind = "storage_without_media_row" | "media_row_without_storage" | "variant_without_parent" | "media_after_observation_deletion" | "media_after_user_deletion" | "public_after_withdrawal" | "unfinalized_upload";

export function nextCleanupStatus(input: { storageDeleteSucceeded: boolean; attemptCount: number; maxAttempts: number }): FishMediaCleanupStatus {
  if (input.storageDeleteSucceeded) return "completed";
  return input.attemptCount >= input.maxAttempts ? "manual_review" : "retry_scheduled";
}

export function shouldDeferOriginalTtl(input: { uploadedAt: string; now: string; processing: boolean; legalHold: boolean; graceHours?: number }): boolean {
  if (input.legalHold || input.processing) return true;
  const grace = (input.graceHours ?? 0) * 60 * 60 * 1000;
  return new Date(input.now).getTime() < new Date(input.uploadedAt).getTime() + 24 * 60 * 60 * 1000 + grace;
}

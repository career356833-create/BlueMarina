import type { FishMediaErrorCode } from "../drafts/fish-media-error-codes";
import type { FishMediaState } from "../drafts/fish-media-state-machine";
import type { FishObservationStorageBucket } from "../drafts/fish-observation-media-policy";

export type FishMediaActorRole = "user" | "fish_reviewer" | "fish_admin" | "fish_crawler" | "media_worker";
export type FishMediaRecord = { id: string; observationId: string; ownerUserId: string; bucket: FishObservationStorageBucket; storagePath: string; state: FishMediaState; version: number; exifRemoved: boolean; reviewApproved: boolean; observationPublic: boolean; publicConsent: boolean; finalizedResult?: FishMediaCommandResult };
export type FishMediaUploadSession = { id: string; mediaId: string; observationId: string; userId: string; idempotencyKey: string; state: FishMediaState; gatewayExpiresAt: string; providerExpiresAt: string; createdAt: string };
export type FishMediaCommandResult = { accepted: boolean; mediaId: string; state: FishMediaState; idempotent?: boolean; cleanupJobId?: string; error?: FishMediaApplicationError };
export class FishMediaApplicationError extends Error { constructor(public readonly code: FishMediaErrorCode | "IDEMPOTENCY_CONFLICT" | "STORAGE_OBJECT_NOT_FOUND" | "STATE_CONFLICT" | "ROLE_NOT_ALLOWED", public readonly retryable: boolean, public readonly publicMessageKey: string, public readonly internalContext: Record<string, string> = {}) { super(code); } }
export type FishMediaCommandContext = { actorUserId: string; actorRole: FishMediaActorRole; idempotencyKey: string };
export type UploadedObjectMetadata = { exists: boolean; detectedMimeType: string; byteSize: number; magicBytesValid: boolean; decodes: boolean; width: number; height: number; frameCount?: number; checksum: string };

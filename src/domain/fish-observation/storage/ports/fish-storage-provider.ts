import type { FishObservationStorageBucket } from "../drafts/fish-observation-media-policy";
import type { UploadedObjectMetadata } from "../application/types";
export interface FishStorageProvider { issueUploadUrl(input: { bucket: FishObservationStorageBucket; storagePath: string; expiresAt: string }): Promise<{ signedUploadUrl: string; providerTtlSeconds: number }>; inspectObject(input: { bucket: FishObservationStorageBucket; storagePath: string }): Promise<UploadedObjectMetadata>; revokePublicObject(input: { bucket: FishObservationStorageBucket; storagePath: string }): Promise<void>; }

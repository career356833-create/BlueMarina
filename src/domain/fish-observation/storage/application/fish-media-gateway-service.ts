import { randomUUID } from "node:crypto";
import { FISH_OBSERVATION_MEDIA_POLICY, buildFishObservationStoragePaths, validateFishObservationUploadFile } from "../drafts/fish-observation-media-policy";
import { assertFishMediaStateTransition, canPublishPublicDerivative } from "../drafts/fish-media-state-machine";
import type { FishCleanupQueue } from "../ports/fish-cleanup-queue";
import type { FishImageProcessor } from "../ports/fish-image-processor";
import type { FishMediaAuditLog } from "../ports/fish-media-audit-log";
import type { FishMediaRepository } from "../ports/fish-media-repository";
import type { FishObservationAccess } from "../ports/fish-observation-access";
import type { FishStorageProvider } from "../ports/fish-storage-provider";
import { FishMediaApplicationError, type FishMediaCommandContext, type FishMediaCommandResult, type FishMediaRecord, type UploadedObjectMetadata } from "./types";

export type FishMediaGatewayDependencies = { repository: FishMediaRepository; storage: FishStorageProvider; imageProcessor: FishImageProcessor; cleanupQueue: FishCleanupQueue; observationAccess: FishObservationAccess; auditLog: FishMediaAuditLog; now?: () => Date; createId?: () => string };
export type CreateUploadInput = FishMediaCommandContext & { observationId: string; expectedMimeType: string; expectedByteSize: number; purpose: "user_original_upload" };
export type FinalizeUploadInput = FishMediaCommandContext & { observationId: string; mediaId: string; uploadedObjectMetadata?: UploadedObjectMetadata };
export type DeleteMediaInput = FishMediaCommandContext & { observationId: string; mediaId: string; purpose: "delete_media" };
export type PublishMediaInput = FishMediaCommandContext & { observationId: string; mediaId: string; purpose: "public_review" };

export class FishMediaGatewayService {
  constructor(private readonly deps: FishMediaGatewayDependencies) {}
  private now() { return (this.deps.now ?? (() => new Date()))(); }
  private id() { return (this.deps.createId ?? randomUUID)(); }
  private fingerprint(action: string, input: Record<string, unknown>) { return `${action}:${JSON.stringify(input)}`; }
  private async ensureIdempotency(action: string, input: Record<string, unknown>, key: string) { const fingerprint = this.fingerprint(action, input); const existing = await this.deps.repository.findIdempotency(key); if (!existing) return { fingerprint, existing: null }; if (existing.fingerprint === fingerprint) return { fingerprint, existing: { ...existing.result, idempotent: true } }; await this.deps.auditLog.append({ event: "idempotency_conflict", actorUserId: String(input.actorUserId), observationId: String(input.observationId) }); throw new FishMediaApplicationError("IDEMPOTENCY_CONFLICT", false, "media.request_conflict"); }
  private async ownActiveObservation(actorUserId: string, observationId: string) { const observation = await this.deps.observationAccess.getObservation({ observationId }); if (!observation || observation.ownerUserId !== actorUserId || observation.deletionStatus !== "active") throw new FishMediaApplicationError("OBSERVATION_NOT_OWNED", false, "media.access_denied"); return observation; }
  async createObservationUpload(input: CreateUploadInput) {
    const cached = await this.ensureIdempotency("create", input, input.idempotencyKey); if (cached.existing) return cached.existing;
    await this.ownActiveObservation(input.actorUserId, input.observationId);
    if (!FISH_OBSERVATION_MEDIA_POLICY.acceptedUploadMimeTypes.includes(input.expectedMimeType as never)) throw new FishMediaApplicationError("INVALID_MIME", false, "media.invalid_mime");
    if (input.expectedByteSize > FISH_OBSERVATION_MEDIA_POLICY.maxOriginalBytes) throw new FishMediaApplicationError("IMAGE_TOO_LARGE", false, "media.too_large");
    const issuedAt = this.now();
    const mediaId = this.id(), bucket = "fish-observation-originals" as const, paths = buildFishObservationStoragePaths({ userId: input.actorUserId, observationId: input.observationId, mediaId, extension: "jpg", variantType: "upload_original" });
    const record: FishMediaRecord = { id: mediaId, observationId: input.observationId, ownerUserId: input.actorUserId, bucket, storagePath: paths.originalsPath, state: "requested", version: 1, exifRemoved: false, reviewApproved: false, observationPublic: false, publicConsent: false };
    await this.deps.repository.create(record); await this.deps.auditLog.append({ event: "upload_requested", actorUserId: input.actorUserId, mediaId, observationId: input.observationId });
    const expiresAt = new Date(issuedAt.getTime() + FISH_OBSERVATION_MEDIA_POLICY.signedUploadTtlSeconds * 1000).toISOString(); const signed = await this.deps.storage.issueUploadUrl({ bucket, storagePath: record.storagePath, expiresAt });
    await this.deps.repository.createUploadSession({ id: this.id(), mediaId, observationId: input.observationId, userId: input.actorUserId, idempotencyKey: input.idempotencyKey, state: "upload_url_issued", gatewayExpiresAt: expiresAt, providerExpiresAt: new Date(issuedAt.getTime() + signed.providerTtlSeconds * 1000).toISOString(), createdAt: issuedAt.toISOString() });
    const issued = await this.deps.repository.compareAndSet(mediaId, 1, { state: "upload_url_issued" }); if (!issued) throw new FishMediaApplicationError("STATE_CONFLICT", true, "media.retry");
    const result: FishMediaCommandResult = { accepted: true, mediaId, state: "upload_url_issued" }; await this.deps.repository.saveIdempotency(input.idempotencyKey, cached.fingerprint, result); await this.deps.auditLog.append({ event: "upload_url_issued", actorUserId: input.actorUserId, mediaId, observationId: input.observationId }); return { ...result, signedUploadUrl: signed.signedUploadUrl, expiresAt };
  }
  async finalizeObservationUpload(input: FinalizeUploadInput): Promise<FishMediaCommandResult> {
    const cached = await this.ensureIdempotency("finalize", input, input.idempotencyKey); if (cached.existing) return cached.existing;
    await this.ownActiveObservation(input.actorUserId, input.observationId);
    return this.deps.repository.withMediaLock(input.mediaId, async () => {
      const media = await this.deps.repository.find(input.mediaId);
      if (!media || media.ownerUserId !== input.actorUserId || media.observationId !== input.observationId) throw new FishMediaApplicationError("OBSERVATION_NOT_OWNED", false, "media.access_denied");
      if (media.state === "delete_pending" || media.state === "deleted") throw new FishMediaApplicationError("MEDIA_DELETE_PENDING", false, "media.delete_pending");
      const session = await this.deps.repository.findUploadSessionByMediaId(media.id);
      if (!session) throw new FishMediaApplicationError("UPLOAD_NOT_FOUND", false, "media.upload_not_found");
      const pendingSession = session.state === "requested" || session.state === "upload_url_issued" || session.state === "uploaded_unverified";
      if (pendingSession && this.now().getTime() > new Date(session.gatewayExpiresAt).getTime()) {
        if (session.state !== "expired") {
          assertFishMediaStateTransition(media.state, "expired");
          const expired = await this.deps.repository.compareAndSet(media.id, media.version, { state: "expired" });
          if (!expired) throw new FishMediaApplicationError("STATE_CONFLICT", true, "media.retry");
          await this.deps.repository.updateUploadSessionState(session.id, "expired");
          const cleanupAt = this.now().toISOString();
          await this.deps.cleanupQueue.enqueue({ jobId: this.id(), mediaId: media.id, bucket: media.bucket, storagePath: media.storagePath, cleanupType: "abandoned_upload_cleanup", attemptCount: 0, nextAttemptAt: cleanupAt, status: "pending", createdAt: cleanupAt });
          await this.deps.auditLog.append({ event: "upload_expired", actorUserId: input.actorUserId, mediaId: media.id, observationId: input.observationId });
        }
        throw new FishMediaApplicationError("UPLOAD_EXPIRED", false, "media.upload_expired");
      }
      if (media.state === "expired" || session.state === "expired") throw new FishMediaApplicationError("UPLOAD_EXPIRED", false, "media.upload_expired");
      if (media.finalizedResult) return { ...media.finalizedResult, idempotent: true };
      assertFishMediaStateTransition(media.state, "uploaded_unverified");
      const uploaded = input.uploadedObjectMetadata ?? await this.deps.storage.inspectObject({ bucket: media.bucket, storagePath: media.storagePath });
      if (!uploaded.exists) throw new FishMediaApplicationError("STORAGE_OBJECT_NOT_FOUND", true, "media.retry");
      if (!uploaded.magicBytesValid) throw new FishMediaApplicationError("MAGIC_BYTE_MISMATCH", false, "media.invalid_file");
      if (!uploaded.decodes) throw new FishMediaApplicationError("IMAGE_DECODE_FAILED", false, "media.invalid_file");
      const validation = validateFishObservationUploadFile({ declaredMimeType: uploaded.detectedMimeType, detectedMimeType: uploaded.detectedMimeType, byteSize: uploaded.byteSize, width: uploaded.width, height: uploaded.height, frameCount: uploaded.frameCount });
      if (!validation.accepted) throw new FishMediaApplicationError(validation.reasons.includes("file_too_large") ? "IMAGE_TOO_LARGE" : "PIXEL_LIMIT_EXCEEDED", false, "media.invalid_file");
      const verified = await this.deps.repository.compareAndSet(media.id, media.version, { state: "verified" });
      if (!verified) throw new FishMediaApplicationError("STATE_CONFLICT", true, "media.retry");
      const processing = await this.deps.repository.compareAndSet(media.id, verified.version, { state: "processing" });
      if (!processing) throw new FishMediaApplicationError("STATE_CONFLICT", true, "media.retry");
      await this.deps.auditLog.append({ event: "media_processing_started", actorUserId: input.actorUserId, mediaId: media.id, observationId: input.observationId });
      const variants = await this.deps.imageProcessor.sanitizeAndCreatePrivateVariants(uploaded, { media });
      if (!variants.exifRemoved) throw new FishMediaApplicationError("EXIF_PROCESSING_FAILED", true, "media.retry");
      const state: FishMediaCommandResult["state"] = variants.readyForAi ? "ready_for_ai" : "ready_private";
      const ready = await this.deps.repository.compareAndSet(media.id, processing.version, { state, exifRemoved: true });
      if (!ready) throw new FishMediaApplicationError("STATE_CONFLICT", true, "media.retry");
      await this.deps.repository.updateUploadSessionState(session.id, state);
      const jobId = this.id();
      await this.deps.cleanupQueue.enqueue({ jobId, mediaId: media.id, bucket: media.bucket, storagePath: media.storagePath, cleanupType: "expired_original_cleanup", attemptCount: 0, nextAttemptAt: new Date(this.now().getTime() + 24 * 60 * 60 * 1000).toISOString(), status: "pending", createdAt: this.now().toISOString() });
      const result: FishMediaCommandResult = { accepted: true, mediaId: media.id, state, cleanupJobId: jobId };
      await this.deps.repository.compareAndSet(media.id, ready.version, { finalizedResult: result });
      await this.deps.repository.saveIdempotency(input.idempotencyKey, cached.fingerprint, result);
      await this.deps.auditLog.append({ event: state === "ready_for_ai" ? "media_ready_for_ai" : "media_ready_private", actorUserId: input.actorUserId, mediaId: media.id, observationId: input.observationId });
      return result;
    });
  }
  async requestMediaDeletion(input: DeleteMediaInput): Promise<FishMediaCommandResult> { const cached = await this.ensureIdempotency("delete", input, input.idempotencyKey); if (cached.existing) return cached.existing; const media = await this.deps.repository.find(input.mediaId); if (!media || media.observationId !== input.observationId || (input.actorRole !== "fish_admin" && media.ownerUserId !== input.actorUserId)) throw new FishMediaApplicationError("OBSERVATION_NOT_OWNED", false, "media.access_denied"); return this.deps.repository.withMediaLock(media.id, async () => { const current = await this.deps.repository.find(media.id); if (!current || current.state === "deleted") throw new FishMediaApplicationError("MEDIA_DELETE_PENDING", false, "media.delete_pending"); if (current.state !== "delete_pending") { const updated = await this.deps.repository.compareAndSet(current.id, current.version, { state: "delete_pending" }); if (!updated) throw new FishMediaApplicationError("STATE_CONFLICT", true, "media.retry"); } await this.deps.storage.revokePublicObject({ bucket: "fish-observation-public", storagePath: current.storagePath }); const variants = await this.deps.repository.findVariants?.(current.id) ?? []; const cleanupTargets = [current, ...variants]; let firstJobId = ""; for (const target of cleanupTargets) { if (target.id !== current.id && target.state !== "delete_pending") await this.deps.repository.compareAndSet(target.id, target.version, { state: "delete_pending" }); const jobId = this.id(); if (!firstJobId) firstJobId = jobId; await this.deps.cleanupQueue.enqueue({ jobId, mediaId: target.id, bucket: target.bucket, storagePath: target.storagePath, cleanupType: "deleted_observation_cleanup", attemptCount: 0, nextAttemptAt: this.now().toISOString(), status: "pending", createdAt: this.now().toISOString() }); } const result = { accepted: true, mediaId: current.id, state: "delete_pending" as const, cleanupJobId: firstJobId }; await this.deps.repository.saveIdempotency(input.idempotencyKey, cached.fingerprint, result); await this.deps.auditLog.append({ event: "media_delete_requested", actorUserId: input.actorUserId, mediaId: current.id, observationId: input.observationId }); return result; }); }
  async publishObservationMedia(input: PublishMediaInput): Promise<FishMediaCommandResult> { const cached = await this.ensureIdempotency("publish", input, input.idempotencyKey); if (cached.existing) return cached.existing; if (input.actorRole !== "fish_reviewer" && input.actorRole !== "fish_admin") throw new FishMediaApplicationError("ROLE_NOT_ALLOWED", false, "media.access_denied"); const media = await this.deps.repository.find(input.mediaId); if (!media || media.observationId !== input.observationId || media.state === "delete_pending") throw new FishMediaApplicationError("PUBLICATION_NOT_ALLOWED", false, "media.publication_denied"); if (!canPublishPublicDerivative({ state: "public_review_pending", exifRemoved: media.exifRemoved, reviewApproved: media.reviewApproved, observationPublic: media.observationPublic, publicConsent: media.publicConsent })) throw new FishMediaApplicationError("PUBLICATION_NOT_ALLOWED", false, "media.publication_denied"); await this.deps.imageProcessor.createPublicWatermarkedVariant(); const updated = await this.deps.repository.compareAndSet(media.id, media.version, { state: "published" }); if (!updated) throw new FishMediaApplicationError("STATE_CONFLICT", true, "media.retry"); const result = { accepted: true, mediaId: media.id, state: "published" as const }; await this.deps.repository.saveIdempotency(input.idempotencyKey, cached.fingerprint, result); await this.deps.auditLog.append({ event: "media_published", actorUserId: input.actorUserId, mediaId: media.id, observationId: input.observationId }); return result; }
}

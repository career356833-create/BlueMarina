import type { FishMediaRecord } from "../../../domain/fish-observation/storage/application/types";

type GatewayMetadata = {
  state?: FishMediaRecord["state"];
  version?: number;
  publicConsent?: boolean;
  finalizedResult?: FishMediaRecord["finalizedResult"];
  variantType?: string;
};

function metadata(row: Record<string, unknown>): GatewayMetadata {
  return row.generation_metadata && typeof row.generation_metadata === "object"
    ? row.generation_metadata as GatewayMetadata
    : {};
}

export function mediaFromRow(row: Record<string, unknown>): FishMediaRecord {
  const gateway = metadata(row);
  return {
    id: String(row.id),
    observationId: String(row.observation_id),
    ownerUserId: String(row.user_id),
    bucket: String(row.storage_bucket) as FishMediaRecord["bucket"],
    storagePath: String(row.storage_path),
    state: gateway.state ?? "requested",
    version: Number(gateway.version ?? 1),
    exifRemoved: row.exif_status === "stripped",
    reviewApproved: row.review_status === "approved",
    observationPublic: row.privacy === "public",
    publicConsent: gateway.publicConsent === true,
    finalizedResult: gateway.finalizedResult,
  };
}

export function mediaToRow(record: FishMediaRecord) {
  return {
    id: record.id,
    observation_id: record.observationId,
    user_id: record.ownerUserId,
    media_kind: "image",
    origin_type: "user_catch_photo",
    storage_bucket: record.bucket,
    storage_path: record.storagePath,
    usage_status: record.state === "ready_private" || record.state === "ready_for_ai" ? "ready" : "pending",
    review_status: record.reviewApproved ? "approved" : "pending",
    privacy: record.observationPublic ? "public" : "private",
    exif_status: record.exifRemoved ? "stripped" : "unknown",
    deletion_status: record.state === "deleted" ? "deleted" : record.state === "delete_pending" ? "requested" : "active",
    generation_metadata: {
      variantType: "upload_original",
      state: record.state,
      version: record.version,
      publicConsent: record.publicConsent,
      ...(record.finalizedResult ? { finalizedResult: record.finalizedResult } : {}),
    },
  };
}

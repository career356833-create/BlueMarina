import { fail } from "./fish-media-http-response";

const KNOWN_ERROR_STATUS: Record<string, number> = {
  FISH_MEDIA_GATEWAY_DISABLED: 503,
  METHOD_NOT_ALLOWED: 405,
  ORIGIN_NOT_ALLOWED: 403,
  UNAUTHENTICATED: 401,
  VALIDATION_ERROR: 400,
  INVALID_IDEMPOTENCY_KEY: 400,
  RATE_LIMITED: 429,
  ROLE_NOT_ALLOWED: 403,
  OBSERVATION_NOT_OWNED: 403,
  INVALID_MIME: 400,
  UPLOAD_NOT_FOUND: 404,
  UPLOAD_EXPIRED: 410,
  IMAGE_TOO_LARGE: 413,
  STORAGE_OBJECT_NOT_FOUND: 503,
  MAGIC_BYTE_MISMATCH: 422,
  IMAGE_DECODE_FAILED: 422,
  PIXEL_LIMIT_EXCEEDED: 413,
  MEDIA_DELETE_PENDING: 409,
  PUBLICATION_NOT_ALLOWED: 403,
  STATE_CONFLICT: 409,
  EXIF_PROCESSING_FAILED: 503,
  IDEMPOTENCY_CONFLICT: 409,
};

const KNOWN_ERROR_CODES = new Set(Object.keys(KNOWN_ERROR_STATUS));

export function mapFishMediaHttpError(requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const normalized = KNOWN_ERROR_CODES.has(code) ? code : "INTERNAL_ERROR";
  const status = KNOWN_ERROR_STATUS[normalized] ?? 500;
  const retryable = status >= 500 || status === 429 || normalized === "STORAGE_OBJECT_NOT_FOUND" || normalized === "STATE_CONFLICT";
  return fail(requestId, status, normalized, undefined, retryable);
}

import type { FishMediaHttpResponse } from "./fish-media-handler-context";

export function ok(requestId: string, data: Record<string, unknown>, status = 200): FishMediaHttpResponse {
  return { status, body: { success: true, requestId, data } };
}

export function fail(
  requestId: string,
  status: number,
  code: string,
  field?: string,
  retryable = false,
  headers?: Record<string, string>,
): FishMediaHttpResponse {
  return {
    status,
    headers: { ...(status === 429 ? { "Retry-After": "60" } : {}), ...(headers ?? {}) },
    body: {
      success: false,
      requestId,
      error: {
        code,
        messageKey: `fish_media.${code.toLowerCase()}`,
        retryable,
        ...(field ? { field } : {}),
      },
    },
  };
}

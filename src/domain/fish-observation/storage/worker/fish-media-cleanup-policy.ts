export const FISH_MEDIA_CLEANUP_BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000] as const;
export const FISH_MEDIA_CLEANUP_MAX_ATTEMPTS = 5;
export function cleanupBackoffMs(attempt: number) { return FISH_MEDIA_CLEANUP_BACKOFF_MS[Math.min(Math.max(attempt - 1, 0), FISH_MEDIA_CLEANUP_BACKOFF_MS.length - 1)]; }
export function isRetryableCleanupError(code: string) { return ["STORAGE_DELETE_FAILED", "STORAGE_READ_FAILED", "MEDIA_CONCURRENCY_CONFLICT", "timeout", "rate_limit"].includes(code); }

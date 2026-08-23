import type { FishMediaRateLimiter } from "./fish-media-handler-context";

type LimitWindow = { limit: number; windowMs: number };

const DEFAULT_LIMITS: Record<"upload_request" | "finalize" | "delete" | "publish", LimitWindow> = {
  upload_request: { limit: 5, windowMs: 60_000 },
  finalize: { limit: 8, windowMs: 60_000 },
  delete: { limit: 10, windowMs: 60_000 },
  publish: { limit: 12, windowMs: 60_000 },
};

export class InMemoryFishMediaRateLimiter implements FishMediaRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly limits: Record<"upload_request" | "finalize" | "delete" | "publish", LimitWindow> = DEFAULT_LIMITS,
  ) {}

  async consume(input: { actorUserId: string; action: "upload_request" | "finalize" | "delete" | "publish"; observationId: string }) {
    const key = `${input.actorUserId}:${input.action}:${input.observationId}`;
    const window = this.limits[input.action];
    const bucket = (this.buckets.get(key) ?? []).filter((timestamp) => timestamp > this.now() - window.windowMs);
    if (bucket.length >= window.limit) {
      const oldest = bucket[0] ?? this.now();
      this.buckets.set(key, bucket);
      return { allowed: false as const, retryAfterSeconds: Math.max(1, Math.ceil((oldest + window.windowMs - this.now()) / 1000)) };
    }
    bucket.push(this.now());
    this.buckets.set(key, bucket);
    return { allowed: true as const };
  }
}

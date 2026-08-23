import "server-only";
import type { FishMediaCleanupJob } from "../../../domain/fish-observation/storage/drafts/fish-media-cleanup-contract";
import type { ClaimedCleanupJob, FishMediaCleanupStore } from "../../../domain/fish-observation/storage/worker/types";

type Result = { data: unknown; error: { message?: string } | null };
type Builder = PromiseLike<Result> & {
  select(columns?: string): Builder;
  update(patch: Record<string, unknown>): Builder;
  in(column: string, values: readonly unknown[]): Builder;
  lte(column: string, value: string): Builder;
  match(values: Record<string, unknown>): Builder;
  order(column: string, options?: { ascending?: boolean }): Builder;
  limit(value: number): Builder;
};
export interface SupabaseCleanupClient { from(table: string): Builder; rpc(name: string, args: Record<string, unknown>): Promise<Result>; }

function rowToJob(row: Record<string, unknown>): ClaimedCleanupJob {
  return { jobId: String(row.id), mediaId: row.media_id ? String(row.media_id) : null, bucket: String(row.bucket) as ClaimedCleanupJob["bucket"], storagePath: String(row.storage_path), cleanupType: String(row.cleanup_type) as ClaimedCleanupJob["cleanupType"], attemptCount: Number(row.attempt_count), nextAttemptAt: String(row.next_attempt_at), status: String(row.status) as ClaimedCleanupJob["status"], leaseToken: String(row.lease_token), leaseExpiresAt: String(row.lease_expires_at), lastErrorCode: row.last_error_code ? String(row.last_error_code) as ClaimedCleanupJob["lastErrorCode"] : null, expectedVersion: Number(row.expected_version), createdAt: String(row.created_at), completedAt: row.completed_at ? String(row.completed_at) : null };
}

export class SupabaseJsFishMediaCleanupStore implements FishMediaCleanupStore {
  constructor(private readonly client: SupabaseCleanupClient) {}
  async preview(limit: number, now: string): Promise<FishMediaCleanupJob[]> { const result = await this.client.from("fish_media_cleanup_jobs").select("*").in("status", ["pending", "retry_scheduled"]).lte("next_attempt_at", now).order("next_attempt_at", { ascending: true }).limit(limit); if (result.error) throw new Error("CLEANUP_PREVIEW_FAILED"); return (Array.isArray(result.data) ? result.data : []).map((row) => rowToJob(row as Record<string, unknown>)); }
  async claimBatch(input: { limit: number; workerId: string; now: string }) { void input.workerId; void input.now; const result = await this.client.rpc("claim_fish_media_cleanup_jobs", { p_limit: input.limit, p_lease_seconds: 60 }); if (result.error) throw new Error("CLEANUP_CLAIM_FAILED"); return (Array.isArray(result.data) ? result.data : []).map((row) => rowToJob(row as Record<string, unknown>)); }
  async complete(job: ClaimedCleanupJob) { const completedAt = new Date().toISOString(); const result = await this.client.from("fish_media_cleanup_jobs").update({ status: "completed", completed_at: completedAt, lease_token: null, lease_expires_at: null, expected_version: job.expectedVersion + 1 }).match({ id: job.jobId, lease_token: job.leaseToken, expected_version: job.expectedVersion }).select("id"); if (result.error || !Array.isArray(result.data) || result.data.length !== 1) return false; if (job.mediaId && job.cleanupType === "deleted_observation_cleanup") { const media = await this.client.from("fish_media").update({ deletion_status: "deleted", deleted_at: completedAt, usage_status: "archived" }).match({ id: job.mediaId }).select("id"); if (media.error) throw new Error("CLEANUP_MEDIA_FINALIZE_FAILED"); } return true; }
  async retry(job: ClaimedCleanupJob, nextAttemptAt: string, code: string) { return this.transition(job, { status: "retry_scheduled", next_attempt_at: nextAttemptAt, last_error_code: code, lease_token: null, lease_expires_at: null, expected_version: job.expectedVersion + 1 }); }
  async deadLetter(job: ClaimedCleanupJob, code: string) { return this.transition(job, { status: "manual_review", last_error_code: code, lease_token: null, lease_expires_at: null, expected_version: job.expectedVersion + 1 }); }
  private async transition(job: ClaimedCleanupJob, patch: Record<string, unknown>) { const result = await this.client.from("fish_media_cleanup_jobs").update(patch).match({ id: job.jobId, lease_token: job.leaseToken, expected_version: job.expectedVersion }).select("id"); return !result.error && Array.isArray(result.data) && result.data.length === 1; }
}

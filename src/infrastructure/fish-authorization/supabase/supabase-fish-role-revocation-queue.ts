import { randomUUID } from "node:crypto";
import type { ClaimedFishRoleRevocationJob, FishRoleDeadLetterRecord, FishRoleRevocationCandidate, FishRoleRevocationJob, FishRoleRevocationQueue } from "../../../domain/fish-authorization/worker/types";
import type { FishRoleDatabaseClient, FishRoleDbRow } from "./types";

const table = "fish_role_session_revocation_jobs";
const asString = (value: unknown) => typeof value === "string" ? value : "";
const asNullableString = (value: unknown) => typeof value === "string" ? value : null;
const toJob = (row: FishRoleDbRow): FishRoleRevocationJob => ({
  jobId: asString(row.job_id), operationId: asString(row.operation_id), targetUserId: asString(row.target_user_id),
  revocationType: asString(row.revocation_type) as FishRoleRevocationJob["revocationType"], priority: (row.priority === "critical" ? "critical" : "normal"),
  attemptCount: Number(row.attempt_count ?? 0), status: asString(row.status) as FishRoleRevocationJob["status"], leaseToken: asNullableString(row.lease_token),
  leaseExpiresAt: asNullableString(row.lease_expires_at), nextAttemptAt: asString(row.next_attempt_at), lastErrorCode: asNullableString(row.last_error_code),
  expectedVersion: Number(row.expected_version ?? 1), providerRevocationCompleted: row.provider_revocation_completed === true, createdAt: asString(row.created_at),
  completedAt: asNullableString(row.completed_at), deadLetteredAt: asNullableString(row.dead_lettered_at),
});
const toCandidate = (job: FishRoleRevocationJob): FishRoleRevocationCandidate => ({ jobId: job.jobId, operationId: job.operationId, targetUserId: job.targetUserId, revocationType: job.revocationType, priority: job.priority, attemptCount: job.attemptCount, nextAttemptAt: job.nextAttemptAt });

export class SupabaseFishRoleRevocationQueue implements FishRoleRevocationQueue {
  constructor(private readonly client: FishRoleDatabaseClient) {}
  async enqueue(job: FishRoleRevocationJob) {
    const existing = await this.findByOperationId(job.operationId); if (existing && !["completed", "dead_letter", "cancelled"].includes(existing.status)) return existing;
    await this.client.insert(table, { job_id: job.jobId, target_user_id: job.targetUserId, operation_id: job.operationId, revocation_type: job.revocationType, priority: job.priority, attempt_count: job.attemptCount, status: job.status, lease_token: job.leaseToken, lease_expires_at: job.leaseExpiresAt, next_attempt_at: job.nextAttemptAt, last_error_code: job.lastErrorCode, expected_version: job.expectedVersion, provider_revocation_completed: job.providerRevocationCompleted, created_at: job.createdAt, completed_at: job.completedAt, dead_lettered_at: job.deadLetteredAt }); return job;
  }
  async previewCandidates(limit: number, now: Date) { return (await this.available(now)).slice(0, limit).map(toCandidate); }
  async claimBatch(input: { limit: number; workerId: string; now: Date; leaseDurationMs: number }) {
    const result: ClaimedFishRoleRevocationJob[] = []; const activeTargets = new Set((await this.client.select(table, { status: "claimed" })).filter((row) => new Date(asString(row.lease_expires_at)).getTime() > input.now.getTime()).map((row) => asString(row.target_user_id)));
    for (const job of (await this.available(input.now)).slice(0, input.limit)) {
      if (activeTargets.has(job.targetUserId)) continue; const leaseToken = `${input.workerId}:${randomUUID()}`; const leaseExpiresAt = new Date(input.now.getTime() + input.leaseDurationMs).toISOString();
      const claimed = await this.client.update(table, { status: "claimed", lease_token: leaseToken, lease_expires_at: leaseExpiresAt }, { job_id: job.jobId, status: job.status, lease_token: job.leaseToken });
      if (!claimed) continue; activeTargets.add(job.targetUserId); result.push({ ...toJob(claimed), status: "claimed", leaseToken, leaseExpiresAt });
    }
    return result;
  }
  async renewLease(job: ClaimedFishRoleRevocationJob, leaseExpiresAt: Date): Promise<ClaimedFishRoleRevocationJob> { const row = await this.cas(job, { lease_expires_at: leaseExpiresAt.toISOString() }); return { ...toJob(row), status: "claimed", leaseToken: job.leaseToken, leaseExpiresAt: leaseExpiresAt.toISOString() }; }
  async markCompleted(job: ClaimedFishRoleRevocationJob, completedAt: Date) { await this.cas(job, { status: "completed", completed_at: completedAt.toISOString(), lease_token: null, lease_expires_at: null }); }
  async markRetry(job: ClaimedFishRoleRevocationJob, input: { attemptCount: number; nextAttemptAt: Date; errorCode: string; providerRevocationCompleted?: boolean }) { await this.cas(job, { status: "retry_wait", attempt_count: input.attemptCount, next_attempt_at: input.nextAttemptAt.toISOString(), last_error_code: input.errorCode, provider_revocation_completed: input.providerRevocationCompleted ?? job.providerRevocationCompleted, lease_token: null, lease_expires_at: null }); }
  async markDeadLetter(job: ClaimedFishRoleRevocationJob, record: FishRoleDeadLetterRecord) { await this.client.insert("fish_role_session_revocation_dead_letters", { job_id: record.jobId, operation_id: record.operationId, target_user_id: record.targetUserId, revocation_type: record.revocationType, attempt_count: record.attemptCount, last_error_code: record.lastErrorCode, sanitized_context: record.sanitizedContext, requires_manual_review: record.requiresManualReview, created_at: record.createdAt }); await this.cas(job, { status: "dead_letter", attempt_count: record.attemptCount, last_error_code: record.lastErrorCode, dead_lettered_at: record.createdAt, lease_token: null, lease_expires_at: null }); }
  async releaseLease(job: ClaimedFishRoleRevocationJob) { await this.cas(job, { status: "queued", lease_token: null, lease_expires_at: null }); }
  async findByOperationId(operationId: string) { const row = (await this.client.select(table, { operation_id: operationId }))[0]; return row ? toJob(row) : null; }
  private async available(now: Date) { const rows = await this.client.select(table, {}); return rows.map(toJob).filter((job) => (["queued", "retry_wait"].includes(job.status) || (job.status === "claimed" && new Date(job.leaseExpiresAt ?? 0).getTime() <= now.getTime())) && new Date(job.nextAttemptAt).getTime() <= now.getTime()).sort((a, b) => a.priority === b.priority ? a.createdAt.localeCompare(b.createdAt) : a.priority === "critical" ? -1 : 1); }
  private async cas(job: ClaimedFishRoleRevocationJob, patch: FishRoleDbRow) { const row = await this.client.update(table, patch, { job_id: job.jobId, status: "claimed", lease_token: job.leaseToken, lease_expires_at: job.leaseExpiresAt }); if (!row) throw new Error("FISH_ROLE_REVOCATION_LEASE_CONFLICT"); return row; }
}

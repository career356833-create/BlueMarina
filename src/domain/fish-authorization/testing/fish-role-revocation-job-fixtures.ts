import type { ClaimedFishRoleRevocationJob, FishRoleDeadLetterRecord, FishRoleOperationSnapshot, FishRoleProjectionSnapshot, FishRoleRevocationAuditEvent, FishRoleRevocationAuditSink, FishRoleRevocationCandidate, FishRoleRevocationJob, FishRoleRevocationOperationRepository, FishRoleRevocationQueue, FishRoleProjectionReader } from "../worker/types";

export function fishRoleRevocationJob(overrides: Partial<FishRoleRevocationJob> = {}): FishRoleRevocationJob {
  return { jobId: "job-1", operationId: "operation-1", targetUserId: "user-1", revocationType: "role_revoked", priority: "normal", attemptCount: 0, status: "queued", leaseToken: null, leaseExpiresAt: null, nextAttemptAt: "2026-08-04T00:00:00.000Z", lastErrorCode: null, expectedVersion: 1, providerRevocationCompleted: false, createdAt: "2026-08-04T00:00:00.000Z", completedAt: null, deadLetteredAt: null, ...overrides };
}
export class InMemoryFishRoleRevocationQueue implements FishRoleRevocationQueue {
  readonly jobs = new Map<string, FishRoleRevocationJob>(); readonly deadLetters: FishRoleDeadLetterRecord[] = [];
  constructor(jobs: FishRoleRevocationJob[] = []) { for (const job of jobs) this.jobs.set(job.jobId, { ...job }); }
  async previewCandidates(limit: number, now: Date): Promise<FishRoleRevocationCandidate[]> { return this.available(now).slice(0, limit).map(({ jobId, operationId, targetUserId, revocationType, priority, attemptCount, nextAttemptAt }) => ({ jobId, operationId, targetUserId, revocationType, priority, attemptCount, nextAttemptAt })); }
  async claimBatch(input: { limit: number; workerId: string; now: Date; leaseDurationMs: number }): Promise<ClaimedFishRoleRevocationJob[]> {
    const claimed: ClaimedFishRoleRevocationJob[] = [];
    for (const job of this.available(input.now).slice(0, input.limit)) {
      if ([...this.jobs.values()].some((other) => other.jobId !== job.jobId && other.targetUserId === job.targetUserId && other.status === "claimed" && new Date(other.leaseExpiresAt ?? 0).getTime() > input.now.getTime())) continue;
      const leaseToken = `${input.workerId}:${job.jobId}:${job.attemptCount}`; const leaseExpiresAt = new Date(input.now.getTime() + input.leaseDurationMs).toISOString();
      Object.assign(job, { status: "claimed", leaseToken, leaseExpiresAt }); claimed.push({ ...job } as ClaimedFishRoleRevocationJob);
    }
    return claimed;
  }
  async renewLease(job: ClaimedFishRoleRevocationJob, leaseExpiresAt: Date) { const current = this.assertLease(job); current.leaseExpiresAt = leaseExpiresAt.toISOString(); return { ...current } as ClaimedFishRoleRevocationJob; }
  async markCompleted(job: ClaimedFishRoleRevocationJob, completedAt: Date) { const current = this.assertLease(job); Object.assign(current, { status: "completed", completedAt: completedAt.toISOString(), leaseToken: null, leaseExpiresAt: null }); }
  async markRetry(job: ClaimedFishRoleRevocationJob, input: { attemptCount: number; nextAttemptAt: Date; errorCode: string; providerRevocationCompleted?: boolean }) { const current = this.assertLease(job); Object.assign(current, { status: "retry_wait", attemptCount: input.attemptCount, nextAttemptAt: input.nextAttemptAt.toISOString(), lastErrorCode: input.errorCode, providerRevocationCompleted: input.providerRevocationCompleted ?? current.providerRevocationCompleted, leaseToken: null, leaseExpiresAt: null }); }
  async markDeadLetter(job: ClaimedFishRoleRevocationJob, record: FishRoleDeadLetterRecord) { const current = this.assertLease(job); Object.assign(current, { status: "dead_letter", attemptCount: record.attemptCount, lastErrorCode: record.lastErrorCode, deadLetteredAt: record.createdAt, leaseToken: null, leaseExpiresAt: null }); this.deadLetters.push(record); }
  async releaseLease(job: ClaimedFishRoleRevocationJob) { const current = this.assertLease(job); Object.assign(current, { status: "queued", leaseToken: null, leaseExpiresAt: null }); }
  async findByOperationId(operationId: string) { return [...this.jobs.values()].find((job) => job.operationId === operationId) ?? null; }
  private available(now: Date) { return [...this.jobs.values()].filter((job) => (["queued", "retry_wait"].includes(job.status) || (job.status === "claimed" && new Date(job.leaseExpiresAt ?? 0).getTime() <= now.getTime())) && new Date(job.nextAttemptAt).getTime() <= now.getTime()).sort((a, b) => (a.priority === b.priority ? a.createdAt.localeCompare(b.createdAt) : a.priority === "critical" ? -1 : 1)); }
  private assertLease(job: ClaimedFishRoleRevocationJob) { const current = this.jobs.get(job.jobId); if (!current || current.status !== "claimed" || current.leaseToken !== job.leaseToken) throw new Error("FISH_ROLE_REVOCATION_LEASE_CONFLICT"); if (current.leaseExpiresAt !== job.leaseExpiresAt) throw new Error("FISH_ROLE_REVOCATION_LEASE_CONFLICT"); return current; }
}
export class InMemoryFishRoleRevocationState implements FishRoleRevocationOperationRepository, FishRoleProjectionReader {
  readonly operations = new Map<string, FishRoleOperationSnapshot>(); readonly projections = new Map<string, FishRoleProjectionSnapshot>(); readonly auditPending: string[] = [];
  failMarkRevoked = false;
  async getOperation(id: string) { return this.operations.get(id) ?? null; }
  async getProjection(id: string) { return this.projections.get(id) ?? null; }
  async markSessionRevoked(id: string, expectedVersion: number) { const value = this.operations.get(id); if (!value || value.version !== expectedVersion || this.failMarkRevoked) throw new Error("CAS conflict"); Object.assign(value, { status: "completed", sessionRevocationStatus: "revoked", version: value.version + 1 }); }
  async markAuditPending(id: string) { this.auditPending.push(id); const value = this.operations.get(id); if (value) value.status = "audit_pending"; }
}
export class InMemoryFishRoleRevocationAuditSink implements FishRoleRevocationAuditSink { readonly events: FishRoleRevocationAuditEvent[] = []; fail = false; async append(event: FishRoleRevocationAuditEvent) { if (this.fail) throw new Error("audit unavailable"); this.events.push({ ...event }); } }

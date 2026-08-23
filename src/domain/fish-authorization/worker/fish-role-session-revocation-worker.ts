import { FishRoleRevocationError, normalizeFishRoleRevocationError } from "./fish-role-revocation-errors";
import { fishRoleRevocationBackoffMs, shouldDeadLetterFishRoleRevocation } from "./fish-role-revocation-retry-policy";
import type { FishRoleRevocationBatchResult, FishRoleRevocationJobResult } from "./fish-role-revocation-result";
import type { ClaimedFishRoleRevocationJob, FishRoleDeadLetterRecord, FishRoleSessionRevocationWorkerDependencies } from "./types";

export type FishRoleRevocationWorkerInput = { batchSize: number; workerId: string; maxRuntimeMs: number; leaseDurationMs?: number };

export class FishRoleSessionRevocationWorker {
  constructor(private readonly deps: FishRoleSessionRevocationWorkerDependencies) {}

  async run(input: FishRoleRevocationWorkerInput): Promise<FishRoleRevocationBatchResult> {
    const started = this.deps.clock.now();
    const result: FishRoleRevocationBatchResult = { mode: "execute", candidates: 0, claimed: 0, completed: 0, retried: 0, deadLettered: 0, skipped: 0, durationMs: 0, aborted: false };
    await this.audit({ type: "session_revocation_batch_started", at: started.toISOString(), workerId: input.workerId });
    const claimed = await this.deps.queue.claimBatch({ limit: input.batchSize, workerId: input.workerId, now: started, leaseDurationMs: input.leaseDurationMs ?? 60_000 });
    result.candidates = claimed.length; result.claimed = claimed.length;
    let consecutiveProviderFailures = 0;
    for (let index = 0; index < claimed.length; index += 1) {
      const job = claimed[index];
      if (this.deps.clock.now().getTime() - started.getTime() >= input.maxRuntimeMs) { await this.deps.queue.releaseLease(job); result.skipped += 1; continue; }
      await this.audit({ type: "session_revocation_job_claimed", at: this.deps.clock.now().toISOString(), jobId: job.jobId, operationId: job.operationId, targetUserId: job.targetUserId, workerId: input.workerId });
      const jobResult = await this.process(job);
      if (jobResult.outcome === "completed") result.completed += 1;
      if (jobResult.outcome === "retried") result.retried += 1;
      if (jobResult.outcome === "dead_lettered") result.deadLettered += 1;
      if (jobResult.outcome === "skipped") result.skipped += 1;
      consecutiveProviderFailures = jobResult.providerSystemFailure ? consecutiveProviderFailures + 1 : 0;
      if (consecutiveProviderFailures >= 3) {
        result.aborted = true; result.errorCode = "FISH_ROLE_REVOCATION_CIRCUIT_OPEN";
        for (const remaining of claimed.slice(index + 1)) { await this.deps.queue.releaseLease(remaining); result.skipped += 1; }
        await this.audit({ type: "session_revocation_batch_aborted", at: this.deps.clock.now().toISOString(), errorCode: result.errorCode, workerId: input.workerId });
        break;
      }
    }
    result.durationMs = Math.max(0, this.deps.clock.now().getTime() - started.getTime());
    await this.audit({ type: "session_revocation_batch_finished", at: this.deps.clock.now().toISOString(), workerId: input.workerId, errorCode: result.errorCode });
    return result;
  }

  private async process(job: ClaimedFishRoleRevocationJob): Promise<FishRoleRevocationJobResult> {
    try {
      this.assertLease(job);
      return await this.deps.lock.withTargetLock(job.targetUserId, async () => {
        const operation = await this.deps.operationRepository.getOperation(job.operationId);
        if (!operation) throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_JOB_NOT_FOUND", false, "fishRole.revocationOperationNotFound", "high", { operationId: job.operationId });
        if (operation.targetUserId !== job.targetUserId) throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_OPERATION_MISMATCH", false, "fishRole.revocationOperationMismatch", "critical", { operationId: job.operationId });
        if (operation.status === "completed" || operation.sessionRevocationStatus === "revoked") {
          await this.deps.queue.markCompleted(job, this.deps.clock.now()); return { outcome: "completed", providerSystemFailure: false };
        }
        const projection = await this.deps.projectionReader.getProjection(job.targetUserId);
        if (!projection) throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_TARGET_NOT_FOUND", false, "fishRole.revocationTargetNotFound", "high", { targetUserId: job.targetUserId });
        if (job.revocationType === "crawler_credential_revoked") throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_CREDENTIAL_ROTATION_REQUIRED", false, "fishRole.credentialRotationRequired", "critical", { operationId: job.operationId });
        if (projection.status === "active" && ["admin_role_changed", "reviewer_role_revoked", "role_revoked", "emergency_account_lockdown"].includes(job.revocationType)) {
          throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_OPERATION_MISMATCH", false, "fishRole.revocationProjectionStillActive", "critical", { projectionStatus: projection.status });
        }
        if (!job.providerRevocationCompleted) await this.deps.sessionRevoker.revokeAllSessions(job.targetUserId);
        try { await this.deps.operationRepository.markSessionRevoked(job.operationId, operation.version); }
        catch { throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_RECONCILIATION_REQUIRED", true, "fishRole.revocationReconciliationRequired", "high", { providerRevocationCompleted: true }); }
        try { await this.audit({ type: "session_revocation_succeeded", at: this.deps.clock.now().toISOString(), jobId: job.jobId, operationId: job.operationId, targetUserId: job.targetUserId }); }
        catch { await this.deps.operationRepository.markAuditPending(job.operationId, "FISH_ROLE_REVOCATION_RECONCILIATION_REQUIRED"); }
        await this.deps.queue.markCompleted(job, this.deps.clock.now());
        return { outcome: "completed", providerSystemFailure: false };
      });
    } catch (cause) { return this.handleFailure(job, normalizeFishRoleRevocationError(cause)); }
  }

  private assertLease(job: ClaimedFishRoleRevocationJob) {
    if (!job.leaseToken) throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_LEASE_CONFLICT", true, "fishRole.revocationLeaseConflict", "high");
    if (new Date(job.leaseExpiresAt).getTime() <= this.deps.clock.now().getTime()) throw new FishRoleRevocationError("FISH_ROLE_REVOCATION_LEASE_EXPIRED", true, "fishRole.revocationLeaseExpired", "high");
  }
  private async handleFailure(job: ClaimedFishRoleRevocationJob, error: FishRoleRevocationError): Promise<FishRoleRevocationJobResult> {
    const attemptCount = job.attemptCount + 1;
    if (shouldDeadLetterFishRoleRevocation(attemptCount, error.retryable)) {
      const record: FishRoleDeadLetterRecord = { jobId: job.jobId, operationId: job.operationId, targetUserId: job.targetUserId, revocationType: job.revocationType, attemptCount, lastErrorCode: error.code, sanitizedContext: error.sanitizedContext, requiresManualReview: true, createdAt: this.deps.clock.now().toISOString() };
      await this.deps.queue.markDeadLetter(job, record);
      await this.audit({ type: "session_revocation_dead_lettered", at: record.createdAt, jobId: job.jobId, operationId: job.operationId, targetUserId: job.targetUserId, errorCode: error.code });
      return { outcome: "dead_lettered", providerSystemFailure: error.providerSystemFailure };
    }
    const nextAttemptAt = new Date(this.deps.clock.now().getTime() + fishRoleRevocationBackoffMs(attemptCount, job.priority));
    await this.deps.queue.markRetry(job, { attemptCount, nextAttemptAt, errorCode: error.code, providerRevocationCompleted: job.providerRevocationCompleted || error.sanitizedContext.providerRevocationCompleted === true });
    await this.audit({ type: "session_revocation_retry_scheduled", at: this.deps.clock.now().toISOString(), jobId: job.jobId, operationId: job.operationId, targetUserId: job.targetUserId, errorCode: error.code });
    return { outcome: "retried", providerSystemFailure: error.providerSystemFailure };
  }
  private async audit(event: Parameters<FishRoleSessionRevocationWorkerDependencies["audit"]["append"]>[0]) { await this.deps.audit.append(event); }
}

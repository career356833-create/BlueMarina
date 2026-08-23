import type { FishRoleOrNone } from "../drafts/fish-role";
import type { FishRoleSessionRevoker } from "../ports/fish-role-session-revoker";

export type FishRoleRevocationType = "role_revoked" | "admin_role_changed" | "reviewer_role_revoked" | "crawler_credential_revoked" | "emergency_account_lockdown";
export type FishRoleRevocationPriority = "normal" | "critical";
export type FishRoleRevocationJobStatus = "queued" | "claimed" | "retry_wait" | "completed" | "dead_letter" | "cancelled" | "manual_review";
export type FishRoleSessionStatus = "pending" | "revoked" | "unknown";

export type FishRoleRevocationJob = {
  jobId: string;
  operationId: string;
  targetUserId: string;
  revocationType: FishRoleRevocationType;
  priority: FishRoleRevocationPriority;
  attemptCount: number;
  status: FishRoleRevocationJobStatus;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  nextAttemptAt: string;
  lastErrorCode: string | null;
  expectedVersion: number;
  providerRevocationCompleted: boolean;
  createdAt: string;
  completedAt: string | null;
  deadLetteredAt: string | null;
};

export type ClaimedFishRoleRevocationJob = FishRoleRevocationJob & { leaseToken: string; leaseExpiresAt: string; status: "claimed" };
export type FishRoleDeadLetterRecord = Pick<FishRoleRevocationJob, "jobId" | "operationId" | "targetUserId" | "revocationType" | "attemptCount"> & {
  lastErrorCode: string;
  sanitizedContext: Record<string, string | number | boolean | null>;
  requiresManualReview: boolean;
  createdAt: string;
};

export type FishRoleRevocationCandidate = Pick<FishRoleRevocationJob, "jobId" | "operationId" | "targetUserId" | "revocationType" | "priority" | "attemptCount" | "nextAttemptAt">;
export type FishRoleOperationSnapshot = {
  operationId: string;
  targetUserId: string;
  status: "session_revocation_pending" | "completed" | "audit_pending" | "failed";
  sessionRevocationStatus: FishRoleSessionStatus;
  version: number;
};
export type FishRoleProjectionSnapshot = { targetUserId: string; role: FishRoleOrNone; status: "active" | "inactive" | "revocation_pending"; version: number };

export interface FishRoleRevocationQueue {
  previewCandidates(limit: number, now: Date): Promise<FishRoleRevocationCandidate[]>;
  claimBatch(input: { limit: number; workerId: string; now: Date; leaseDurationMs: number }): Promise<ClaimedFishRoleRevocationJob[]>;
  renewLease(job: ClaimedFishRoleRevocationJob, leaseExpiresAt: Date): Promise<ClaimedFishRoleRevocationJob>;
  markCompleted(job: ClaimedFishRoleRevocationJob, completedAt: Date): Promise<void>;
  markRetry(job: ClaimedFishRoleRevocationJob, input: { attemptCount: number; nextAttemptAt: Date; errorCode: string; providerRevocationCompleted?: boolean }): Promise<void>;
  markDeadLetter(job: ClaimedFishRoleRevocationJob, record: FishRoleDeadLetterRecord): Promise<void>;
  releaseLease(job: ClaimedFishRoleRevocationJob): Promise<void>;
  findByOperationId(operationId: string): Promise<FishRoleRevocationJob | null>;
}

export interface FishRoleRevocationOperationRepository {
  getOperation(operationId: string): Promise<FishRoleOperationSnapshot | null>;
  markSessionRevoked(operationId: string, expectedVersion: number): Promise<void>;
  markAuditPending(operationId: string, errorCode: string): Promise<void>;
}
export interface FishRoleProjectionReader { getProjection(targetUserId: string): Promise<FishRoleProjectionSnapshot | null>; }
export interface FishRoleRevocationWorkerLock { withTargetLock<T>(targetUserId: string, work: () => Promise<T>): Promise<T>; }
export interface FishRoleRevocationClock { now(): Date; }
export type FishRoleRevocationAuditEvent = {
  type: "session_revocation_batch_started" | "session_revocation_job_claimed" | "session_revocation_succeeded" | "session_revocation_retry_scheduled" | "session_revocation_dead_lettered" | "session_revocation_reconciliation_detected" | "session_revocation_recovery_scheduled" | "session_revocation_batch_aborted" | "session_revocation_batch_finished";
  at: string;
  jobId?: string;
  operationId?: string;
  targetUserId?: string;
  errorCode?: string;
  workerId?: string;
};
export interface FishRoleRevocationAuditSink { append(event: FishRoleRevocationAuditEvent): Promise<void>; }

export type FishRoleSessionRevocationWorkerDependencies = {
  queue: FishRoleRevocationQueue;
  operationRepository: FishRoleRevocationOperationRepository;
  projectionReader: FishRoleProjectionReader;
  sessionRevoker: FishRoleSessionRevoker;
  lock: FishRoleRevocationWorkerLock;
  audit: FishRoleRevocationAuditSink;
  clock: FishRoleRevocationClock;
};

export type FishRoleRevocationRecoveryFinding = {
  code: "missing_queue_job" | "completed_with_retry_job" | "dead_letter_projection_active" | "revoked_role_session_unknown" | "crawler_rotation_missing" | "stale_lease" | "auth_projection_mismatch" | "last_admin_mismatch";
  operationId: string;
  targetUserId: string;
  automatic: boolean;
};
export type FishRoleRevocationRecoveryInventory = {
  operations: FishRoleOperationSnapshot[];
  jobs: FishRoleRevocationJob[];
  projections: FishRoleProjectionSnapshot[];
  crawlerRotationOperationIds: string[];
  authProjectionMismatches?: Array<{ operationId: string; targetUserId: string }>;
  lastAdminMismatches?: Array<{ operationId: string; targetUserId: string }>;
};
export interface FishRoleRevocationRecoveryWriter {
  enqueueMissing(operation: FishRoleOperationSnapshot): Promise<void>;
  completeStaleJob(job: FishRoleRevocationJob): Promise<void>;
  releaseStaleLease(job: FishRoleRevocationJob): Promise<void>;
  markManualReview(finding: FishRoleRevocationRecoveryFinding): Promise<void>;
}

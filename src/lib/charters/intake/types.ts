import type { CharterSupplySubmission, CrosswalkStatus, PromotionReadiness, SubmissionState } from "../onboarding/contracts";

export const INTAKE_ERROR_CODES = ["VALIDATION_ERROR", "INVALID_STATE_TRANSITION", "SUBMISSION_NOT_FOUND", "AUTH_REQUIRED", "DUPLICATE_SUBMISSION", "INTERNAL_ERROR"] as const;
export type IntakeErrorCode = (typeof INTAKE_ERROR_CODES)[number];
export type ReviewAction = "APPROVE" | "REJECT" | "REQUEST_CHANGES";

export interface StoredSupplySubmission {
  id: string;
  submittedBy: string;
  idempotencyKey: string;
  contentHash: string;
  status: SubmissionState;
  rawPayload: unknown;
  normalizedPayload: CharterSupplySubmission;
  validationResult: { errors: number; warnings: number; issues: CharterSupplySubmission["validationIssues"] };
  registrationCrosswalk: { status: CrosswalkStatus; registrationId: string | null; autoApproved: false };
  promotionReadiness: PromotionReadiness;
  submittedAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  reviewNotes: string | null;
}

export interface IntakeReviewRecord { id: string; submissionId: string; reviewerId: string; action: ReviewAction; reason: string; createdAt: string }
export interface IntakeAuditEvent { submissionId: string; actorId: string | null; eventType: "SUBMISSION_CREATED" | "SUBMISSION_VALIDATED" | "REVIEW_RECORDED" | "SUBMISSION_APPROVED" | "SUBMISSION_REJECTED" | "CHANGES_REQUESTED" | "PROMOTION_CANDIDATE_CREATED"; fromStatus: SubmissionState | null; toStatus: SubmissionState | null; details: Record<string, unknown>; createdAt: string }
export interface PromotionCandidateRecord { submissionId: string; candidatePayload: unknown; contentHash: string; productionActivated: false; createdBy: string; createdAt: string }

export interface SupplyIntakeRepository {
  find(id: string): Promise<StoredSupplySubmission | null>;
  findByIdempotency(submittedBy: string, idempotencyKey: string): Promise<StoredSupplySubmission | null>;
  findByContentHash(submittedBy: string, contentHash: string): Promise<StoredSupplySubmission | null>;
  list(limit: number): Promise<StoredSupplySubmission[]>;
  create(value: StoredSupplySubmission): Promise<StoredSupplySubmission>;
  update(value: StoredSupplySubmission): Promise<StoredSupplySubmission>;
  appendReview(value: IntakeReviewRecord): Promise<void>;
  appendAudit(value: IntakeAuditEvent): Promise<void>;
  savePromotionCandidate(value: PromotionCandidateRecord): Promise<void>;
}

export class SupplyIntakeError extends Error {
  constructor(readonly code: IntakeErrorCode, readonly status: number) { super(code); }
}

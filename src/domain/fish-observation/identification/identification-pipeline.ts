import type { FishIdentificationVerification } from "../drafts/fish-identification";
import type { FishIdentificationRequest, FishIdentificationRequestFailureReason, FishIdentificationRequestStatus } from "./identification-request";
import type {
  FishIdentificationResult,
  FishIdentificationResultCandidate,
  FishIdentificationVerificationLink,
} from "./identification-result";

export type FishIdentificationPipelineWarning =
  | "request_queued"
  | "request_processing"
  | "request_failed"
  | "request_cancelled"
  | "no_candidates"
  | "low_confidence"
  | "ai_only"
  | "awaiting_user_confirmation"
  | "retry_available"
  | "cost_limit_reached";

export type FishIdentificationPipelineViewModel = {
  request: FishIdentificationRequest;
  result?: FishIdentificationResult | null;
  verification?: FishIdentificationVerification | null;
  link: FishIdentificationVerificationLink | null;
  requestStatus: FishIdentificationRequestStatus;
  readyForCollection: boolean;
  canRetry: boolean;
  warnings: FishIdentificationPipelineWarning[];
  topCandidate?: FishIdentificationResultCandidate | null;
};

export type BuildFishIdentificationPipelineInput = {
  request: FishIdentificationRequest;
  result?: FishIdentificationResult | null;
  verification?: FishIdentificationVerification | null;
  minimumConfidenceToAutoLink?: number;
  linkedAt?: string;
};

function hasConfirmedVerification(verification?: FishIdentificationVerification | null) {
  return verification?.verificationType === "user_confirmed" || verification?.verificationType === "expert_confirmed";
}

function buildWarnings(input: BuildFishIdentificationPipelineInput, topCandidate: FishIdentificationResultCandidate | null): FishIdentificationPipelineWarning[] {
  const warnings: FishIdentificationPipelineWarning[] = [];
  if (input.request.status === "queued") warnings.push("request_queued");
  if (input.request.status === "processing") warnings.push("request_processing");
  if (input.request.status === "failed") warnings.push("request_failed");
  if (input.request.status === "cancelled") warnings.push("request_cancelled");
  if (input.request.failureReason === "cost_limit_exceeded") warnings.push("cost_limit_reached");
  if (!input.result || input.result.candidates.length === 0) warnings.push("no_candidates");
  if (input.result && input.result.confidence < (input.minimumConfidenceToAutoLink ?? 0.7)) warnings.push("low_confidence");
  if (input.verification?.verificationType === "ai_only") warnings.push("ai_only");
  if (!hasConfirmedVerification(input.verification) && input.result?.candidates.length) warnings.push("awaiting_user_confirmation");
  if (input.request.retryCount > 0 && input.request.status === "queued") warnings.push("retry_available");
  if (topCandidate && input.result?.selectedSpeciesId && topCandidate.speciesId !== input.result.selectedSpeciesId) {
    warnings.push("awaiting_user_confirmation");
  }
  return [...new Set(warnings)];
}

function buildLink(input: BuildFishIdentificationPipelineInput): FishIdentificationVerificationLink | null {
  if (!input.request.observationId || !input.verification || !hasConfirmedVerification(input.verification)) {
    return null;
  }
  if (!input.verification.selectedSpeciesId) return null;
  return {
    requestId: input.request.requestId,
    attemptId: input.request.attemptId ?? null,
    observationId: input.request.observationId,
    selectedSpeciesId: input.verification.selectedSpeciesId,
    verificationType: input.verification.verificationType,
    confidence: input.verification.confidence,
    linkedAt: input.linkedAt ?? input.verification.verifiedAt,
    confirmedAt: input.verification.verifiedAt,
    note: input.verification.note ?? null,
  };
}

export function buildFishIdentificationPipelineViewModel(input: BuildFishIdentificationPipelineInput): FishIdentificationPipelineViewModel {
  const topCandidate = input.result?.candidates?.[0] ?? null;
  const link = buildLink(input);
  const warnings = buildWarnings(input, topCandidate);
  const readyForCollection = Boolean(
    link &&
      input.request.status === "completed" &&
      input.result &&
      input.result.candidates.length > 0 &&
      hasConfirmedVerification(input.verification) &&
      input.verification?.selectedSpeciesId &&
      (input.result.confidence >= (input.minimumConfidenceToAutoLink ?? 0.7) || hasConfirmedVerification(input.verification)),
  );

  return {
    request: input.request,
    result: input.result ?? null,
    verification: input.verification ?? null,
    link,
    requestStatus: input.request.status,
    readyForCollection,
    canRetry:
      input.request.status === "failed" &&
      input.request.failureReason !== "cost_limit_exceeded" &&
      input.request.failureReason !== "cancelled" &&
      (input.request.maxRetries === null || input.request.maxRetries === undefined || input.request.retryCount < input.request.maxRetries),
    warnings,
    topCandidate,
  };
}

export function buildFishIdentificationRetryState(
  request: FishIdentificationRequest,
  failureReason: FishIdentificationRequestFailureReason,
  reportedAt: string,
) {
  return {
    request,
    failureReason,
    reportedAt,
    retryable:
      failureReason !== "cost_limit_exceeded" &&
      failureReason !== "cancelled" &&
      (request.maxRetries === null || request.maxRetries === undefined || request.retryCount < request.maxRetries),
  };
}

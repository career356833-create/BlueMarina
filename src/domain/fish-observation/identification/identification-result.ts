import type { FishIdentificationAttemptReviewStatus, FishIdentificationCandidate, FishIdentificationVerification } from "../drafts/fish-identification";
import type { FishIdentificationRequestFailureReason } from "./identification-request";

export type FishIdentificationCostMetadata = {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  estimatedCostUsd?: number | null;
  currency?: string | null;
};

export type FishIdentificationResultCandidate = FishIdentificationCandidate & {
  label?: string | null;
  reason?: string | null;
};

export type FishIdentificationResult = {
  attemptId: string;
  requestId: string;
  provider: string;
  model: string;
  modelVersion: string;
  imageHash: string;
  candidates: FishIdentificationResultCandidate[];
  confidence: number;
  latencyMs: number;
  costMetadata?: FishIdentificationCostMetadata | null;
  createdAt: string;
  reviewStatus: FishIdentificationAttemptReviewStatus;
  selectedSpeciesId?: string | null;
  selectedCandidateRank?: number | null;
  confirmedLabel?: string | null;
  trainingEligible?: boolean;
};

export type FishIdentificationResultFailure = {
  attemptId?: string | null;
  requestId: string;
  provider?: string | null;
  model?: string | null;
  modelVersion?: string | null;
  failureReason: FishIdentificationRequestFailureReason;
  message?: string | null;
  retryable: boolean;
  reportedAt: string;
  costMetadata?: FishIdentificationCostMetadata | null;
};

export type FishIdentificationVerificationLink = {
  requestId: string;
  attemptId?: string | null;
  observationId: string;
  selectedSpeciesId: string;
  verificationType: FishIdentificationVerification["verificationType"];
  confidence: number;
  linkedAt: string;
  confirmedAt?: string | null;
  note?: string | null;
};

export function buildFishIdentificationVerificationLink(input: FishIdentificationVerificationLink): FishIdentificationVerificationLink {
  return {
    requestId: input.requestId,
    attemptId: input.attemptId ?? null,
    observationId: input.observationId,
    selectedSpeciesId: input.selectedSpeciesId,
    verificationType: input.verificationType,
    confidence: input.confidence,
    linkedAt: input.linkedAt,
    confirmedAt: input.confirmedAt ?? null,
    note: input.note ?? null,
  };
}

export function buildFishIdentificationFailure(input: FishIdentificationResultFailure): FishIdentificationResultFailure {
  return {
    attemptId: input.attemptId ?? null,
    requestId: input.requestId,
    provider: input.provider ?? null,
    model: input.model ?? null,
    modelVersion: input.modelVersion ?? null,
    failureReason: input.failureReason,
    message: input.message ?? null,
    retryable: input.retryable,
    reportedAt: input.reportedAt,
    costMetadata: input.costMetadata ?? null,
  };
}

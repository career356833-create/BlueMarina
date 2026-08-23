export type FishIdentificationRequestStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type FishIdentificationRequestFailureReason =
  | "image_quality_low"
  | "no_candidates"
  | "low_confidence"
  | "api_failure"
  | "retry_scheduled"
  | "cost_limit_exceeded"
  | "cancelled";

export type FishIdentificationRequest = {
  requestId: string;
  userId: string;
  imageMediaId: string;
  imageHash: string;
  createdAt: string;
  status: FishIdentificationRequestStatus;
  observationId?: string | null;
  attemptId?: string | null;
  retryCount: number;
  maxRetries?: number | null;
  costBudgetUsd?: number | null;
  provider?: string | null;
  model?: string | null;
  modelVersion?: string | null;
  failureReason?: FishIdentificationRequestFailureReason | null;
  failureMessage?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
};

export type CreateFishIdentificationRequestInput = {
  requestId: string;
  userId: string;
  imageMediaId: string;
  imageHash: string;
  createdAt: string;
  observationId?: string | null;
  maxRetries?: number | null;
  costBudgetUsd?: number | null;
  provider?: string | null;
  model?: string | null;
  modelVersion?: string | null;
};

export function createIdentificationRequest(input: CreateFishIdentificationRequestInput): FishIdentificationRequest {
  return {
    requestId: input.requestId,
    userId: input.userId,
    imageMediaId: input.imageMediaId,
    imageHash: input.imageHash,
    createdAt: input.createdAt,
    status: "queued",
    observationId: input.observationId ?? null,
    attemptId: null,
    retryCount: 0,
    maxRetries: input.maxRetries ?? null,
    costBudgetUsd: input.costBudgetUsd ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    modelVersion: input.modelVersion ?? null,
    failureReason: null,
    failureMessage: null,
    updatedAt: input.createdAt,
    completedAt: null,
    cancelledAt: null,
  };
}

export function markIdentificationRequestProcessing(
  request: FishIdentificationRequest,
  updatedAt: string,
): FishIdentificationRequest {
  return {
    ...request,
    status: "processing",
    updatedAt,
    failureReason: null,
    failureMessage: null,
  };
}

export function completeIdentificationRequest(
  request: FishIdentificationRequest,
  attemptId: string,
  updatedAt: string,
): FishIdentificationRequest {
  return {
    ...request,
    status: "completed",
    attemptId,
    updatedAt,
    completedAt: updatedAt,
    failureReason: null,
    failureMessage: null,
  };
}

export function failIdentificationRequest(
  request: FishIdentificationRequest,
  failureReason: FishIdentificationRequestFailureReason,
  updatedAt: string,
  failureMessage?: string | null,
): FishIdentificationRequest {
  return {
    ...request,
    status: "failed",
    updatedAt,
    failureReason,
    failureMessage: failureMessage ?? null,
  };
}

export function cancelIdentificationRequest(
  request: FishIdentificationRequest,
  updatedAt: string,
  failureMessage?: string | null,
): FishIdentificationRequest {
  return {
    ...request,
    status: "cancelled",
    updatedAt,
    cancelledAt: updatedAt,
    failureReason: "cancelled",
    failureMessage: failureMessage ?? null,
  };
}

export function retryIdentificationRequest(
  request: FishIdentificationRequest,
  updatedAt: string,
): FishIdentificationRequest {
  const nextRetryCount = request.retryCount + 1;
  return {
    ...request,
    status: "queued",
    retryCount: nextRetryCount,
    updatedAt,
    failureReason: "retry_scheduled",
    failureMessage: null,
    attemptId: null,
  };
}

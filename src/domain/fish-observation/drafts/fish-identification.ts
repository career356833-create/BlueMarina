export type FishIdentificationAttemptReviewStatus = "pending" | "reviewed" | "approved" | "rejected";

export type FishIdentificationCandidate = {
  speciesId: string;
  confidence: number;
  rank: number;
  label?: string | null;
  reason?: string | null;
};

export type FishIdentificationAttempt = {
  id: string;
  observationId: string;
  provider: string;
  model: string;
  promptVersion: string;
  imageHash: string;
  imageMediaId?: string | null;
  candidates: FishIdentificationCandidate[];
  createdAt: string;
  reviewStatus: FishIdentificationAttemptReviewStatus;
  selectedSpeciesId?: string | null;
  selectedCandidateRank?: number | null;
  confirmedLabel?: string | null;
  trainingEligible: boolean;
  embeddingStoragePath?: string | null;
  embeddingModel?: string | null;
  notes?: string | null;
};

export type FishIdentificationVerification = {
  observationId: string;
  selectedSpeciesId: string;
  verificationType: "user_confirmed" | "expert_confirmed" | "ai_only";
  verifiedBy?: string | null;
  verifiedAt: string;
  confidence: number;
  note?: string | null;
};

export type FishIdentificationLabel = {
  observationId: string;
  speciesId: string;
  confirmedLabel: string;
  source: "user" | "expert" | "system";
  confidence: number;
  createdAt: string;
};

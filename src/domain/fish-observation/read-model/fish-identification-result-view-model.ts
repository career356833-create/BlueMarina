import type { FishIdentificationRequestStatus } from "../identification/identification-request";
import type { FishIdentificationResultCandidate } from "../identification/identification-result";

export type FishIdentificationResultViewModelCandidate = {
  speciesId: string;
  speciesName: string;
  thumbnail?: string | null;
  confidence: number;
  rank: number;
  label?: string | null;
  reason?: string | null;
};

export type FishIdentificationResultViewModelStatus =
  | FishIdentificationRequestStatus
  | "awaiting_confirmation";

export type FishIdentificationResultViewModelWarning =
  | "pending_request"
  | "processing"
  | "awaiting_confirmation"
  | "low_confidence"
  | "no_candidates"
  | "failed"
  | "cancelled";

export type FishIdentificationResultViewModel = {
  requestId: string;
  imagePreview?: string | null;
  status: FishIdentificationResultViewModelStatus;
  candidates: FishIdentificationResultViewModelCandidate[];
  topCandidate?: FishIdentificationResultViewModelCandidate | null;
  warning?: string | null;
  warningCodes: FishIdentificationResultViewModelWarning[];
  canConfirm: boolean;
  canRetry: boolean;
};

export type FishIdentificationResultViewModelSpecies = {
  id: string;
  speciesName: string;
  thumbnail?: string | null;
};

export type FishIdentificationResultViewModelInput = {
  requestId: string;
  imagePreview?: string | null;
  requestStatus: FishIdentificationRequestStatus;
  candidates?: FishIdentificationResultCandidate[] | null;
  speciesCatalog?: FishIdentificationResultViewModelSpecies[] | null;
  selectedSpeciesId?: string | null;
  confidenceThreshold?: number;
  warning?: string | null;
  retryable?: boolean;
};

function pickSpeciesName(species?: FishIdentificationResultViewModelSpecies | null) {
  return species?.speciesName ?? species?.id ?? "Unknown";
}

function buildWarningCodes(
  input: FishIdentificationResultViewModelInput,
  candidates: FishIdentificationResultViewModelCandidate[],
): FishIdentificationResultViewModelWarning[] {
  const warningCodes: FishIdentificationResultViewModelWarning[] = [];
  const threshold = input.confidenceThreshold ?? 0.7;

  if (input.requestStatus === "queued") warningCodes.push("pending_request");
  if (input.requestStatus === "processing") warningCodes.push("processing");
  if (input.requestStatus === "failed") warningCodes.push("failed");
  if (input.requestStatus === "cancelled") warningCodes.push("cancelled");
  if (!candidates.length) warningCodes.push("no_candidates");
  if (candidates.length && candidates[0].confidence < threshold) warningCodes.push("low_confidence");
  if (input.requestStatus === "completed" && candidates.length && !input.selectedSpeciesId) warningCodes.push("awaiting_confirmation");

  return [...new Set(warningCodes)];
}

export function buildFishIdentificationResultViewModel(
  input: FishIdentificationResultViewModelInput,
): FishIdentificationResultViewModel {
  const speciesById = new Map((input.speciesCatalog ?? []).map((species) => [species.id, species] as const));
  const candidates = (input.candidates ?? []).map((candidate) => {
    const species = speciesById.get(candidate.speciesId);
    return {
      speciesId: candidate.speciesId,
      speciesName: pickSpeciesName(species),
      thumbnail: species?.thumbnail ?? null,
      confidence: candidate.confidence,
      rank: candidate.rank,
      label: candidate.label ?? null,
      reason: candidate.reason ?? null,
    };
  });

  candidates.sort((left, right) => left.rank - right.rank || right.confidence - left.confidence || left.speciesName.localeCompare(right.speciesName));
  const topCandidate = candidates[0] ?? null;
  const warningCodes = buildWarningCodes(input, candidates);
  const warning =
    input.warning ??
    (warningCodes.includes("no_candidates")
      ? "AI 후보가 없습니다."
      : warningCodes.includes("low_confidence")
        ? "확인이 필요합니다."
        : warningCodes.includes("awaiting_confirmation")
          ? "사용자 확인을 기다리는 중입니다."
          : null);

  return {
    requestId: input.requestId,
    imagePreview: input.imagePreview ?? null,
    status: input.requestStatus === "completed" && !input.selectedSpeciesId && candidates.length ? "awaiting_confirmation" : input.requestStatus,
    candidates,
    topCandidate,
    warning,
    warningCodes,
    canConfirm: input.requestStatus === "completed" && candidates.length > 0,
    canRetry: input.retryable ?? input.requestStatus === "failed",
  };
}

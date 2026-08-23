import type { FishCollectionSpeciesEntry } from "../drafts/fish-collection";
import type { FishIdentificationRequest } from "../identification/identification-request";
import type { FishIdentificationResult } from "../identification/identification-result";
import type { FishIdentificationVerification } from "../drafts/fish-identification";
import type { FishAchievement } from "./fish-achievement";
import type { MyFishDexEntryStatus } from "./my-fish-dex-view-model";
import {
  buildFishIdentificationResultViewModel,
  type FishIdentificationResultViewModel,
} from "./fish-identification-result-view-model";
import {
  buildFishDexConfirmationViewModel,
  type FishDexConfirmationViewModel,
} from "./fish-dex-confirmation-view-model";

export type FishIdentificationDexAssemblerSpecies = {
  id: string;
  speciesName: string;
  thumbnail?: string | null;
};

export type FishIdentificationDexAssemblerInput = {
  request: FishIdentificationRequest;
  result?: FishIdentificationResult | null;
  verification?: FishIdentificationVerification | null;
  imagePreview?: string | null;
  speciesCatalog?: FishIdentificationDexAssemblerSpecies[] | null;
  collections?: FishCollectionSpeciesEntry[] | null;
  unlockedAchievements?: FishAchievement[] | null;
  confidenceThreshold?: number;
};

export type FishIdentificationDexViewModel = {
  result: FishIdentificationResultViewModel;
  confirmation: FishDexConfirmationViewModel;
  myFishDex: {
    newlyDiscovered: boolean;
    speciesName: string;
    collectionStatus: FishCollectionSpeciesEntry["achievementStatus"] | MyFishDexEntryStatus;
    achievementUnlocked: boolean;
  };
};

function pickSpeciesName(species?: FishIdentificationDexAssemblerSpecies | null) {
  return species?.speciesName ?? species?.id ?? "Unknown";
}

function getCollectionStatus(
  verification: FishIdentificationVerification | null | undefined,
  collection?: FishCollectionSpeciesEntry | null,
) {
  if (collection) return collection.achievementStatus;
  if (!verification || verification.verificationType === "ai_only") return "locked";
  return "tracking";
}

export function buildFishIdentificationDexViewModel(input: FishIdentificationDexAssemblerInput): FishIdentificationDexViewModel {
  const speciesById = new Map((input.speciesCatalog ?? []).map((species) => [species.id, species] as const));
  const candidateSpeciesId = input.verification?.selectedSpeciesId ?? input.result?.selectedSpeciesId ?? input.result?.candidates?.[0]?.speciesId ?? null;
  const species = candidateSpeciesId ? speciesById.get(candidateSpeciesId) ?? null : null;
  const speciesName = pickSpeciesName(species);
  const collection = (input.collections ?? []).find((item) => item.speciesId === candidateSpeciesId) ?? null;
  const collectionStatus = getCollectionStatus(input.verification, collection);
  const newlyDiscovered = Boolean(input.verification && input.verification.verificationType !== "ai_only" && !collection);
  const unlockedAchievements = input.unlockedAchievements ?? [];

  const result = buildFishIdentificationResultViewModel({
    requestId: input.request.requestId,
    imagePreview: input.imagePreview ?? null,
    requestStatus: input.request.status,
    candidates: input.result?.candidates ?? null,
    selectedSpeciesId: input.result?.selectedSpeciesId ?? input.verification?.selectedSpeciesId ?? null,
    speciesCatalog: input.speciesCatalog ?? null,
    confidenceThreshold: input.confidenceThreshold ?? 0.7,
    retryable:
      input.request.status === "failed" &&
      input.request.failureReason !== "cost_limit_exceeded" &&
      input.request.failureReason !== "cancelled" &&
      (input.request.maxRetries === null || input.request.maxRetries === undefined || input.request.retryCount < input.request.maxRetries),
  });

  const confirmation = buildFishDexConfirmationViewModel({
    requestId: input.request.requestId,
    observationId: input.request.observationId ?? null,
    speciesId: candidateSpeciesId,
    speciesName,
    verification: input.verification ?? null,
    collectionStatus,
    newlyDiscovered,
    unlockedAchievements,
  });

  return {
    result,
    confirmation,
    myFishDex: {
      newlyDiscovered,
      speciesName,
      collectionStatus,
      achievementUnlocked: unlockedAchievements.length > 0,
    },
  };
}

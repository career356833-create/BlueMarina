import type { FishCollectionAchievementStatus } from "../drafts/fish-collection";
import type { FishAchievement } from "./fish-achievement";
import type { FishIdentificationVerification } from "../drafts/fish-identification";

export type FishDexConfirmationStatus = FishIdentificationVerification["verificationType"] | "ai_only";

export type FishDexConfirmationViewModel = {
  requestId: string;
  observationId?: string | null;
  speciesId?: string | null;
  speciesName?: string | null;
  status: FishDexConfirmationStatus;
  collectionStatus: FishCollectionAchievementStatus;
  newlyDiscovered: boolean;
  achievementUnlocked: boolean;
  unlockedAchievements: FishAchievement[];
  canActivateDex: boolean;
  confirmedAt?: string | null;
  verifiedBy?: string | null;
  confidence?: number | null;
  note?: string | null;
};

export type FishDexConfirmationInput = {
  requestId: string;
  observationId?: string | null;
  speciesId?: string | null;
  speciesName?: string | null;
  verification?: FishIdentificationVerification | null;
  collectionStatus?: FishCollectionAchievementStatus | null;
  newlyDiscovered?: boolean;
  unlockedAchievements?: FishAchievement[] | null;
};

export function buildFishDexConfirmationViewModel(input: FishDexConfirmationInput): FishDexConfirmationViewModel {
  const status: FishDexConfirmationStatus = input.verification?.verificationType ?? "ai_only";
  const collectionStatus = input.collectionStatus ?? (status === "ai_only" ? "locked" : input.newlyDiscovered ? "tracking" : "unlocked");
  const unlockedAchievements = (input.unlockedAchievements ?? []).slice();
  const achievementUnlocked = unlockedAchievements.length > 0;

  return {
    requestId: input.requestId,
    observationId: input.observationId ?? null,
    speciesId: input.speciesId ?? null,
    speciesName: input.speciesName ?? null,
    status,
    collectionStatus,
    newlyDiscovered: input.newlyDiscovered ?? false,
    achievementUnlocked,
    unlockedAchievements,
    canActivateDex: status !== "ai_only" && Boolean(input.speciesId),
    confirmedAt: input.verification?.verifiedAt ?? null,
    verifiedBy: input.verification?.verifiedBy ?? null,
    confidence: input.verification?.confidence ?? null,
    note: input.verification?.note ?? null,
  };
}

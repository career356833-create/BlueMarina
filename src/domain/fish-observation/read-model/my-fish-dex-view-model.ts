import type { FishObservationMediaExtension } from "../drafts/fish-media-extension";
import type { FishCollectionAchievementStatus, FishCollectionRegionStat } from "../drafts/fish-collection";
import type { FishObservation } from "../drafts/fish-observation";
import type { FishIdentificationVerification } from "../drafts/fish-identification";
import type { FishAchievement } from "./fish-achievement";
import type { FishSpecies } from "../../../lib/types/drafts/nifs-fish-contract";

export type MyFishDexEntryStatus = "locked" | "discovered" | "verified";

export type MyFishDexSummary = {
  totalSpecies: number;
  discoveredSpecies: number;
  completionRate: number;
};

export type MyFishDexPhoto = {
  mediaId?: string | null;
  sourceUrl?: string | null;
  thumbnailUrl?: string | null;
  originType?: FishObservationMediaExtension["originType"] | null;
  privacy?: FishObservationMediaExtension["privacy"] | null;
  capturedAt?: string | null;
};

export type MyFishDexBestRecord = {
  observationId: string;
  capturedAt: string;
  length?: number | null;
  weight?: number | null;
  photo?: MyFishDexPhoto | null;
};

export type MyFishDexSeasonStat = {
  season: "spring" | "summer" | "autumn" | "winter";
  count: number;
  firstCaughtAt?: string | null;
  latestCaughtAt?: string | null;
};

export type MyFishDexRegionStat = {
  regionId: string;
  count: number;
  firstCaughtAt?: string | null;
  latestCaughtAt?: string | null;
};

export type MyFishDexEntry = {
  speciesId: string;
  speciesName: string;
  thumbnail?: string | null;
  discoveredAt?: string | null;
  discoveryCount: number;
  firstPhoto?: MyFishDexPhoto | null;
  latestPhoto?: MyFishDexPhoto | null;
  bestRecord?: MyFishDexBestRecord | null;
  regions: MyFishDexRegionStat[];
  seasons: MyFishDexSeasonStat[];
  rarity: "common" | "uncommon" | "rare";
  status: MyFishDexEntryStatus;
  verifiedAt?: string | null;
  verificationType?: FishIdentificationVerification["verificationType"] | null;
};

export type MyFishDexRecentDiscovery = {
  observationId: string;
  speciesId: string;
  speciesName: string;
  capturedAt: string;
  region?: string | null;
  thumbnail?: string | null;
  status: MyFishDexEntryStatus;
};

export type MyFishDexFavoriteSpecies = {
  speciesId: string;
  speciesName: string;
  thumbnail?: string | null;
  discoveryCount: number;
  status: MyFishDexEntryStatus;
  regions: string[];
};

export type MyFishDexViewModel = {
  userId: string;
  summary: MyFishDexSummary;
  entries: MyFishDexEntry[];
  achievements: FishAchievement[];
  recentDiscoveries: MyFishDexRecentDiscovery[];
  favoriteSpecies: MyFishDexFavoriteSpecies[];
  generatedAt: string;
  catalogSpeciesCount: number;
};

export type MyFishDexAssemblerInput = {
  userId: string;
  catalogSpeciesCount?: number;
  speciesCatalog?: FishSpecies[];
  observations: FishObservation[];
  verifications?: FishIdentificationVerification[];
  collections?: {
    userId: string;
    speciesId: string;
    firstDiscoveredAt: string;
    discoveryCount: number;
    firstObservationId?: string | null;
    latestObservationId?: string | null;
    firstPhotoId?: string | null;
    latestPhotoId?: string | null;
    firstLength?: number | null;
    bestLength?: number | null;
    bestWeight?: number | null;
    regions: FishCollectionRegionStat[];
    achievementStatus: FishCollectionAchievementStatus;
    updatedAt: string;
  }[];
  media?: FishObservationMediaExtension[];
  favoriteSpeciesIds?: string[];
  now?: string;
};

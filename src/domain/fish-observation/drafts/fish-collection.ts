export type FishCollectionAchievementStatus = "locked" | "tracking" | "unlocked" | "completed";

export type FishCollectionRegionStat = {
  region: string;
  firstDiscoveredAt?: string | null;
  latestDiscoveredAt?: string | null;
  discoveryCount: number;
};

export type FishCollectionSpeciesEntry = {
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
};

export type FishCollectionSummary = {
  userId: string;
  totalSpeciesCount: number;
  totalObservationCount: number;
  activeSpeciesCount: number;
  achievementStatus: FishCollectionAchievementStatus;
  updatedAt: string;
};

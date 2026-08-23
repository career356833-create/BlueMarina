import type { FishAchievement } from "../read-model/fish-achievement";
import type { FishIdentificationResultViewModel } from "../read-model/fish-identification-result-view-model";
import type { MyFishDexCardViewModel } from "./my-fish-dex-card-view-model";
import type { MyFishDexFilterModel } from "./my-fish-dex-filter-model";

export type MyFishDexSummaryViewModel = {
  discoveredCount: number;
  totalCount: number;
  completionRate: number;
  verifiedCount: number;
  latestDiscovery?: {
    speciesId: string;
    speciesName: string;
    capturedAt: string;
  } | null;
};

export type MyFishDexProgressViewModel = {
  discoveredCount: number;
  totalCount: number;
  completionRate: number;
  verifiedCount: number;
  remainingCount: number;
  latestDiscoveryAt?: string | null;
  progressLabel?: string | null;
};

export type MyFishDexFeaturedCollectionViewModel = MyFishDexCardViewModel & {
  reason: "latest_verified" | "most_caught" | "best_record" | "first_discovery";
};

export type MyFishDexAchievementViewModel = {
  id: string;
  title: string;
  description: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string | null;
};

export type MyFishDexRecentDiscoveryViewModel = {
  observationId: string;
  speciesId: string;
  speciesName: string;
  capturedAt: string;
  thumbnail?: string | null;
  status: "locked" | "discovered" | "verified";
};

export type MyFishDexRecentAiAnalysisViewModel = {
  requestId: string;
  imagePreview?: string | null;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled" | "awaiting_confirmation";
  candidates: Array<{
    speciesId: string;
    speciesName: string;
    thumbnail?: string | null;
    confidence: number;
    rank: number;
  }>;
  topCandidate?: {
    speciesId: string;
    speciesName: string;
    thumbnail?: string | null;
    confidence: number;
    rank: number;
  } | null;
  warning?: string | null;
  canConfirm: boolean;
  canRetry: boolean;
};

export type MyFishDexEmptyStateViewModel = {
  kind: "initial" | "search" | "filter" | "none";
  status: "empty" | "hidden";
  hasDiscoveries: boolean;
  hasConfirmedSpecies: boolean;
  actionKeys: string[];
};

export type MyFishDexPageViewModel = {
  userId: string;
  summary: MyFishDexSummaryViewModel;
  progress: MyFishDexProgressViewModel;
  featuredCollection: MyFishDexFeaturedCollectionViewModel | null;
  recentDiscoveries: MyFishDexRecentDiscoveryViewModel[];
  entries: MyFishDexCardViewModel[];
  achievements: MyFishDexAchievementViewModel[];
  filters: MyFishDexFilterModel;
  sorting: MyFishDexFilterModel["activeSorting"];
  search: MyFishDexFilterModel["search"];
  emptyState: MyFishDexEmptyStateViewModel;
  recentAiAnalyses: MyFishDexRecentAiAnalysisViewModel[];
  generatedAt: string;
  catalogSpeciesCount: number;
};

export type BuildMyFishDexPageViewModelInput = {
  userId: string;
  baseSummary: {
    totalSpecies: number;
    discoveredSpecies: number;
    completionRate: number;
  };
  entries: MyFishDexCardViewModel[];
  achievements: FishAchievement[];
  recentDiscoveries: MyFishDexRecentDiscoveryViewModel[];
  recentAiAnalyses?: FishIdentificationResultViewModel[] | null;
  activeFilter?: MyFishDexFilterModel["activeFilter"];
  activeSorting?: MyFishDexFilterModel["activeSorting"];
  searchQuery?: string | null;
  now?: string;
};

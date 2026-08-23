import type {
  FishDisplayCategory,
  FishDisplayCategoryAssignment,
  FishDetailGeneratedContentSummary,
  FishDetailMediaSummary,
  FishDetailOfficialFacts,
  FishDetailOfficialSource,
  FishDetailPublishMetadata,
  FishDetailRelatedSpecies,
  FishDetailReviewBadge,
  FishDetailSeoMetadata,
  FishDetailViewModel,
  FishDetailFishingGuide,
  FishDetailSeasonSummary,
  FishDetailSeasonSourceStatus,
} from "../../../lib/types/drafts/fish-detail-view-model";
import type { FishSourceTextStatus, FishSourceTextSummary, FishTaxonomy } from "../../../lib/types/drafts/nifs-fish-contract";
import type { RegulationReadModelBuildResult } from "../../fish-regulation/read-model/types";

export type FishDetailSectionStatus = "available" | "source_missing" | "empty";

export type FishDetailSectionKey =
  | "identity"
  | "officialFacts"
  | "taxonomy"
  | "morphology"
  | "habitat"
  | "distribution"
  | "ecology"
  | "spawning"
  | "feeding"
  | "regulations"
  | "media"
  | "sources";

export type FishDetailSectionState = {
  status: FishDetailSectionStatus;
  sourceStatus?: FishSourceTextStatus | "present" | "missing";
  count?: number;
  note?: string;
};

export type FishDetailSectionData = {
  morphology?: string | null;
  morphologySummary?: FishSourceTextSummary | null;
  morphologySourceStatus?: FishSourceTextStatus;
  morphologySourceText?: string | null;
  distinguishingFeatures?: string | null;
  featureSummary?: FishSourceTextSummary | null;
  featureSourceStatus?: FishSourceTextStatus;
  featureSourceText?: string | null;
  habitat?: string | null;
  habitatSourceStatus?: FishSourceTextStatus;
  distribution?: string | null;
  distributionSourceStatus?: FishSourceTextStatus;
  ecology?: string | null;
  ecologySourceStatus?: FishSourceTextStatus;
  spawning?: string | null;
  spawningSourceStatus?: FishSourceTextStatus;
  feeding?: string | null;
  feedingSourceStatus?: FishSourceTextStatus;
  size?: string | null;
  season?: FishDetailSeasonSummary | null;
  seasonSourceStatus?: FishDetailSeasonSourceStatus;
  seasonDisplayText?: string | null;
  seasonFallbackText?: string | null;
  quickFactsSummary?: string | null;
};

export type FishDetailViewModelAssemblerInput = {
  candidateId: string;
  sourceId: string;
  identity: FishDetailViewModel["identity"];
  officialFacts: FishDetailOfficialFacts;
  taxonomy?: FishTaxonomy | null;
  sections: FishDetailSectionData;
  fishingGuide?: FishDetailFishingGuide;
  foodNutrition?: string | null;
  aliases?: string[];
  displayCategories?: FishDisplayCategory[];
  categoryAssignments?: FishDisplayCategoryAssignment[];
  regulationReadModel?: RegulationReadModelBuildResult;
  media?: FishDetailMediaSummary[];
  relatedSpecies?: FishDetailRelatedSpecies[];
  generatedContents?: FishDetailGeneratedContentSummary[];
  officialSources?: FishDetailOfficialSource[];
  reviewBadges?: FishDetailReviewBadge[];
  publishMetadata?: FishDetailPublishMetadata;
  seoMetadata?: FishDetailSeoMetadata;
};

export type FishDetailViewModelAssemblyPreview = {
  candidateId: string;
  sourceId: string;
  viewModel: FishDetailViewModel;
  sectionStates: Record<FishDetailSectionKey, FishDetailSectionState>;
  missingFields: string[];
  warnings: string[];
  readiness: "ready" | "partial" | "blocked";
  regulationCounts: {
    current: number;
    history: number;
    all: number;
  };
};

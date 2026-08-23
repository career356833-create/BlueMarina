import type {
  FishFactReviewStatus,
  FishGeneratedContent,
  FishGeneratedContentReviewStatus,
  FishMedia,
  FishMediaReviewStatus,
  FishPublishStatus,
  FishSourceRef,
  FishTaxonomy,
  FishSourceTextStatus,
  FishSourceTextSummary,
} from "./nifs-fish-contract";

export type FishSlugPolicy = {
  strategy: "immutable-readable-short-id";
  stemSource: "koreanName" | "commonName" | "englishName" | "scientificName" | "internalShortId";
  immutable: true;
  collisionSuffixStrategy: "short-id" | "hash";
  redirectFromSlugs: string[];
  frozenAt?: string;
  note?: string;
};

export type FishDisplayCategorySourceType = "taxonomy" | "manual" | "ai_candidate";

export type FishDisplayCategory = {
  id: string;
  slug: string;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  sourceType: FishDisplayCategorySourceType;
  reviewStatus: FishFactReviewStatus;
};

export type FishDisplayCategoryAssignment = {
  fishSpeciesId: string;
  categoryId: string;
  isPrimary: boolean;
  displayOrder: number;
  sourceType: FishDisplayCategorySourceType;
  reviewStatus: FishFactReviewStatus;
  assignedAt?: string;
  assignedBy?: string;
  note?: string;
};

export type FishSpeciesRelationType =
  | "similar_appearance"
  | "same_taxon"
  | "same_habitat"
  | "confusable"
  | "co_search"
  | "substitute";

export type FishSpeciesRelationSourceType = "official" | "manual" | "ai_candidate";

export type FishSpeciesRelation = {
  sourceSpeciesId: string;
  targetSpeciesId: string;
  relationType: FishSpeciesRelationType;
  reason: string;
  sourceType: FishSpeciesRelationSourceType;
  reviewStatus: FishFactReviewStatus;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FishDetailIdentity = {
  id: string;
  slug: string;
  slugPolicy: FishSlugPolicy;
  slugAliases: string[];
  displayName: string;
  koreanName: string;
  commonName?: string;
  englishName?: string;
  scientificName?: string;
};

export type FishDetailOfficialFacts = {
  factReviewStatus: FishFactReviewStatus;
  publishStatus: FishPublishStatus;
  version: number;
  sourceRefs: FishSourceRef[];
  lastReviewedAt?: string;
  reviewNote?: string;
};

export type FishDetailQuickFacts = {
  summary?: string;
  season?: FishDetailSeasonSummary | null;
  seasonSourceStatus?: FishDetailSeasonSourceStatus;
  seasonDisplayText?: string;
  seasonFallbackText?: string;
  habitat?: string;
  size?: string;
  fishingMethods: string[];
};

export type FishDetailSeasonSourceStatus = "present" | "source_missing";

export type FishDetailSeasonPeriod = {
  month: number | null;
  sourceValue?: string | number | null;
  level?: string | null;
};

export type FishDetailSeasonSummary = {
  source: "NIFS" | string;
  rawKey: "periodList" | string;
  periods: FishDetailSeasonPeriod[];
  sourceStatus: FishDetailSeasonSourceStatus;
  fallbackText?: string;
};

export type FishDetailFishingGuide = {
  methods: string[];
  tips: string[];
  cautions: string[];
};

export type FishDetailRegulationSummary = {
  regulationId: string;
  slug: string;
  title: string;
  summary?: string;
  regulationType?: "CLOSED_SEASON" | "PROHIBITED_LENGTH" | "PROHIBITED_WEIGHT" | "REGION_SCOPE" | "EXCEPTION" | "OTHER";
  region?: string | null;
  waterArea?: string | null;
  fisheryType?: string | null;
  sourceName?: string;
  sourceUrl?: string;
  sourceVersionId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  legalBasis?: string;
  reviewStatus?: "pending" | "needs_review" | "approved" | "rejected";
  confidence?: number | null;
  historyAvailable?: boolean;
  visibility?: "current" | "warning" | "history";
};

export type FishDetailMediaSummary = Pick<
  FishMedia,
  | "id"
  | "fishSpeciesId"
  | "mediaType"
  | "sourceUrl"
  | "storagePath"
  | "referencedSourceMediaId"
  | "copyrightStatus"
  | "usageStatus"
  | "reviewStatus"
>;

export type FishDetailGeneratedContentSummary = Pick<
  FishGeneratedContent,
  | "id"
  | "fishSpeciesId"
  | "contentType"
  | "targetAudience"
  | "provider"
  | "model"
  | "promptVersion"
  | "generatedAt"
  | "reviewStatus"
  | "published"
>;

export type FishDetailOfficialSource = FishSourceRef & {
  sourceName?: string;
  sourceUrl?: string;
  title?: string;
  checkedAt?: string;
  excerpt?: string;
};

export type FishDetailRelatedSpecies = {
  speciesId: string;
  slug?: string;
  displayName: string;
  relationType: FishSpeciesRelationType;
  reason: string;
  sourceType: FishSpeciesRelationSourceType;
  reviewStatus: FishFactReviewStatus;
  displayOrder: number;
};

export type FishDetailReviewBadgeTone = "approved" | "warning" | "danger" | "draft" | "info";

export type FishDetailReviewBadge = {
  key: string;
  label: string;
  tone: FishDetailReviewBadgeTone;
  detail?: string;
  factReviewStatus?: FishFactReviewStatus;
  generatedContentReviewStatus?: FishGeneratedContentReviewStatus;
  mediaReviewStatus?: FishMediaReviewStatus;
};

export type FishDetailPublishMetadata = {
  factReviewStatus: FishFactReviewStatus;
  publishStatus: FishPublishStatus;
  version: number;
  publishedAt?: string;
  updatedAt?: string;
  hiddenReason?: string;
};

export type FishDetailSeoMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  keywords?: string[];
  noindex?: boolean;
};

export type FishDetailViewModel = {
  identity: FishDetailIdentity;
  taxonomy?: FishTaxonomy | null;
  officialFacts: FishDetailOfficialFacts;
  quickFacts: FishDetailQuickFacts;
  morphology?: string | null;
  morphologySummary?: FishSourceTextSummary | null;
  morphologySourceStatus?: FishSourceTextStatus;
  morphologySourceText?: string | null;
  distinguishingFeatures?: string | null;
  featureSummary?: FishSourceTextSummary | null;
  featureSourceStatus?: FishSourceTextStatus;
  featureSourceText?: string | null;
  habitat?: string;
  distribution?: string;
  ecology?: string;
  spawning?: string;
  feeding?: string;
  size?: string;
  season?: string;
  fishingGuide: FishDetailFishingGuide;
  foodNutrition?: string;
  aliases: string[];
  displayCategories: FishDisplayCategory[];
  categoryAssignments: FishDisplayCategoryAssignment[];
  regulations: FishDetailRegulationSummary[];
  media: FishDetailMediaSummary[];
  relatedSpecies: FishDetailRelatedSpecies[];
  generatedContents: FishDetailGeneratedContentSummary[];
  officialSources: FishDetailOfficialSource[];
  reviewBadges: FishDetailReviewBadge[];
  publishMetadata: FishDetailPublishMetadata;
  seoMetadata: FishDetailSeoMetadata;
};

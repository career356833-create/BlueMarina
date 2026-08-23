export type FishSourceRef = {
  sourceProvider: string;
  sourceId: string;
};

export type FishCrawlStatus =
  | "pending"
  | "crawling"
  | "complete"
  | "partial"
  | "failed"
  | "missing"
  | "archived";

export type FishFactReviewStatus =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected";

export type FishGeneratedContentReviewStatus =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected";

export type FishMediaReviewStatus =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected";

export type FishPublishStatus =
  | "draft"
  | "review"
  | "published"
  | "hidden"
  | "archived";

export type FishTaxonomy = {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
};

export type FishSourceTextStatus = "present" | "source_missing";

export type FishSourceTextSummary = {
  source: "NIFS" | string;
  rawKey: string;
  sourceText: string | null;
  sourceStatus: FishSourceTextStatus;
};

export type FishSourceRecord = {
  sourceProvider: string;
  sourceId: string;
  sourceUrl: string;
  rawPayload?: unknown;
  rawFilePath?: string;
  rawHtmlPath?: string;
  sourceImageUrls?: string[];
  fetchedAt: string;
  contentHash: string;
  parserVersion: string;
  crawlStatus: FishCrawlStatus;
  errorMessage?: string;
  sourceMissingAt?: string;
  lastSeenAt?: string;
};

export type FishSpecies = {
  id: string;
  slug: string;
  koreanName: string;
  commonName?: string;
  englishName?: string;
  scientificName?: string;
  taxonomy?: FishTaxonomy;
  morphology?: string;
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
  fishingMethods?: string[];
  foodNutrition?: string;
  aliases?: string[];
  officialSourceIds?: FishSourceRef[];
  factReviewStatus: FishFactReviewStatus;
  publishStatus: FishPublishStatus;
  version: number;
};

export type FishGeneratedContent = {
  id?: string;
  fishSpeciesId: string;
  contentType: string;
  targetAudience?: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputSourceHash: string;
  generatedPayload: unknown;
  generatedAt: string;
  reviewStatus: FishGeneratedContentReviewStatus;
  published: boolean;
};

export type FishCopyrightStatus =
  | "unknown"
  | "verified"
  | "licensed"
  | "restricted"
  | "rejected";

export type FishMediaUsageStatus =
  | "unknown"
  | "ready"
  | "pending"
  | "blocked"
  | "archived";

export type FishMediaType =
  | "image"
  | "thumbnail"
  | "illustration"
  | "diagram"
  | "video";

export type FishMedia = {
  id?: string;
  fishSpeciesId: string;
  mediaType: FishMediaType;
  sourceUrl: string;
  storagePath?: string;
  referencedSourceMediaId?: string;
  copyrightStatus: FishCopyrightStatus;
  usageStatus: FishMediaUsageStatus;
  prompt?: string;
  provider?: string;
  generationMetadata?: Record<string, unknown>;
  reviewStatus: FishMediaReviewStatus;
};

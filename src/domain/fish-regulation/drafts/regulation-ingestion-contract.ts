import type { RegulationSourceLocator } from "../knowledge/versioning/regulation-source-locator";

export type RegulationCrawlStatus = "pending" | "success" | "failed";

export type RegulationFactReviewStatus = "pending" | "reviewed" | "approved" | "rejected";

export type RegulationPublishStatus = "draft" | "review" | "published" | "archived";

export type RegulationSourceRecord = {
  id: string;
  sourceProvider: string;
  sourceType: "LAW" | "ENFORCEMENT_DECREE" | "NOTICE" | "GUIDELINE" | "OTHER";
  documentName: string;
  documentUrl: string;
  rawContentPath?: string | null;
  rawHash: string;
  publishedDate?: string | null;
  effectiveDate?: string | null;
  collectedAt: string;
  parserVersion: string;
  crawlStatus: RegulationCrawlStatus;
  errorMessage?: string | null;
  sourceMissingAt?: string | null;
  lastSeenAt?: string | null;
  isCurrent?: boolean;
};

export type RegulationSourceVersionRecord = {
  versionId: string;
  sourceRecordId: string;
  documentVersion: string;
  revisionDate: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  sourceHash: string;
  sourceLocator?: RegulationSourceLocator;
  status: "draft" | "active" | "expired" | "archived";
  diffSummary?: string | null;
};

export type RegulationRule = {
  id: string;
  sourceRecordId: string;
  sourceVersionId?: string | null;
  regulationType: "CLOSED_SEASON" | "PROHIBITED_LENGTH" | "PROHIBITED_WEIGHT" | "REGION_SCOPE" | "EXCEPTION" | "OTHER";
  primarySpeciesId?: string | null;
  speciesIds: string[];
  region?: string | null;
  waterArea?: string | null;
  fisheryType?: string | null;
  closedSeason?: string | null;
  prohibitedLength?: string | number | null;
  prohibitedWeight?: string | number | null;
  exceptionConditions: string[];
  legalBasis?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  factReviewStatus: RegulationFactReviewStatus;
  publishStatus: RegulationPublishStatus;
  confidence?: number | null;
  version: number;
  note?: string | null;
};

export type RegulationRuleSpeciesLink = {
  ruleId: string;
  speciesId: string;
  isPrimary: boolean;
  displayOrder: number;
  reviewStatus: RegulationFactReviewStatus;
  note?: string | null;
};

export type RegulationDiffRecord = {
  sourceRecordId: string;
  previousVersionId?: string | null;
  nextVersionId: string;
  changedFields: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
};

export type RegulationImpactReportRecord = {
  sourceRecordId: string;
  affectedSpeciesIds: string[];
  affectedRuleIds: string[];
  affectedRegions: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

export type RegulationReviewQueueItem = {
  sourceRecordId: string;
  ruleId?: string | null;
  versionId?: string | null;
  priority: number;
  reason: string;
  stage: "source" | "rule" | "version" | "impact";
  reviewStatus: RegulationFactReviewStatus;
};

export type RegulationDetailSummary = {
  regulationType: "CLOSED_SEASON" | "PROHIBITED_LENGTH" | "PROHIBITED_WEIGHT" | "REGION_SCOPE" | "EXCEPTION" | "OTHER";
  summary: string;
  prohibitedLength?: string | number | null;
  prohibitedWeight?: string | number | null;
  closedSeason?: string | null;
  region?: string | null;
  waterArea?: string | null;
  fisheryType?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceVersionId?: string | null;
  confidence?: number | null;
  reviewStatus: RegulationFactReviewStatus;
  publishStatus: RegulationPublishStatus;
};

export type RegulationDetailHistoryEntry = {
  sourceVersionId: string;
  revisionDate: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  summary: string;
  changedFields: string[];
  status: "draft" | "active" | "expired" | "archived";
};

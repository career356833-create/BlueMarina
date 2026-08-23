export const CONTENT_REVIEW_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "needs_fact_check",
] as const;

export type ContentReviewStatus = (typeof CONTENT_REVIEW_STATUSES)[number];

export const CLAUDE_CONTENT_ROOTS = [
  "src/content",
  "src/data/fish",
  "src/data/regulations",
  "src/data/seo",
] as const;

export type ContentTitleFields =
  | {
      title: string;
      name?: string;
    }
  | {
      name: string;
      title?: string;
    };

export type ContentBodyFields =
  | {
      body: string;
      content?: never;
    }
  | {
      content: string;
      body?: never;
    };

export type ContentBaseFields = {
  id: string;
  slug: string;
  summary: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  reviewStatus: ContentReviewStatus;
  relatedQuestionIds?: number[];
  published?: boolean;
};

export type FishInfo = ContentBaseFields &
  ContentTitleFields &
  ContentBodyFields & {
    kind?: "fish";
    speciesId?: string;
    scientificName?: string;
    aliases?: string[];
    habitat?: string;
    season?: string;
    tags?: string[];
  };

export type FishingRegulation = ContentBaseFields &
  ContentTitleFields &
  ContentBodyFields & {
    kind?: "regulation";
    speciesId?: string;
    region?: string;
    closedSeason?: string;
    prohibitedLength?: string | number;
    effectiveFrom?: string;
    effectiveTo?: string;
    legalBasis?: string;
  };

export type SeoArticle = ContentBaseFields &
  ContentTitleFields &
  ContentBodyFields & {
    kind?: "seo";
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };

export type ContentRecord = FishInfo | FishingRegulation | SeoArticle;

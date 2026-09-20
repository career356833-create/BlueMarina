export const COMMUNITY_POST_TYPES = ["CATCH_REPORT", "TRIP_REVIEW", "REGIONAL", "QNA", "CAPTAIN_NOTICE", "GENERAL"] as const;
export const COMMUNITY_POST_STATUSES = ["DRAFT", "SUBMITTED", "ACTIVE", "HIDDEN", "REJECTED", "DELETED"] as const;
export const COMMUNITY_MODERATION_STATUSES = ["REVIEW_REQUIRED", "APPROVED", "REJECTED", "FLAGGED"] as const;
export const COMMUNITY_COMMENT_STATUSES = ["ACTIVE", "HIDDEN", "DELETED", "FLAGGED"] as const;
export const COMMUNITY_REACTION_TYPES = ["LIKE", "HELPFUL"] as const;
export const COMMUNITY_REPORT_REASONS = ["SPAM", "HARASSMENT", "ILLEGAL_TRADE", "PERSONAL_INFORMATION", "MISLEADING_SAFETY", "PROTECTED_SPECIES", "OTHER"] as const;
export const COMMUNITY_SORTS = ["NEWEST", "OLDEST"] as const;

export type CommunityPostType = typeof COMMUNITY_POST_TYPES[number];
export type CommunityPostStatus = typeof COMMUNITY_POST_STATUSES[number];
export type CommunityModerationStatus = typeof COMMUNITY_MODERATION_STATUSES[number];
export type CommunityCommentStatus = typeof COMMUNITY_COMMENT_STATUSES[number];
export type CommunityReactionType = typeof COMMUNITY_REACTION_TYPES[number];
export type CommunityReportReason = typeof COMMUNITY_REPORT_REASONS[number];
export type CommunitySort = typeof COMMUNITY_SORTS[number];

export type CommunityImage = { id: string; url: string; alt: string | null; order: number; sourceType: "USER_LOCAL_PREVIEW" | "USER_SUBMITTED" };
export type CommunityCatchMetadata = { catchDate: string | null; approximateTime: string | null; method: string | null; note: string | null };
export type CommunityTripMetadata = { departureRegion: string | null; tripDate: string | null };
export type CommunityPost = {
  id: string; authorId: string | null; type: CommunityPostType; title: string; body: string;
  region: { province: string; district: string | null } | null; images: CommunityImage[];
  linkedSpeciesIds: string[]; linkedFishingSpotIds: string[]; linkedCharterIds: string[]; linkedMarketListingIds: string[];
  catchMetadata: CommunityCatchMetadata | null; tripMetadata: CommunityTripMetadata | null;
  status: CommunityPostStatus; moderationStatus: CommunityModerationStatus;
  createdAt: string; updatedAt: string; sourceType: "USER_SUBMITTED" | "OFFICIAL_SOURCE";
};
export type CommunityComment = { id: string; postId: string; authorId: string | null; body: string; status: CommunityCommentStatus; createdAt: string; updatedAt: string };
export type CommunityReaction = { postId: string; actorId: string | null; type: CommunityReactionType };
export type CommunityReport = { id: string; targetType: "POST" | "COMMENT"; targetId: string; reason: CommunityReportReason; detail: string | null; status: "PREPARED" | "SUBMITTED" | "REVIEWED"; createdAt: string };
export type CommunityFilters = { type: CommunityPostType | null; region: string | null; q: string; sort: CommunitySort };
export type CommunityImageInput = { name: string; type: string; size: number; order: number };
export type CommunityPostDraft = {
  type: string; title: string; body: string; province: string; district?: string | null; images: CommunityImageInput[];
  linkedSpeciesIds: string[]; linkedFishingSpotIds: string[]; linkedCharterIds: string[]; linkedMarketListingIds: string[];
  catchMetadata?: Partial<CommunityCatchMetadata> | null; tripMetadata?: Partial<CommunityTripMetadata> | null;
};
export type CommunityLinkCatalog = { speciesIds: ReadonlySet<string>; fishingSpotIds: ReadonlySet<string>; charterIds: ReadonlySet<string>; marketListingIds: ReadonlySet<string> };

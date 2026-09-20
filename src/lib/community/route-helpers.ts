import type { CommunityPostType, CommunityReportReason } from "./types";

export const communityPostTypeLabels: Record<CommunityPostType, string> = {
  CATCH_REPORT: "조황", TRIP_REVIEW: "출조후기", REGIONAL: "지역", QNA: "질문", CAPTAIN_NOTICE: "선장/업체 게시물", GENERAL: "자유",
};
export const communityReportReasonLabels: Record<CommunityReportReason, string> = {
  SPAM: "스팸", HARASSMENT: "괴롭힘", ILLEGAL_TRADE: "불법 거래", PERSONAL_INFORMATION: "개인정보", MISLEADING_SAFETY: "안전 오도", PROTECTED_SPECIES: "보호종", OTHER: "기타",
};
export const linkedCommunityHref = {
  species: (id: string) => `/fish?speciesId=${encodeURIComponent(id)}`,
  fishingSpot: (id: string) => `/fishing-spots/${encodeURIComponent(id)}`,
  charter: (id: string) => `/charters/${encodeURIComponent(id)}`,
  market: (id: string) => `/market/${encodeURIComponent(id)}`,
};
export const communityExcerpt = (value: string, length = 140) => value.length <= length ? value : `${value.slice(0, length).trim()}…`;

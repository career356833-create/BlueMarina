import type { RecentItem } from "@/lib/account/recent";
import type { SavedItem } from "@/lib/account/types";

export const HOME_RECENT_LIMIT = 6;
export const HOME_SAVED_GROUP_LIMIT = 2;

export type HomeSavedGroup = {
  type: SavedItem["entityType"];
  title: string;
  items: SavedItem[];
};

const savedGroupLabels: Record<SavedItem["entityType"], string> = {
  FISHING_SPOT: "저장한 낚시 포인트",
  FISH: "관심 어종",
  CHARTER: "저장한 출조",
  MARKET_LISTING: "저장한 마켓 항목",
};

const recentHrefPrefixes: Record<RecentItem["entityType"], string> = {
  FISHING_SPOT: "/fishing-spots/",
  FISH: "/fish/",
  CHARTER: "/charters/",
  MARKET_LISTING: "/market/",
  COMMUNITY_POST: "/community/",
};

const savedHrefPrefixes: Record<SavedItem["entityType"], string> = {
  FISHING_SPOT: "/fishing-spots/",
  FISH: "/fish/",
  CHARTER: "/charters/",
  MARKET_LISTING: "/market/",
};

function isSafeEntityHref(href: unknown, prefix: string) {
  return typeof href === "string" && href.startsWith(prefix) && !href.includes("//") && href.length > prefix.length;
}

function timeValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getRecentHighlights(items: RecentItem[], limit = HOME_RECENT_LIMIT) {
  const seen = new Set<string>();
  return [...items]
    .filter((item) => typeof item?.label === "string" && item.label.trim().length > 0 && isSafeEntityHref(item.href, recentHrefPrefixes[item.entityType]))
    .sort((left, right) => timeValue(right.viewedAt) - timeValue(left.viewedAt))
    .filter((item) => {
      const key = `${item.entityType}:${item.entityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function getSavedHighlights(items: SavedItem[], limit = HOME_SAVED_GROUP_LIMIT): HomeSavedGroup[] {
  return (Object.keys(savedGroupLabels) as SavedItem["entityType"][])
    .map((type) => ({
      type,
      title: savedGroupLabels[type],
      items: items.filter((item) => item.entityType === type && isSafeEntityHref(item.href, savedHrefPrefixes[type])).slice(0, limit),
    }))
    .filter((group) => group.items.length > 0);
}

export function formatViewedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금 본 콘텐츠";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

export const ACCOUNT_RECENT_STORAGE_KEY = "blue-marina:account:recent:v1";
export const ACCOUNT_RECENT_LIMIT = 30;

export type RecentItem = {
  entityType: "FISHING_SPOT" | "FISH" | "CHARTER" | "MARKET_LISTING" | "COMMUNITY_POST";
  entityId: string;
  label: string;
  href: string;
  viewedAt: string;
};

export function parseRecentItems(raw: string | null): RecentItem[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.entityId === "string" && typeof item.href === "string" && item.href.startsWith("/")).slice(0, ACCOUNT_RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function addRecentItem(items: RecentItem[], next: RecentItem) {
  return [next, ...items.filter((item) => !(item.entityType === next.entityType && item.entityId === next.entityId))].slice(0, ACCOUNT_RECENT_LIMIT);
}

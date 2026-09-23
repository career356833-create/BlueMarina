"use client";

import { useEffect } from "react";
import { ACCOUNT_RECENT_STORAGE_KEY, addRecentItem, parseRecentItems, type RecentItem } from "@/lib/account/recent";

export function RecentlyViewedTracker({ item }: { item: Omit<RecentItem, "viewedAt"> }) {
  const { entityType, entityId, label, href } = item;
  useEffect(() => {
    try {
      const current = parseRecentItems(window.localStorage.getItem(ACCOUNT_RECENT_STORAGE_KEY));
      window.localStorage.setItem(ACCOUNT_RECENT_STORAGE_KEY, JSON.stringify(addRecentItem(current, { entityType, entityId, label, href, viewedAt: new Date().toISOString() })));
    } catch {
      // Browsing remains available when storage is blocked.
    }
  }, [entityId, entityType, href, label]);
  return null;
}

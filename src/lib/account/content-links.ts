import type { AccountSavedEntityType } from "./types";

export function safeContentHref(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    const url = new URL(value, "https://blue-marina.invalid");
    const decoded = decodeURIComponent(url.pathname);
    if (url.origin !== "https://blue-marina.invalid" || /[\\\u0000-\u0020]/.test(decoded) || decoded.startsWith("//")) return null;
    if (/^\/(?:api|admin|_next)(?:\/|$)/.test(decoded)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

const parents: Record<AccountSavedEntityType, string> = {
  FISHING_SPOT: "/fishing-spots", FISH: "/fish", CHARTER: "/charters", MARKET_LISTING: "/market",
};

// Route validity is separate from remote publication/availability. Detail pages own that boundary.
export function savedContentTarget(item: { entityType: AccountSavedEntityType; entityId: string; href: string | null }) {
  const fallback = parents[item.entityType] ?? "/account/saved";
  const href = safeContentHref(item.href);
  if (href) {
    const url = new URL(href, "https://blue-marina.invalid");
    const path = url.pathname;
    const valid = item.entityType === "FISH"
      ? path === "/fishing-spots/conditions" && url.searchParams.get("speciesId") === item.entityId
      : path === `${fallback}/${encodeURIComponent(item.entityId)}`;
    if (valid) return { href, fallback, notice: null };
  }
  return { href: fallback, fallback, notice: "원본 링크를 확인할 수 없습니다. 목록에서 다시 찾아주세요." };
}

export function marketActivityHref(id: string, status: string) {
  return status === "ACTIVE" ? `/market/${encodeURIComponent(id)}` : `/market/new#listing-${encodeURIComponent(id)}`;
}

import type { MarketCategory, MarketCondition, MarketListing, MarketPriceType, MarketTransactionMethod } from "./types";

export const categoryLabels: Record<MarketCategory, string> = {
  FISHING_ROD: "낚싯대", REEL: "릴", LINE_TERMINAL: "라인·채비", LURE_BAIT: "루어·미끼",
  TACKLE_ACCESSORY: "낚시 액세서리", BOAT_EQUIPMENT: "보트용품", MARINE_ELECTRONICS: "해양 전자장비",
  SAFETY_GEAR: "안전장비", CLOTHING: "의류", COOLER_STORAGE: "쿨러·수납", ENGINE_PARTS: "엔진 부품", OTHER: "기타"
};

export const conditionLabels: Record<MarketCondition, string> = {
  NEW_UNUSED: "새상품·미사용", LIKE_NEW: "사용감 거의 없음", GOOD: "상태 좋음", USED: "사용감 있음",
  HEAVILY_USED: "사용감 많음", FOR_PARTS: "부품용"
};

export const priceTypeLabels: Record<MarketPriceType, string> = {
  FIXED: "가격 고정", NEGOTIABLE: "가격 협의", FREE: "무료 나눔", INQUIRY: "가격 문의"
};

export const transactionLabels: Record<MarketTransactionMethod, string> = {
  DIRECT: "직거래", DELIVERY: "직접 전달", PARCEL: "택배", OTHER: "기타"
};

export function formatMarketPrice(listing: Pick<MarketListing, "price" | "priceType">) {
  if (listing.priceType === "INQUIRY" || listing.price === null) return "가격 문의";
  if (listing.priceType === "FREE") return "무료 나눔";
  return `${listing.price.toLocaleString("ko-KR")}원${listing.priceType === "NEGOTIABLE" ? " · 협의 가능" : ""}`;
}

export function safeExternalHref(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

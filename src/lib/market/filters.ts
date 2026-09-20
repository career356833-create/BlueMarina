import { productionMarketDataset } from "./registry";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, MARKET_PRICE_TYPES, MARKET_SORTS, type MarketFilters, type MarketListing } from "./types";

type Query = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const member = <T extends readonly string[]>(values: T, value: string | undefined): T[number] | null => value && values.includes(value as T[number]) ? value as T[number] : null;

export function parseMarketFilters(query: Query): MarketFilters {
  const rawSort = first(query.sort);
  return {
    category: member(MARKET_CATEGORIES, first(query.category)),
    region: first(query.region)?.trim().slice(0, 40) || null,
    condition: member(MARKET_CONDITIONS, first(query.condition)),
    priceType: member(MARKET_PRICE_TYPES, first(query.priceType)),
    q: first(query.q)?.trim().slice(0, 80) || "",
    sort: member(MARKET_SORTS, rawSort) ?? "NEWEST"
  };
}

export function filterMarketListings(listings: readonly MarketListing[], filters: MarketFilters) {
  const query = filters.q.toLocaleLowerCase("ko-KR");
  const filtered = listings.filter((listing) => {
    if (listing.status !== "ACTIVE") return false;
    if (filters.category && listing.category !== filters.category) return false;
    if (filters.condition && listing.condition !== filters.condition) return false;
    if (filters.priceType && listing.priceType !== filters.priceType) return false;
    if (filters.region && !`${listing.region.province} ${listing.region.district ?? ""}`.includes(filters.region)) return false;
    return !query || `${listing.title} ${listing.description}`.toLocaleLowerCase("ko-KR").includes(query);
  });
  return [...filtered].sort((a, b) => {
    if (filters.sort === "NEWEST") return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    const aPrice = a.price ?? Number.POSITIVE_INFINITY;
    const bPrice = b.price ?? Number.POSITIVE_INFINITY;
    const delta = filters.sort === "PRICE_LOW" ? aPrice - bPrice : bPrice - aPrice;
    return delta || a.id.localeCompare(b.id);
  });
}

export function listMarketListings(filters: MarketFilters) {
  return filterMarketListings(productionMarketDataset.listings, filters);
}

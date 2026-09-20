import "server-only";

import { filterMarketListings } from "../filters";
import { getMarketListing, productionMarketDataset } from "../registry";
import type { MarketFilters, MarketListing } from "../types";
import { marketBackend } from "./server";
import type { StoredMarketListing } from "./types";

const publicSafe = (value: StoredMarketListing): MarketListing => ({
  ...value.listing,
  contact: null,
});

export async function readPublicMarketListings(filters: MarketFilters) {
  const backend = marketBackend();
  if (!backend) return filterMarketListings(productionMarketDataset.listings, filters);
  const records = await backend.service.listPublic(100);
  return filterMarketListings(records.map(publicSafe), filters);
}

export async function readPublicMarketListing(id: string) {
  const backend = marketBackend();
  if (!backend) return getMarketListing(id);
  try {
    const record = await backend.service.get(id);
    return record.listing.status === "ACTIVE"
      ? publicSafe(record)
      : null;
  } catch {
    return null;
  }
}

import type { MarketListing } from "./types";

export const productionMarketDataset: Readonly<{
  datasetKind: "PRODUCTION";
  listings: readonly MarketListing[];
}> = {
  datasetKind: "PRODUCTION",
  listings: []
};

export function findMarketListing(listings: readonly MarketListing[], id: string) {
  return listings.find((listing) => listing.id === id) ?? null;
}

export function getMarketListing(id: string) {
  return findMarketListing(productionMarketDataset.listings, id);
}

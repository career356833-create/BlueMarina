export const MARKET_CATEGORIES = [
  "FISHING_ROD",
  "REEL",
  "LINE_TERMINAL",
  "LURE_BAIT",
  "TACKLE_ACCESSORY",
  "BOAT_EQUIPMENT",
  "MARINE_ELECTRONICS",
  "SAFETY_GEAR",
  "CLOTHING",
  "COOLER_STORAGE",
  "ENGINE_PARTS",
  "OTHER"
] as const;

export const MARKET_CONDITIONS = ["NEW_UNUSED", "LIKE_NEW", "GOOD", "USED", "HEAVILY_USED", "FOR_PARTS"] as const;
export const MARKET_PRICE_TYPES = ["FIXED", "NEGOTIABLE", "FREE", "INQUIRY"] as const;
export const MARKET_TRANSACTION_METHODS = ["DIRECT", "DELIVERY", "PARCEL", "OTHER"] as const;
export const MARKET_LISTING_STATUSES = ["DRAFT", "SUBMITTED", "ACTIVE", "RESERVED", "SOLD", "HIDDEN", "REJECTED"] as const;
export const MARKET_SORTS = ["NEWEST", "PRICE_LOW", "PRICE_HIGH"] as const;

export type MarketCategory = typeof MARKET_CATEGORIES[number];
export type MarketCondition = typeof MARKET_CONDITIONS[number];
export type MarketPriceType = typeof MARKET_PRICE_TYPES[number];
export type MarketTransactionMethod = typeof MARKET_TRANSACTION_METHODS[number];
export type MarketListingStatus = typeof MARKET_LISTING_STATUSES[number];
export type MarketSort = typeof MARKET_SORTS[number];
export type MarketSourceType = "USER_SUBMITTED" | "OFFICIAL_SOURCE" | "DEMO_PLACEHOLDER";
export type MarketVerificationStatus = "UNVERIFIED" | "REVIEW_REQUIRED" | "SOURCE_VERIFIED";
export type MarketContactType = "PHONE" | "EMAIL" | "EXTERNAL_LINK" | "INQUIRY_PREPARED";

export type MarketImage = {
  id: string;
  listingId: string;
  url: string;
  alt: string | null;
  order: number;
  sourceType: "USER_LOCAL_PREVIEW" | "SELLER_PROVIDED" | "OFFICIAL_SOURCE";
};

export type MarketContact = {
  listingId: string;
  contactType: MarketContactType;
  destination: string | null;
};

export type MarketListing = {
  id: string;
  sellerId: string | null;
  title: string;
  description: string;
  category: MarketCategory;
  subcategory: string | null;
  price: number | null;
  currency: "KRW";
  priceType: MarketPriceType;
  condition: MarketCondition;
  region: { province: string; district: string | null };
  transactionMethods: MarketTransactionMethod[];
  images: MarketImage[];
  contact: MarketContact | null;
  status: MarketListingStatus;
  createdAt: string;
  updatedAt: string;
  sourceType: MarketSourceType;
  verificationStatus: MarketVerificationStatus;
};

export type MarketFilters = {
  category: MarketCategory | null;
  region: string | null;
  condition: MarketCondition | null;
  priceType: MarketPriceType | null;
  q: string;
  sort: MarketSort;
};

export type MarketImageInput = { name: string; type: string; size: number; order: number };

export type MarketListingDraftInput = {
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  price: number | null;
  priceType: string;
  condition: string;
  province: string;
  district?: string | null;
  transactionMethods: string[];
  images: MarketImageInput[];
  contactType: string;
  contactDestination?: string | null;
};

export type MarketDraftValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  prohibitedFlags: string[];
  sanitized: MarketListingDraftInput;
};

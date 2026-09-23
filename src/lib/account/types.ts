export const ACCOUNT_SAVED_ENTITY_TYPES = [
  "FISHING_SPOT",
  "FISH",
  "CHARTER",
  "MARKET_LISTING",
] as const;

export type AccountSavedEntityType = (typeof ACCOUNT_SAVED_ENTITY_TYPES)[number];

export type AccountProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  region: string | null;
  bio: string | null;
  updatedAt: string | null;
};

export type SavedItem = {
  id: string;
  entityType: AccountSavedEntityType;
  entityId: string;
  label: string | null;
  href: string | null;
  savedAt: string;
};

export type MarketActivity = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

export type AccountReadModel = {
  profile: AccountProfile;
  savedItems: SavedItem[];
  marketActivity: MarketActivity[];
  charterActivity: [];
};

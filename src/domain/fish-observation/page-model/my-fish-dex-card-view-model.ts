import type { MyFishDexEntryStatus, MyFishDexBestRecord } from "../read-model/my-fish-dex-view-model";

export type MyFishDexCardVerificationStatus = "unverified" | "user_confirmed" | "expert_confirmed" | "ai_only";

export type MyFishDexCardViewModel = {
  speciesId: string;
  speciesName: string;
  thumbnail?: string | null;
  status: MyFishDexEntryStatus;
  discoveredAt?: string | null;
  count: number;
  bestRecord?: MyFishDexBestRecord | null;
  regionSummary?: string | null;
  seasonSummary?: string | null;
  verificationStatus: MyFishDexCardVerificationStatus;
};

export type MyFishDexCardSortKey = "recent_discovery" | "most_caught" | "largest_record" | "alphabetical";

export type MyFishDexCardFilterKey = "all" | "discovered" | "undiscovered" | "verified" | "region" | "season";

export type MyFishDexCardSearchField = "speciesName" | "scientificName" | "alias" | "record";

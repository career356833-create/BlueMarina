import type { FishMedia } from "../../../lib/types/drafts/nifs-fish-contract";

export type FishObservationMediaOrigin = "source_original" | "ai_realistic" | "ai_character" | "user_catch_photo";

export type FishObservationMediaPrivacy = "private" | "shared" | "public";

export type FishObservationMediaExtension = FishMedia & {
  originType: FishObservationMediaOrigin;
  privacy: FishObservationMediaPrivacy;
  observationId?: string | null;
  userId?: string | null;
  storageBucket?: "fish-observation-originals" | "fish-observation-processed" | "fish-observation-public" | null;
  imageHash?: string | null;
  exifStatus?: "preserved" | "stripped" | "unknown";
  exifStrippedAt?: string | null;
  locationPrivacy?: "exact" | "grid" | "hidden";
  trainingEligible?: boolean;
  confirmedLabel?: string | null;
  embeddingStoragePath?: string | null;
};

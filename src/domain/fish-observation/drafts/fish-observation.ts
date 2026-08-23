export type FishObservationVisibility = "private" | "shared" | "public";

export type FishObservationLocationPrivacy = "exact" | "grid" | "hidden";

export type FishObservationModerationStatus = "pending" | "reviewed" | "approved" | "rejected" | "archived";

export type FishObservationDeletionStatus = "active" | "deleted" | "requested";

export type FishObservationLocation = {
  lat?: number | null;
  lng?: number | null;
  accuracyMeters?: number | null;
  gridCode?: string | null;
  geohash?: string | null;
  regionLabel?: string | null;
};

export type FishObservation = {
  id: string;
  userId: string;
  speciesId?: string | null;
  photoMediaId?: string | null;
  capturedAt: string;
  location?: FishObservationLocation | null;
  region?: string | null;
  fishingSpotId?: string | null;
  marinePlaceId?: string | null;
  length?: number | null;
  weight?: number | null;
  notes?: string | null;
  visibility: FishObservationVisibility;
  locationPrivacy: FishObservationLocationPrivacy;
  isPersonalRecord: boolean;
  isAnonymous: boolean;
  moderationStatus: FishObservationModerationStatus;
  deletionStatus: FishObservationDeletionStatus;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type FishObservationPublicLocation = {
  observationId: string;
  privacy: "grid" | "hidden";
  displayRegion?: string | null;
  regionCode?: string | null;
  gridCode?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type FishObservationAuditTrail = {
  observationId: string;
  actorType: "user" | "expert" | "system";
  changeType: "create" | "update" | "verify" | "hide" | "delete";
  beforePayload?: Record<string, unknown> | null;
  afterPayload?: Record<string, unknown> | null;
  changedAt: string;
  reason?: string | null;
};

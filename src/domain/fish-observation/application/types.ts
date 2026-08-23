import type { FishCollectionSummary, FishCollectionSpeciesEntry } from "../drafts/fish-collection";
import type { FishIdentificationVerification } from "../drafts/fish-identification";
import type { FishObservation, FishObservationLocation } from "../drafts/fish-observation";
import type { FishObservationMediaExtension } from "../drafts/fish-media-extension";
import type { FishAchievement } from "../read-model/fish-achievement";
import type { FishIdentificationResultViewModel } from "../read-model/fish-identification-result-view-model";
import type { MyFishDexEmptyStateViewModel, MyFishDexPageViewModel } from "../page-model/my-fish-dex-page-view-model";
import type { MyFishDexCardFilterKey, MyFishDexCardSortKey, MyFishDexCardViewModel } from "../page-model/my-fish-dex-card-view-model";
import type { MyFishDexFilterModel } from "../page-model/my-fish-dex-filter-model";
import type { FishSpecies } from "../../../lib/types/drafts/nifs-fish-contract";

export type MyFishDexRouteQuery = {
  filter?: string | string[] | null;
  sort?: string | string[] | null;
  search?: string | string[] | null;
  region?: string | string[] | null;
  season?: string | string[] | null;
  page?: string | string[] | null;
};

export type MyFishDexNormalizedRouteQuery = {
  activeFilter: MyFishDexCardFilterKey;
  activeSorting: MyFishDexCardSortKey;
  search: string;
  region: string | null;
  season: "spring" | "summer" | "autumn" | "winter" | null;
  page: number;
};

export type MyFishDexPageStateKind = "loading" | "success" | "empty" | "error" | "unauthorized";

export type MyFishDexPageState =
  | {
      kind: "loading";
      message?: string;
    }
  | {
      kind: "success";
      viewModel: MyFishDexPageViewModel;
    }
  | {
      kind: "empty";
      viewModel: MyFishDexPageViewModel;
      emptyState: MyFishDexEmptyStateViewModel;
    }
  | {
      kind: "error";
      message: string;
      retryable: boolean;
    }
  | {
      kind: "unauthorized";
      redirectTo: string;
    };

export type MyFishDexPageRequest = {
  userId?: string | null;
  query?: MyFishDexRouteQuery;
  recentAiAnalyses?: FishIdentificationResultViewModel[] | null;
};

export type MyFishDexPageComponentContract = {
  MyFishDexPage: {
    props: {
      state: MyFishDexPageState;
    };
  };
  MyFishDexSummary: {
    props: {
      summary: MyFishDexPageViewModel["summary"];
      progress: MyFishDexPageViewModel["progress"];
    };
  };
  MyFishDexProgress: {
    props: {
      progress: MyFishDexPageViewModel["progress"];
    };
  };
  MyFishDexGrid: {
    props: {
      entries: MyFishDexCardViewModel[];
      filters: MyFishDexFilterModel;
    };
  };
  MyFishDexCard: {
    props: {
      card: MyFishDexCardViewModel;
    };
  };
  MyFishDexFilterBar: {
    props: {
      filters: MyFishDexFilterModel;
    };
  };
  MyFishDexAchievementPanel: {
    props: {
      achievements: FishAchievement[];
    };
  };
  MyFishDexRecentAI: {
    props: {
      recentAiAnalyses: FishIdentificationResultViewModel[];
    };
  };
  MyFishDexEmptyState: {
    props: {
      emptyState: MyFishDexEmptyStateViewModel;
    };
  };
};

export interface FishCollectionRepository {
  findByUserId(userId: string): Promise<FishCollectionSpeciesEntry[]>;
  findSummaryByUserId(userId: string): Promise<FishCollectionSummary | null>;
}

export interface FishObservationRepository {
  findByUserId(userId: string): Promise<FishObservation[]>;
  findVerificationsByUserId(userId: string): Promise<FishIdentificationVerification[]>;
  findMediaByUserId(userId: string): Promise<FishObservationMediaExtension[]>;
  findLocationsByUserId(userId: string): Promise<Array<Pick<FishObservationLocation, "regionLabel"> & { observationId: string }>>;
}

export interface FishSpeciesRepository {
  findPublished(): Promise<FishSpecies[]>;
  findByIds(ids: string[]): Promise<FishSpecies[]>;
  findBySlug(slug: string): Promise<FishSpecies | null>;
}

export type FishObservationConfirmationActorRole = "user" | "expert" | "admin";

export type FishObservationConfirmationMode = "apply" | "noop" | "blocked";

export type FishObservationConfirmationBlockReason =
  | "observation_not_found"
  | "not_authorized"
  | "verification_type_not_allowed"
  | "candidate_mismatch"
  | "species_archived"
  | "already_confirmed";

export type FishObservationConfirmationStepKind =
  | "insert_verification"
  | "update_observation_species"
  | "mark_verification_status"
  | "upsert_collection"
  | "append_achievement_event"
  | "append_change_log";

export type FishObservationConfirmationStep = {
  order: number;
  kind: FishObservationConfirmationStepKind;
  description: string;
  required: boolean;
  skipped?: boolean;
  note?: string;
};

export type FishObservationConfirmationCollectionPolicy = {
  strategy: "insert_or_increment";
  sameUserSameSpecies: "increment_discovery_count";
  preserveObservationHistory: true;
  updateBestLength: true;
  updateBestWeight: true;
  sameObservationIdempotent: true;
};

export type FishObservationAchievementEvent = {
  userId: string;
  achievementType: string;
  speciesId?: string | null;
  observationId: string;
  createdAt: string;
};

export type FishObservationConfirmationSnapshotObservation = Pick<
  FishObservation,
  "id" | "userId" | "speciesId" | "photoMediaId" | "moderationStatus" | "deletionStatus" | "createdAt" | "updatedAt"
> & {
  verificationStatus?: "pending" | "verified" | "rejected" | "archived";
};

export type FishObservationConfirmationSnapshotSpecies = Pick<
  FishSpecies,
  "id" | "factReviewStatus" | "publishStatus" | "version"
> & {
  archived?: boolean;
};

export type FishObservationConfirmationSnapshot = {
  observation?: FishObservationConfirmationSnapshotObservation | null;
  selectedSpecies?: FishObservationConfirmationSnapshotSpecies | null;
  candidateSpeciesIds?: string[] | null;
  existingVerification?: FishIdentificationVerification | null;
  collectionEntry?: FishCollectionSpeciesEntry | null;
  mediaDeleted?: boolean;
};

export type FishObservationConfirmationInput = {
  observationId: string;
  selectedSpeciesId: string;
  verificationType: FishIdentificationVerification["verificationType"];
  verifiedBy: string;
  idempotencyKey?: string | null;
  actorRole: FishObservationConfirmationActorRole;
  actorUserId?: string | null;
  now?: string;
  confidence?: number | null;
  note?: string | null;
};

export type FishObservationConfirmationPlan = {
  mode: FishObservationConfirmationMode;
  idempotencyKey: string;
  warnings: string[];
  blockReasons: FishObservationConfirmationBlockReason[];
  steps: FishObservationConfirmationStep[];
  collectionPolicy: FishObservationConfirmationCollectionPolicy;
  achievementEvent?: FishObservationAchievementEvent | null;
  existingVerificationDetected: boolean;
  deletedMediaDetected: boolean;
};

export interface FishObservationConfirmationRepository {
  findObservationById(observationId: string): Promise<FishObservationConfirmationSnapshotObservation | null>;
  findLatestVerificationByObservationId(observationId: string): Promise<FishIdentificationVerification | null>;
  findCandidateSpeciesIdsByObservationId(observationId: string): Promise<string[]>;
  findSpeciesById(speciesId: string): Promise<FishObservationConfirmationSnapshotSpecies | null>;
  findCollectionEntry(userId: string, speciesId: string): Promise<FishCollectionSpeciesEntry | null>;
}

export interface FishObservationConfirmationWriter {
  upsertVerification(
    observationId: string,
    input: FishObservationConfirmationInput,
  ): Promise<{ verificationId: string; idempotent: boolean }>;
  updateObservationSpecies(
    observationId: string,
    selectedSpeciesId: string,
  ): Promise<{ observationId: string; speciesId: string }>;
  upsertCollectionEntry(
    userId: string,
    speciesId: string,
    observationId: string,
    capturedAt: string,
    record: Pick<FishObservation, "length" | "weight" | "photoMediaId" | "region" | "createdAt">,
  ): Promise<FishCollectionSpeciesEntry>;
  appendAchievementEvent(event: FishObservationAchievementEvent): Promise<{ id: string }>;
  appendChangeLog(
    changeType: "confirm_observation" | "upsert_collection" | "achievement_event",
    payload: Record<string, unknown>,
  ): Promise<{ id: string }>;
}

export type FishObservationConfirmationTransactionResult = {
  mode: FishObservationConfirmationMode;
  idempotencyKey: string;
  observationId: string;
  selectedSpeciesId: string;
  verificationType: FishIdentificationVerification["verificationType"];
  verifiedBy: string;
  steps: FishObservationConfirmationStep[];
  warnings: string[];
  blockReasons: FishObservationConfirmationBlockReason[];
  collectionPolicy: FishObservationConfirmationCollectionPolicy;
  achievementEvent?: FishObservationAchievementEvent | null;
};

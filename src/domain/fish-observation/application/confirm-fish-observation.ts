import type { FishObservationConfirmationInput, FishObservationConfirmationPlan, FishObservationConfirmationSnapshot, FishObservationConfirmationStep } from "./types";

function buildDefaultIdempotencyKey(input: FishObservationConfirmationInput) {
  return [input.observationId, input.selectedSpeciesId, input.verificationType, input.verifiedBy, input.actorRole].join(":");
}

function hasCandidate(snapshot: FishObservationConfirmationSnapshot, selectedSpeciesId: string) {
  const candidates = snapshot.candidateSpeciesIds ?? [];
  return candidates.length === 0 || candidates.includes(selectedSpeciesId);
}

function buildSteps(mode: FishObservationConfirmationPlan["mode"], replacedVerification: boolean): FishObservationConfirmationStep[] {
  if (mode === "blocked") return [];
  const steps: FishObservationConfirmationStep[] = [
    { order: 1, kind: "insert_verification", description: "Create FishObservationVerification", required: true, skipped: false },
    { order: 2, kind: "update_observation_species", description: "Fix FishObservation.speciesId to the selected species", required: true, skipped: false },
    { order: 3, kind: "mark_verification_status", description: "Mark verification as confirmed", required: true, skipped: false },
    { order: 4, kind: "upsert_collection", description: "Upsert FishCollection for the user/species pair", required: true, skipped: false },
    { order: 5, kind: "append_achievement_event", description: "Append achievement event for read-model aggregation", required: true, skipped: false },
    { order: 6, kind: "append_change_log", description: "Append change log for audit trail", required: true, skipped: false },
  ];
  if (mode === "noop") {
    return steps.map((step) => ({ ...step, skipped: true, note: "Idempotent confirmation already exists" }));
  }
  if (replacedVerification) {
    return steps.map((step, index) =>
      index === 0 ? { ...step, note: "Admin override will replace the existing verification if needed" } : step,
    );
  }
  return steps;
}

export function buildConfirmFishObservationPlan(
  input: FishObservationConfirmationInput,
  snapshot: FishObservationConfirmationSnapshot,
): FishObservationConfirmationPlan {
  const idempotencyKey = input.idempotencyKey?.trim() || buildDefaultIdempotencyKey(input);
  const warnings: string[] = [];
  const blockReasons: FishObservationConfirmationPlan["blockReasons"] = [];

  if (!snapshot.observation || snapshot.observation.id !== input.observationId) {
    blockReasons.push("observation_not_found");
  }

  if (snapshot.observation && input.actorRole === "user" && snapshot.observation.userId !== input.actorUserId) {
    blockReasons.push("not_authorized");
  }

  if (input.actorRole === "user" && input.verificationType !== "user_confirmed") {
    blockReasons.push("verification_type_not_allowed");
  }
  if (input.actorRole === "expert" && input.verificationType !== "expert_confirmed") {
    blockReasons.push("verification_type_not_allowed");
  }

  if (snapshot.selectedSpecies?.archived || snapshot.selectedSpecies?.publishStatus === "archived") {
    blockReasons.push("species_archived");
  }

  if (!hasCandidate(snapshot, input.selectedSpeciesId)) {
    blockReasons.push("candidate_mismatch");
  }

  const existingVerification = snapshot.existingVerification ?? null;
  const matchesExistingVerification =
    existingVerification &&
    existingVerification.observationId === input.observationId &&
    existingVerification.selectedSpeciesId === input.selectedSpeciesId &&
    existingVerification.verificationType === input.verificationType &&
    (existingVerification.verifiedBy ?? null) === input.verifiedBy;

  const replacedVerification = Boolean(existingVerification && !matchesExistingVerification && input.actorRole === "admin");
  if (existingVerification && !matchesExistingVerification && input.actorRole !== "admin") {
    blockReasons.push("already_confirmed");
  }

  if (snapshot.mediaDeleted) {
    warnings.push("deleted_media_detected");
  }

  if (snapshot.observation?.deletionStatus === "deleted") {
    blockReasons.push("observation_not_found");
  }

  const mode: FishObservationConfirmationPlan["mode"] =
    blockReasons.length > 0 ? "blocked" : matchesExistingVerification ? "noop" : "apply";

  if (mode === "apply" && existingVerification && replacedVerification) {
    warnings.push("admin_override_replaces_existing_verification");
  }

  const achievementEvent =
    mode === "apply"
      ? {
          userId: snapshot.observation?.userId ?? input.actorUserId ?? "unknown-user",
          achievementType: "fish_observation_confirmed",
          speciesId: input.selectedSpeciesId,
          observationId: input.observationId,
          createdAt: input.now ?? snapshot.observation?.updatedAt ?? snapshot.observation?.createdAt ?? new Date().toISOString(),
        }
      : null;

  return {
    mode,
    idempotencyKey,
    warnings,
    blockReasons,
    steps: buildSteps(mode, replacedVerification),
    collectionPolicy: {
      strategy: "insert_or_increment",
      sameUserSameSpecies: "increment_discovery_count",
      preserveObservationHistory: true,
      updateBestLength: true,
      updateBestWeight: true,
      sameObservationIdempotent: true,
    },
    achievementEvent,
    existingVerificationDetected: Boolean(existingVerification),
    deletedMediaDetected: Boolean(snapshot.mediaDeleted),
  };
}

export type ConfirmFishObservationRpcInput = Pick<
  FishObservationConfirmationInput,
  "observationId" | "selectedSpeciesId" | "verificationType" | "verifiedBy"
> & {
  idempotencyKey?: string | null;
};

export type ConfirmFishObservationRpcResult = {
  confirmed: boolean;
  idempotent: boolean;
  mode: FishObservationConfirmationPlan["mode"];
  observationId: string;
  selectedSpeciesId: string;
  collectionUpdated: boolean;
  achievementEventCreated: boolean;
  warnings: string[];
  blockReasons: FishObservationConfirmationPlan["blockReasons"];
};

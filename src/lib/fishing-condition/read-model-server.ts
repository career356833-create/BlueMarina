import "server-only";

import {
  ConditionEvidenceBundleError,
  runConditionEvidenceBundle,
  type ConditionEvidenceBundleRequest,
} from "./evidence-bundle-server";
import { getFishingConditionEnvironment } from "./comparator-server";
import { getFishingConditionProfile } from "./profile-registry";
import { findSpeciesEnvironmentProfile } from "./species-environment";
import { buildFishingConditionReadModel, buildProfileOnlyFishingConditionReadModel } from "./read-model";

export type FishingConditionReadModelRequest = ConditionEvidenceBundleRequest;

export { ConditionEvidenceBundleError as FishingConditionReadModelError };

export async function runFishingConditionReadModel(request: FishingConditionReadModelRequest) {
  const profile = getFishingConditionProfile(request.speciesId);
  const legacyProfile = findSpeciesEnvironmentProfile({ speciesId: request.speciesId });
  if (legacyProfile) {
    const bundle = await runConditionEvidenceBundle(request);
    return buildFishingConditionReadModel(bundle, profile);
  }
  if (!profile) throw new ConditionEvidenceBundleError("PROFILE_NOT_FOUND");
  const environment = await getFishingConditionEnvironment(request);
  return buildProfileOnlyFishingConditionReadModel(profile, environment, request.contexts);
}

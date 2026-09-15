import "server-only";

import {
  ConditionEvidenceBundleError,
  runConditionEvidenceBundle,
  type ConditionEvidenceBundleRequest,
} from "./evidence-bundle-server";
import { buildFishingConditionReadModel } from "./read-model";

export type FishingConditionReadModelRequest = ConditionEvidenceBundleRequest;

export { ConditionEvidenceBundleError as FishingConditionReadModelError };

export async function runFishingConditionReadModel(request: FishingConditionReadModelRequest) {
  const bundle = await runConditionEvidenceBundle(request);
  return buildFishingConditionReadModel(bundle);
}

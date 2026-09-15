import "server-only";

import {
  FishingConditionComparatorError,
  runFishingConditionComparison,
  type FishingConditionComparisonRequest,
} from "./comparator-server";
import {
  attachSeasonalityEvidence,
  buildConditionEvidenceBundle,
  type ConditionEvidenceBundleContexts,
} from "./evidence-bundle";
import { explainFishingCondition } from "./explanation";
import { getSpeciesSeasonality } from "./seasonality-runtime";

export type ConditionEvidenceBundleRequest = FishingConditionComparisonRequest & {
  contexts: ConditionEvidenceBundleContexts;
};

export { FishingConditionComparatorError as ConditionEvidenceBundleError };

export async function runConditionEvidenceBundle(request: ConditionEvidenceBundleRequest) {
  const comparison = await runFishingConditionComparison(request);
  const explanation = explainFishingCondition(comparison);
  const bundle = buildConditionEvidenceBundle(comparison, explanation, request.contexts);
  if (request.contexts.month === null) return bundle;
  const seasonality = getSpeciesSeasonality({ speciesId: request.speciesId, month: request.contexts.month });
  return attachSeasonalityEvidence(bundle, seasonality);
}

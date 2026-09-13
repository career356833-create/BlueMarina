import "server-only";

import {
  FishingConditionComparatorError,
  runFishingConditionComparison,
  type FishingConditionComparisonRequest,
} from "./comparator-server";
import {
  buildConditionEvidenceBundle,
  type ConditionEvidenceBundleContexts,
} from "./evidence-bundle";
import { explainFishingCondition } from "./explanation";

export type ConditionEvidenceBundleRequest = FishingConditionComparisonRequest & {
  contexts: ConditionEvidenceBundleContexts;
};

export { FishingConditionComparatorError as ConditionEvidenceBundleError };

export async function runConditionEvidenceBundle(request: ConditionEvidenceBundleRequest) {
  const comparison = await runFishingConditionComparison(request);
  const explanation = explainFishingCondition(comparison);
  return buildConditionEvidenceBundle(comparison, explanation, request.contexts);
}

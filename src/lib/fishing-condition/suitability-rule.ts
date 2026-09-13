import type { ComparisonRelation } from "./comparator";
import type { DepthMatchStatus } from "./source-alignment";
import type { SourcePolicyEvaluation } from "./source-policy";

export const SUITABILITY_RULE_QUALITY_CLASS = "DERIVED_SUITABILITY_RULE" as const;

export const SUITABILITY_RULE_STATUSES = [
  "INTERPRETABLE_MATCH",
  "INTERPRETABLE_BELOW",
  "INTERPRETABLE_ABOVE",
  "INTERPRETABLE_MISMATCH",
  "LIMITED_INTERPRETATION",
  "BLOCKED_BY_POLICY",
  "BLOCKED_BY_GATE",
  "UNSUPPORTED",
  "CONTEXT_ONLY",
  "BASELINE_ONLY",
  "MISSING_CONTEXT",
  "UNAVAILABLE",
] as const;

export type SuitabilityRuleStatus = typeof SUITABILITY_RULE_STATUSES[number];
export type SuitabilityRuleFreshness = "fresh" | "stale" | "unavailable" | null;

export type SuitabilityRuleResult = {
  variable: string;
  ruleStatus: SuitabilityRuleStatus;
  relation: ComparisonRelation | null;
  sourceId: string;
  policyAction: string;
  passedGates: string[];
  failedGates: string[];
  limitations: string[];
  evidenceRefs: string[];
  qualityClass: typeof SUITABILITY_RULE_QUALITY_CLASS;
};

export type EvaluateSuitabilityRuleInput = {
  variable: string;
  relation: ComparisonRelation | null;
  sourcePolicy: SourcePolicyEvaluation;
  freshness: SuitabilityRuleFreshness;
  depthStatus: DepthMatchStatus;
  evidenceRefs?: readonly string[];
  contextAvailable?: boolean;
  limitations?: readonly string[];
};

const relationStatuses: Partial<Record<ComparisonRelation, SuitabilityRuleStatus>> = {
  WITHIN_RANGE: "INTERPRETABLE_MATCH",
  BELOW_RANGE: "INTERPRETABLE_BELOW",
  ABOVE_RANGE: "INTERPRETABLE_ABOVE",
  MATCH: "INTERPRETABLE_MATCH",
  MISMATCH: "INTERPRETABLE_MISMATCH",
};

const gateRelations = new Set<ComparisonRelation>([
  "UNIT_MISMATCH",
  "UNIT_UNVERIFIED",
  "DEPTH_CONTEXT_UNRESOLVED",
  "CONFLICT_REVIEW_REQUIRED",
]);

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

export function evaluateSuitabilityRule(input: EvaluateSuitabilityRuleInput): SuitabilityRuleResult {
  const evidenceRefs = unique(input.evidenceRefs ?? []);
  const limitations = unique([...(input.sourcePolicy.limitations ?? []), ...(input.limitations ?? [])]);
  const base = {
    variable: input.variable,
    sourceId: input.sourcePolicy.sourceId,
    policyAction: input.sourcePolicy.action,
    passedGates: unique(input.sourcePolicy.passedGates),
    failedGates: unique(input.sourcePolicy.failedGates),
    limitations,
    evidenceRefs,
    qualityClass: SUITABILITY_RULE_QUALITY_CLASS,
  };
  const result = (ruleStatus: SuitabilityRuleStatus, relation: ComparisonRelation | null, extra: string[] = []): SuitabilityRuleResult => ({
    ...base,
    ruleStatus,
    relation,
    limitations: unique([...limitations, ...extra]),
  });

  if (input.freshness === "unavailable") return result("UNAVAILABLE", null, ["SOURCE_UNAVAILABLE"]);
  if (input.sourcePolicy.configuredAction === "BLOCKED") return result("BLOCKED_BY_POLICY", null);
  if (input.sourcePolicy.action === "BLOCKED") return result("BLOCKED_BY_GATE", null);
  if (input.sourcePolicy.action === "UNSUPPORTED") return result("UNSUPPORTED", null);
  if (input.sourcePolicy.action === "CONTEXT_ONLY") return result("CONTEXT_ONLY", null);
  if (input.sourcePolicy.action === "BASELINE_ONLY") return result("BASELINE_ONLY", null);
  if (input.variable === "activity" && input.contextAvailable !== true) return result("MISSING_CONTEXT", null, ["TIME_CONTEXT_REQUIRED"]);
  if (input.relation === "UNSUPPORTED_PROFILE" || input.relation === "UNSUPPORTED_ENVIRONMENT") return result("UNSUPPORTED", null);
  if (input.relation === "MISSING_ENVIRONMENT" || input.relation === null) return result("UNAVAILABLE", null);
  if (gateRelations.has(input.relation)) return result("BLOCKED_BY_GATE", null, [input.relation]);
  if (input.depthStatus === "UNRESOLVED" && input.sourcePolicy.requiredGates.includes("DEPTH_COMPATIBLE")) {
    return result("BLOCKED_BY_GATE", null, ["DEPTH_CONTEXT_UNRESOLVED"]);
  }

  const relationStatus = relationStatuses[input.relation];
  if (!relationStatus) return result("UNSUPPORTED", null, ["RELATION_NOT_INTERPRETABLE"]);
  if (evidenceRefs.length === 0) return result("BLOCKED_BY_GATE", null, ["EVIDENCE_REFERENCE_REQUIRED"]);
  if (input.sourcePolicy.configuredAction === "COMPARISON_ALLOWED_WITH_LIMITS" || input.freshness === "stale") {
    return result("LIMITED_INTERPRETATION", input.relation, input.freshness === "stale" ? ["STALE_SOURCE"] : []);
  }
  return result(relationStatus, input.relation);
}

type ComparisonShape = {
  comparisons: Record<string, { relation?: ComparisonRelation; evidenceIds?: string[] } | undefined>;
};

export function buildBranchSuitabilityRules(input: {
  sourcePolicy: SourcePolicyEvaluation[];
  comparison: ComparisonShape | null;
  freshness: SuitabilityRuleFreshness;
  depthStatus: DepthMatchStatus;
}): SuitabilityRuleResult[] {
  return input.sourcePolicy.map((sourcePolicy) => {
    const compared = input.comparison?.comparisons[sourcePolicy.variable];
    return evaluateSuitabilityRule({
      variable: sourcePolicy.variable,
      relation: compared?.relation ?? null,
      sourcePolicy,
      freshness: input.freshness,
      depthStatus: input.depthStatus,
      evidenceRefs: compared?.evidenceIds ?? [],
    });
  });
}

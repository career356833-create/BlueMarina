import type { ComparisonRelation, compareFishingCondition } from "./comparator";
import type { explainFishingCondition, FishingConditionExplanation } from "./explanation";

export const CONDITION_EVIDENCE_BUNDLE_QUALITY_CLASS = "DERIVED_EVIDENCE_BUNDLE" as const;
export const CONDITION_EVIDENCE_BUNDLE_PROFILE_VERSION = "v2" as const;

export type ConditionEvidenceStatus =
  | "SUPPORTED"
  | "UNSUPPORTED_PROFILE"
  | "UNSUPPORTED_ENVIRONMENT"
  | "MISSING_ENVIRONMENT"
  | "MISSING_ENVIRONMENT_CONTEXT"
  | "UNIT_UNVERIFIED"
  | "UNIT_MISMATCH"
  | "CONFLICT_REVIEW_REQUIRED"
  | "LIMITED"
  | "UNKNOWN";

export type ConditionEvidenceItem = {
  field: "temperature" | "salinity" | "dissolvedOxygen" | "seasonality" | "activity" | "habitat";
  status: ConditionEvidenceStatus;
  relation: ComparisonRelation | null;
  environmentValue: number | string | null;
  profileReference: {
    rangeType: string | null;
    min: number | null;
    max: number | null;
    unit: string | null;
  } | null;
  explanation: string | null;
  evidenceRefs: string[];
  sourceLineage: string[];
  freshness: string | null;
  contexts?: Array<{
    context: "SPAWNING" | "MIGRATION" | "FISHERY_OCCURRENCE";
    relation: "MATCH" | "MISMATCH";
    months: number[];
    explanation: string;
    evidenceRefs: string[];
  }>;
};

type FishingConditionComparison = ReturnType<typeof compareFishingCondition>;
type FishingConditionExplanationResult = ReturnType<typeof explainFishingCondition>;
type NumericComparison = FishingConditionComparison["comparisons"]["temperature"];

export type ConditionEvidenceBundleContexts = {
  month: number | null;
  timeOfDay: "DAY" | "NIGHT" | "DAWN" | "DUSK" | null;
};

const BLOCKED_RELATIONS = new Set<ComparisonRelation>([
  "UNIT_UNVERIFIED",
  "UNIT_MISMATCH",
  "CONFLICT_REVIEW_REQUIRED",
]);

function unique(values: string[]) {
  return [...new Set(values)];
}

function lineage(comparison: FishingConditionComparison) {
  return [
    comparison.sourceLineage.environmentSource,
    comparison.qualityClass,
    "DERIVED_EXPLANATION",
    CONDITION_EVIDENCE_BUNDLE_QUALITY_CLASS,
  ];
}

function explanationFor(
  explanation: FishingConditionExplanationResult,
  field: string,
): FishingConditionExplanation | null {
  return explanation.explanations.find((item) => item.field === field) ?? null;
}

function statusFor(
  relation: ComparisonRelation,
  usability: "USABLE" | "LIMITED" | "UNAVAILABLE",
): ConditionEvidenceStatus {
  if (usability === "LIMITED") return "LIMITED";
  if (relation === "UNSUPPORTED_PROFILE") return "UNSUPPORTED_PROFILE";
  if (relation === "UNSUPPORTED_ENVIRONMENT") return "UNSUPPORTED_ENVIRONMENT";
  if (relation === "MISSING_ENVIRONMENT") return "MISSING_ENVIRONMENT";
  if (relation === "UNIT_UNVERIFIED") return "UNIT_UNVERIFIED";
  if (relation === "UNIT_MISMATCH") return "UNIT_MISMATCH";
  if (relation === "CONFLICT_REVIEW_REQUIRED") return "CONFLICT_REVIEW_REQUIRED";
  if (relation === "UNKNOWN" || usability === "UNAVAILABLE") return "UNKNOWN";
  return "SUPPORTED";
}

function supportedRelation(relation: ComparisonRelation): ComparisonRelation | null {
  return ["WITHIN_RANGE", "BELOW_RANGE", "ABOVE_RANGE", "MATCH", "MISMATCH"].includes(relation)
    ? relation
    : null;
}

function numericItem(
  field: "temperature" | "salinity" | "dissolvedOxygen",
  value: NumericComparison,
  comparison: FishingConditionComparison,
  explanation: FishingConditionExplanationResult,
): ConditionEvidenceItem {
  const described = explanationFor(explanation, field);
  return {
    field,
    status: statusFor(value.relation, value.usability),
    relation: supportedRelation(value.relation),
    environmentValue: value.currentValue,
    profileReference: value.rangeType === null ? null : {
      rangeType: value.rangeType,
      min: value.min,
      max: value.max,
      unit: value.unit,
    },
    explanation: described?.summary ?? null,
    evidenceRefs: value.evidenceIds,
    sourceLineage: lineage(comparison),
    freshness: comparison.environment.freshness,
  };
}

function seasonalityItem(
  comparison: FishingConditionComparison,
  explanation: FishingConditionExplanationResult,
): ConditionEvidenceItem {
  const value = comparison.comparisons.seasonality;
  const contextExplanations = explanation.explanations.filter((item) => item.field.startsWith("seasonality"));
  const contexts = value.contexts.map((context) => {
    const described = explanationFor(explanation, `seasonality.${context.context.toLowerCase()}`);
    return {
      context: context.context,
      relation: context.relation,
      months: context.months,
      explanation: described?.summary ?? "",
      evidenceRefs: context.evidenceIds,
    };
  });
  return {
    field: "seasonality",
    status: statusFor(
      value.relation,
      comparison.environment.freshness === "stale" && (value.relation === "MATCH" || value.relation === "MISMATCH")
        ? "LIMITED"
        : value.usability,
    ),
    relation: supportedRelation(value.relation),
    environmentValue: value.observedMonth,
    profileReference: null,
    explanation: contextExplanations.map((item) => item.summary).join(" ") || null,
    evidenceRefs: unique(contexts.flatMap((context) => context.evidenceRefs)),
    sourceLineage: lineage(comparison),
    freshness: comparison.environment.freshness,
    contexts,
  };
}

function categoricalItem(
  field: "activity" | "habitat",
  comparison: FishingConditionComparison,
  explanation: FishingConditionExplanationResult,
  contexts: ConditionEvidenceBundleContexts,
): ConditionEvidenceItem {
  const described = explanationFor(explanation, field);
  const missingActivityContext = field === "activity" && contexts.timeOfDay === null;
  const relation = comparison.comparisons[field].relation;
  return {
    field,
    status: missingActivityContext ? "MISSING_ENVIRONMENT_CONTEXT" : statusFor(relation, "UNAVAILABLE"),
    relation: missingActivityContext ? null : supportedRelation(relation),
    environmentValue: field === "activity" ? contexts.timeOfDay : null,
    profileReference: null,
    explanation: described?.summary ?? null,
    evidenceRefs: [],
    sourceLineage: lineage(comparison),
    freshness: comparison.environment.freshness,
  };
}

function summarize(items: ConditionEvidenceItem[]) {
  return {
    supportedCount: items.filter((item) => item.status === "SUPPORTED").length,
    unsupportedCount: items.filter((item) => [
      "UNSUPPORTED_PROFILE",
      "UNSUPPORTED_ENVIRONMENT",
      "MISSING_ENVIRONMENT",
      "MISSING_ENVIRONMENT_CONTEXT",
      "UNKNOWN",
    ].includes(item.status)).length,
    blockedCount: items.filter((item) => BLOCKED_RELATIONS.has(item.status as ComparisonRelation)).length,
    limitedCount: items.filter((item) => item.status === "LIMITED").length,
  };
}

export function buildConditionEvidenceBundle(
  comparison: FishingConditionComparison,
  explanation: FishingConditionExplanationResult,
  contexts: ConditionEvidenceBundleContexts = { month: null, timeOfDay: null },
) {
  const evidence = {
    temperature: numericItem("temperature", comparison.comparisons.temperature, comparison, explanation),
    salinity: numericItem("salinity", comparison.comparisons.salinity, comparison, explanation),
    dissolvedOxygen: numericItem("dissolvedOxygen", comparison.comparisons.dissolvedOxygen, comparison, explanation),
    seasonality: seasonalityItem(comparison, explanation),
    activity: categoricalItem("activity", comparison, explanation, contexts),
    habitat: categoricalItem("habitat", comparison, explanation, contexts),
  };
  return {
    species: {
      speciesId: comparison.species.speciesId,
      koreanName: comparison.species.koreanName,
      scientificName: comparison.species.scientificName,
      profileVersion: CONDITION_EVIDENCE_BUNDLE_PROFILE_VERSION,
    },
    environmentContext: {
      sourceId: comparison.environment.sourceId,
      stationOrSiteId: comparison.environment.stationOrSiteId,
      observedAt: comparison.environment.observedAt,
      freshness: comparison.environment.freshness,
      depthContext: comparison.environment.depthContext,
    },
    requestedContexts: contexts,
    evidence,
    summary: summarize(Object.values(evidence)),
    qualityClass: CONDITION_EVIDENCE_BUNDLE_QUALITY_CLASS,
  };
}

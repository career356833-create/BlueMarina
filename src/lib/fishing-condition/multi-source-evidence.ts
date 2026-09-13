import type { compareFishingCondition } from "./comparator";
import type { buildConditionEvidenceBundle } from "./evidence-bundle";
import type { explainFishingCondition, FishingConditionExplanation } from "./explanation";
import type { AlignedSourceResult, FishingConditionAlignmentContext } from "./source-alignment";
import type { SourcePolicyEvaluation } from "./source-policy";
import type { SuitabilityRuleResult } from "./suitability-rule";

export const MULTI_SOURCE_EVIDENCE_QUALITY_CLASS = "DERIVED_MULTI_SOURCE_EVIDENCE" as const;
export const MULTI_SOURCE_EVIDENCE_PROFILE_VERSION = "v2" as const;

type Comparison = ReturnType<typeof compareFishingCondition>;
type EvidenceBundle = ReturnType<typeof buildConditionEvidenceBundle>;
type ExplanationResult = ReturnType<typeof explainFishingCondition>;

export type MultiSourceEvidenceBranch = {
  sourceId: string;
  provider: string;
  sourceQualityClass: string;
  alignmentStatus: string;
  spatial: { distanceMeters: number | null };
  temporal: { timeSemantic: string; sourceTime: string | null; timeOffsetMinutes: number | null; absoluteTimeOffsetMinutes: number | null; sourceTimezone: string; freshness: string | null };
  depth: { status: string; context: unknown };
  values: AlignedSourceResult["values"];
  comparison: Comparison | null;
  explanations: FishingConditionExplanation[];
  evidenceBundle: EvidenceBundle | null;
  sourcePolicy: SourcePolicyEvaluation[];
  interpretations: SuitabilityRuleResult[];
  branchMode: "COMPARABLE" | "CONTEXT_ONLY" | "UNAVAILABLE";
  limitations: string[];
  lineage: string[];
};

export type MultiSourceEvidenceResult = {
  species: { speciesId: string; koreanName: string; scientificName: string; profileVersion: typeof MULTI_SOURCE_EVIDENCE_PROFILE_VERSION };
  target: FishingConditionAlignmentContext["target"];
  alignment: FishingConditionAlignmentContext["summary"] & { qualityClass: FishingConditionAlignmentContext["qualityClass"] };
  branches: MultiSourceEvidenceBranch[];
  summary: { sourceCount: number; comparableBranches: number; contextOnlyBranches: number; unavailableBranches: number; limitedBranches: number };
  qualityClass: typeof MULTI_SOURCE_EVIDENCE_QUALITY_CLASS;
};

export function buildMultiSourceBranch(
  source: AlignedSourceResult,
  derived: { comparison: Comparison; explanation: ExplanationResult; evidenceBundle: EvidenceBundle } | null,
  extraLimitations: string[] = [],
  sourcePolicy: SourcePolicyEvaluation[] = [],
  interpretations: SuitabilityRuleResult[] = [],
): MultiSourceEvidenceBranch {
  const unavailable = source.status === "UNAVAILABLE";
  const branchMode = unavailable ? "UNAVAILABLE" : derived ? "COMPARABLE" : "CONTEXT_ONLY";
  return {
    sourceId: source.sourceId,
    provider: source.provider,
    sourceQualityClass: source.qualityClass,
    alignmentStatus: source.status,
    spatial: { distanceMeters: source.distanceMeters },
    temporal: {
      timeSemantic: source.timeSemantic,
      sourceTime: source.observedOrValidAt,
      timeOffsetMinutes: source.timeOffsetMinutes,
      absoluteTimeOffsetMinutes: source.absoluteTimeOffsetMinutes,
      sourceTimezone: source.sourceTimezone,
      freshness: source.freshness,
    },
    depth: { status: source.depthMatchStatus, context: source.depthContext },
    values: source.values,
    comparison: derived?.comparison ?? null,
    explanations: derived?.explanation.explanations ?? [],
    evidenceBundle: derived?.evidenceBundle ?? null,
    sourcePolicy,
    interpretations,
    branchMode,
    limitations: [...new Set([...source.limitations, ...extraLimitations])],
    lineage: derived
      ? [source.sourceId, "DERIVED_SOURCE_ALIGNMENT", "DERIVED_COMPARISON", "DERIVED_EXPLANATION", "DERIVED_EVIDENCE_BUNDLE", MULTI_SOURCE_EVIDENCE_QUALITY_CLASS]
      : [source.sourceId, "DERIVED_SOURCE_ALIGNMENT", MULTI_SOURCE_EVIDENCE_QUALITY_CLASS],
  };
}

export function buildMultiSourceEvidenceResult(
  species: MultiSourceEvidenceResult["species"],
  alignment: FishingConditionAlignmentContext,
  branches: MultiSourceEvidenceBranch[],
): MultiSourceEvidenceResult {
  return {
    species,
    target: alignment.target,
    alignment: { ...alignment.summary, qualityClass: alignment.qualityClass },
    branches,
    summary: {
      sourceCount: branches.length,
      comparableBranches: branches.filter((branch) => branch.branchMode === "COMPARABLE").length,
      contextOnlyBranches: branches.filter((branch) => branch.branchMode === "CONTEXT_ONLY").length,
      unavailableBranches: branches.filter((branch) => branch.branchMode === "UNAVAILABLE").length,
      limitedBranches: branches.filter((branch) => branch.branchMode !== "UNAVAILABLE" && (branch.alignmentStatus !== "ALIGNED" || branch.limitations.length > 0)).length,
    },
    qualityClass: MULTI_SOURCE_EVIDENCE_QUALITY_CLASS,
  };
}

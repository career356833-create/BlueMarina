import type { RegulationFactCandidate } from "./regulation-fact-candidate";
import type { SpeciesRegulationMatch } from "./species-regulation-mapper";
import type { RegulationValidationResult } from "./regulation-validation";

export type RegulationReviewItem = {
  candidate: RegulationFactCandidate;
  validation: RegulationValidationResult;
  speciesMatches: SpeciesRegulationMatch[];
  confidence: number;
  priority: number;
  reviewReason: string;
};

export function buildRegulationReviewQueue(input: Array<{
  candidate: RegulationFactCandidate;
  validation: RegulationValidationResult;
  speciesMatches: SpeciesRegulationMatch[];
  confidence: number;
}>): RegulationReviewItem[] {
  return input
    .map((item) => ({
      ...item,
      priority: priority(item.candidate, item.validation, item.confidence),
      reviewReason: reason(item.candidate, item.validation, item.confidence)
    }))
    .sort((left, right) => right.priority - left.priority);
}

function priority(candidate: RegulationFactCandidate, validation: RegulationValidationResult, confidence: number) {
  const legalImpact = candidate.regulationType === "CLOSED_SEASON" || candidate.regulationType === "PROHIBITED_LENGTH" ? 0.25 : 0.1;
  const risk = validation.highRiskCount * 0.25 + validation.mediumRiskCount * 0.1;
  const lowConfidence = 1 - confidence;
  return round(lowConfidence * 0.45 + risk + legalImpact);
}

function reason(candidate: RegulationFactCandidate, validation: RegulationValidationResult, confidence: number) {
  const parts = [
    `confidence=${confidence.toFixed(3)}`,
    `type=${candidate.regulationType}`
  ];
  if (validation.highRiskCount) parts.push(`high risks=${validation.highRiskCount}`);
  if (validation.mediumRiskCount) parts.push(`medium risks=${validation.mediumRiskCount}`);
  return parts.join("; ");
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

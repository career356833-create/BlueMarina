import type { RegulationFactCandidate } from "../../knowledge-ingestion/regulation-fact-candidate";
import type { RegulationDiff, RegulationDiffSeverity } from "./regulation-diff-engine";

export type RegulationImpactReport = {
  affectedSpecies: string[];
  affectedRegions: string[];
  affectedRegulations: string[];
  riskLevel: RegulationDiffSeverity;
};

export function analyzeRegulationImpact(input: {
  previous?: RegulationFactCandidate;
  next?: RegulationFactCandidate;
  diff: RegulationDiff;
}): RegulationImpactReport {
  const candidates = [input.previous, input.next].filter((candidate): candidate is RegulationFactCandidate => Boolean(candidate));
  return {
    affectedSpecies: unique(candidates.map((candidate) => candidate.speciesId).filter(isString)),
    affectedRegions: unique(candidates.map((candidate) => candidate.waterArea).filter(isString)),
    affectedRegulations: unique(candidates.map((candidate) => candidate.regulationType)),
    riskLevel: input.diff.severity
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

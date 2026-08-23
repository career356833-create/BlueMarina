import type { FishingRegulation } from "@/lib/types/content-contract";
import type { RegulationFactCandidate, RegulationType } from "./regulation-fact-candidate";
import type { RegulationSource } from "./regulation-source";
import { normalizeClosedSeason, normalizeMeasurement, normalizeWaterArea } from "./regulation-normalizer";
import { validateRegulationCandidate, type RegulationValidationResult } from "./regulation-validation";

export type RegulationExtractionResult = {
  source: RegulationSource;
  candidates: RegulationFactCandidate[];
  validationResults: RegulationValidationResult[];
};

export function extractRegulationCandidates(source: RegulationSource, content: FishingRegulation | string): RegulationExtractionResult {
  const candidates = typeof content === "string"
    ? extractFromText(source, content)
    : extractFromFishingRegulation(source, content);
  return {
    source,
    candidates,
    validationResults: candidates.map(validateRegulationCandidate)
  };
}

function extractFromFishingRegulation(source: RegulationSource, regulation: FishingRegulation): RegulationFactCandidate[] {
  const candidates: RegulationFactCandidate[] = [];
  const waterArea = normalizeWaterArea(regulation.region);
  const closedSeason = normalizeClosedSeason(regulation.closedSeason);
  const prohibitedLength = normalizeMeasurement(typeof regulation.prohibitedLength === "number" ? `${regulation.prohibitedLength}cm` : regulation.prohibitedLength);
  const base = {
    sourceId: source.sourceId,
    speciesId: regulation.speciesId,
    waterArea,
    fisheryType: undefined,
    exceptionConditions: extractExceptions(`${regulation.summary} ${regulation.body}`),
    sourceLocator: source.sourceLocator,
    reviewStatus: "needs_fact_check" as const
  };

  if (closedSeason) {
    candidates.push({
      ...base,
      candidateId: `${regulation.id}:closed-season`,
      statement: `${regulation.title}의 금어기는 ${closedSeason.raw}이다.`,
      regulationType: "CLOSED_SEASON",
      closedSeason,
      confidence: 0
    });
  }

  if (prohibitedLength) {
    candidates.push({
      ...base,
      candidateId: `${regulation.id}:prohibited-length`,
      statement: `${regulation.title}의 금지체장은 ${prohibitedLength.raw}이다.`,
      regulationType: "PROHIBITED_LENGTH",
      prohibitedLength,
      confidence: 0
    });
  }

  if (!candidates.length) {
    candidates.push({
      ...base,
      candidateId: `${regulation.id}:general`,
      statement: regulation.summary,
      regulationType: inferRegulationType(regulation.summary),
      confidence: 0
    });
  }

  return candidates;
}

function extractFromText(source: RegulationSource, content: string): RegulationFactCandidate[] {
  const parts = content.split(/[\n.;。]+/).map((part) => part.trim()).filter((part) => part.length > 8);
  return parts.flatMap((statement, index) => {
    const closedSeason = normalizeClosedSeason(statement);
    const measurement = normalizeMeasurement(statement);
    if (!closedSeason && !measurement) return [];
    return [{
      candidateId: `${source.sourceId}:candidate-${index + 1}`,
      sourceId: source.sourceId,
      statement,
      regulationType: closedSeason ? "CLOSED_SEASON" : "PROHIBITED_LENGTH",
      waterArea: normalizeWaterArea(statement),
      closedSeason,
      prohibitedLength: measurement?.unit === "cm" ? measurement : undefined,
      prohibitedWeight: measurement && measurement.unit !== "cm" ? measurement : undefined,
      exceptionConditions: extractExceptions(statement),
      sourceLocator: source.sourceLocator,
      confidence: 0,
      reviewStatus: "draft"
    }];
  });
}

function inferRegulationType(text: string): RegulationType {
  if (/금어기|기간|월/.test(text)) return "CLOSED_SEASON";
  if (/체장|cm|센티미터/.test(text)) return "PROHIBITED_LENGTH";
  if (/중량|kg|그램/.test(text)) return "PROHIBITED_WEIGHT";
  if (/지역|해역|수역/.test(text)) return "REGION_SCOPE";
  if (/예외|제외|다만/.test(text)) return "EXCEPTION";
  return "OTHER";
}

function extractExceptions(text: string) {
  return text
    .split(/(?=다만|예외|제외|상이|지역별)/)
    .map((part) => part.trim())
    .filter((part) => /(다만|예외|제외|상이|지역별)/.test(part))
    .slice(0, 4);
}

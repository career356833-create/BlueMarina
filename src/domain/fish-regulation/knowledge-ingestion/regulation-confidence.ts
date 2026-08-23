import type { RegulationSource } from "./regulation-source";
import type { RegulationFactCandidate } from "./regulation-fact-candidate";
import type { SpeciesRegulationMatch } from "./species-regulation-mapper";
import type { RegulationValidationResult } from "./regulation-validation";
import type { RegulationSourceVersion } from "../knowledge/versioning/regulation-source-version";
import type { RegulationSourceLocator } from "../knowledge/versioning/regulation-source-locator";
import { validateRegulationSourceLocator } from "../knowledge/versioning/regulation-source-locator";

export function scoreRegulationConfidence(input: {
  source: RegulationSource;
  candidate: RegulationFactCandidate;
  speciesMatches: SpeciesRegulationMatch[];
  validation: RegulationValidationResult;
  sourceVersion?: RegulationSourceVersion;
  locator?: RegulationSourceLocator;
  asOfDate?: string;
}) {
  const sourceQuality = scoreSource(input.source);
  const locatorCompleteness = scoreLocator(input.candidate.sourceLocator, input.locator);
  const sourceVersionConfidence = scoreSourceVersion(input.sourceVersion);
  const temporalConfidence = scoreTemporal(input.sourceVersion, input.asOfDate);
  const speciesMatch = input.speciesMatches[0]?.matchScore ?? 0;
  const numericConsistency = scoreNumeric(input.candidate);
  const conditionCompleteness = scoreConditions(input.candidate);
  const penalty = Math.min(0.35, input.validation.highRiskCount * 0.15 + input.validation.mediumRiskCount * 0.05);
  return round(Math.max(0, (
    sourceQuality * 0.18 +
    locatorCompleteness * 0.18 +
    sourceVersionConfidence * 0.14 +
    temporalConfidence * 0.1 +
    speciesMatch * 0.2 +
    numericConsistency * 0.12 +
    conditionCompleteness * 0.08
  ) - penalty));
}

function scoreSource(source: RegulationSource) {
  let score = 0;
  if (source.sourceUrl) score += 0.25;
  if (source.issuingAuthority) score += 0.25;
  if (source.collectedAt) score += 0.2;
  if (source.sourceType === "LAW" || source.sourceType === "ENFORCEMENT_DECREE" || source.sourceType === "NOTICE") score += 0.3;
  return Math.min(1, score);
}

function scoreNumeric(candidate: RegulationFactCandidate) {
  if (!candidate.prohibitedLength && !candidate.prohibitedWeight) return 0.65;
  const measurements = [candidate.prohibitedLength, candidate.prohibitedWeight].filter(Boolean);
  const valid = measurements.filter((measurement) => measurement && Number.isFinite(measurement.value) && measurement.unit).length;
  return valid / measurements.length;
}

function scoreLocator(sourceLocator?: string, locator?: RegulationSourceLocator) {
  if (locator) return validateRegulationSourceLocator(locator).completenessScore;
  return sourceLocator ? 0.45 : 0;
}

function scoreSourceVersion(version?: RegulationSourceVersion) {
  if (!version) return 0.25;
  let score = 0;
  if (version.documentVersion) score += 0.25;
  if (version.revisionDate) score += 0.25;
  if (version.sourceHash) score += 0.2;
  if (version.status === "active") score += 0.3;
  if (version.status === "draft") score += 0.1;
  return Math.min(1, score);
}

function scoreTemporal(version?: RegulationSourceVersion, asOfDate?: string) {
  if (!version) return 0.5;
  const target = asOfDate ?? new Date().toISOString().slice(0, 10);
  if (target < version.effectiveFrom) return 0.2;
  if (version.effectiveTo && target > version.effectiveTo) return 0.2;
  return version.status === "active" ? 1 : 0.65;
}

function scoreConditions(candidate: RegulationFactCandidate) {
  let score = 0;
  if (candidate.waterArea) score += 0.3;
  if (candidate.fisheryType) score += 0.25;
  if (candidate.closedSeason || candidate.prohibitedLength || candidate.prohibitedWeight) score += 0.3;
  if (candidate.exceptionConditions.length) score += 0.15;
  return Math.min(1, score);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

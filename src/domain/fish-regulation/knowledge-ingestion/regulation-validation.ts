import type { RegulationFactCandidate } from "./regulation-fact-candidate";

export type RegulationValidationSeverity = "HIGH" | "MEDIUM" | "LOW";

export type RegulationValidationIssue = {
  severity: RegulationValidationSeverity;
  code:
    | "SOURCE_LOCATOR_MISSING"
    | "SPECIES_UNKNOWN"
    | "NUMERIC_CONFLICT"
    | "PERIOD_INVALID"
    | "REGION_MISSING"
    | "FISHERY_TYPE_MISSING"
    | "EXCEPTION_MISSING"
    | "DESCRIPTION_VARIANCE";
  message: string;
};

export type RegulationValidationResult = {
  candidateId: string;
  valid: boolean;
  issues: RegulationValidationIssue[];
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
};

export function validateRegulationCandidate(candidate: RegulationFactCandidate): RegulationValidationResult {
  const issues: RegulationValidationIssue[] = [];
  if (!candidate.sourceLocator) issues.push(issue("HIGH", "SOURCE_LOCATOR_MISSING", "sourceLocator is missing or not locator-grade."));
  if (!candidate.speciesId) issues.push(issue("HIGH", "SPECIES_UNKNOWN", "speciesId is missing."));
  if (candidate.closedSeason && !isValidSeason(candidate.closedSeason.start, candidate.closedSeason.end)) {
    issues.push(issue("HIGH", "PERIOD_INVALID", "closedSeason start/end is invalid."));
  }
  if (hasMeasurementConflict(candidate)) issues.push(issue("HIGH", "NUMERIC_CONFLICT", "numeric measurement conflicts with candidate statement."));
  if (!candidate.waterArea) issues.push(issue("MEDIUM", "REGION_MISSING", "waterArea/region is missing."));
  if (!candidate.fisheryType) issues.push(issue("MEDIUM", "FISHERY_TYPE_MISSING", "fisheryType is missing."));
  if (!candidate.exceptionConditions.length) issues.push(issue("MEDIUM", "EXCEPTION_MISSING", "exception conditions are not represented."));
  if (candidate.statement.length < 20) issues.push(issue("LOW", "DESCRIPTION_VARIANCE", "statement is too short for review context."));

  return {
    candidateId: candidate.candidateId,
    valid: issues.every((item) => item.severity !== "HIGH"),
    issues,
    highRiskCount: issues.filter((item) => item.severity === "HIGH").length,
    mediumRiskCount: issues.filter((item) => item.severity === "MEDIUM").length,
    lowRiskCount: issues.filter((item) => item.severity === "LOW").length
  };
}

function issue(severity: RegulationValidationSeverity, code: RegulationValidationIssue["code"], message: string): RegulationValidationIssue {
  return { severity, code, message };
}

function isValidSeason(start: string, end: string) {
  return /^\d{2}-\d{2}$/.test(start) && /^\d{2}-\d{2}$/.test(end);
}

function hasMeasurementConflict(candidate: RegulationFactCandidate) {
  const measurements = [candidate.prohibitedLength, candidate.prohibitedWeight].filter(Boolean);
  return measurements.some((measurement) => measurement && !candidate.statement.includes(String(measurement.value)));
}

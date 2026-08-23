export type RegulationFactReviewStatus =
  | "draft"
  | "needs_fact_check"
  | "verified"
  | "rejected";

export type RegulationType =
  | "CLOSED_SEASON"
  | "PROHIBITED_LENGTH"
  | "PROHIBITED_WEIGHT"
  | "REGION_SCOPE"
  | "EXCEPTION"
  | "OTHER";

export type NormalizedClosedSeason = {
  type: "closed_season";
  start: string;
  end: string;
  raw: string;
};

export type NormalizedMeasurement = {
  operator: "LESS_EQUAL" | "LESS_THAN" | "GREATER_EQUAL" | "GREATER_THAN" | "EQUAL";
  value: number;
  unit: string;
  raw: string;
};

export type RegulationFactCandidate = {
  candidateId: string;
  sourceId: string;
  speciesId?: string;
  statement: string;
  regulationType: RegulationType;
  waterArea?: string;
  fisheryType?: string;
  closedSeason?: NormalizedClosedSeason;
  prohibitedLength?: NormalizedMeasurement;
  prohibitedWeight?: NormalizedMeasurement;
  exceptionConditions: string[];
  sourceLocator?: string;
  confidence: number;
  reviewStatus: RegulationFactReviewStatus;
};

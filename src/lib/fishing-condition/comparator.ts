import type { SpeciesEnvironmentProfile } from "./species-environment";

export const FISHING_CONDITION_COMPARISON_QUALITY_CLASS = "DERIVED_COMPARISON" as const;
export const FISHING_CONDITION_COMPARISON_SOURCES = ["nifs-risa", "nifs-femo-sea"] as const;

export type FishingConditionComparisonSource = (typeof FISHING_CONDITION_COMPARISON_SOURCES)[number];
export type ComparisonRelation =
  | "WITHIN_RANGE"
  | "BELOW_RANGE"
  | "ABOVE_RANGE"
  | "MATCH"
  | "MISMATCH"
  | "UNSUPPORTED_PROFILE"
  | "UNSUPPORTED_ENVIRONMENT"
  | "MISSING_ENVIRONMENT"
  | "UNIT_MISMATCH"
  | "UNIT_UNVERIFIED"
  | "DEPTH_CONTEXT_UNRESOLVED"
  | "CONFLICT_REVIEW_REQUIRED"
  | "UNKNOWN";

export type ComparisonUsability = "USABLE" | "LIMITED" | "UNAVAILABLE";
export type ComparatorDepthContext = "SURFACE" | "MIDDLE" | "BOTTOM";

export type ComparatorEnvironment = {
  sourceId: FishingConditionComparisonSource;
  provider: "NIFS";
  qualityClass: "OBSERVED" | "OBSERVED_PERIODIC_ENVIRONMENT";
  stationOrSiteId: string;
  observedAt: string | null;
  freshness: "fresh" | "stale" | "unavailable";
  depthContext: ComparatorDepthContext;
  exactDepthM: number | null;
  stationWaterDepthM: number | null;
  temperature: { value: number | null; unit: string | null };
  salinity: { value: number | null; unit: string | null };
  dissolvedOxygen: { value: number | null; unit: string | null };
  chlorophyllA: { value: number | null; unit: string | null };
};

type NumericComparison = {
  relation: ComparisonRelation;
  usability: ComparisonUsability;
  currentValue: number | null;
  rangeType: "PREFERRED" | "OBSERVED" | "CANONICAL" | null;
  min: number | null;
  max: number | null;
  unit: string | null;
  evidenceIds: string[];
  rangeContext: string | null;
  lifeStage: string | null;
  regionScope: string | null;
};

function relationForRange(value: number, min: number, max: number): ComparisonRelation {
  if (value < min) return "BELOW_RANGE";
  if (value > max) return "ABOVE_RANGE";
  return "WITHIN_RANGE";
}

function unavailableNumeric(relation: ComparisonRelation, currentValue: number | null, unit: string | null): NumericComparison {
  return {
    relation,
    usability: "UNAVAILABLE",
    currentValue,
    rangeType: null,
    min: null,
    max: null,
    unit,
    evidenceIds: [],
    rangeContext: null,
    lifeStage: null,
    regionScope: null,
  };
}

function fieldHasConflict(profile: SpeciesEnvironmentProfile, field: string) {
  return profile.conflicts.some((conflict) => conflict.field === field || conflict.field.startsWith(`${field}.`));
}

function fieldConflictEvidence(profile: SpeciesEnvironmentProfile, field: string) {
  return [...new Set(profile.conflicts
    .filter((conflict) => conflict.field === field || conflict.field.startsWith(`${field}.`))
    .flatMap((conflict) => conflict.evidenceIds))];
}

function usabilityForFreshness(freshness: ComparatorEnvironment["freshness"]): ComparisonUsability {
  if (freshness === "fresh") return "USABLE";
  if (freshness === "stale") return "LIMITED";
  return "UNAVAILABLE";
}

function completeTemperatureRange(profile: SpeciesEnvironmentProfile) {
  const preferredMin = profile.temperature.canonicalPreferredMinC;
  const preferredMax = profile.temperature.canonicalPreferredMaxC;
  if (preferredMin !== null && preferredMax !== null) {
    const sources = profile.temperature.preferred.filter((range) => range.minC === preferredMin && range.maxC === preferredMax);
    const source = sources[0] ?? null;
    return {
      rangeType: "PREFERRED" as const,
      min: preferredMin,
      max: preferredMax,
      evidenceIds: [...new Set(sources.flatMap((range) => range.evidenceIds))],
      rangeContext: source?.context ?? null,
      lifeStage: source?.lifeStage ?? null,
      regionScope: source?.regionScope ?? null,
    };
  }

  const observed = profile.temperature.observed.find((range) => range.minC !== null && range.minC !== undefined && range.maxC !== null && range.maxC !== undefined);
  if (!observed || observed.minC === null || observed.minC === undefined || observed.maxC === null || observed.maxC === undefined) return null;
  return {
    rangeType: "OBSERVED" as const,
    min: observed.minC,
    max: observed.maxC,
    evidenceIds: observed.evidenceIds,
    rangeContext: observed.context,
    lifeStage: observed.lifeStage,
    regionScope: observed.regionScope,
  };
}

function compareTemperature(profile: SpeciesEnvironmentProfile, environment: ComparatorEnvironment): NumericComparison {
  const current = environment.temperature.value;
  const unit = environment.temperature.unit;
  if (environment.freshness === "unavailable" || current === null) return unavailableNumeric("MISSING_ENVIRONMENT", current, unit);
  if (unit === null) return unavailableNumeric("UNIT_UNVERIFIED", current, unit);
  if (unit !== "degC") return unavailableNumeric("UNIT_MISMATCH", current, unit);
  if (fieldHasConflict(profile, "temperature")) {
    return { ...unavailableNumeric("CONFLICT_REVIEW_REQUIRED", current, unit), evidenceIds: fieldConflictEvidence(profile, "temperature") };
  }
  const range = completeTemperatureRange(profile);
  if (!range) return unavailableNumeric("UNSUPPORTED_PROFILE", current, unit);
  return {
    relation: relationForRange(current, range.min, range.max),
    usability: usabilityForFreshness(environment.freshness),
    currentValue: current,
    rangeType: range.rangeType,
    min: range.min,
    max: range.max,
    unit,
    evidenceIds: range.evidenceIds,
    rangeContext: range.rangeContext,
    lifeStage: range.lifeStage,
    regionScope: range.regionScope,
  };
}

function compareSalinity(profile: SpeciesEnvironmentProfile, environment: ComparatorEnvironment): NumericComparison {
  const current = environment.salinity.value;
  const unit = environment.salinity.unit;
  if (environment.freshness === "unavailable" || current === null) return unavailableNumeric("MISSING_ENVIRONMENT", current, unit);
  if (unit === null || unit === "UNIT_NOT_DOCUMENTED") return unavailableNumeric("UNIT_UNVERIFIED", current, unit);
  if (fieldHasConflict(profile, "salinity")) {
    return { ...unavailableNumeric("CONFLICT_REVIEW_REQUIRED", current, unit), evidenceIds: fieldConflictEvidence(profile, "salinity") };
  }
  const min = profile.salinity.canonicalMin;
  const max = profile.salinity.canonicalMax;
  const profileUnit = profile.salinity.unit;
  if (min === null || max === null || profileUnit === null) return unavailableNumeric("UNSUPPORTED_PROFILE", current, unit);
  if (unit !== profileUnit) return unavailableNumeric("UNIT_MISMATCH", current, unit);
  const sources = profile.salinity.ranges.filter((range) => range.min === min && range.max === max && range.unit === profileUnit);
  const source = sources[0] ?? null;
  return {
    relation: relationForRange(current, min, max),
    usability: usabilityForFreshness(environment.freshness),
    currentValue: current,
    rangeType: "CANONICAL",
    min,
    max,
    unit,
    evidenceIds: [...new Set(sources.flatMap((range) => range.evidenceIds))],
    rangeContext: source?.context ?? null,
    lifeStage: null,
    regionScope: source?.regionScope ?? null,
  };
}

function compareDissolvedOxygen(profile: SpeciesEnvironmentProfile, environment: ComparatorEnvironment): NumericComparison {
  const current = environment.dissolvedOxygen.value;
  const unit = environment.dissolvedOxygen.unit;
  if (environment.freshness === "unavailable" || current === null) return unavailableNumeric("MISSING_ENVIRONMENT", current, unit);
  if (unit === null) return unavailableNumeric("UNIT_UNVERIFIED", current, unit);
  if (fieldHasConflict(profile, "dissolvedOxygen")) {
    return { ...unavailableNumeric("CONFLICT_REVIEW_REQUIRED", current, unit), evidenceIds: fieldConflictEvidence(profile, "dissolvedOxygen") };
  }
  const minimum = profile.dissolvedOxygen.minimumMgL;
  if (minimum === null) return unavailableNumeric("UNSUPPORTED_PROFILE", current, unit);
  if (unit !== "mg/L") return unavailableNumeric("UNIT_MISMATCH", current, unit);
  const sources = profile.dissolvedOxygen.observations.filter((observation) => observation.minMgL === minimum);
  const source = sources[0] ?? null;
  return {
    relation: current < minimum ? "BELOW_RANGE" : "WITHIN_RANGE",
    usability: usabilityForFreshness(environment.freshness),
    currentValue: current,
    rangeType: "CANONICAL",
    min: minimum,
    max: null,
    unit,
    evidenceIds: [...new Set(sources.flatMap((observation) => observation.evidenceIds))],
    rangeContext: source?.context ?? null,
    lifeStage: null,
    regionScope: source?.regionScope ?? null,
  };
}

function compareDepth(profile: SpeciesEnvironmentProfile, environment: ComparatorEnvironment): NumericComparison {
  const current = environment.exactDepthM;
  if (fieldHasConflict(profile, "depth")) {
    return { ...unavailableNumeric("CONFLICT_REVIEW_REQUIRED", current, "m"), evidenceIds: fieldConflictEvidence(profile, "depth") };
  }
  if (current === null) return unavailableNumeric("DEPTH_CONTEXT_UNRESOLVED", current, "m");
  const min = profile.depth.canonicalObservedMinM;
  const max = profile.depth.canonicalObservedMaxM;
  if (min === null || max === null) return unavailableNumeric("UNSUPPORTED_PROFILE", current, "m");
  const sources = profile.depth.observed.filter((range) => range.minM === min && range.maxM === max);
  const source = sources[0] ?? null;
  return {
    relation: relationForRange(current, min, max),
    usability: usabilityForFreshness(environment.freshness),
    currentValue: current,
    rangeType: "CANONICAL",
    min,
    max,
    unit: "m",
    evidenceIds: [...new Set(sources.flatMap((range) => range.evidenceIds))],
    rangeContext: source?.context ?? null,
    lifeStage: source?.lifeStage ?? null,
    regionScope: source?.regionScope ?? null,
  };
}

type SeasonalityContext = {
  context: "SPAWNING" | "MIGRATION" | "FISHERY_OCCURRENCE";
  relation: "MATCH" | "MISMATCH";
  months: number[];
  evidenceIds: string[];
};

function compareSeasonality(profile: SpeciesEnvironmentProfile, observedAt: string | null) {
  const monthMatch = observedAt ? /^(?:\d{4})-(\d{2})-/.exec(observedAt) : null;
  const observedMonth = monthMatch ? Number(monthMatch[1]) : null;
  if (observedMonth === null || observedMonth < 1 || observedMonth > 12) {
    return { relation: "MISSING_ENVIRONMENT" as ComparisonRelation, usability: "UNAVAILABLE" as ComparisonUsability, observedMonth: null, contexts: [] as SeasonalityContext[] };
  }
  const facts = [
    ...profile.spawning.filter((fact) => fact.months.length > 0).map((fact) => ({ context: "SPAWNING" as const, months: fact.months, evidenceIds: fact.evidenceIds })),
    ...profile.migration.filter((fact) => fact.months.length > 0).map((fact) => ({ context: "MIGRATION" as const, months: fact.months, evidenceIds: fact.evidenceIds })),
    ...profile.seasonality.filter((fact) => fact.months.length > 0).map((fact) => ({ context: "FISHERY_OCCURRENCE" as const, months: fact.months, evidenceIds: fact.evidenceIds })),
  ];
  if (facts.length === 0) return { relation: "UNSUPPORTED_PROFILE" as ComparisonRelation, usability: "UNAVAILABLE" as ComparisonUsability, observedMonth, contexts: [] as SeasonalityContext[] };
  const contexts = facts.map((fact) => ({ ...fact, relation: fact.months.includes(observedMonth) ? "MATCH" as const : "MISMATCH" as const }));
  return {
    relation: contexts.some((context) => context.relation === "MATCH") ? "MATCH" as ComparisonRelation : "MISMATCH" as ComparisonRelation,
    usability: "USABLE" as ComparisonUsability,
    observedMonth,
    contexts,
  };
}

export function compareFishingCondition(profile: SpeciesEnvironmentProfile, environment: ComparatorEnvironment) {
  const temperature = compareTemperature(profile, environment);
  const salinity = compareSalinity(profile, environment);
  const dissolvedOxygen = compareDissolvedOxygen(profile, environment);
  const freshnessWarning = environment.freshness === "stale";
  return {
    species: {
      speciesId: profile.speciesId,
      koreanName: profile.koreanName,
      scientificName: profile.scientificName,
      profileStatus: profile.profileStatus,
    },
    environment: {
      sourceId: environment.sourceId,
      qualityClass: environment.qualityClass,
      stationOrSiteId: environment.stationOrSiteId,
      observedAt: environment.observedAt,
      freshness: environment.freshness,
      freshnessWarning,
      depthContext: environment.depthContext,
      exactDepthM: environment.exactDepthM,
      stationWaterDepthM: environment.stationWaterDepthM,
    },
    comparisons: {
      temperature,
      salinity,
      dissolvedOxygen,
      depth: compareDepth(profile, environment),
      chlorophyllA: {
        relation: "UNSUPPORTED_PROFILE" as ComparisonRelation,
        usability: "UNAVAILABLE" as ComparisonUsability,
        currentValue: environment.chlorophyllA.value,
        unit: environment.chlorophyllA.unit,
      },
      habitat: { relation: "UNSUPPORTED_ENVIRONMENT" as ComparisonRelation, usability: "UNAVAILABLE" as ComparisonUsability },
      seasonality: compareSeasonality(profile, environment.observedAt),
      activity: { relation: "UNSUPPORTED_ENVIRONMENT" as ComparisonRelation, usability: "UNAVAILABLE" as ComparisonUsability, profileActivityPeriod: profile.activityPeriod },
    },
    sourceLineage: {
      speciesProfileSource: "blue-marina-species-environment-v2" as const,
      environmentSource: environment.sourceId,
      quality: {
        species: "PROFILE" as const,
        environment: environment.qualityClass,
        comparison: FISHING_CONDITION_COMPARISON_QUALITY_CLASS,
      },
    },
    interpretation: null,
    qualityClass: FISHING_CONDITION_COMPARISON_QUALITY_CLASS,
  };
}

export const FISHING_CONDITION_COMPARISON_FEATURE_REGISTRY = [
  "comparison.temperature.relation",
  "comparison.salinity.relation",
  "comparison.do.relation",
  "comparison.seasonality.relation",
].map((feature) => ({
  feature,
  qualityClass: FISHING_CONDITION_COMPARISON_QUALITY_CLASS,
  sources: FISHING_CONDITION_COMPARISON_SOURCES,
  scoring: false as const,
}));

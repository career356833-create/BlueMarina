import artifactJson from "../../../data/fishing-condition/species-environment/v1/species-environment-profiles.json";

export const SPECIES_ENVIRONMENT_SOURCE_ID = "blue-marina-species-environment-v1" as const;
export const SPECIES_ENVIRONMENT_ACTIVITY_PERIODS = ["DIURNAL", "NOCTURNAL", "CREPUSCULAR", "MIXED", "UNKNOWN"] as const;
export const SPECIES_ENVIRONMENT_CONFIDENCE = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;
export const SPECIES_ENVIRONMENT_PROFILE_STATUSES = ["COMPLETE", "PARTIAL", "CONFLICT_REVIEW_REQUIRED"] as const;

export type SpeciesEnvironmentActivityPeriod = (typeof SPECIES_ENVIRONMENT_ACTIVITY_PERIODS)[number];
export type SpeciesEnvironmentConfidence = (typeof SPECIES_ENVIRONMENT_CONFIDENCE)[number];
export type SpeciesEnvironmentProfileStatus = (typeof SPECIES_ENVIRONMENT_PROFILE_STATUSES)[number];

export type EvidenceRange = {
  minC?: number | null;
  maxC?: number | null;
  minM?: number | null;
  maxM?: number | null;
  context: string;
  lifeStage: string;
  regionScope: string;
  evidenceIds: string[];
};

export type SpeciesEnvironmentEvidence = {
  id: string;
  sourceType: "NIFS" | "MBRIS" | "FAO" | "FISHBASE" | "PAPER" | "OTHER_OFFICIAL";
  title: string;
  url: string | null;
  publicationYear: number | null;
  regionScope: string | null;
  evidenceType: string;
  quoteOrSummary: string;
};

export type SpeciesEnvironmentProfile = {
  speciesId: string;
  speciesIdKind: "MBRIS_INTERNAL_CANONICAL_ID";
  canonicalDatabaseId: string | null;
  slug: string;
  koreanName: string;
  scientificName: string;
  aliases: string[];
  canonicalProvenance: { provider: string; sourceId: string; registryPath: string };
  profileStatus: SpeciesEnvironmentProfileStatus;
  temperature: {
    observed: EvidenceRange[];
    preferred: EvidenceRange[];
    spawning: EvidenceRange[];
    canonicalPreferredMinC: number | null;
    canonicalPreferredMaxC: number | null;
  };
  depth: {
    observed: EvidenceRange[];
    typicalFishing: EvidenceRange[];
    spawning: EvidenceRange[];
    juvenile: EvidenceRange[];
    adult: EvidenceRange[];
    canonicalObservedMinM: number | null;
    canonicalObservedMaxM: number | null;
  };
  salinity: {
    ranges: Array<{ min: number | null; max: number | null; unit: string; context: string; regionScope: string; evidenceIds: string[] }>;
    qualitative: string[];
    canonicalMin: number | null;
    canonicalMax: number | null;
    unit: string | null;
  };
  dissolvedOxygen: {
    observations: Array<{ minMgL: number | null; maxMgL: number | null; context: string; regionScope: string; evidenceIds: string[] }>;
    minimumMgL: number | null;
    sensitivity: string | null;
  };
  habitats: string[];
  substrates: string[];
  spawning: Array<{ months: number[]; seasons: string[]; temperatureMinC: number | null; temperatureMaxC: number | null; depthMinM: number | null; depthMaxM: number | null; regionScope: string; evidenceIds: string[] }>;
  migration: Array<{ movement: string; months: number[]; seasons: string[]; lifeStage: string; regionScope: string; summary: string; evidenceIds: string[] }>;
  seasonality: Array<{ context: string; months: number[]; seasons: string[]; regionScope: string; evidenceIds: string[] }>;
  activityPeriod: SpeciesEnvironmentActivityPeriod;
  feeding: { preyCategories: string[]; pattern: string | null; evidenceIds: string[] };
  conflicts: Array<{ field: string; status: "CONFLICT_REVIEW_REQUIRED"; evidenceIds: string[]; summary: string }>;
  unsupportedFields: string[];
  confidence: SpeciesEnvironmentConfidence;
  evidence: SpeciesEnvironmentEvidence[];
};

export type SpeciesEnvironmentArtifact = {
  schemaVersion: "1.0.0";
  sourceId: typeof SPECIES_ENVIRONMENT_SOURCE_ID;
  generatedAt: string;
  identitySource: "MBRIS_INTERNAL_ID_REGISTRY";
  profileCount: number;
  noScoreBoundary: true;
  profiles: SpeciesEnvironmentProfile[];
};

function validateRange(min: number | null | undefined, max: number | null | undefined, path: string, issues: string[]) {
  if (min !== null && min !== undefined && (!Number.isFinite(min) || min < 0)) issues.push(`${path}.min invalid`);
  if (max !== null && max !== undefined && (!Number.isFinite(max) || max < 0)) issues.push(`${path}.max invalid`);
  if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) issues.push(`${path} inverted`);
}

function validateMonths(months: number[], path: string, issues: string[]) {
  if (months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) issues.push(`${path} invalid month`);
}

export function validateSpeciesEnvironmentArtifact(input: SpeciesEnvironmentArtifact) {
  const issues: string[] = [];
  if (input.sourceId !== SPECIES_ENVIRONMENT_SOURCE_ID) issues.push("sourceId invalid");
  if (input.profileCount !== input.profiles.length) issues.push("profileCount mismatch");
  if (input.noScoreBoundary !== true) issues.push("noScoreBoundary must be true");
  const speciesIds = new Set<string>();
  const slugs = new Set<string>();
  for (const profile of input.profiles) {
    if (speciesIds.has(profile.speciesId)) issues.push(`${profile.speciesId} duplicate speciesId`);
    if (slugs.has(profile.slug)) issues.push(`${profile.slug} duplicate slug`);
    speciesIds.add(profile.speciesId);
    slugs.add(profile.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.slug)) issues.push(`${profile.speciesId} invalid slug`);
    if (!SPECIES_ENVIRONMENT_ACTIVITY_PERIODS.includes(profile.activityPeriod)) issues.push(`${profile.speciesId} invalid activityPeriod`);
    if (!SPECIES_ENVIRONMENT_CONFIDENCE.includes(profile.confidence)) issues.push(`${profile.speciesId} invalid confidence`);
    if (!SPECIES_ENVIRONMENT_PROFILE_STATUSES.includes(profile.profileStatus)) issues.push(`${profile.speciesId} invalid profileStatus`);
    if (profile.evidence.length === 0) issues.push(`${profile.speciesId} evidence required`);
    const evidenceIds = new Set(profile.evidence.map((item) => item.id));
    if (evidenceIds.size !== profile.evidence.length) issues.push(`${profile.speciesId} duplicate evidence id`);
    const references: string[] = [];
    for (const key of ["observed", "preferred", "spawning"] as const) {
      for (const [index, range] of profile.temperature[key].entries()) {
        validateRange(range.minC, range.maxC, `${profile.speciesId}.temperature.${key}.${index}`, issues);
        references.push(...range.evidenceIds);
      }
    }
    validateRange(profile.temperature.canonicalPreferredMinC, profile.temperature.canonicalPreferredMaxC, `${profile.speciesId}.temperature.canonical`, issues);
    for (const key of ["observed", "typicalFishing", "spawning", "juvenile", "adult"] as const) {
      for (const [index, range] of profile.depth[key].entries()) {
        validateRange(range.minM, range.maxM, `${profile.speciesId}.depth.${key}.${index}`, issues);
        references.push(...range.evidenceIds);
      }
    }
    validateRange(profile.depth.canonicalObservedMinM, profile.depth.canonicalObservedMaxM, `${profile.speciesId}.depth.canonical`, issues);
    for (const [index, fact] of profile.salinity.ranges.entries()) {
      validateRange(fact.min, fact.max, `${profile.speciesId}.salinity.${index}`, issues);
      references.push(...fact.evidenceIds);
    }
    for (const [index, fact] of profile.dissolvedOxygen.observations.entries()) {
      validateRange(fact.minMgL, fact.maxMgL, `${profile.speciesId}.dissolvedOxygen.${index}`, issues);
      references.push(...fact.evidenceIds);
    }
    for (const [index, fact] of profile.spawning.entries()) {
      validateMonths(fact.months, `${profile.speciesId}.spawning.${index}`, issues);
      validateRange(fact.temperatureMinC, fact.temperatureMaxC, `${profile.speciesId}.spawning.temperature.${index}`, issues);
      validateRange(fact.depthMinM, fact.depthMaxM, `${profile.speciesId}.spawning.depth.${index}`, issues);
      references.push(...fact.evidenceIds);
    }
    for (const [index, fact] of [...profile.migration, ...profile.seasonality].entries()) {
      validateMonths(fact.months, `${profile.speciesId}.season.${index}`, issues);
      references.push(...fact.evidenceIds);
    }
    references.push(...profile.feeding.evidenceIds, ...profile.conflicts.flatMap((item) => item.evidenceIds));
    for (const id of references) if (!evidenceIds.has(id)) issues.push(`${profile.speciesId} missing evidence ${id}`);
    if (profile.conflicts.length > 0 && profile.profileStatus !== "CONFLICT_REVIEW_REQUIRED") issues.push(`${profile.speciesId} conflict status mismatch`);
  }
  return issues;
}

export const SPECIES_ENVIRONMENT_ARTIFACT = artifactJson as unknown as SpeciesEnvironmentArtifact;
const artifactIssues = validateSpeciesEnvironmentArtifact(SPECIES_ENVIRONMENT_ARTIFACT);
if (artifactIssues.length > 0) throw new Error(`INVALID_SPECIES_ENVIRONMENT_ARTIFACT: ${artifactIssues.join("; ")}`);

export function findSpeciesEnvironmentProfile(query: { speciesId?: string; slug?: string }) {
  if ((query.speciesId ? 1 : 0) + (query.slug ? 1 : 0) !== 1) return null;
  return SPECIES_ENVIRONMENT_ARTIFACT.profiles.find((profile) => query.speciesId ? profile.speciesId === query.speciesId : profile.slug === query.slug) ?? null;
}

export const FISHING_CONDITION_SPECIES_ENVIRONMENT_FEATURE_REGISTRY = [
  "speciesEnvironment.temperature",
  "speciesEnvironment.depth",
  "speciesEnvironment.habitat",
  "speciesEnvironment.seasonality",
].map((feature) => ({ feature, sourceId: SPECIES_ENVIRONMENT_SOURCE_ID, status: "PROFILE_ONLY_NO_COMPARISON" as const }));

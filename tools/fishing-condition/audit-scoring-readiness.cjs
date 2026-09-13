const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ROOT = path.resolve(__dirname, "../..");
const PROFILE_PATH = "data/fishing-condition/species-environment/v2/species-environment-profiles.json";
const POLICY_PATH = "data/fishing-condition/source-policy/v1/source-policy.json";
const RULE_PATH = "data/fishing-condition/suitability-rule/v1/suitability-rules.json";
const DEFAULT_OUTPUT = "reports/fishing-condition/scoring-readiness-audit-v1.json";

const READINESS = {
  CANDIDATE: "SCORING_CANDIDATE",
  LIMITED: "LIMITED_CANDIDATE",
  NOT_READY: "NOT_READY",
  BLOCKED: "BLOCKED",
  CONTEXT: "CONTEXT_ONLY",
  BASELINE: "BASELINE_ONLY",
  INSUFFICIENT: "INSUFFICIENT_EVIDENCE",
};

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function sha256(root, relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

function hasCompleteRange(range, minKey, maxKey) {
  return Number.isFinite(range?.[minKey]) && Number.isFinite(range?.[maxKey]);
}

function monthComparable(profile) {
  return [...profile.spawning, ...profile.migration, ...profile.seasonality]
    .some((item) => Array.isArray(item.months) && item.months.length > 0);
}

function temperatureReadiness(profile) {
  const completePreferred = profile.temperature.preferred.filter((item) => hasCompleteRange(item, "minC", "maxC"));
  const completeObserved = profile.temperature.observed.filter((item) => hasCompleteRange(item, "minC", "maxC"));
  const contexts = [...completePreferred, ...completeObserved].map((item) => item.context);
  const evidenceRefs = [...new Set([...completePreferred, ...completeObserved].flatMap((item) => item.evidenceIds))];
  const conflict = profile.conflicts.some((item) => item.field === "temperature" || item.field.startsWith("temperature."));
  const hasComparatorRange = Number.isFinite(profile.temperature.canonicalPreferredMinC)
    && Number.isFinite(profile.temperature.canonicalPreferredMaxC) || completeObserved.length > 0;

  if (!hasComparatorRange || evidenceRefs.length === 0) {
    return { status: READINESS.INSUFFICIENT, comparatorAvailable: false, evidenceRefs, limitations: ["COMPLETE_NUMERIC_RANGE_MISSING"] };
  }
  if (conflict) return { status: READINESS.BLOCKED, comparatorAvailable: true, evidenceRefs, limitations: ["FIELD_CONFLICT"] };

  const hasKoreanPreferred = completePreferred.some((item) => item.context === "PREFERRED_TEMPERATURE" && item.regionScope === "KOREA");
  if (hasKoreanPreferred) return { status: READINESS.CANDIDATE, comparatorAvailable: true, evidenceRefs, limitations: [] };

  const hasWildObserved = completeObserved.some((item) => /WILD_.*OBSERVED|OCCURRENCE/.test(item.context));
  if (hasWildObserved) {
    return { status: READINESS.LIMITED, comparatorAvailable: true, evidenceRefs, limitations: ["LIFE_STAGE_OR_REGION_SCOPE_LIMITED", "OBSERVED_RANGE_NOT_PREFERRED_RANGE"] };
  }

  const isModelled = contexts.some((item) => item.includes("MODELLED_PREFERRED_TEMPERATURE"));
  if (isModelled) return { status: READINESS.LIMITED, comparatorAvailable: true, evidenceRefs, limitations: ["AQUAMAPS_MODELLED_RANGE", "GLOBAL_RANGE_NOT_KOREAN_FIELD_OBSERVATION"] };

  const captiveOnly = contexts.every((item) => /AQUACULTURE|CAPTIVE|HUSBANDRY/.test(item));
  if (captiveOnly) return { status: READINESS.NOT_READY, comparatorAvailable: true, evidenceRefs, limitations: ["CAPTIVE_OR_AQUACULTURE_NOT_WILD_PREFERENCE"] };

  return { status: READINESS.LIMITED, comparatorAvailable: true, evidenceRefs, limitations: ["RANGE_CONTEXT_NOT_EQUIVALENT_TO_WILD_PREFERENCE"] };
}

function dissolvedOxygenReadiness(profile) {
  const observations = profile.dissolvedOxygen.observations ?? [];
  const evidenceRefs = [...new Set(observations.flatMap((item) => item.evidenceIds))];
  if (!Number.isFinite(profile.dissolvedOxygen.minimumMgL) || evidenceRefs.length === 0) {
    return { status: READINESS.INSUFFICIENT, comparatorAvailable: false, evidenceRefs, limitations: ["MG_L_SPECIES_THRESHOLD_MISSING"] };
  }
  const contexts = observations.map((item) => item.context);
  if (contexts.some((item) => /AQUACULTURE|CAPTIVE|HUSBANDRY/.test(item))) {
    return { status: READINESS.LIMITED, comparatorAvailable: true, evidenceRefs, limitations: ["AQUACULTURE_THRESHOLD_NOT_WILD_MINIMUM", "PERIODIC_SOURCE"] };
  }
  return { status: READINESS.LIMITED, comparatorAvailable: true, evidenceRefs, limitations: ["PERIODIC_SOURCE"] };
}

function speciesRow(profile) {
  const temperature = temperatureReadiness(profile);
  const dissolvedOxygen = dissolvedOxygenReadiness(profile);
  const seasonalityCovered = monthComparable(profile);
  const activityCovered = profile.activityPeriod !== "UNKNOWN";
  const statuses = [temperature.status, READINESS.BLOCKED, dissolvedOxygen.status,
    seasonalityCovered ? READINESS.NOT_READY : READINESS.INSUFFICIENT,
    activityCovered ? READINESS.NOT_READY : READINESS.INSUFFICIENT];
  const candidateFieldCount = statuses.filter((item) => item === READINESS.CANDIDATE).length;
  const limitedFieldCount = statuses.filter((item) => item === READINESS.LIMITED).length;
  const blockedFieldCount = statuses.filter((item) => item === READINESS.BLOCKED).length
    + (dissolvedOxygen.status === READINESS.INSUFFICIENT ? 1 : 0);
  return {
    speciesId: profile.speciesId,
    name: profile.koreanName,
    scientificName: profile.scientificName,
    profileStatus: profile.profileStatus,
    evidenceConfidence: profile.confidence,
    temperatureReadiness: temperature.status,
    temperatureEvidenceRefs: temperature.evidenceRefs,
    temperatureLimitations: temperature.limitations,
    salinityReadiness: READINESS.BLOCKED,
    salinityLimitations: ["FEMO_UNIT_UNVERIFIED", "RUNTIME_COMPARISON_PROHIBITED"],
    dissolvedOxygenReadiness: dissolvedOxygen.status,
    dissolvedOxygenEvidenceRefs: dissolvedOxygen.evidenceRefs,
    dissolvedOxygenLimitations: dissolvedOxygen.limitations,
    seasonalityReadiness: seasonalityCovered ? READINESS.NOT_READY : READINESS.INSUFFICIENT,
    seasonalityContextCoverage: seasonalityCovered,
    activityReadiness: activityCovered ? READINESS.NOT_READY : READINESS.INSUFFICIENT,
    activityProfileCoverage: activityCovered,
    candidateFieldCount,
    limitedFieldCount,
    blockedFieldCount,
    overallAuditStatus: candidateFieldCount > 0 ? "READY_FOR_SINGLE_FIELD_EXPERIMENT" : limitedFieldCount > 0 ? "PARTIAL" : "NOT_READY",
    unresolvedConflicts: profile.conflicts.map((item) => ({ field: item.field, status: item.status, evidenceIds: item.evidenceIds })),
  };
}

function variableMatrix(species) {
  const count = (field, status) => species.filter((item) => item[field] === status).length;
  return [
    { variable: "temperature", profileCoverage: 9, source: "nifs-risa|nifs-femo-sea", policy: "COMPARISON_ALLOWED|COMPARISON_ALLOWED_WITH_LIMITS", gateStatus: "CONDITIONALLY_PASSABLE", unitReadiness: "CONFIRMED", depthReadiness: "EXPLICIT_BINDING_REQUIRED", freshnessReadiness: "RUNTIME_DEPENDENT", comparatorAvailability: 9, interpretationAvailability: 9, readiness: READINESS.LIMITED, strictCandidates: count("temperatureReadiness", READINESS.CANDIDATE), limitedCandidates: count("temperatureReadiness", READINESS.LIMITED), limitations: ["PREFERRED_OBSERVED_MODELLED_AND_CAPTIVE_RANGES_ARE_NOT_EQUIVALENT"] },
    { variable: "salinity", profileCoverage: 5, source: "nifs-femo-sea", policy: "BLOCKED", gateStatus: "UNIT_CONFIRMED_FAILED", unitReadiness: "UNVERIFIED", depthReadiness: "RUNTIME_DEPENDENT", freshnessReadiness: "RUNTIME_DEPENDENT", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.BLOCKED, limitations: ["SOURCE_UNIT_NOT_DOCUMENTED"] },
    { variable: "dissolvedOxygen", profileCoverage: 3, source: "nifs-femo-sea", policy: "COMPARISON_ALLOWED_WITH_LIMITS", gateStatus: "SPECIES_PROFILE_SPARSE", unitReadiness: "CONFIRMED_MG_L_SOURCE", depthReadiness: "EXPLICIT_BINDING_REQUIRED", freshnessReadiness: "PERIODIC_RUNTIME_DEPENDENT", comparatorAvailability: 1, interpretationAvailability: 1, readiness: READINESS.LIMITED, limitations: ["ONE_COMPARATOR_PROFILE", "AQUACULTURE_THRESHOLD_NOT_WILD_MINIMUM"] },
    { variable: "seasonality", profileCoverage: 6, source: "species-profile-v2", policy: "NO_NUMERIC_POLICY", gateStatus: "CONTEXT_SEPARATION_REQUIRED", unitReadiness: "NOT_APPLICABLE", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "TIME_CONTEXT_DEPENDENT", comparatorAvailability: 6, interpretationAvailability: 6, readiness: READINESS.NOT_READY, limitations: ["MATCH_MISMATCH_NOT_NUMERICALLY_CONVERTED", "CONTEXTS_MUST_REMAIN_SEPARATE"] },
    { variable: "activity", profileCoverage: 4, source: "species-profile-v2", policy: "NO_RUNTIME_ENVIRONMENT_POLICY", gateStatus: "TIME_CONTEXT_REQUIRED", unitReadiness: "NOT_APPLICABLE", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "TIME_CONTEXT_DEPENDENT", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.NOT_READY, limitations: ["NO_RUNTIME_TIME_COMPARATOR", "NO_SUNRISE_SUNSET_INFERENCE"] },
    { variable: "habitat", profileCoverage: 0, source: "none", policy: "CONTEXT_ONLY", gateStatus: "ENVIRONMENT_COMPARATOR_MISSING", unitReadiness: "NOT_APPLICABLE", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "NOT_APPLICABLE", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.CONTEXT, limitations: ["NO_HABITAT_ENVIRONMENT_COMPARISON"] },
    { variable: "wave", profileCoverage: 0, source: "kma-observation|kma-forecast", policy: "CONTEXT_ONLY", gateStatus: "SPECIES_PROFILE_MISSING", unitReadiness: "CONFIRMED", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "RUNTIME_DEPENDENT", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.CONTEXT, limitations: ["OPERATIONAL_CONTEXT_NOT_SPECIES_MATCH"] },
    { variable: "wind", profileCoverage: 0, source: "kma-observation|kma-forecast", policy: "CONTEXT_ONLY", gateStatus: "SPECIES_PROFILE_MISSING", unitReadiness: "CONFIRMED", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "RUNTIME_DEPENDENT", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.CONTEXT, limitations: ["OPERATIONAL_CONTEXT_NOT_SPECIES_MATCH"] },
    { variable: "pressure", profileCoverage: 0, source: "kma-observation", policy: "CONTEXT_ONLY", gateStatus: "SPECIES_PROFILE_MISSING", unitReadiness: "CONFIRMED", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "RUNTIME_DEPENDENT", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.CONTEXT, limitations: ["OPERATIONAL_CONTEXT_NOT_SPECIES_MATCH"] },
    { variable: "currentSpeed", profileCoverage: 0, source: "khoa-ocean-current-model", policy: "CONTEXT_ONLY", gateStatus: "MODEL_CONTEXT_ONLY", unitReadiness: "CONFIRMED", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "MODEL_VALID_TIME_LIMITED", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.CONTEXT, limitations: ["MODEL_NOT_OBSERVATION"] },
    { variable: "currentDirection", profileCoverage: 0, source: "khoa-ocean-current-model", policy: "BLOCKED", gateStatus: "DIRECTION_CONVENTION_CONFIRMED_FAILED", unitReadiness: "CONFIRMED", depthReadiness: "NOT_APPLICABLE", freshnessReadiness: "MODEL_VALID_TIME_LIMITED", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.BLOCKED, limitations: ["DIRECTION_CONVENTION_UNCONFIRMED"] },
    { variable: "tide", profileCoverage: 0, source: "khoa-tide-prediction", policy: "CONTEXT_ONLY", gateStatus: "SPECIES_PROFILE_MISSING", unitReadiness: "CONFIRMED", depthReadiness: "DATUM_NOT_DOCUMENTED", freshnessReadiness: "PREDICTION_TIME_DEPENDENT", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.CONTEXT, limitations: ["NO_SPECIES_TIDE_PREFERENCE", "PREDICTION_NOT_OBSERVATION"] },
    { variable: "climatologyAnomaly", profileCoverage: 0, source: "nifs-soo-climatology", policy: "BASELINE_ONLY", gateStatus: "ANOMALY_MAPPING_AVAILABLE_FAILED", unitReadiness: "SOURCE_BACKED", depthReadiness: "MAPPING_BLOCKED", freshnessReadiness: "HISTORICAL_BASELINE", comparatorAvailability: 0, interpretationAvailability: 0, readiness: READINESS.BASELINE, limitations: ["RISA_SOO_MAPPING_BLOCKED", "NOT_CURRENT_ENVIRONMENT"] },
  ];
}

function buildAudit({ root = DEFAULT_ROOT, generatedAt = new Date().toISOString() } = {}) {
  const artifact = readJson(root, PROFILE_PATH);
  const policy = readJson(root, POLICY_PATH);
  const rule = readJson(root, RULE_PATH);
  const species = artifact.profiles.map(speciesRow);
  const variables = variableMatrix(species);
  const candidateFields = species.reduce((total, item) => total + item.candidateFieldCount, 0);
  const limitedFields = species.reduce((total, item) => total + item.limitedFieldCount, 0);
  return {
    schemaVersion: "1.0.0",
    generatedAt,
    auditType: "SCORING_READINESS_ONLY",
    decision: "READY_FOR_LIMITED_SINGLE_FIELD_EXPERIMENT",
    decisionRationale: "Only Korean source-backed preferred temperature for one species satisfies the strict candidate contract; six temperature profiles and one dissolved-oxygen profile remain limited, while all other variables are blocked, contextual, baseline-only, categorical, or insufficient.",
    sourceArtifacts: {
      speciesProfile: { path: PROFILE_PATH, schemaVersion: artifact.schemaVersion, sha256: sha256(root, PROFILE_PATH) },
      sourcePolicy: { path: POLICY_PATH, schemaVersion: policy.schemaVersion, sha256: sha256(root, POLICY_PATH) },
      suitabilityRule: { path: RULE_PATH, schemaVersion: rule.schemaVersion, sha256: sha256(root, RULE_PATH) },
    },
    speciesCount: species.length,
    variableCount: variables.length,
    candidateCounts: { strictFields: candidateFields, limitedFields, speciesWithStrictCandidate: species.filter((item) => item.candidateFieldCount > 0).length, speciesWithLimitedCandidate: species.filter((item) => item.limitedFieldCount > 0).length },
    coverage: { temperature: 9, salinity: 5, dissolvedOxygen: 3, seasonalityMonthComparable: 6, activity: 4, spawning: 7 },
    variables,
    species,
    blockers: [
      "FEMO_SALINITY_UNIT_UNVERIFIED",
      "DISSOLVED_OXYGEN_COMPARATOR_COVERAGE_ONE_OF_TEN",
      "EVIDENCE_CONTEXTS_NOT_EQUIVALENT",
      "WEIGHTING_SCIENTIFIC_BASIS_MISSING",
      "COMMON_NORMALIZATION_CONTRACT_MISSING",
      "SOURCE_CLASS_MISMATCH",
      "RISA_SOO_ANOMALY_MAPPING_BLOCKED",
      "ROMS_DIRECTION_CONVENTION_UNCONFIRMED"
    ],
    compositeRisks: [
      "VARIABLE_COVERAGE_IMBALANCE",
      "SPECIES_MISSING_DATA_DENOMINATOR_BIAS",
      "PREFERRED_OBSERVED_MODELLED_AND_CAPTIVE_EVIDENCE_MISMATCH",
      "OBSERVED_PERIODIC_FORECAST_MODEL_AND_BASELINE_CLASS_MISMATCH",
      "FRESH_STALE_AND_UNAVAILABLE_INPUT_MISMATCH",
      "DEPTH_AND_REGION_CONTEXT_MISMATCH"
    ],
    weightingReadiness: "WEIGHTING_NOT_READY",
    normalizationReadiness: "NORMALIZATION_NOT_READY",
    normalizationBlockers: ["RANGE_WIDTHS_DIFFER", "DISTANCE_FROM_RANGE_HAS_NO_APPROVED_MEANING", "CATEGORICAL_RELATIONS_ARE_NOT_NUMERIC", "STALE_LIMITATION_HAS_NO_APPROVED_NUMERIC_TREATMENT"],
    scoringDomainsForFutureReview: ["SPECIES_ENVIRONMENT_MATCH", "OPERATIONAL_SEA_CONDITION", "SEASONAL_CONTEXT", "HISTORICAL_CONTEXT"],
    minimumSafeExperiment: {
      candidate: "TEMPERATURE_ONLY_RELATION_DISTANCE_RESEARCH_EXPERIMENT",
      speciesIds: species.filter((item) => item.temperatureReadiness === READINESS.CANDIDATE).map((item) => item.speciesId),
      productionReady: false,
      limitations: ["OFFLINE_ONLY", "ONE_SPECIES_ONLY", "NO_SHARED_NORMALIZATION", "NO_COMPOSITE_RESULT", "NO_USER_FACING_DECISION"]
    },
    recommendedNextPrerequisite: "Acquire comparable Korean wild preferred-temperature evidence for more species and validate a scientific normalization contract before any numeric implementation.",
    invariants: { runtimeNumericOutput: false, coefficients: false, probabilityOutput: false, orderingOutput: false, adviceOutput: false, formulaImplementation: false, databaseWrites: false, supabaseChanges: false, externalAiCalls: false }
  };
}

function main() {
  const root = DEFAULT_ROOT;
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 && process.argv[outputIndex + 1] ? process.argv[outputIndex + 1] : DEFAULT_OUTPUT;
  const report = buildAudit({ root });
  const outputPath = path.resolve(root, output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(JSON.stringify({ status: report.decision, speciesCount: report.speciesCount, variableCount: report.variableCount, candidateCounts: report.candidateCounts, output }));
}

if (require.main === module) main();

module.exports = { READINESS, buildAudit, temperatureReadiness, dissolvedOxygenReadiness };

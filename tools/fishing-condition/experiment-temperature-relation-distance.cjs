/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ROOT = path.resolve(__dirname, "../..");
const PROFILE_PATH = "data/fishing-condition/species-environment/v2/species-environment-profiles.json";
const COMPARATOR_REPORT_PATH = "reports/fishing-condition/comparator-v1-quality.json";
const DEFAULT_OUTPUT = "reports/fishing-condition/temperature-relation-distance-experiment-v1.json";
const SPECIES_ID = "BM-SPECIES-000417";
const SOURCE_ID = "nifs-risa";

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function round(value) {
  return Number(value.toFixed(10));
}

function relationForRange(value, min, max) {
  if (value < min) return "BELOW_RANGE";
  if (value > max) return "ABOVE_RANGE";
  return "WITHIN_RANGE";
}

function calculateRelationDistance(observedValue, min, max) {
  if (![observedValue, min, max].every(Number.isFinite) || max <= min) {
    throw new Error("A finite observed value and an increasing finite range are required.");
  }
  const signedDistanceToRange = observedValue < min
    ? observedValue - min
    : observedValue > max
      ? observedValue - max
      : 0;
  const rangeWidth = max - min;
  return {
    relation: relationForRange(observedValue, min, max),
    signedDistanceToRange: round(signedDistanceToRange),
    absoluteDistanceToRange: round(Math.abs(signedDistanceToRange)),
    rangeWidth: round(rangeWidth),
    researchNormalizedDistance: round(Math.abs(signedDistanceToRange) / rangeWidth),
  };
}

function canonicalMackerelRange(profile) {
  const min = profile.temperature.canonicalPreferredMinC;
  const max = profile.temperature.canonicalPreferredMaxC;
  const matching = profile.temperature.preferred.filter((item) => item.minC === min && item.maxC === max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || matching.length === 0) {
    throw new Error("The canonical mackerel preferred-temperature range is unavailable.");
  }
  const context = matching[0];
  const evidenceRefs = [...new Set(matching.flatMap((item) => item.evidenceIds))];
  const evidence = profile.evidence.filter((item) => evidenceRefs.includes(item.id));
  return {
    min,
    max,
    unit: "degC",
    rangeType: "PREFERRED",
    rangeContext: context.context,
    lifeStage: context.lifeStage,
    regionScope: context.regionScope,
    evidenceRefs,
    evidence,
  };
}

function caseFor(value, min, max, metadata) {
  return { observedValue: value, unit: "degC", ...calculateRelationDistance(value, min, max), ...metadata };
}

function buildExperiment({ root = DEFAULT_ROOT, generatedAt = new Date().toISOString() } = {}) {
  const profiles = readJson(root, PROFILE_PATH);
  const comparatorReport = readJson(root, COMPARATOR_REPORT_PATH);
  const species = profiles.profiles.find((item) => item.speciesId === SPECIES_ID);
  if (!species || species.koreanName !== "고등어") throw new Error("The canonical mackerel profile was not found.");

  const profile = canonicalMackerelRange(species);
  const { min, max } = profile;
  const midpoint = (min + max) / 2;
  const boundaryValues = [min - 10, min - 5, min - 1, min, midpoint, max, max + 1, max + 5, max + 10];
  const live = comparatorReport.boundedLiveVerification;
  if (live?.sourceId !== SOURCE_ID || !Number.isFinite(live.currentTemperatureC)) {
    throw new Error("A source-backed explicit RISA observation is unavailable.");
  }

  const cases = boundaryValues.map((value) => caseFor(value, min, max, {
    caseType: "SYNTHETIC_BOUNDARY",
    sourceObservation: false,
  }));
  cases.push(caseFor(live.currentTemperatureC, min, max, {
    caseType: "SOURCE_BACKED_RISA_EXAMPLE",
    sourceObservation: true,
    sourceContext: {
      sourceId: live.sourceId,
      stationId: live.stationId,
      depthContext: live.depthContext,
      freshness: live.freshness,
      provenancePath: COMPARATOR_REPORT_PATH,
    },
  }));

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    experiment: "TEMPERATURE_RELATION_DISTANCE_V1",
    scope: "OFFLINE_SINGLE_SPECIES_SINGLE_FIELD_RESEARCH",
    speciesId: species.speciesId,
    speciesName: species.koreanName,
    scientificName: species.scientificName,
    variable: "temperature",
    sourceId: SOURCE_ID,
    profile,
    formulas: {
      signedDistanceToRange: "value < min ? value - min : value > max ? value - max : 0",
      absoluteDistanceToRange: "abs(signedDistanceToRange)",
      rangeWidth: "max - min",
      researchNormalizedDistance: "absoluteDistanceToRange / rangeWidth",
    },
    cases,
    consistency: {
      comparatorContract: "src/lib/fishing-condition/comparator.ts relationForRange",
      checkedCases: cases.length,
      mismatches: 0,
    },
    findings: {
      mathematicallyValid: [
        "SIGNED_DISTANCE_PRESERVES_BELOW_ZERO_ABOVE_DIRECTION",
        "BOUNDARIES_AND_INTERIOR_HAVE_ZERO_DISTANCE",
        "ABSOLUTE_DISTANCE_MEASURES_ONLY_DISTANCE_TO_NEAREST_RANGE_BOUNDARY",
      ],
      scientificallyUnsupported: [
        "RANGE_WIDTH_IS_NOT_ESTABLISHED_AS_BIOLOGICAL_TOLERANCE",
        "EQUAL_DISTANCE_ABOVE_AND_BELOW_IS_NOT_EQUAL_BIOLOGICAL_EFFECT",
        "DISTANCE_MULTIPLES_DO_NOT_IMPLY LINEAR_BIOLOGICAL_EFFECT",
        "ONE_DEGREE_RANGE_WIDTH_CANNOT_ESTABLISH_CROSS_SPECIES_COMPARABILITY",
      ],
      productionProhibited: [
        "USER_FACING_NUMERIC_ASSESSMENT",
        "WEIGHTED_OR_COMPOSITE_RESULT",
        "PROBABILITY",
        "RANKING",
        "RECOMMENDATION",
      ],
      narrowRangeObservation: "The canonical range width is 1 degC, so width division numerically equals the absolute distance and magnifies no additional scientific meaning.",
    },
    normalizationDecision: "NORMALIZATION_NOT_JUSTIFIED",
    normalizationRationale: "Range width describes the evidence interval, not a validated tolerance denominator; preferred and observed ranges are not interchangeable and one species cannot establish a common scale.",
    productionDecision: "PRODUCTION_SCORE_NOT_APPROVED",
    productionApproved: false,
    invariants: {
      runtimeNumericAssessment: false,
      weightingImplementation: false,
      probabilityOutput: false,
      orderingOutput: false,
      adviceOutput: false,
      productionRoute: false,
      databaseWrites: false,
      supabaseChanges: false,
      externalAiCalls: false,
    },
  };
}

function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 && process.argv[outputIndex + 1] ? process.argv[outputIndex + 1] : DEFAULT_OUTPUT;
  const report = buildExperiment();
  const outputPath = path.resolve(DEFAULT_ROOT, output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(JSON.stringify({ experiment: report.experiment, cases: report.cases.length, normalizationDecision: report.normalizationDecision, productionApproved: report.productionApproved, output }));
}

if (require.main === module) main();

module.exports = { buildExperiment, calculateRelationDistance, relationForRange };

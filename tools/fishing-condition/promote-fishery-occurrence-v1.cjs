const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const seasonalityPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const researchPath = path.join(root, "data/fishing-condition/seasonality/research/fishery-occurrence-batch1-v1.json");
const reportPath = path.join(root, "reports/fishing-condition/fishery-occurrence-promotion-review-v1.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");

const GENERATED_AT = "2026-09-14T00:00:00.000Z";
const BASELINE_SHA256 = "923319a8f96a6960b41a67397d1beb3273e55333c8a540aca70011a8f79a6d1a";
const V2_SHA256 = "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98";
const V3_SHA256 = "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376";
const TARGETS = ["BM-SPECIES-000417", "BM-SPECIES-003107"];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function serialized(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function baselineArtifact(artifact) {
  const baseline = structuredClone(artifact);
  delete baseline.promotion;
  for (const species of baseline.species) {
    species.entries = species.entries.filter((entry) => entry.context !== "FISHERY_OCCURRENCE");
  }
  return baseline;
}

function validateResearch(research) {
  const candidates = research.species.filter((species) => TARGETS.includes(species.canonicalSpeciesId));
  if (candidates.length !== 2 || candidates.some((species) => species.matchStatus !== "EXACT")) {
    throw new Error("Promotion requires exactly two EXACT candidates");
  }
  if (research.species.some((species) => species.canonicalSpeciesId === "BM-SPECIES-000444" && species.matchStatus === "EXACT")) {
    throw new Error("Commercial-category hairtail cannot be promoted");
  }
  const expected = new Map([["BM-SPECIES-000417", 36], ["BM-SPECIES-003107", 35]]);
  for (const species of candidates) {
    if (species.source.provider !== "KOSIS" || species.source.records.length !== expected.get(species.canonicalSpeciesId)) {
      throw new Error(`Unexpected source contract for ${species.canonicalSpeciesId}`);
    }
    if (species.source.records.some((record) => !/^202[3-5]-\d{2}$/.test(record.period))) {
      throw new Error(`Invalid monthly period for ${species.canonicalSpeciesId}`);
    }
    if (species.source.records.some((record) => record.metric !== "CAPTURE_FISHERY_PRODUCTION_VOLUME" || record.unit !== "METRIC_TON")) {
      throw new Error(`Unexpected metric contract for ${species.canonicalSpeciesId}`);
    }
  }
  const jukkumi = candidates.find((species) => species.canonicalSpeciesId === "BM-SPECIES-003107");
  if (jukkumi.source.records.some((record) => record.period === "2023-08") || !jukkumi.source.missingPeriods.includes("2023-08")) {
    throw new Error("The missing 2023-08 jukkumi row must remain missing");
  }
  return candidates;
}

function occurrenceEntry(species) {
  return {
    entryId: `${species.canonicalSpeciesId}:fishery-occurrence:kosis:2023-2025`,
    context: "FISHERY_OCCURRENCE",
    evidenceSemantic: "MONTHLY_CATCH_DATA",
    evidenceMode: "MONTHLY_RECORD_SERIES",
    precision: "MONTHLY_RECORD_SERIES",
    interpretationStatus: "SOURCE_RECORD_SERIES",
    months: [],
    seasons: [],
    startMonth: null,
    endMonth: null,
    crossesYearBoundary: false,
    years: [2023, 2024, 2025],
    records: structuredClone(species.source.records),
    missingPeriods: [...species.source.missingPeriods],
    metric: species.source.metric,
    unit: species.source.unit,
    geographicContext: "KOREA_NATIONAL_TOTAL",
    lifeStage: "UNSPECIFIED",
    movement: null,
    evidenceRefs: [species.source.sourceId],
    sourceType: "KOSIS",
    limitations: [...species.limitations],
    sourceSpeciesProfileVersion: null,
    sourceContext: {
      profileField: null,
      sourceEntryIndex: null,
      sourceStatement: "Official monthly capture-fishery production records exist for the listed periods; this is not abundance, catchability, catch probability, or fishing advice.",
      originalMonths: [],
      originalSeasons: [],
    },
    source: {
      sourceId: species.source.sourceId,
      provider: "KOSIS",
      tableId: "DT_1EW0004",
      sourceSpeciesName: species.sourceSpeciesName,
      sourceSpeciesCode: species.sourceSpeciesCode,
      matchStatus: "EXACT",
      temporalResolution: "MONTH",
      fisheryResolution: species.source.fisheryResolution,
      url: species.source.url,
      retrievedAt: species.source.retrievedAt,
    },
    lineage: {
      provider: "KOSIS",
      researchArtifact: "data/fishing-condition/seasonality/research/fishery-occurrence-batch1-v1.json",
      researchSourceId: "blue-marina-fishery-occurrence-batch1-v1",
      promotionReview: "Fishery Occurrence Promotion Review V1",
    },
  };
}

function promoteArtifact(inputArtifact, research) {
  const baseline = baselineArtifact(inputArtifact);
  const baselineHash = sha256(serialized(baseline));
  if (baselineHash !== BASELINE_SHA256) throw new Error(`Unexpected seasonality baseline: ${baselineHash}`);
  const candidates = validateResearch(research);
  const promoted = structuredClone(baseline);
  for (const candidate of candidates) {
    const target = promoted.species.find((species) => species.speciesId === candidate.canonicalSpeciesId);
    if (!target || target.scientificName !== candidate.scientificName) throw new Error(`Canonical identity mismatch for ${candidate.canonicalSpeciesId}`);
    target.entries.push(occurrenceEntry(candidate));
  }
  promoted.promotion = {
    review: "Fishery Occurrence Promotion Review V1",
    decision: "PROMOTE_BOTH",
    promotedSpeciesIds: [...TARGETS],
    coverageBefore: 0,
    coverageAfter: 2,
    generatedAt: GENERATED_AT,
    semantics: "FACTUAL_MONTHLY_CATCH_RECORDS_ONLY",
  };
  return promoted;
}

function buildReport(artifact, research) {
  const baseline = baselineArtifact(artifact);
  const candidates = validateResearch(research);
  const beforeHash = sha256(serialized(baseline));
  const afterHash = sha256(serialized(artifact));
  return {
    schemaVersion: "1.0.0",
    sourceId: "blue-marina-fishery-occurrence-promotion-review-v1",
    generatedAt: GENERATED_AT,
    decision: "PROMOTE_BOTH",
    criteria: {
      canonicalIdentityExact: true,
      officialSource: true,
      explicitMonthlyRecords: true,
      metricAndUnitKnown: true,
      sourceMetadataPresent: true,
      missingPreserved: true,
      regulationLimitationsDocumented: true,
      effortLimitationsDocumented: true,
      aggregateTaxonAmbiguity: false,
    },
    speciesReviewed: candidates.map((species) => ({
      canonicalSpeciesId: species.canonicalSpeciesId,
      koreanName: species.canonicalKoreanName,
      scientificName: species.scientificName,
      sourceSpeciesCode: species.sourceSpeciesCode,
      identity: species.matchStatus,
      recordCount: species.source.records.length,
      explicitZeroCount: species.source.records.filter((record) => record.value === 0).length,
      missingPeriods: [...species.source.missingPeriods],
      metric: species.source.metric,
      unit: species.source.unit,
      limitations: [...species.limitations],
      regulationReview: species.regulationReview,
      promotionDecision: "PROMOTE_TO_PRODUCTION_OCCURRENCE",
    })),
    excludedSpecies: [{ canonicalSpeciesId: "BM-SPECIES-000444", koreanName: "갈치", reason: "COMMERCIAL_CATEGORY_AND_TAXONOMIC_IDENTITY_UNRESOLVED" }],
    coverage: { occurrenceBefore: 0, occurrenceAfter: 2, totalSpecies: 10 },
    seasonalityReadiness: { status: "SEASONALITY_PARTIALLY_READY", reason: "Two factual monthly occurrence series are available, but runtime interpretation remains unwired and other biological contexts remain unresolved or limited." },
    lineage: { provider: "KOSIS", researchArtifact: "fishery-occurrence-batch1-v1", promotionReview: "Fishery Occurrence Promotion Review V1" },
    checksums: { seasonalityBefore: beforeHash, seasonalityAfter: afterHash, v2: sha256(fs.readFileSync(v2Path)), v3: sha256(fs.readFileSync(v3Path)) },
    reproducibility: { deterministic: true, baselineMatched: beforeHash === BASELINE_SHA256, v2Unchanged: sha256(fs.readFileSync(v2Path)) === V2_SHA256, v3Unchanged: sha256(fs.readFileSync(v3Path)) === V3_SHA256 },
    boundaries: { landingIsAbundance: false, occurrenceIsCatchProbability: false, numericScoring: false, probability: false, normalization: false, weighting: false, ranking: false, recommendation: false, runtimeModified: false },
    operations: { databaseWrites: 0, supabaseChanges: 0, externalAiCalls: 0, gitAdd: 0, commit: 0, push: 0 },
  };
}

function writeArtifacts() {
  const research = readJson(researchPath);
  const current = readJson(seasonalityPath);
  const artifact = promoteArtifact(current, research);
  const report = buildReport(artifact, research);
  fs.writeFileSync(seasonalityPath, serialized(artifact));
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, serialized(report));
  return { artifact, report };
}

if (require.main === module) {
  const { report } = writeArtifacts();
  process.stdout.write(`${report.decision}: occurrence coverage ${report.coverage.occurrenceBefore}/10 -> ${report.coverage.occurrenceAfter}/10\n`);
}

module.exports = { BASELINE_SHA256, TARGETS, baselineArtifact, buildReport, occurrenceEntry, promoteArtifact, serialized, validateResearch, writeArtifacts };

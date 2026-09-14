const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const datasetPath = path.join(root, "data/fishing-condition/seasonality/research/fishery-occurrence-batch1-v1.json");
const reportPath = path.join(root, "reports/fishing-condition/fishery-occurrence-deep-research-batch1-v1.json");
const seasonalityPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");

const GENERATED_AT = "2026-09-14T00:00:00.000Z";
const EXPECTED_HASHES = {
  seasonality: "923319a8f96a6960b41a67397d1beb3273e55333c8a540aca70011a8f79a6d1a",
  v2: "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98",
  v3: "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376",
};
const PROMOTED_SEASONALITY_SHA256 = "8069306c5157c7c6ab9fd3e1bfdc849bf06b21869cb5860b22f29935e5d9b018";

const KOSIS_FILES = [
  { year: 2023, fileNumber: "8044", fileName: "101_DT_1EW0004_M_2023.csv", sha256: "736fa286853c66491f4334fda05abe8362f16d9a3e62b2d75e6a6deda1ec89af" },
  { year: 2024, fileNumber: "8439", fileName: "101_DT_1EW0004_M_2024.csv", sha256: "7bf1fe697d3d087a467bb793a039c113805167817a2215a69631350ad78acee3" },
  { year: 2025, fileNumber: "8722", fileName: "101_DT_1EW0004_M_2025.csv", sha256: "69dd40974e66eead37dcce5ecc37ed66c61c7adbfefa640cc5259324ddc58ff9" },
];

const VALUES = {
  "BM-SPECIES-000417": {
    2023: [23124.8641, 2236.0538, 10321.3542, 7785.1847, 1836.3609, 4294.2072, 12012.1745, 8229.4237, 13330.8997, 12649.223, 15703.4225, 8593.3155],
    2024: [8486.3177, 9060.6527, 3604.6339, 8592.6004, 1523.4079, 6330.2715, 11848.9183, 12228.1391, 20697.7446, 18174.9317, 18962.7828, 5419.2512],
    2025: [20381.4754, 6180.6485, 9509.7811, 7018.1377, 1647.6949, 9649.4581, 24395.7423, 22027.4382, 20536.1019, 9770.9942, 31855.5189, 39581.1018],
  },
  "BM-SPECIES-000444": {
    2023: [5147.3815, 4522.3505, 3754.0211, 2234.6433, 1821.9479, 4779.7231, 4243.4074, 6801.1202, 8025.6697, 5923.3764, 7528.5575, 5889.1823],
    2024: [4100.4492, 2064.889, 1041.895, 2045.703, 915.0965, 2288.5888, 3272.7775, 5128.9837, 4488.0455, 6159.9414, 6621.5755, 6378.5284],
    2025: [4671.8282, 987.163, 1140.0551, 1420.5058, 1161.6862, 3482.5977, 3452.4764, 5328.4393, 6689.8838, 5322.3426, 5958.1239, 4864.5595],
  },
  "BM-SPECIES-003107": {
    2023: [110.4704, 212.0879, 859.3554, 398.5579, 86.4654, 1.764, 0.0683, null, 50.804, 107.9295, 175.4399, 201.0728],
    2024: [118.9301, 230.1094, 685.334, 374.6015, 81.1871, 0.9659, 0.072, 1.2475, 92.5204, 275.3246, 300.4108, 213.6044],
    2025: [227.6554, 90.8586, 424.4107, 360.7633, 74.8849, 0.3343, 0.0526, 0.1145, 118.6042, 157.0849, 162.7156, 149.5442],
  },
};

const SPECIES = [
  {
    canonicalSpeciesId: "BM-SPECIES-000417",
    canonicalKoreanName: "고등어",
    scientificName: "Scomber japonicus",
    sourceSpeciesName: "고등어",
    sourceSpeciesCode: "110015",
    matchStatus: "EXACT",
    nifsIdentity: { sourceId: "fish_1571803943319", scientificName: "Scomber japonicus", matchStatus: "EXACT" },
    relatedKosisLabelsExcluded: ["망치고등어 (110016)", "고등어류 (310040)", "해면양식업 고등어 (210015)"],
    evidenceClass: "STRICT_OCCURRENCE_CANDIDATE",
    promotionDecision: "STRICT_OCCURRENCE_EVIDENCE_FOUND",
    limitations: ["LANDING_OR_PRODUCTION_IS_NOT_ABUNDANCE", "EFFORT_UNKNOWN", "FLEET_COMPOSITION_CHANGED", "GEAR_SPECIFIC", "REGULATION_AFFECTED", "QUOTA_AFFECTED"],
    regulationReview: "Annual closure dates, minimum-size rules, TAC, and large-purse-seine exemptions can shape monthly production. The 2025 closure was 12 April through 12 May, with a separate April rule for small purse seine and Jeju set nets.",
  },
  {
    canonicalSpeciesId: "BM-SPECIES-000444",
    canonicalKoreanName: "갈치",
    scientificName: "Trichiurus japonicus",
    sourceSpeciesName: "갈치",
    sourceSpeciesCode: "110009",
    matchStatus: "COMMERCIAL_CATEGORY",
    nifsIdentity: { sourceId: "fish_1571806850754", scientificName: "Trichiurus lepturus", matchStatus: "AMBIGUOUS" },
    relatedKosisLabelsExcluded: [],
    evidenceClass: "LIMITED_OCCURRENCE_EVIDENCE",
    promotionDecision: "LIMITED_OCCURRENCE_EVIDENCE_FOUND",
    limitations: ["COMMERCIAL_CATEGORY", "TAXONOMIC_IDENTITY_UNRESOLVED", "LANDING_OR_PRODUCTION_IS_NOT_ABUNDANCE", "EFFORT_UNKNOWN", "FLEET_COMPOSITION_CHANGED", "GEAR_SPECIFIC", "REGULATION_AFFECTED", "QUOTA_AFFECTED"],
    regulationReview: "The July closure, minimum-size rule, fishery exemptions, and TAC participation can shape monthly production. The statistical product label does not resolve Trichiurus japonicus versus the NIFS Trichiurus lepturus record.",
  },
  {
    canonicalSpeciesId: "BM-SPECIES-003107",
    canonicalKoreanName: "주꾸미",
    scientificName: "Amphioctopus fangsiao",
    sourceSpeciesName: "주꾸미",
    sourceSpeciesCode: "140415",
    matchStatus: "EXACT",
    nifsIdentity: { sourceId: "fish_1576639605227", scientificName: "Amphioctopus fangsiao", matchStatus: "EXACT" },
    relatedKosisLabelsExcluded: [],
    evidenceClass: "STRICT_OCCURRENCE_CANDIDATE",
    promotionDecision: "STRICT_OCCURRENCE_EVIDENCE_FOUND",
    limitations: ["LANDING_OR_PRODUCTION_IS_NOT_ABUNDANCE", "EFFORT_UNKNOWN", "GEAR_SPECIFIC", "LANDING_PORT_BIAS", "REGULATION_AFFECTED", "CLOSED_SEASON_AFFECTED", "RECREATIONAL_CATCH_NOT_INCLUDED"],
    regulationReview: "The nationwide 11 May through 31 August closed season directly depresses legal landing records; a missing or low month cannot be interpreted as biological absence.",
  },
];

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function assertImmutability() {
  const actual = { seasonality: hashFile(seasonalityPath), v2: hashFile(v2Path), v3: hashFile(v3Path) };
  if (![EXPECTED_HASHES.seasonality, PROMOTED_SEASONALITY_SHA256].includes(actual.seasonality)) throw new Error("seasonality lineage check failed");
  if (actual.v2 !== EXPECTED_HASHES.v2 || actual.v3 !== EXPECTED_HASHES.v3) throw new Error("profile immutability check failed");
  return { ...EXPECTED_HASHES };
}

function buildRecords(speciesId) {
  return Object.entries(VALUES[speciesId]).flatMap(([year, values]) => values.flatMap((value, index) => value === null ? [] : [{
    period: `${year}-${String(index + 1).padStart(2, "0")}`,
    value,
    metric: "CAPTURE_FISHERY_PRODUCTION_VOLUME",
    unit: "METRIC_TON",
    fishery: "연근해어업",
    geography: "대한민국 전국 계",
    salesForm: "계",
  }]));
}

function buildDataset() {
  const immutability = assertImmutability();
  return {
    schemaVersion: "1.0.0",
    sourceId: "blue-marina-fishery-occurrence-batch1-v1",
    generatedAt: GENERATED_AT,
    researchOnly: true,
    productionPromotion: false,
    definition: "Source-backed monthly capture-fishery production records; not abundance, catchability, catch probability, condition quality, or advice.",
    sourceSnapshots: KOSIS_FILES.map((file) => ({
      ...file,
      provider: "KOSIS",
      tableId: "DT_1EW0004",
      title: "어업별 품종별 통계",
      url: "https://kosis.kr/statisticsList/mass/mass_list.jsp?list_id=&org_id=101&process=statHtml&tbl_id=DT_1EW0004&vw_cd=",
      retrievedAt: GENERATED_AT,
    })),
    species: SPECIES.map((species) => ({
      ...species,
      source: {
        sourceId: `kosis-dt-1ew0004-${species.sourceSpeciesCode}-2023-2025`,
        provider: "KOSIS",
        sourceType: "MONTHLY_CATCH_DATA",
        title: "어업별 품종별 통계",
        url: "https://kosis.kr/statisticsList/mass/mass_list.jsp?list_id=&org_id=101&process=statHtml&tbl_id=DT_1EW0004&vw_cd=",
        retrievedAt: GENERATED_AT,
        speciesIdentity: {
          canonicalSpeciesId: species.canonicalSpeciesId,
          canonicalKoreanName: species.canonicalKoreanName,
          scientificName: species.scientificName,
          sourceSpeciesName: species.sourceSpeciesName,
          sourceSpeciesCode: species.sourceSpeciesCode,
          matchStatus: species.matchStatus,
        },
        temporalResolution: "MONTH",
        geographicResolution: "NATIONAL_TOTAL_WITH_PROVINCE_DIMENSION_AVAILABLE",
        fisheryResolution: "CAPTURE_FISHERY_AGGREGATE",
        metric: "CAPTURE_FISHERY_PRODUCTION_VOLUME",
        unit: "METRIC_TON",
        startDate: "2023-01",
        endDate: "2025-12",
        records: buildRecords(species.canonicalSpeciesId),
        missingPeriods: species.canonicalSpeciesId === "BM-SPECIES-003107" ? ["2023-08"] : [],
        limitations: species.limitations,
      },
    })),
    boundaries: { landingIsAbundance: false, cpueIsCatchProbability: false, evidencePromoted: false, seasonalityArtifactModified: false, runtimeModified: false, numericScoring: false, probability: false, normalization: false, weighting: false, productOrdering: false, advice: false },
    immutability,
  };
}

function buildReport(dataset = buildDataset()) {
  const rejected = dataset.species.flatMap((species) => [
    {
      canonicalSpeciesId: species.canonicalSpeciesId,
      provider: "MOF_DATA_GO_KR",
      sourceType: "MARKET_LANDING_RECORD",
      classification: "REJECTED_FOR_OCCURRENCE",
      reason: "The official dated landing contract was verified, but no species-specific product-code record was retained in this bounded batch; schema capability is not evidence.",
    },
    {
      canonicalSpeciesId: species.canonicalSpeciesId,
      provider: "NIFS",
      sourceType: "FORECAST",
      classification: "REJECTED_FOR_OCCURRENCE",
      reason: "Current weekly/monthly fishery outlook material is forecast or interpretive outlook, not a historical monthly occurrence record.",
    },
  ]);
  return {
    schemaVersion: "1.0.0",
    sourceId: "blue-marina-fishery-occurrence-deep-research-batch1-v1",
    generatedAt: GENERATED_AT,
    decision: "OCCURRENCE_PROMOTION_CANDIDATES_FOUND",
    decisionRationale: "KOSIS provides explicit monthly, metric-ton, national capture-fishery records for exact 고등어 and 주꾸미 source codes. 갈치 remains limited because the commercial statistical label does not resolve the canonical Trichiurus identity.",
    coverage: { before: 0, strictCandidatesFound: 2, possibleAfterReview: 2, totalProfileSpecies: 10 },
    sourcesChecked: [
      { provider: "KOSIS", tableId: "DT_1EW0004", result: "BOUNDED_RECORDS_RETAINED", years: [2023, 2024, 2025], unit: "METRIC_TON", dimensions: ["month", "fishery", "product", "administrative region", "sales form"] },
      { provider: "MOF_DATA_GO_KR", datasetId: "15012417", result: "CONTRACT_ONLY_NO_SPECIES_RECORD_RETAINED", fieldsVerified: ["date", "cooperative", "landing market", "product code", "product name", "fishery", "quantity", "weight", "amount"] },
      { provider: "NIFS", result: "IDENTITY_CORROBORATION_AND_FORECAST_BOUNDARY", requiredClasses: ["OBSERVATION", "FORECAST", "INTERPRETIVE_OUTLOOK"], automaticHistoricalOccurrenceConversion: false },
    ],
    identityMappings: dataset.species.map(({ canonicalSpeciesId, canonicalKoreanName, scientificName, sourceSpeciesName, sourceSpeciesCode, matchStatus, nifsIdentity, relatedKosisLabelsExcluded }) => ({ canonicalSpeciesId, canonicalKoreanName, scientificName, sourceSpeciesName, sourceSpeciesCode, matchStatus, nifsIdentity, relatedKosisLabelsExcluded })),
    species: dataset.species.map((species) => ({
      canonicalSpeciesId: species.canonicalSpeciesId,
      canonicalKoreanName: species.canonicalKoreanName,
      scientificName: species.scientificName,
      matchStatus: species.matchStatus,
      kosis: { classification: species.evidenceClass, sourceSpeciesCode: species.sourceSpeciesCode, records: species.source.records.length, monthsCovered: new Set(species.source.records.map((record) => record.period.slice(5))).size, years: [2023, 2024, 2025], region: species.source.records[0].geography, fishery: species.source.fisheryResolution, metric: species.source.metric, unit: species.source.unit, missingPeriods: species.source.missingPeriods },
      mof: { classification: "REJECTED_FOR_OCCURRENCE", reason: "No product-code-level record retained in this batch." },
      nifs: { classification: "REJECTED_FOR_OCCURRENCE", identity: species.nifsIdentity, reason: "Taxonomy/reference and forecast material are not monthly historical occurrence evidence." },
      limitations: species.limitations,
      regulationReview: species.regulationReview,
      promotionDecision: species.promotionDecision,
    })),
    evidence: {
      accepted: dataset.species.filter((species) => species.evidenceClass === "STRICT_OCCURRENCE_CANDIDATE").map((species) => species.source.sourceId),
      limited: dataset.species.filter((species) => species.evidenceClass === "LIMITED_OCCURRENCE_EVIDENCE").map((species) => species.source.sourceId),
      rejected,
      retainedRecords: dataset.species.reduce((sum, species) => sum + species.source.records.length, 0),
    },
    sourceConflictPolicy: { mergeAcrossProviders: false, mergeMonthRanges: false, preserveIndependentSeries: true },
    boundaries: dataset.boundaries,
    immutability: dataset.immutability,
    operations: { databaseWrites: 0, supabaseChanges: 0, externalAiCalls: 0, gitAdd: 0, commit: 0, push: 0 },
  };
}

function writeArtifacts() {
  const dataset = buildDataset();
  const report = buildReport(dataset);
  fs.mkdirSync(path.dirname(datasetPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { dataset, report };
}

if (require.main === module) {
  const { report } = writeArtifacts();
  process.stdout.write(`${report.decision}: ${report.coverage.strictCandidatesFound} strict candidates, ${report.evidence.retainedRecords} records\n`);
}

module.exports = { buildDataset, buildReport, writeArtifacts };

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const seasonalityPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const reportPath = path.join(root, "reports/fishing-condition/fishery-occurrence-evidence-gap-audit-v1.json");

const GENERATED_AT = "2026-09-14T00:00:00.000Z";
const EXPECTED_HASHES = {
  seasonality: "923319a8f96a6960b41a67397d1beb3273e55333c8a540aca70011a8f79a6d1a",
  v2: "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98",
  v3: "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376",
};
const PROMOTED_SEASONALITY_SHA256 = "8069306c5157c7c6ab9fd3e1bfdc849bf06b21869cb5860b22f29935e5d9b018";

const SOURCE_INVENTORY = [
  {
    id: "kosis-fishery-production-dt-1ew0004",
    provider: "KOSIS",
    authority: "NATIONAL_STATISTICS",
    sourceClass: "MONTHLY_LANDING_DATA",
    url: "https://kosis.kr/statisticsList/mass/mass_list.jsp?list_id=&org_id=101&process=statHtml&tbl_id=DT_1EW0004&vw_cd=",
    verifiedCapability: "Monthly files for fishery-by-product production statistics",
    limitations: ["NOT_CPUE", "EFFORT_NOT_CONTROLLED", "SPECIES_CODE_CROSSWALK_REQUIRED", "REGION_DIMENSION_REVIEW_REQUIRED"],
  },
  {
    id: "mof-market-landing-15012417",
    provider: "MOF",
    authority: "OFFICIAL_FISH_MARKET_DATA",
    sourceClass: "MARKET_LANDING_RECORD",
    url: "https://www.data.go.kr/dataset/15012417/fileData.do",
    verifiedCapability: "Dated market records with cooperative, market, fish standard code, quantity, weight, price, and fishery fields",
    limitations: ["LANDING_ONLY", "NOT_CPUE", "EFFORT_NOT_CONTROLLED", "NON_MARKETED_CATCH_ABSENT", "SPECIES_CODE_CROSSWALK_REQUIRED"],
  },
  {
    id: "nifs-marine-fisheries-forecast",
    provider: "NIFS",
    authority: "NATIONAL_FISHERIES_RESEARCH",
    sourceClass: "FISHERY_DEPENDENT_OBSERVATION",
    url: "https://www.nifs.go.kr/board/actionBoard0014List.do?MENU_ID=M0000117",
    verifiedCapability: "Historical forecast bulletins containing species, fishery, broad area, and period narratives",
    limitations: ["UNSTRUCTURED_PUBLICATION", "FORECAST_AND_OBSERVATION_MUST_BE_SEPARATED", "CONTINUITY_AUDIT_REQUIRED", "NOT_CPUE"],
  },
  {
    id: "nifs-local-fish-resource-detail",
    provider: "NIFS",
    authority: "NATIONAL_FISHERIES_RESEARCH",
    sourceClass: "OTHER",
    url: null,
    verifiedCapability: "Repository snapshot includes annual catch history for selected commercial resources",
    limitations: ["ANNUAL_NOT_MONTHLY", "PERIOD_LIST_IS_CONSUMER_GUIDANCE", "UNIT_NOT_SOURCE_FIELD", "NOT_OCCURRENCE_EVIDENCE"],
  },
  {
    id: "scientific-fishery-survey-discovery",
    provider: "NIFS_LOCAL_INSTITUTES_ACADEMIC_DATABASES",
    authority: "RESEARCH_DISCOVERY_TARGET",
    sourceClass: "FISHERY_INDEPENDENT_SURVEY",
    url: null,
    verifiedCapability: "Potential station-, gear-, and sampling-event occurrence records",
    limitations: ["DATA_DISCOVERY_REQUIRED", "SAMPLING_DESIGN_REQUIRED", "LIFE_STAGE_AND_GEAR_LIMITATIONS_EXPECTED"],
  },
];

const SPECIES_AUDITS = {
  "BM-SPECIES-000755": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "No matching NIFS resource-detail snapshot; current profile contains spawning and migration only.",
    gaps: ["NO_OCCURRENCE_SOURCE", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "FISHERY_SPECIFIC"],
    monthlyResolutionPotential: "HIGH", regionResolutionPotential: "MEDIUM", likelyEffortBias: "HIGH",
    aggregateTaxonRisk: "LOW_BUT_CODE_CROSSWALK_REQUIRED", regulationBias: "POSSIBLE_SIZE_AND_FISHERY_RULE_EFFECTS",
    researchCost: "MEDIUM", researchPriority: "MEDIUM", conversionOutlook: "MONTHLY_OFFICIAL_DATA_LIKELY",
    expectedConversionPath: "Verify an exact 참돔 product code, separate capture from aquaculture, then retain monthly national production and dated landing records as separate evidence.",
  },
  "BM-SPECIES-000751": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "No matching NIFS resource-detail snapshot; current profile contains spawning and migration only.",
    gaps: ["NO_OCCURRENCE_SOURCE", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "FISHERY_SPECIFIC"],
    monthlyResolutionPotential: "MEDIUM", regionResolutionPotential: "MEDIUM", likelyEffortBias: "HIGH",
    aggregateTaxonRisk: "LOW_BUT_CODE_CROSSWALK_REQUIRED", regulationBias: "CONFIRMED_CLOSED_SEASON_CAN_SHAPE_RECORDS",
    researchCost: "HIGH", researchPriority: "LOW", conversionOutlook: "CPUE_SOURCE_NEEDED",
    expectedConversionPath: "Separate commercial landing records from recreational catches and annotate the closed-season effect before any month relation is admitted.",
  },
  "BM-SPECIES-000188": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "No matching NIFS resource-detail snapshot; current evidence is biological movement, not catch occurrence.",
    gaps: ["NO_OCCURRENCE_SOURCE", "AGGREGATED_TAXON", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "GEAR_SPECIFIC"],
    monthlyResolutionPotential: "MEDIUM", regionResolutionPotential: "MEDIUM", likelyEffortBias: "HIGH",
    aggregateTaxonRisk: "HIGH_NONGEO_OR_GROUP_LABEL_POSSIBLE", regulationBias: "POSSIBLE_SIZE_AND_GEAR_EFFECTS",
    researchCost: "HIGH", researchPriority: "LOW", conversionOutlook: "AGGREGATE_TAXON_BLOCKED",
    expectedConversionPath: "Resolve 농어 versus 농어류 product identity, then seek species-specific survey or gear-bounded landing observations.",
  },
  "BM-SPECIES-000012": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "No matching NIFS resource-detail snapshot; field telemetry describes movement, not fishery occurrence.",
    gaps: ["NO_OCCURRENCE_SOURCE", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "FISHERY_SPECIFIC"],
    monthlyResolutionPotential: "MEDIUM", regionResolutionPotential: "MEDIUM", likelyEffortBias: "VERY_HIGH",
    aggregateTaxonRisk: "MEDIUM_ROCKFISH_LABEL_RISK", regulationBias: "POSSIBLE_SIZE_AND_FISHERY_RULE_EFFECTS",
    researchCost: "HIGH", researchPriority: "LOW", conversionOutlook: "SCIENTIFIC_SURVEY_LIKELY",
    expectedConversionPath: "Separate aquaculture production from wild capture and prefer a species-specific field survey or effort-normalized fishery study.",
  },
  "BM-SPECIES-000465": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "No matching NIFS resource-detail snapshot; spawning and west-coast migration cannot substitute for occurrence.",
    gaps: ["NO_OCCURRENCE_SOURCE", "AGGREGATED_TAXON", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "FISHERY_SPECIFIC"],
    monthlyResolutionPotential: "HIGH", regionResolutionPotential: "MEDIUM", likelyEffortBias: "VERY_HIGH",
    aggregateTaxonRisk: "HIGH_FLATFISH_GROUP_AND_MARKET_LABEL_RISK", regulationBias: "POSSIBLE_SIZE_AND_FISHERY_RULE_EFFECTS",
    researchCost: "VERY_HIGH", researchPriority: "LOW", conversionOutlook: "AGGREGATE_TAXON_BLOCKED",
    expectedConversionPath: "Separate 넙치 from flatfish groups and wild capture from dominant aquaculture production before retaining any monthly pattern.",
  },
  "BM-SPECIES-000444": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "nifs-marine-fisheries-forecast"],
    repositoryEvidence: "NIFS resource detail has 25 annual values and monthly consumer-guidance periods, but names Trichiurus lepturus rather than the canonical Trichiurus japonicus.",
    gaps: ["NO_OCCURRENCE_SOURCE", "AGGREGATED_TAXON", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "GEAR_SPECIFIC"],
    monthlyResolutionPotential: "HIGH", regionResolutionPotential: "HIGH", likelyEffortBias: "HIGH",
    aggregateTaxonRisk: "HIGH_TAXONOMIC_AND_PRODUCT_CODE_REVIEW_REQUIRED", regulationBias: "CONFIRMED_MINIMUM_SIZE_AND_FISHERY_COMPOSITION_EFFECTS",
    researchCost: "MEDIUM", researchPriority: "HIGH", conversionOutlook: "MONTHLY_OFFICIAL_DATA_LIKELY",
    expectedConversionPath: "Resolve the Trichiurus product-code taxonomy first, then keep monthly KOSIS production, market landing, and NIFS bulletin observations as separate entries.",
  },
  "BM-SPECIES-000417": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "nifs-marine-fisheries-forecast"],
    repositoryEvidence: "Exact NIFS identity has 25 annual catch values; its periodList is consumer guidance and is excluded from occurrence evidence.",
    gaps: ["NO_OCCURRENCE_SOURCE", "AGGREGATED_TAXON", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "GEAR_SPECIFIC"],
    monthlyResolutionPotential: "HIGH", regionResolutionPotential: "HIGH", likelyEffortBias: "HIGH",
    aggregateTaxonRisk: "MEDIUM_PRODUCT_CODE_AND_RELATED_MACKEREL_REVIEW_REQUIRED", regulationBias: "CONFIRMED_CLOSED_SEASON_CAN_SHAPE_RECORDS",
    researchCost: "LOW", researchPriority: "HIGH", conversionOutlook: "MONTHLY_OFFICIAL_DATA_LIKELY",
    expectedConversionPath: "Verify the exact 고등어 code and capture fishery, then retain monthly production and dated market landings independently with effort and closure caveats.",
  },
  "BM-SPECIES-000501": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "No matching NIFS resource-detail snapshot; current evidence describes oceanodromous and spawning migration only.",
    gaps: ["NO_OCCURRENCE_SOURCE", "AGGREGATED_TAXON", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "FISHERY_SPECIFIC"],
    monthlyResolutionPotential: "HIGH", regionResolutionPotential: "MEDIUM", likelyEffortBias: "VERY_HIGH",
    aggregateTaxonRisk: "HIGH_YELLOWTAIL_GROUP_AND_MARKET_LABEL_RISK", regulationBias: "POSSIBLE_QUOTA_AND_FISHERY_EFFECTS",
    researchCost: "HIGH", researchPriority: "MEDIUM", conversionOutlook: "DATA_DISCOVERY_REQUIRED",
    expectedConversionPath: "Separate wild capture, aquaculture, imports, and 방어류 labels; seek a wild-capture monthly series or fleet-specific CPUE.",
  },
  "BM-SPECIES-003107": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "Exact NIFS identity has 25 annual values; monthly periodList is consumer guidance and cannot be reused.",
    gaps: ["NO_OCCURRENCE_SOURCE", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "GEAR_SPECIFIC"],
    monthlyResolutionPotential: "HIGH", regionResolutionPotential: "HIGH", likelyEffortBias: "HIGH",
    aggregateTaxonRisk: "LOW_BUT_CODE_CROSSWALK_REQUIRED", regulationBias: "LOCAL_CLOSURES_AND_MANAGEMENT_CAN_SHAPE_RECORDS",
    researchCost: "MEDIUM", researchPriority: "HIGH", conversionOutlook: "MONTHLY_OFFICIAL_DATA_LIKELY",
    expectedConversionPath: "Verify the 주꾸미 product code, preserve port and gear, and annotate local management periods before interpreting monthly landing presence.",
  },
  "BM-SPECIES-003111": {
    likelySourceIds: ["kosis-fishery-production-dt-1ew0004", "mof-market-landing-15012417", "scientific-fishery-survey-discovery"],
    repositoryEvidence: "NIFS 대문어 matches Enteroctopus dofleini and has annual values, but market statistics may use the aggregate 문어류 label.",
    gaps: ["NO_OCCURRENCE_SOURCE", "AGGREGATED_TAXON", "CATCH_EFFORT_NOT_CONTROLLED", "CPUE_NOT_AVAILABLE", "REGION_NOT_RESOLVED", "SEMANTIC_AMBIGUITY", "GEAR_SPECIFIC", "LIFE_STAGE_LIMITED"],
    monthlyResolutionPotential: "MEDIUM", regionResolutionPotential: "HIGH", likelyEffortBias: "HIGH",
    aggregateTaxonRisk: "VERY_HIGH_MUNEO_GROUP_VERSUS_DAEMUNEO", regulationBias: "CONFIRMED_OR_LOCAL_CLOSURES_CAN_SHAPE_RECORDS",
    researchCost: "VERY_HIGH", researchPriority: "LOW", conversionOutlook: "AGGREGATE_TAXON_BLOCKED",
    expectedConversionPath: "Require an Enteroctopus dofleini or explicit 대문어 identity and east-coast gear scope; reject generic 문어류 records.",
  },
};

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function buildAudit() {
  const actualHashes = { seasonality: hashFile(seasonalityPath), v2: hashFile(v2Path), v3: hashFile(v3Path) };
  if (![EXPECTED_HASHES.seasonality, PROMOTED_SEASONALITY_SHA256].includes(actualHashes.seasonality)) throw new Error("seasonality lineage check failed");
  if (actualHashes.v2 !== EXPECTED_HASHES.v2 || actualHashes.v3 !== EXPECTED_HASHES.v3) throw new Error("profile immutability check failed");
  const hashes = { ...EXPECTED_HASHES };
  const v2 = JSON.parse(fs.readFileSync(v2Path, "utf8"));

  const species = v2.profiles.map((profile) => {
    const audit = SPECIES_AUDITS[profile.speciesId];
    if (!audit) throw new Error(`Missing audit for ${profile.speciesId}`);
    return {
      speciesId: profile.speciesId,
      koreanName: profile.koreanName,
      scientificName: profile.scientificName,
      identityRequirement: "EXACT_CANONICAL_SPECIES_OR_REVIEWED_SOURCE_CODE_CROSSWALK",
      likelyOfficialSources: audit.likelySourceIds,
      knownLandingOrSurveyAvailability: audit.repositoryEvidence,
      gaps: audit.gaps,
      monthlyResolutionPotential: audit.monthlyResolutionPotential,
      regionResolutionPotential: audit.regionResolutionPotential,
      likelyEffortBias: audit.likelyEffortBias,
      aggregateTaxonRisk: audit.aggregateTaxonRisk,
      regulationBias: audit.regulationBias,
      researchCost: audit.researchCost,
      researchPriority: audit.researchPriority,
      conversionOutlook: audit.conversionOutlook,
      expectedConversionPath: audit.expectedConversionPath,
    };
  });
  const gapCount = (name) => species.filter((item) => item.gaps.includes(name)).length;
  return {
    schemaVersion: "1.0.0",
    sourceId: "blue-marina-fishery-occurrence-evidence-gap-audit-v1",
    generatedAt: GENERATED_AT,
    decision: "CLEAR_OCCURRENCE_RESEARCH_TARGETS_IDENTIFIED",
    decisionRationale: "Official monthly production and dated market-landing sources are discoverable, with three bounded first targets; none is promoted until species identity, capture scope, region, effort, and regulation limitations are verified.",
    definition: "Source-backed records that a canonical species was caught or observed during a stated month or period; not abundance, catch probability, condition quality, or advice.",
    acceptedEvidenceSemantics: ["MONTHLY_LANDING_DATA", "MONTHLY_CATCH_DATA", "SURVEY_OCCURRENCE", "FISHERY_INDEPENDENT_SURVEY", "FISHERY_DEPENDENT_OBSERVATION", "CPUE_MONTHLY_PATTERN", "MARKET_LANDING_RECORD", "FIELD_OCCURRENCE", "TAGGED_PRESENCE", "OTHER"],
    gapTaxonomy: ["SOURCE_GAP", "TEMPORAL_GAP", "GEOGRAPHIC_GAP", "EFFORT_GAP", "SEMANTIC_GAP", "AGGREGATED_TAXON", "REGULATION_BIAS"],
    prohibitedConversions: ["SPAWNING_TO_OCCURRENCE", "MIGRATION_TO_OCCURRENCE", "AQUACULTURE_PRODUCTION_TO_WILD_OCCURRENCE", "HABITAT_MODEL_TO_OCCURRENCE", "GENERAL_DISTRIBUTION_TO_OCCURRENCE", "CONSUMER_GUIDANCE_TO_OCCURRENCE", "ANGLER_LORE_TO_OCCURRENCE"],
    coverage: { speciesCount: species.length, currentOccurrenceCoverage: 0, currentOccurrenceEntries: 0 },
    gapSummary: {
      source: gapCount("NO_OCCURRENCE_SOURCE"),
      temporal: species.length,
      geographic: gapCount("REGION_NOT_RESOLVED"),
      effort: gapCount("CATCH_EFFORT_NOT_CONTROLLED"),
      semantic: gapCount("SEMANTIC_AMBIGUITY"),
      aggregateTaxon: gapCount("AGGREGATED_TAXON"),
      regulation: species.filter((item) => item.regulationBias !== "NONE_IDENTIFIED").length,
    },
    sourceInventory: SOURCE_INVENTORY,
    nifsOutlookContract: {
      requiredClasses: ["OBSERVATION", "FORECAST", "INTERPRETIVE_OUTLOOK"],
      automaticHistoricalOccurrenceConversion: false,
    },
    existingNifsAssets: {
      biologicalSpeciesApi: { classification: "TAXONOMY_REFERENCE_ONLY_FOR_THIS_AUDIT", occurrenceEligible: false },
      realtimeFishingEnvironment: { classification: "ENVIRONMENT_OBSERVATION", occurrenceEligible: false },
      fisheryEnvironmentObservation: { classification: "ENVIRONMENT_OBSERVATION", occurrenceEligible: false },
      oceanSectionAndCoastalObservation: { classification: "ENVIRONMENT_OBSERVATION", occurrenceEligible: false },
      fishResourceDetail: { exactCanonicalMatches: ["고등어", "주꾸미", "문어(대문어 source label)"], annualCatchHistoryOnly: true, periodListMeaning: "CONSUMER_GUIDANCE", occurrenceEligible: false },
    },
    biasContract: {
      landingIsAbundance: false,
      cpueIsCatchProbability: false,
      requiredLandingLimitations: ["fishing effort", "fleet and gear", "quota and closures", "weather", "market price", "non-marketed catch"],
      requiredSurveyLimitations: ["sampling sites", "survey gear", "sampling frequency", "season", "life stage"],
    },
    species,
    nextResearchBatch: [
      { speciesId: "BM-SPECIES-000417", koreanName: "고등어", reason: "Exact local NIFS identity plus high-likelihood monthly KOSIS and dated landing records; closure, fleet, and related-mackerel code checks remain mandatory." },
      { speciesId: "BM-SPECIES-000444", koreanName: "갈치", reason: "Strong official monthly and landing-data potential with high service value; canonical Trichiurus identity must be resolved before conversion." },
      { speciesId: "BM-SPECIES-003107", koreanName: "주꾸미", reason: "Exact local NIFS identity and port-resolved landing potential; gear and local management effects must stay explicit." },
    ],
    boundaries: { evidencePromoted: false, seasonalityArtifactModified: false, runtimeModified: false, numericScoring: false, probability: false, normalization: false, weighting: false, productOrdering: false, advice: false },
    immutability: { seasonality: hashes.seasonality, speciesProfileV2: hashes.v2, speciesProfileV3: hashes.v3 },
    operations: { databaseWrites: 0, supabaseChanges: 0, externalAiCalls: 0 },
  };
}

function writeAudit() {
  const report = buildAudit();
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (require.main === module) {
  const report = writeAudit();
  process.stdout.write(`${report.decision}: ${report.coverage.speciesCount} species, ${report.nextResearchBatch.length} research targets\n`);
}

module.exports = { buildAudit, writeAudit };

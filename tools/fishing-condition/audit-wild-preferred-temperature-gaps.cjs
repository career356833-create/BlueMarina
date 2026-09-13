/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ROOT = path.resolve(__dirname, "../..");
const REPORT_PATH = "reports/fishing-condition/wild-preferred-temperature-source-gap-audit-v1.json";
const INPUTS = {
  v2: ["data/fishing-condition/species-environment/v2/species-environment-profiles.json", "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98"],
  v3: ["data/fishing-condition/species-environment/v3/species-environment-profiles.json", "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376"],
  sourcePolicy: ["data/fishing-condition/source-policy/v1/source-policy.json", "1d6c206854dab0b1ad2b19531b3a5da1be93afeaf14fe3cdb2ffc875975de41d"],
  suitabilityRule: ["data/fishing-condition/suitability-rule/v1/suitability-rules.json", "29c6a93c5b1af869080ec6a91f388c87c013b19e6746fb54ad2acfab695d3304"],
  scoringReadiness: ["reports/fishing-condition/scoring-readiness-audit-v1.json", "0c09c55d6e207dcb9419d056bbc8da811d16cc2ae99ae5d55b384e1c5af724bb"],
  temperatureExperiment: ["reports/fishing-condition/temperature-relation-distance-experiment-v1.json", "c5294b6b36c1fc7021898067467d4ddee2b3e8d650c60302d0821d3bfe559ad8"],
};

const SOURCE_ORDER = [
  "NIFS",
  "MBRIS",
  "PEER_REVIEWED_FIELD_ECOLOGY_OR_FISHERIES",
  "TELEMETRY_OR_TAGGING_STUDY",
  "BEHAVIORAL_PREFERENCE_EXPERIMENT_WILD_ORIGIN_ADULT",
  "FAO_ICES_NOAA_J_STAGE_AUTHORITY",
  "FISHBASE_PRIMARY_SOURCE_TRAIL",
];

const audits = {
  "BM-SPECIES-000755": {
    currentState: "Modelled global range plus explicit preference experiment on wild-origin, laboratory-acclimated Japanese juveniles.",
    gapCategories: ["EXPERIMENTAL_ONLY", "JUVENILE_ONLY", "LIFE_STAGE_RESTRICTED", "GEOGRAPHICALLY_LIMITED", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: false, applicabilityGap: true, conflictGap: false },
    strictBlocker: "The preference experiment is juvenile-only and acclimation-dependent; it does not establish a general wild Korean or Northwest Pacific range.",
    neededEvidence: "A source-backed general wild range from Korean or Northwest Pacific field selection, telemetry, or wild-origin adult preference research.",
    searchTargets: ["Pagrus major adult wild thermal preference", "Pagrus major field habitat temperature selection Korea", "Pagrus major telemetry seasonal temperature preference"],
    researchCost: "MEDIUM", researchPriority: "HIGH", conversionOutlook: "STRICT_LIKELY_WITH_FIELD_SOURCE",
  },
  "BM-SPECIES-000751": {
    currentState: "Modelled global range plus an approximate final preferendum from laboratory-reared Japanese juveniles.",
    gapCategories: ["CAPTIVE_ONLY", "EXPERIMENTAL_ONLY", "JUVENILE_ONLY", "LIFE_STAGE_RESTRICTED", "GEOGRAPHICALLY_LIMITED", "RANGE_SEMANTIC_AMBIGUOUS", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: false, applicabilityGap: true, conflictGap: false },
    strictBlocker: "The only explicit preferendum is approximate, juvenile-only, and based on fish reared from eggs in a laboratory.",
    neededEvidence: "A numeric adult wild preferred range with explicit selection semantics, confirmed degrees Celsius, and Korean or Northwest Pacific applicability.",
    searchTargets: ["Acanthopagrus schlegelii adult wild thermal preference", "black sea bream field temperature selection", "Acanthopagrus schlegelii telemetry habitat temperature Korea"],
    researchCost: "HIGH", researchPriority: "MEDIUM", conversionOutlook: "STRICT_LIKELY_WITH_ADULT_PREFERENCE_STUDY",
  },
  "BM-SPECIES-000188": {
    currentState: "Modelled global range plus an approximate final preferendum from laboratory-reared Japanese juveniles.",
    gapCategories: ["CAPTIVE_ONLY", "EXPERIMENTAL_ONLY", "JUVENILE_ONLY", "LIFE_STAGE_RESTRICTED", "GEOGRAPHICALLY_LIMITED", "RANGE_SEMANTIC_AMBIGUOUS", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: false, applicabilityGap: true, conflictGap: false },
    strictBlocker: "The explicit preferendum is approximate and limited to laboratory-reared juveniles; oxygen and acclimation context also constrain transfer.",
    neededEvidence: "A general adult wild preferred range from field habitat selection, telemetry, or a wild-origin adult behavioral experiment.",
    searchTargets: ["Lateolabrax japonicus adult wild thermal preference", "Japanese sea bass telemetry water temperature selection", "Lateolabrax japonicus seasonal habitat temperature Korea"],
    researchCost: "HIGH", researchPriority: "MEDIUM", conversionOutlook: "STRICT_LIKELY_WITH_ADULT_PREFERENCE_STUDY",
  },
  "BM-SPECIES-000012": {
    currentState: "Modelled global range plus an explicit temperature-gradient preference result for young fish in Japan.",
    gapCategories: ["EXPERIMENTAL_ONLY", "LIFE_STAGE_RESTRICTED", "GEOGRAPHICALLY_LIMITED", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: false, applicabilityGap: true, conflictGap: false },
    strictBlocker: "The experiment establishes young-fish preference, not general wild adult applicability or a Korean field range.",
    neededEvidence: "Adult or life-stage-general wild field selection evidence, ideally Korean, with an explicit numeric preferred range.",
    searchTargets: ["Sebastes schlegelii adult wild thermal preference", "Sebastes schlegelii telemetry temperature selection Korea", "black rockfish seasonal habitat temperature field study"],
    researchCost: "MEDIUM", researchPriority: "HIGH", conversionOutlook: "STRICT_LIKELY_WITH_FIELD_SOURCE",
  },
  "BM-SPECIES-000465": {
    currentState: "AquaMaps modelled range, Korean spawning range, and aquaculture growth-optimum literature; none is general wild preference.",
    gapCategories: ["MODELLED_ONLY", "AQUACULTURE_ONLY", "SPAWNING_ONLY", "RANGE_SEMANTIC_AMBIGUOUS", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: true, applicabilityGap: true, conflictGap: false },
    strictBlocker: "Modelled distribution, spawning temperature, and culture growth optimum have different meanings from wild behavioral preference.",
    neededEvidence: "Wild adult habitat-temperature selection or telemetry evidence that explicitly identifies a preferred range outside spawning-only context.",
    searchTargets: ["Paralichthys olivaceus wild preferred temperature", "olive flounder telemetry habitat temperature selection", "Paralichthys olivaceus adult field thermal habitat Korea"],
    researchCost: "HIGH", researchPriority: "MEDIUM", conversionOutlook: "STRICT_LIKELY_WITH_FIELD_SOURCE",
  },
  "BM-SPECIES-000444": {
    currentState: "Species and habitat records exist, but reviewed occurrence and distribution modelling do not provide an explicit preferred-temperature range.",
    gapCategories: ["NO_PREFERRED_EVIDENCE", "MODELLED_ONLY", "RANGE_SEMANTIC_AMBIGUOUS", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: true, applicabilityGap: false, conflictGap: false },
    strictBlocker: "No numeric source states thermal preference; nursery occurrence and model optima cannot be relabelled as preference.",
    neededEvidence: "An explicit wild thermal-selection range from tagging, field habitat selection, or behavioral preference work with confirmed species identity.",
    searchTargets: ["Trichiurus japonicus wild thermal preference", "largehead hairtail telemetry temperature selection", "Trichiurus japonicus seasonal habitat temperature preference"],
    researchCost: "VERY_HIGH", researchPriority: "MEDIUM", conversionOutlook: "STRICT_UNCERTAIN",
  },
  "BM-SPECIES-000501": {
    currentState: "Aquaculture adult and juvenile growth optima plus a wild-origin juvenile laboratory acclimation preference experiment.",
    gapCategories: ["AQUACULTURE_ONLY", "EXPERIMENTAL_ONLY", "JUVENILE_ONLY", "LIFE_STAGE_RESTRICTED", "GEOGRAPHICALLY_LIMITED", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: false, applicabilityGap: true, conflictGap: false },
    strictBlocker: "The explicit preference evidence is juvenile and acclimation-dependent; aquaculture optima cannot supply general wild semantics.",
    neededEvidence: "A general wild adult or multi-life-stage preferred range from Northwest Pacific telemetry, field selection, or wild-origin adult experiments.",
    searchTargets: ["Seriola quinqueradiata adult wild thermal preference", "yellowtail archival tag preferred temperature", "Seriola quinqueradiata seasonal migration habitat temperature Japan Korea"],
    researchCost: "MEDIUM", researchPriority: "HIGH", conversionOutlook: "STRICT_LIKELY_WITH_FIELD_SOURCE",
  },
  "BM-SPECIES-003107": {
    currentState: "The numeric range is a captive broodstock and hatchling rearing condition, not adult wild preference.",
    gapCategories: ["NO_PREFERRED_EVIDENCE", "CAPTIVE_ONLY", "LIFE_STAGE_RESTRICTED", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: true, applicabilityGap: true, conflictGap: false },
    strictBlocker: "Captive embryonic and hatchling development conditions cannot represent adult wild selection.",
    neededEvidence: "Adult wild field occurrence with explicit selection analysis or a behavioral thermal-preference study using wild-origin adults.",
    searchTargets: ["Amphioctopus fangsiao adult wild thermal preference", "webfoot octopus field habitat temperature selection", "Amphioctopus fangsiao seasonal temperature habitat Korea"],
    researchCost: "HIGH", researchPriority: "MEDIUM", conversionOutlook: "STRICT_UNCERTAIN",
  },
  "BM-SPECIES-003111": {
    currentState: "Wild immature occurrence temperatures and captive husbandry guidance are preserved separately; neither is general adult wild preference.",
    gapCategories: ["NO_PREFERRED_EVIDENCE", "OBSERVED_ONLY", "CAPTIVE_ONLY", "LIFE_STAGE_RESTRICTED", "GEOGRAPHICALLY_LIMITED", "COMPARATOR_POLICY_BLOCKED"],
    dimensions: { sourceGap: true, semanticGap: true, applicabilityGap: true, conflictGap: false },
    strictBlocker: "Observed exposure does not prove selection, the wild data are immature and regional, and husbandry guidance is captive context.",
    neededEvidence: "Adult wild telemetry or field selection evidence with explicit preferred-temperature semantics and a numeric range.",
    searchTargets: ["Enteroctopus dofleini adult wild thermal preference", "giant Pacific octopus telemetry temperature selection adult", "Enteroctopus dofleini field habitat temperature preference"],
    researchCost: "VERY_HIGH", researchPriority: "LOW", conversionOutlook: "STRICT_UNLIKELY_WITH_CURRENT_EVIDENCE",
  },
};

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function verifyInputs(root) {
  const checksums = {};
  for (const [name, [relativePath, expected]] of Object.entries(INPUTS)) {
    const actual = sha256(path.join(root, relativePath));
    if (actual !== expected) throw new Error(`${name} checksum mismatch: ${actual}`);
    checksums[name] = actual;
  }
  return checksums;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function temperatureSnapshot(profile) {
  return {
    canonical: {
      min: profile.temperature.canonicalPreferredMinC,
      max: profile.temperature.canonicalPreferredMaxC,
      unit: "degC",
    },
    preferred: profile.temperature.preferred,
    observed: profile.temperature.observed,
    spawning: profile.temperature.spawning,
  };
}

function buildAudit({ root = DEFAULT_ROOT, generatedAt = new Date().toISOString() } = {}) {
  const checksums = verifyInputs(root);
  const v3 = readJson(root, INPUTS.v3[0]);
  const species = v3.profiles.map((profile) => {
    if (profile.speciesId === "BM-SPECIES-000417") {
      return {
        speciesId: profile.speciesId,
        slug: profile.slug,
        koreanName: profile.koreanName,
        scientificName: profile.scientificName,
        role: "STRICT_CONTROL",
        currentEvidence: temperatureSnapshot(profile),
        gapCategories: [],
        strictBlocker: null,
        strictConversionRequirement: null,
        researchCost: null,
        researchPriority: null,
        conversionOutlook: "STRICT_CONTROL_PRESERVED",
      };
    }
    const audit = audits[profile.speciesId];
    if (!audit) throw new Error(`Missing gap audit: ${profile.speciesId}`);
    return {
      speciesId: profile.speciesId,
      slug: profile.slug,
      koreanName: profile.koreanName,
      scientificName: profile.scientificName,
      role: "NON_STRICT_AUDIT_TARGET",
      currentState: audit.currentState,
      currentEvidence: temperatureSnapshot(profile),
      gapCategories: audit.gapCategories,
      gapDimensions: audit.dimensions,
      strictBlocker: audit.strictBlocker,
      strictConversionRequirement: audit.neededEvidence,
      searchTargets: audit.searchTargets,
      preferredSourceOrder: SOURCE_ORDER,
      researchCost: audit.researchCost,
      researchPriority: audit.researchPriority,
      conversionOutlook: audit.conversionOutlook,
    };
  });

  const targets = species.filter((item) => item.role === "NON_STRICT_AUDIT_TARGET");
  const categoryCounts = {};
  for (const item of targets)
    for (const category of item.gapCategories)
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    audit: "WILD_PREFERRED_TEMPERATURE_SOURCE_GAP_AUDIT_V1",
    decision: "CLEAR_RESEARCH_TARGETS_IDENTIFIED",
    decisionRationale: "Every non-strict species has an explicit evidence gap and conversion requirement; three commercially relevant species with direct experimental preference evidence have bounded next-search targets, while no evidence is promoted or merged.",
    speciesTotal: species.length,
    strictControlCount: 1,
    auditedNonStrictCount: targets.length,
    gapDimensionCounts: {
      sourceGaps: targets.filter((item) => item.gapDimensions.sourceGap).length,
      semanticGaps: targets.filter((item) => item.gapDimensions.semanticGap).length,
      applicabilityGaps: targets.filter((item) => item.gapDimensions.applicabilityGap).length,
      conflictGaps: targets.filter((item) => item.gapDimensions.conflictGap).length,
    },
    blockerCountsByCategory: categoryCounts,
    strictCriteria: [
      "NUMERIC_MIN_MAX",
      "UNIT_CONFIRMED_DEGC",
      "EXPLICIT_PREFERRED_SEMANTICS",
      "WILD_CONTEXT",
      "GENERAL_APPLICABILITY",
      "NON_AQUACULTURE",
      "NON_CAPTIVE",
      "EVIDENCE_REFERENCE",
      "SUFFICIENT_SOURCE_AUTHORITY",
      "NO_UNRESOLVED_TEMPERATURE_CONFLICT",
      "COMPARATOR_COMPATIBLE_SOURCE",
      "SOURCE_POLICY_AND_GATES_USABLE",
    ],
    nextResearchBatch: [
      { speciesId: "BM-SPECIES-000755", koreanName: "참돔", priority: "HIGH", reason: "Explicit wild-origin preference evidence exists; adult or field applicability is the bounded missing link." },
      { speciesId: "BM-SPECIES-000012", koreanName: "조피볼락", priority: "HIGH", reason: "Explicit thermal preference is available for young fish; adult Korean field applicability is the bounded missing link." },
      { speciesId: "BM-SPECIES-000501", koreanName: "방어", priority: "HIGH", reason: "Commercially important species with explicit wild-origin juvenile preference evidence and plausible tagging literature targets." },
    ],
    species,
    existingConflictNote: {
      speciesId: "BM-SPECIES-000501",
      field: "depth.observed",
      status: "CONFLICT_REVIEW_REQUIRED",
      temperatureEligibilityEffect: "FIELD_SEPARATE_NO_AUTOMATIC_TEMPERATURE_BLOCK",
      note: "The MBRIS <=200m and FishBase <=100m depth conflict remains unresolved and canonical depth remains null. It is not a temperature conflict.",
    },
    immutableInputs: checksums,
    boundaries: {
      evidenceAdded: false,
      preferredRangeAdded: false,
      canonicalRangeChanged: false,
      v3Activated: false,
      runtimeChanged: false,
      databaseChanged: false,
      supabaseChanged: false,
      externalAiCalled: false,
      numericScoringAllowed: false,
      normalization: "NORMALIZATION_NOT_JUSTIFIED",
      weightingAllowed: false,
      probabilityAllowed: false,
      orderingAllowed: false,
      productAdviceAllowed: false,
    },
  };
}

function writeAudit(root, report) {
  const output = path.join(root, REPORT_PATH);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const report = buildAudit();
  writeAudit(DEFAULT_ROOT, report);
  process.stdout.write(JSON.stringify({ decision: report.decision, species: report.speciesTotal, audited: report.auditedNonStrictCount, gapDimensions: report.gapDimensionCounts }));
}

if (require.main === module) main();
module.exports = { INPUTS, REPORT_PATH, SOURCE_ORDER, audits, buildAudit };

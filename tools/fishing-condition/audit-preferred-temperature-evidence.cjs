/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ROOT = path.resolve(__dirname, "../..");
const V2_PATH = "data/fishing-condition/species-environment/v2/species-environment-profiles.json";
const V3_PATH = "data/fishing-condition/species-environment/v3/species-environment-profiles.json";
const REPORT_PATH = "reports/fishing-condition/preferred-wild-temperature-enrichment-v1.json";
const DIFF_PATH = "reports/fishing-condition/species-environment-v2-v3-temperature-diff.json";
const EXPECTED_V2_SHA256 = "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98";

const KAISEIKEN_URL = "https://www.kaiseiken.or.jp/publish/reports/lib/2002_04_02.pdf";
const ROCKFISH_URL = "https://www.jstage.jst.go.jp/article/suisan1932/63/3/63_3_317/_article/-char/en";

const additions = {
  "BM-SPECIES-000755": {
    range: { minC: 18.4, maxC: 25.4, context: "EXPERIMENTAL_TEMPERATURE_PREFERENCE_ACCLIMATION_DEPENDENT", lifeStage: "JUVENILE", regionScope: "JAPAN_WILD_ORIGIN_LAB_ACCLIMATED", evidenceIds: ["pagrus-kaiseiken-preference-2002"] },
    evidence: { id: "pagrus-kaiseiken-preference-2002", sourceName: "Marine Ecology Research Institute", sourceType: "RESEARCH_INSTITUTE_REPORT", title: "Experimental study on temperature preference of Japanese marine fish", url: KAISEIKEN_URL, year: 2002, species: "참돔", scientificName: "Pagrus major", temperature: { min: 18.4, max: 25.4, unit: "degC" }, rangeType: "EXPERIMENTAL_PREFERRED_ACCLIMATION_DEPENDENT", lifeStage: "JUVENILE", geographicContext: "Japan; wild-origin fish subsequently held and acclimated in laboratory", seasonContext: null, evidenceStrength: "MEDIUM", notes: "Temperature-gradient preference range across acclimation treatments; source reports 25.3 degC final preferendum. Not a general wild field range." },
  },
  "BM-SPECIES-000751": {
    range: { minC: 29, maxC: 30, context: "EXPERIMENTAL_FINAL_PREFERENDUM_APPROXIMATE", lifeStage: "JUVENILE", regionScope: "JAPAN_LAB_REARED", evidenceIds: ["blackporgy-kaiseiken-preference-2002"] },
    evidence: { id: "blackporgy-kaiseiken-preference-2002", sourceName: "Marine Ecology Research Institute", sourceType: "RESEARCH_INSTITUTE_REPORT", title: "Experimental study on temperature preference of Japanese marine fish", url: KAISEIKEN_URL, year: 2002, species: "감성돔", scientificName: "Acanthopagrus schlegelii", temperature: { min: 29, max: 30, unit: "degC" }, rangeType: "EXPERIMENTAL_FINAL_PREFERENDUM_APPROXIMATE", lifeStage: "JUVENILE", geographicContext: "Japan; laboratory-reared from eyed eggs", seasonContext: null, evidenceStrength: "MEDIUM", notes: "Narrative reports an approximately 29-30 degC final preferendum. Laboratory origin and life-stage scope prohibit general wild promotion." },
  },
  "BM-SPECIES-000188": {
    range: { minC: 29, maxC: 30, context: "EXPERIMENTAL_FINAL_PREFERENDUM_APPROXIMATE", lifeStage: "JUVENILE", regionScope: "JAPAN_LAB_REARED", evidenceIds: ["seabass-kaiseiken-preference-2002"] },
    evidence: { id: "seabass-kaiseiken-preference-2002", sourceName: "Marine Ecology Research Institute", sourceType: "RESEARCH_INSTITUTE_REPORT", title: "Experimental study on temperature preference of Japanese marine fish", url: KAISEIKEN_URL, year: 2002, species: "농어", scientificName: "Lateolabrax japonicus", temperature: { min: 29, max: 30, unit: "degC" }, rangeType: "EXPERIMENTAL_FINAL_PREFERENDUM_APPROXIMATE", lifeStage: "JUVENILE", geographicContext: "Japan; laboratory-reared after artificial fertilization", seasonContext: null, evidenceStrength: "MEDIUM", notes: "Narrative reports an approximately 29-30 degC final preferendum. Oxygen and acclimation affect preference; not a general wild range." },
  },
  "BM-SPECIES-000012": {
    range: { minC: 17.8, maxC: 22.8, context: "EXPERIMENTAL_TEMPERATURE_PREFERENCE_ACCLIMATION_INDEPENDENT", lifeStage: "YOUNG", regionScope: "JAPAN_LAB_EXPERIMENT", evidenceIds: ["rockfish-jstage-preference-1997"] },
    evidence: { id: "rockfish-jstage-preference-1997", sourceName: "Japanese Society of Fisheries Science", sourceType: "PEER_REVIEWED_PAPER", title: "Temperature Responses of Young Schlegel's Black Rockfish Sebastes schlegelii", url: ROCKFISH_URL, year: 1997, species: "조피볼락", scientificName: "Sebastes schlegelii", temperature: { min: 17.8, max: 22.8, unit: "degC" }, rangeType: "EXPERIMENTAL_PREFERRED_TEMPERATURE", lifeStage: "YOUNG", geographicContext: "Japan; laboratory temperature-gradient experiment", seasonContext: null, evidenceStrength: "MEDIUM", notes: "Explicit preference test across 15-28 degC acclimation; final preferendum estimated near 20.5 degC. Young-fish experimental scope prevents general wild promotion." },
  },
  "BM-SPECIES-000501": {
    range: { minC: 20.8, maxC: 27.2, context: "EXPERIMENTAL_TEMPERATURE_PREFERENCE_ACCLIMATION_DEPENDENT", lifeStage: "JUVENILE", regionScope: "JAPAN_WILD_ORIGIN_LAB_ACCLIMATED", evidenceIds: ["yellowtail-kaiseiken-preference-2002"] },
    evidence: { id: "yellowtail-kaiseiken-preference-2002", sourceName: "Marine Ecology Research Institute", sourceType: "RESEARCH_INSTITUTE_REPORT", title: "Experimental study on temperature preference of Japanese marine fish", url: KAISEIKEN_URL, year: 2002, species: "방어", scientificName: "Seriola quinqueradiata", temperature: { min: 20.8, max: 27.2, unit: "degC" }, rangeType: "EXPERIMENTAL_PREFERRED_ACCLIMATION_DEPENDENT", lifeStage: "JUVENILE", geographicContext: "Japan; wild-origin fish subsequently held and acclimated in laboratory", seasonContext: null, evidenceStrength: "MEDIUM", notes: "Temperature-gradient preference range across acclimation treatments; source reports 26.9 degC final preferendum. Life-stage and acclimation limits prevent general wild promotion." },
  },
};

const auditNotes = {
  "BM-SPECIES-000755": { result: "LIMITED", sourcesChecked: ["MBRIS", "FishBase/AquaMaps", KAISEIKEN_URL], reason: "NEW_EXPERIMENTAL_PREFERENCE_IS_JUVENILE_AND_LAB_ACCLIMATED" },
  "BM-SPECIES-000751": { result: "LIMITED", sourcesChecked: ["MBRIS", "FishBase/AquaMaps", KAISEIKEN_URL], reason: "NEW_FINAL_PREFERENDUM_IS_APPROXIMATE_AND_LAB_REARED_JUVENILE" },
  "BM-SPECIES-000188": { result: "LIMITED", sourcesChecked: ["MBRIS", "FishBase/AquaMaps", KAISEIKEN_URL], reason: "NEW_FINAL_PREFERENDUM_IS_APPROXIMATE_AND_LAB_REARED_JUVENILE" },
  "BM-SPECIES-000012": { result: "LIMITED", sourcesChecked: ["FishBase/AquaMaps", ROCKFISH_URL, KAISEIKEN_URL], reason: "NEW_EXPLICIT_PREFERENCE_IS_YOUNG_FISH_LAB_EXPERIMENT" },
  "BM-SPECIES-000465": { result: "LIMITED", sourcesChecked: ["MBRIS", "FishBase/AquaMaps", "https://www.jstage.jst.go.jp/article/fishsci1994/60/5/60_5_527/_article"], reason: "AVAILABLE_20_25_DEGC_RANGE_IS_AQUACULTURE_GROWTH_OPTIMUM" },
  "BM-SPECIES-000444": { result: "PREFERRED_NOT_FOUND", sourcesChecked: ["MBRIS", "FishBase", "https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2021.779144/full"], reason: "NURSERY_OCCURRENCE_AND_MODEL_OPTIMA_ARE_NOT_THERMAL_PREFERENCE" },
  "BM-SPECIES-000417": { result: "STRICT", sourcesChecked: ["MBRIS", "FishBase/AquaMaps", "https://meetings.pices.int/publications/book-of-abstracts/PICES-2022-Book-of-Abstracts.pdf"], reason: "EXISTING_KOREAN_MBRIS_PREFERRED_RANGE_REMAINS_CANONICAL" },
  "BM-SPECIES-000501": { result: "LIMITED", sourcesChecked: ["MBRIS", "FAO aquaculture", KAISEIKEN_URL], reason: "NEW_EXPERIMENTAL_PREFERENCE_IS_JUVENILE_AND_LAB_ACCLIMATED" },
  "BM-SPECIES-003107": { result: "PREFERRED_NOT_FOUND", sourcesChecked: ["MBRIS", "FishBase", "https://doi.org/10.1016/j.fishres.2019.105479"], reason: "AVAILABLE_NUMERIC_RANGE_IS_CAPTIVE_EMBRYONIC_DEVELOPMENT" },
  "BM-SPECIES-003111": { result: "LIMITED", sourcesChecked: ["MBRIS", "FishBase/SeaLifeBase", "https://www.jstage.jst.go.jp/article/suisan/92/4/92_25-00036/_article/-char/en"], reason: "WILD_IMMATURE_EXPOSURE_AND_CAPTIVE_HUSBANDRY_ARE_NOT_GENERAL_PREFERENCE" },
};

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function writeJson(root, relativePath, value) {
  const output = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isStrict(profile) {
  const min = profile.temperature.canonicalPreferredMinC;
  const max = profile.temperature.canonicalPreferredMaxC;
  const matching = profile.temperature.preferred.filter((item) => item.minC === min && item.maxC === max);
  return Number.isFinite(min) && Number.isFinite(max)
    && matching.some((item) => item.context === "PREFERRED_TEMPERATURE" && item.regionScope === "KOREA" && item.evidenceIds.length > 0)
    && !profile.conflicts.some((item) => item.field === "temperature" || item.field.startsWith("temperature."));
}

function beforeReadiness(profile) {
  if (isStrict(profile)) return "STRICT";
  const name = profile.koreanName;
  if (["참돔", "감성돔", "농어", "조피볼락", "넙치", "문어"].includes(name)) return "LIMITED";
  return "NOT_READY";
}

function afterReadiness(profile) {
  if (isStrict(profile)) return "STRICT";
  if (auditNotes[profile.speciesId].result === "LIMITED") return "LIMITED";
  return "NOT_READY";
}

function profileStatus(profile) {
  if (profile.profileStatus === "CONFLICT_REVIEW_REQUIRED") return "CONFLICT_REVIEW_REQUIRED";
  if (profile.speciesId === "BM-SPECIES-000417" || additions[profile.speciesId]) return "PREFERRED_EVIDENCE_ENRICHED";
  if (auditNotes[profile.speciesId].result === "PREFERRED_NOT_FOUND") return "PREFERRED_NOT_FOUND";
  return "PARTIAL";
}

function buildArtifacts({ root = DEFAULT_ROOT, generatedAt = new Date().toISOString() } = {}) {
  const v2Path = path.join(root, V2_PATH);
  const v2Hash = sha256(v2Path);
  if (v2Hash !== EXPECTED_V2_SHA256) throw new Error(`V2 checksum mismatch: ${v2Hash}`);
  const v2 = readJson(v2Path);
  const profiles = clone(v2.profiles);

  for (const profile of profiles) {
    const addition = additions[profile.speciesId];
    if (addition) {
      profile.temperature.preferred.push(addition.range);
      profile.evidence.push(addition.evidence);
    }
    profile.profileStatus = profileStatus(profile);
  }

  const v3 = {
    schemaVersion: "3.0.0-candidate",
    sourceId: "blue-marina-species-environment-v3-candidate",
    generatedAt,
    identitySource: v2.identitySource,
    profileCount: profiles.length,
    baseSourceId: v2.sourceId,
    baseArtifactSha256: v2Hash,
    activationStatus: "INACTIVE_RESEARCH_CANDIDATE",
    enrichmentPolicy: {
      canonicalRangeReplacement: false,
      observedPromotion: false,
      modelledPromotion: false,
      aquaculturePromotion: false,
      captivePromotion: false,
      spawningPromotion: false,
      numericScoring: false,
      normalization: "NORMALIZATION_NOT_JUSTIFIED",
    },
    profiles,
  };

  const rows = profiles.map((profile) => {
    const before = v2.profiles.find((item) => item.speciesId === profile.speciesId);
    const addition = additions[profile.speciesId] ?? null;
    return {
      speciesId: profile.speciesId,
      slug: profile.slug,
      koreanName: profile.koreanName,
      scientificName: profile.scientificName,
      sourcesChecked: auditNotes[profile.speciesId].sourcesChecked,
      addedEvidence: addition ? [addition.evidence] : [],
      canonicalRangeBefore: { min: before.temperature.canonicalPreferredMinC, max: before.temperature.canonicalPreferredMaxC, unit: "degC" },
      canonicalRangeAfter: { min: profile.temperature.canonicalPreferredMinC, max: profile.temperature.canonicalPreferredMaxC, unit: "degC" },
      canonicalChanged: false,
      readinessBefore: beforeReadiness(before),
      readinessAfter: afterReadiness(profile),
      status: profile.profileStatus,
      reason: auditNotes[profile.speciesId].reason,
    };
  });

  const beforeCounts = { strict: rows.filter((row) => row.readinessBefore === "STRICT").length, limited: rows.filter((row) => row.readinessBefore === "LIMITED").length, notReady: rows.filter((row) => row.readinessBefore === "NOT_READY").length };
  const afterCounts = { strict: rows.filter((row) => row.readinessAfter === "STRICT").length, limited: rows.filter((row) => row.readinessAfter === "LIMITED").length, notReady: rows.filter((row) => row.readinessAfter === "NOT_READY").length };
  const evidenceBefore = v2.profiles.reduce((sum, profile) => sum + profile.evidence.length, 0);
  const preferredBefore = v2.profiles.reduce((sum, profile) => sum + profile.temperature.preferred.length, 0);
  const sourceDistribution = {};
  for (const addition of Object.values(additions)) sourceDistribution[addition.evidence.sourceType] = (sourceDistribution[addition.evidence.sourceType] ?? 0) + 1;

  const report = {
    schemaVersion: "1.0.0",
    generatedAt,
    audit: "PREFERRED_WILD_TEMPERATURE_EVIDENCE_ENRICHMENT_V1",
    decision: "LIMITED_EVIDENCE_ONLY",
    decisionRationale: "Five explicit thermal-preference experiments were found, but all are restricted by life stage, laboratory acclimation, laboratory origin, or approximate final-preferendum reporting; none establishes a general wild preferred range for a new strict candidate.",
    speciesCount: rows.length,
    v2Sha256Before: v2Hash,
    v2Sha256After: sha256(v2Path),
    evidence: { before: evidenceBefore, after: evidenceBefore + Object.keys(additions).length, added: Object.keys(additions).length, preferredBefore, preferredAfter: preferredBefore + Object.keys(additions).length, addedSourceDistribution: sourceDistribution },
    readiness: { before: beforeCounts, after: afterCounts, newlyStrictSpecies: [], newlyLimitedSpecies: rows.filter((row) => row.readinessBefore !== "LIMITED" && row.readinessAfter === "LIMITED").map((row) => row.koreanName) },
    species: rows,
    conflicts: profiles.flatMap((profile) => profile.conflicts.map((conflict) => ({ speciesId: profile.speciesId, koreanName: profile.koreanName, ...conflict }))),
    preferredNotFound: rows.filter((row) => row.status === "PREFERRED_NOT_FOUND").map((row) => ({ speciesId: row.speciesId, koreanName: row.koreanName, reason: row.reason })),
    scoringBoundary: { normalization: "NORMALIZATION_NOT_JUSTIFIED", productionApproval: false, runtimeChanges: false, databaseWrites: false, supabaseChanges: false, externalAiCalls: false },
  };

  const diff = {
    schemaVersion: "1.0.0",
    generatedAt,
    comparison: "SPECIES_ENVIRONMENT_V2_TO_V3_TEMPERATURE_ONLY",
    v2Sha256: v2Hash,
    addedEvidence: rows.flatMap((row) => row.addedEvidence.map((evidence) => ({ speciesId: row.speciesId, koreanName: row.koreanName, evidenceId: evidence.id, rangeType: evidence.rangeType, temperature: evidence.temperature }))),
    changedTemperatureFields: rows.filter((row) => row.addedEvidence.length > 0).map((row) => ({ speciesId: row.speciesId, field: "temperature.preferred", canonicalRangeChanged: false })),
    unchangedSpecies: rows.filter((row) => row.addedEvidence.length === 0).map((row) => row.speciesId),
    conflicts: report.conflicts,
    statusTransitions: rows.map((row) => ({ speciesId: row.speciesId, from: v2.profiles.find((item) => item.speciesId === row.speciesId).profileStatus, to: row.status })),
    identityChanges: [],
    productionActivation: false,
  };
  return { v3, report, diff };
}

function main() {
  const artifacts = buildArtifacts();
  writeJson(DEFAULT_ROOT, V3_PATH, artifacts.v3);
  writeJson(DEFAULT_ROOT, REPORT_PATH, artifacts.report);
  writeJson(DEFAULT_ROOT, DIFF_PATH, artifacts.diff);
  process.stdout.write(JSON.stringify({ decision: artifacts.report.decision, strictBefore: artifacts.report.readiness.before.strict, strictAfter: artifacts.report.readiness.after.strict, evidenceAdded: artifacts.report.evidence.added, v3: V3_PATH }));
}

if (require.main === module) main();
module.exports = { EXPECTED_V2_SHA256, additions, auditNotes, buildArtifacts, isStrict };

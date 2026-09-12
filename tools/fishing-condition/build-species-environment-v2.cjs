const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const v1Path = path.join(root, "data/fishing-condition/species-environment/v1/species-environment-profiles.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const diffPath = path.join(root, "reports/fishing-condition/species-environment-v2-diff.json");
const auditPath = path.join(root, "reports/fishing-condition/species-environment-profile-audit-v2.json");
const accessedAt = "2026-09-11";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const v1Text = fs.readFileSync(v1Path, "utf8");
const v1 = JSON.parse(v1Text);
const v2 = structuredClone(v1);
v2.schemaVersion = "2.0.0";
v2.sourceId = "blue-marina-species-environment-v2";
v2.generatedAt = "2026-09-11T00:00:00.000Z";
v2.baseSourceId = v1.sourceId;
v2.baseArtifactSha256 = sha256(v1Text);
v2.enrichmentPolicy = {
  sourceBackedOnly: true,
  preserveRegionalAndLifeStageContext: true,
  noInterpolation: true,
  noScoreBoundary: true,
};

function profile(koreanName) {
  const value = v2.profiles.find((item) => item.koreanName === koreanName);
  if (!value) throw new Error(`Missing profile: ${koreanName}`);
  return value;
}

function addEvidence(target, evidence) {
  if (target.evidence.some((item) => item.id === evidence.id)) throw new Error(`Duplicate evidence: ${evidence.id}`);
  target.evidence.push({ ...evidence, accessedAt });
  if (target.profileStatus !== "CONFLICT_REVIEW_REQUIRED") target.profileStatus = "EVIDENCE_ENRICHED";
}

function addModelledPreferred(koreanName, id, minC, maxC, url, cellCount) {
  const target = profile(koreanName);
  addEvidence(target, {
    id,
    sourceType: "FISHBASE",
    title: `FishBase AquaMaps modelled preferred temperature: ${target.scientificName}`,
    url,
    publicationYear: null,
    regionScope: "GLOBAL",
    evidenceType: "MODELLED_PREFERRED_TEMPERATURE",
    quoteOrSummary: `FishBase가 AquaMaps occurrence-cell model로 ${minC}~${maxC}°C 범위를 제시한다(${cellCount} cells). 현장 실측 범위와 혼합하지 않는다.`,
    officialDatasetId: "FishBase Ref. 123201",
  });
  target.temperature.preferred.push({
    minC,
    maxC,
    context: "MODELLED_PREFERRED_TEMPERATURE_AQUAMAPS",
    lifeStage: "UNSPECIFIED",
    regionScope: "GLOBAL",
    evidenceIds: [id],
  });
  target.temperature.canonicalPreferredMinC = minC;
  target.temperature.canonicalPreferredMaxC = maxC;
  target.unsupportedFields = target.unsupportedFields.filter((field) => !field.startsWith("temperature"));
}

addModelledPreferred("참돔", "pagrus-fishbase-temperature-v2", 17, 24.4, "https://www.fishbase.se/summary/Pagrus-major.html", 143);
addModelledPreferred("감성돔", "blackporgy-fishbase-temperature-v2", 13.1, 25.4, "https://www.fishbase.se/summary/6531", 68);
addModelledPreferred("농어", "seabass-fishbase-temperature-v2", 12.7, 26.3, "https://www.fishbase.se/summary/Lateolabrax-japonicus.html", 180);
addModelledPreferred("조피볼락", "rockfish-fishbase-temperature-v2", 8, 21.3, "https://www.fishbase.se/summary/6534", 86);
addModelledPreferred("넙치", "flounder-fishbase-temperature-v2", 8.6, 25, "https://www.fishbase.se/summary/Paralichthys_olivaceus.html", 241);

{
  const target = profile("고등어");
  addEvidence(target, {
    id: "mackerel-fishbase-temperature-v2",
    sourceType: "FISHBASE",
    title: "FishBase AquaMaps modelled preferred temperature: Scomber japonicus",
    url: "https://www.fishbase.se/summary/Scomber-japonicus.html",
    publicationYear: null,
    regionScope: "GLOBAL",
    evidenceType: "MODELLED_PREFERRED_TEMPERATURE",
    quoteOrSummary: "FishBase가 AquaMaps occurrence-cell model로 9.3~27.7°C를 제시한다(1,526 cells). 한국 MBRIS 15~16°C canonical 범위보다 우선하지 않는다.",
    officialDatasetId: "FishBase Ref. 123201",
  });
  target.temperature.preferred.push({
    minC: 9.3,
    maxC: 27.7,
    context: "MODELLED_PREFERRED_TEMPERATURE_AQUAMAPS_SECONDARY",
    lifeStage: "UNSPECIFIED",
    regionScope: "GLOBAL",
    evidenceIds: ["mackerel-fishbase-temperature-v2"],
  });
}

{
  const target = profile("방어");
  addEvidence(target, {
    id: "amberjack-fao-aquaculture-v2",
    sourceType: "FAO",
    title: "FAO Cultured Aquatic Species Information Programme: Seriola quinqueradiata",
    url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_japaneseamberjack.htm",
    publicationYear: null,
    regionScope: "NORTHWEST_PACIFIC",
    evidenceType: "AQUACULTURE_TEMPERATURE_SALINITY_DO_LIFE_STAGE_MIGRATION",
    quoteOrSummary: "성어 최적 성장 20~26°C, 유어 최적 성장 22~27°C, 양식 최적 염분 30~36‰, 4.3mg/L 미만에서 이상행동을 보고한다. 야생 선호·치사 한계로 일반화하지 않는다.",
    officialDatasetId: "FAO Cultured Aquatic Species Programme",
  });
  target.temperature.preferred.push(
    { minC: 20, maxC: 26, context: "AQUACULTURE_ADULT_OPTIMUM_GROWTH_NOT_WILD_PREFERENCE", lifeStage: "ADULT", regionScope: "NORTHWEST_PACIFIC", evidenceIds: ["amberjack-fao-aquaculture-v2"] },
    { minC: 22, maxC: 27, context: "AQUACULTURE_JUVENILE_MAXIMUM_GROWTH_NOT_WILD_PREFERENCE", lifeStage: "JUVENILE", regionScope: "NORTHWEST_PACIFIC", evidenceIds: ["amberjack-fao-aquaculture-v2"] },
  );
  target.temperature.canonicalPreferredMinC = 20;
  target.temperature.canonicalPreferredMaxC = 26;
  target.salinity.ranges.push({ min: 30, max: 36, unit: "permille", context: "AQUACULTURE_OPTIMUM_NOT_WILD_PREFERENCE", regionScope: "NORTHWEST_PACIFIC", evidenceIds: ["amberjack-fao-aquaculture-v2"] });
  target.salinity.canonicalMin = 30;
  target.salinity.canonicalMax = 36;
  target.salinity.unit = "permille";
  target.dissolvedOxygen.observations.push({ minMgL: 4.3, maxMgL: null, context: "AQUACULTURE_BEHAVIORAL_ABNORMALITY_THRESHOLD_NOT_MORTALITY", regionScope: "NORTHWEST_PACIFIC", evidenceIds: ["amberjack-fao-aquaculture-v2"] });
  target.dissolvedOxygen.minimumMgL = 4.3;
  target.dissolvedOxygen.sensitivity = "ABNORMAL_BEHAVIOR_REPORTED_BELOW_4_3_MG_L_IN_AQUACULTURE";
  target.spawning.push({ months: [], seasons: [], temperatureMinC: null, temperatureMaxC: null, depthMinM: 200, depthMaxM: 200, regionScope: "NORTHWEST_PACIFIC", evidenceIds: ["amberjack-fao-aquaculture-v2"] });
  target.migration.push({ movement: "SOUTHWARD_SPAWNING_MIGRATION", months: [], seasons: [], lifeStage: "ADULT", regionScope: "NORTHWEST_PACIFIC", summary: "성숙 개체가 산란을 위해 남하하는 생활사를 FAO가 기술한다.", evidenceIds: ["amberjack-fao-aquaculture-v2"] });
  target.unsupportedFields = target.unsupportedFields.filter((field) => !["temperature", "salinity", "dissolvedOxygen", "spawning"].includes(field));
}

{
  const target = profile("문어");
  addEvidence(target, {
    id: "gpo-hokkaido-temperature-v2",
    sourceType: "PAPER",
    title: "Ecology of immature octopus Enteroctopus dofleini: Growth, movement and behaviour",
    url: "https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/52601/3/PatriciaRRigby_2004.pdf",
    publicationYear: 2004,
    regionScope: "OTHER_REGIONAL",
    evidenceType: "WILD_IMMATURE_OBSERVED_TEMPERATURE",
    quoteOrSummary: "홋카이도 분카만의 미성숙 개체가 5~14°C 수온에서 관찰되며, 범위 밖 계절에는 심층으로 이동한다고 정리한다.",
    doi: null,
  });
  addEvidence(target, {
    id: "gpo-seasonal-migration-temperature-v2",
    sourceType: "PAPER",
    title: "Effect of water temperature on seasonal vertical migration of the immature North Pacific giant octopus",
    url: "https://www.jstage.jst.go.jp/article/suisan/92/4/92_25-00036/_article/-char/en",
    publicationYear: 2026,
    regionScope: "OTHER_REGIONAL",
    evidenceType: "WILD_IMMATURE_TEMPERATURE_MIGRATION",
    quoteOrSummary: "소야 해협 표지재포 연구에서 12~4월 연안의 -1.5~5°C 노출과 6~7월 10~20°C 상승 시 심층 이동을 보고한다.",
    doi: "10.2331/suisan.25-00036",
  });
  addEvidence(target, {
    id: "gpo-husbandry-water-quality-v2",
    sourceType: "PAPER",
    title: "Characterization of Current Husbandry and Veterinary Care Practices of the Giant Pacific Octopus",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10385140/",
    publicationYear: 2023,
    regionScope: "GLOBAL",
    evidenceType: "CAPTIVE_HUSBANDRY_TEMPERATURE_SALINITY_DO",
    quoteOrSummary: "기관 사육 조사와 AZA 지침의 수온 6~12°C, 염분 28~33ppt, DO 85~95% saturation을 정리한다. 야생 선호나 mg/L 한계로 변환하지 않는다.",
    doi: "10.3390/vetsci10070448",
  });
  target.temperature.observed.push({ minC: 5, maxC: 14, context: "WILD_IMMATURE_OCCURRENCE_TEMPERATURE", lifeStage: "IMMATURE", regionScope: "OTHER_REGIONAL", evidenceIds: ["gpo-hokkaido-temperature-v2"] });
  target.temperature.preferred.push({ minC: 6, maxC: 12, context: "CAPTIVE_HUSBANDRY_RECOMMENDED_NOT_WILD_PREFERENCE", lifeStage: "UNSPECIFIED", regionScope: "GLOBAL", evidenceIds: ["gpo-husbandry-water-quality-v2"] });
  target.salinity.ranges.push({ min: 28, max: 33, unit: "ppt", context: "CAPTIVE_HUSBANDRY_RECOMMENDED_NOT_WILD_PREFERENCE", regionScope: "GLOBAL", evidenceIds: ["gpo-husbandry-water-quality-v2"] });
  target.dissolvedOxygen.observations.push({ minMgL: null, maxMgL: null, context: "CAPTIVE_HUSBANDRY_85_TO_95_PERCENT_SATURATION_NOT_CONVERTED", regionScope: "GLOBAL", evidenceIds: ["gpo-husbandry-water-quality-v2"] });
  target.migration.push(
    { movement: "SHALLOW_COASTAL_RESIDENCE", months: [12, 1, 2, 3, 4], seasons: [], lifeStage: "IMMATURE", regionScope: "OTHER_REGIONAL", summary: "소야 해협 미성숙 개체는 12~4월 얕은 연안에 머물렀다.", evidenceIds: ["gpo-seasonal-migration-temperature-v2"] },
    { movement: "OFFSHORE_DEEPER", months: [6, 7], seasons: [], lifeStage: "IMMATURE", regionScope: "OTHER_REGIONAL", summary: "연안 수온이 10~20°C로 상승한 6~7월 더 깊은 수역으로 이동했다.", evidenceIds: ["gpo-seasonal-migration-temperature-v2"] },
  );
  target.unsupportedFields = target.unsupportedFields.filter((field) => field !== "temperature.canonical");
}

const v1ById = new Map(v1.profiles.map((item) => [item.speciesId, item]));
const hasTemperature = (item) => item.temperature.preferred.length + item.temperature.observed.length + item.temperature.spawning.length > 0;
const temperatureComparable = (item) => (
  item.temperature.canonicalPreferredMinC !== null && item.temperature.canonicalPreferredMaxC !== null
) || item.temperature.observed.some((range) => range.minC !== null && range.minC !== undefined && range.maxC !== null && range.maxC !== undefined);
const hasSalinity = (item) => item.salinity.ranges.length > 0 || item.salinity.qualitative.length > 0;
const hasDo = (item) => item.dissolvedOxygen.observations.length > 0 || item.dissolvedOxygen.minimumMgL !== null;
const hasSpawning = (item) => item.spawning.length > 0;
const hasSeasonMonth = (item) => [...item.spawning, ...item.migration, ...item.seasonality].some((fact) => fact.months.length > 0);
const count = (profiles, predicate) => profiles.filter(predicate).length;
const sourceDistribution = Object.fromEntries([...new Set(v2.profiles.flatMap((item) => item.evidence.map((evidence) => evidence.sourceType)))].sort().map((type) => [type, v2.profiles.flatMap((item) => item.evidence).filter((item) => item.sourceType === type).length]));

const coverage = (profiles) => ({
  temperature: count(profiles, hasTemperature),
  salinity: count(profiles, hasSalinity),
  dissolvedOxygen: count(profiles, hasDo),
  activity: count(profiles, (item) => item.activityPeriod !== "UNKNOWN"),
  seasonalityMonthComparable: count(profiles, hasSeasonMonth),
  spawning: count(profiles, hasSpawning),
});

writeJson(v2Path, v2);
const v2Text = fs.readFileSync(v2Path, "utf8");
const addedEvidence = v2.profiles.flatMap((item) => {
  const beforeIds = new Set(v1ById.get(item.speciesId).evidence.map((evidence) => evidence.id));
  return item.evidence.filter((evidence) => !beforeIds.has(evidence.id)).map((evidence) => ({ speciesId: item.speciesId, koreanName: item.koreanName, evidenceId: evidence.id, evidenceType: evidence.evidenceType }));
});
const changedCanonicalRanges = v2.profiles.flatMap((item) => {
  const before = v1ById.get(item.speciesId);
  const fields = [];
  if (before.temperature.canonicalPreferredMinC !== item.temperature.canonicalPreferredMinC || before.temperature.canonicalPreferredMaxC !== item.temperature.canonicalPreferredMaxC) fields.push("temperature.preferred");
  if (before.salinity.canonicalMin !== item.salinity.canonicalMin || before.salinity.canonicalMax !== item.salinity.canonicalMax || before.salinity.unit !== item.salinity.unit) fields.push("salinity");
  if (before.dissolvedOxygen.minimumMgL !== item.dissolvedOxygen.minimumMgL) fields.push("dissolvedOxygen.minimum");
  return fields.map((field) => ({ speciesId: item.speciesId, koreanName: item.koreanName, field }));
});

const beforeCoverage = coverage(v1.profiles);
const afterCoverage = coverage(v2.profiles);
const beforeComparable = count(v1.profiles, temperatureComparable);
const afterComparable = count(v2.profiles, temperatureComparable);
const unresolvedConflicts = v2.profiles.flatMap((item) => item.conflicts.map((conflict) => ({ speciesId: item.speciesId, koreanName: item.koreanName, ...conflict })));

const searchLog = v2.profiles.map((item) => {
  const added = addedEvidence.filter((evidence) => evidence.speciesId === item.speciesId).map((evidence) => evidence.evidenceId);
  const rejected = [];
  if (!hasTemperature(item)) rejected.push({ field: "temperature", reason: "No source-backed complete range found" });
  if (item.salinity.canonicalMin === null) rejected.push({ field: "salinity", reason: "No wild numeric preference with a runtime-compatible documented unit" });
  if (item.dissolvedOxygen.minimumMgL === null) rejected.push({ field: "dissolvedOxygen", reason: "No species threshold in mg/L; husbandry values were not promoted" });
  if (item.activityPeriod === "UNKNOWN") rejected.push({ field: "activity", reason: "No species-specific diel classification found in reviewed authority sources" });
  return {
    speciesId: item.speciesId,
    koreanName: item.koreanName,
    searchedFields: ["temperature", "salinity", "dissolvedOxygen", "activity", "seasonality"],
    searchedSources: [...new Set(item.evidence.map((evidence) => evidence.url).filter(Boolean))],
    foundEvidence: added,
    rejectedEvidence: rejected,
  };
});

writeJson(diffPath, {
  schemaVersion: "1.0.0",
  generatedAt: v2.generatedAt,
  v1: { sourceId: v1.sourceId, sha256: sha256(v1Text) },
  v2: { sourceId: v2.sourceId, path: path.relative(root, v2Path).replaceAll("\\", "/"), sha256: sha256(v2Text) },
  identityPreserved: v2.profiles.every((item) => {
    const before = v1ById.get(item.speciesId);
    return before && ["speciesId", "slug", "scientificName", "koreanName"].every((field) => before[field] === item[field]);
  }),
  addedEvidence,
  addedFields: changedCanonicalRanges,
  changedCanonicalRanges,
  resolvedConflicts: [],
  unresolvedConflicts,
  coverage: { before: beforeCoverage, after: afterCoverage },
  comparatorCoverage: {
    temperature: { before: beforeComparable, after: afterComparable },
    salinityProfiles: count(v2.profiles, (item) => item.salinity.canonicalMin !== null && item.salinity.canonicalMax !== null && item.salinity.unit !== null),
    salinityRuntimeComparable: 0,
    dissolvedOxygen: count(v2.profiles, (item) => item.dissolvedOxygen.minimumMgL !== null),
  },
});

writeJson(auditPath, {
  schemaVersion: "2.0.0",
  generatedAt: v2.generatedAt,
  sourceId: v2.sourceId,
  artifact: { path: path.relative(root, v2Path).replaceAll("\\", "/"), bytes: Buffer.byteLength(v2Text), sha256: sha256(v2Text), v1Sha256: sha256(v1Text) },
  species: {
    total: v2.profiles.length,
    canonicalMatches: v2.profiles.filter((item) => v1ById.has(item.speciesId)).length,
    statusDistribution: Object.fromEntries(["PARTIAL", "EVIDENCE_ENRICHED", "CONFLICT_REVIEW_REQUIRED"].map((status) => [status, count(v2.profiles, (item) => item.profileStatus === status)])),
  },
  evidence: { v1Total: v1.profiles.flatMap((item) => item.evidence).length, v2Total: v2.profiles.flatMap((item) => item.evidence).length, added: addedEvidence.length, sourceDistribution },
  coverage: { before: beforeCoverage, after: afterCoverage },
  comparator: {
    temperatureComparableBefore: beforeComparable,
    temperatureComparableAfter: afterComparable,
    salinityProfileComparable: count(v2.profiles, (item) => item.salinity.canonicalMin !== null && item.salinity.canonicalMax !== null && item.salinity.unit !== null),
    salinityRuntimeComparable: 0,
    salinityRuntimeBlocker: "NIFS FEMO salinity unit remains UNIT_NOT_DOCUMENTED",
    dissolvedOxygenComparable: count(v2.profiles, (item) => item.dissolvedOxygen.minimumMgL !== null),
  },
  conflicts: { existing: 1, new: 0, resolved: 0, unresolved: unresolvedConflicts.length, items: unresolvedConflicts },
  confidenceDistribution: Object.fromEntries(["HIGH", "MEDIUM", "LOW", "UNKNOWN"].map((confidence) => [confidence, count(v2.profiles, (item) => item.confidence === confidence)])),
  unsupportedFields: Object.fromEntries(v2.profiles.map((item) => [item.speciesId, item.unsupportedFields])),
  searchedButUnresolvedCount: searchLog.filter((item) => item.rejectedEvidence.length > 0).length,
  searchLog,
  boundaries: { suitabilityScore: false, fishingProbability: false, ranking: false, recommendation: false, databaseWrites: false },
});

console.log(JSON.stringify({ v2Path: path.relative(root, v2Path), evidence: addedEvidence.length, temperatureComparable: afterComparable, sha256: sha256(v2Text) }));

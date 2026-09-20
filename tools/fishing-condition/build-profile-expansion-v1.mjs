import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generatedOn = "2026-09-20";
const inputs = {
  priorityPool: "reports/fish-canonical/condition-profile-priority-pool-v1.json",
  inventory: "data/fish-canonical/bulk/v1/canonical-inventory-v1.json",
  existingProfiles: "data/fishing-condition/species-environment/v3/species-environment-profiles.json",
};
const outputs = {
  batchA: "data/fishing-condition/profiles/v1/batch-a-19.json",
  batchB: "data/fishing-condition/profiles/v1/batch-b-19.json",
  report: "reports/fishing-condition/profile-expansion-v1.json",
  exceptions: "reports/fishing-condition/profile-expansion-exceptions-v1.json",
};

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const sha256 = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const unknown = (extra = {}) => ({ ...extra, status: "UNKNOWN" });
const range = (min, max, unit, context, evidenceId, evidenceClass) => ({ min, max, unit, context, evidenceId, evidenceClass });
const mbrisUrl = (sourceId) => `https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=${sourceId}`;
const fishBaseUrl = (scientificName) => `https://www.fishbase.se/summary/${scientificName.replace(/ /g, "-")}.html`;

const priorityPool = readJson(inputs.priorityPool);
const inventory = readJson(inputs.inventory);
const existingArtifact = readJson(inputs.existingProfiles);
const inventoryById = new Map(inventory.species.map((row) => [row.speciesId, row]));
const existingById = new Map(existingArtifact.profiles.map((row) => [row.speciesId, row]));

// Frozen research notes transcribed from the cited MBRIS public records and FishBase pages.
// Missing domains deliberately remain UNKNOWN; climate labels are not promoted to observed or preferred ranges.
const research = {
  "BM-SPECIES-001164": { sourceId: "270000008283", habitat: ["COASTAL_ROCKY_REEF", "SEAWEED"], summary: "바위와 해조류가 많은 연안에 서식한다.", spawn: { months: [11, 12], summary: "산란기는 11~12월이다." } },
  "BM-SPECIES-000002": { fishbase: true, habitat: ["DEMERSAL", "COASTAL", "DRIFTING_SEAWEED_JUVENILE"], summary: "FishBase는 저서성 종으로 기록하며 유어가 유조에 연관됨을 기술한다." },
  "BM-SPECIES-000278": { sourceId: "270000012286", habitat: ["COASTAL_ROCKY_REEF"], summary: "성어는 바위가 많은 해안 지역의 저서 환경에 서식한다.", depth: { min: 1, max: 10, source: "FISHBASE" }, spawn: { months: [4, 5, 6, 7], summary: "국내 기록의 산란기는 4~7월이다." } },
  "BM-SPECIES-000908": { sourceId: "270000004416", habitat: ["DEMERSAL", "SAND", "MUD"], summary: "수심 800m 이내 모래·개펄 저층에 서식한다.", depth: { min: 0, max: 800 }, depthConflict: { min: 320, max: 830, source: "FISHBASE" } },
  "BM-SPECIES-000097": { sourceId: "270000028620", habitat: ["SHALLOW_COASTAL", "ESTUARY", "SAND", "MUD"], summary: "얕은 연안의 사니질과 기수역을 이용한다.", depth: { min: 0, max: 120, source: "FISHBASE" }, migration: "성어는 해상 산란을 위해 외해로 이동하고 유생은 연안으로 돌아온다." },
  "BM-SPECIES-000279": { sourceId: "270000007132", habitat: ["COASTAL_ROCKY_REEF", "TIDE_POOL", "SEAWEED"], summary: "연안 암초와 자갈·해조류 지대에 서식한다.", spawn: { months: [2, 3, 4, 5, 6], summary: "산란기는 2~6월이다." } },
  "BM-SPECIES-000548": { sourceId: "270000013960", habitat: ["DEMERSAL", "SAND", "MUD"], summary: "수심 100m 미만의 모래 또는 개펄 바닥에 서식한다.", depth: { min: 0, max: 100 }, seasonal: { seasons: ["AUTUMN", "WINTER"], summary: "가을~겨울 사이 산란한다." } },
  "BM-SPECIES-000500": { sourceId: "270000016341", habitat: ["COASTAL_ROCKY", "MIDWATER", "DEMERSAL"], summary: "연안 바위지역의 중층과 저층에 서식한다.", spawn: { months: [5, 6, 7, 8], summary: "5~8월경 산란한다." } },
  "BM-SPECIES-000884": { sourceId: "270000008600", habitat: ["COASTAL", "BAY", "SURFACE"], summary: "연안과 내만의 표층에 무리 지어 서식한다.", spawn: { months: [4, 5, 6, 7], summary: "산란기는 4~7월이다." } },
  "BM-SPECIES-000408": { sourceId: "270000016173", habitat: ["CONTINENTAL_SHELF", "COASTAL", "SURFACE"], summary: "대륙붕과 연안의 표층에 서식한다.", spawn: { months: [4, 5], summary: "4~5월경 내만에서 산란한다." }, migration: "여름에는 얕은 곳, 겨울에는 깊은 곳으로 이동한다." },
  "BM-SPECIES-000958": { sourceId: "270000018212", habitat: ["COASTAL_SAND", "RIVER"], summary: "연안 사질과 하천을 이용하는 회유성 어류이다.", depth: { min: 0, max: 200 }, spawn: { months: [3], summary: "3월 중순 산란기에 하천으로 소상한다." }, migration: "3월 중순 하천으로 소상한다." },
  "BM-SPECIES-000818": { fishbase: true, habitat: ["COASTAL", "ESTUARY", "SAND"], summary: "해변·사주·맹그로브 수로·하구의 모래 바닥을 이용한다.", depth: { min: 0, max: 60, source: "FISHBASE" } },
  "BM-SPECIES-000800": { sourceId: "270000016477", habitat: ["SEAGRASS", "COASTAL_ROCKY_REEF"], summary: "수심 1~50m 해초 또는 연안 암초역에 서식한다.", depth: { min: 1, max: 50 }, seasonal: { seasons: ["SUMMER"], summary: "산란기는 여름이다." } },
  "BM-SPECIES-000840": { sourceId: "270000010842", habitat: ["DEMERSAL", "COASTAL_MUD"], summary: "수심 15~100m 연안 니질바닥의 저층부에 서식한다.", depth: { min: 15, max: 100 } },
  "BM-SPECIES-000226": { sourceId: "270000003808", habitat: ["ROCKY_REEF", "CORAL_REEF"], summary: "수심 2~30m 바위 또는 산호초에 서식한다.", depth: { min: 2, max: 30 }, spawn: { months: [6, 7, 8], summary: "산란기는 6~8월이다." } },
  "BM-SPECIES-000842": { fishbase: true, habitat: ["COASTAL", "ESTUARY", "MUD", "SAND"], summary: "연안·하구의 진흙 또는 사니질 바닥, 수심 120m보다 얕은 곳에 서식한다.", depth: { min: 0, max: 120, source: "FISHBASE" }, migration: "FishBase는 oceanodromous로 분류한다." },
  "BM-SPECIES-000065": { sourceId: "270000013863", habitat: ["DEMERSAL", "COASTAL"], summary: "연안 저서 환경에서 생활한다.", spawn: { months: [5, 6], summary: "주 산란기는 5~6월이다." }, migration: "서해 개체는 가을 수온 하강기에 남해로 이동한다." },
  "BM-SPECIES-000019": { sourceId: "270000016264", habitat: ["DEMERSAL", "COASTAL_ROCKY_REEF"], summary: "암초가 많은 연안 바닥에 서식한다.", seasonal: { months: [12, 1, 2, 3, 4], summary: "난태생이며 12~4월 출산 기록이다. 산란 월로 변환하지 않는다." } },
  "BM-SPECIES-000488": { sourceId: "270000018166", habitat: ["PELAGIC", "SCHOOLING"], summary: "수심 0~275m에서 무리를 지어 서식한다.", depth: { min: 0, max: 275 } },
  "BM-SPECIES-000792": { fishbase: true, habitat: ["ROCKY_SHORE", "BENTHOPELAGIC"], summary: "따뜻하고 염분이 높은 암반 연안을 선호한다는 정성 기록이 있다.", migration: "제한된 지역에서 계절적 외해-연안 이동을 한다.", preferredTemperature: { min: 18.2, max: 26.6, context: "MODELLED_AQUAMAPS" } },
  "BM-SPECIES-000385": { fishbase: true, habitat: ["INTERTIDAL_MUDFLAT", "BURROW", "AMPHIBIOUS"], summary: "간조 때 갯벌을 이용하고 만조 때 진흙 굴에 머문다." },
  "BM-SPECIES-001227": { sourceId: "270000011681", habitat: ["DEEP_ROCKY", "SHELL_SAND"], summary: "패각·모래가 섞인 수심 100~140m 암초지대에 서식한다.", depth: { min: 100, max: 140 }, spawn: { months: [5, 6, 7, 8], summary: "산란기는 5~8월이다." } },
  "BM-SPECIES-000223": { sourceId: "270000005635", habitat: ["COASTAL", "SAND", "ROCK"], summary: "모래 또는 바위 바닥의 해안에 서식한다.", seasonal: { months: [4, 5], summary: "4~5월 출산 기록이며 산란 월로 변환하지 않는다." } },
  "BM-SPECIES-000839": { fishbase: true, habitat: ["COASTAL", "SAND", "MUD"], summary: "연안 사질·니질 바닥에 서식한다.", depth: { min: 20, max: 140, source: "FISHBASE" } },
  "BM-SPECIES-001135": { sourceId: "270000003607", habitat: ["DEMERSAL"], summary: "수심 20~30m 해저에서 주로 생활한다.", depth: { min: 20, max: 30 }, spawn: { months: [4, 5, 6], summary: "산란기는 4~6월이다." } },
  "BM-SPECIES-000122": { sourceId: "270000017064", habitat: ["DEMERSAL"], summary: "수심 0~100m에 주로 서식한다.", depth: { min: 0, max: 100 } },
  "BM-SPECIES-001037": { sourceId: "270000009032", habitat: ["COASTAL", "ESTUARY", "DEMERSAL"], summary: "연안·기수역의 보통 수심 30m 이내에 서식한다.", depth: { min: 0, max: 30 }, spawn: { months: [3, 4, 5, 6], summary: "산란기는 3~6월이다." } },
  "BM-SPECIES-001165": { sourceId: "270000008285", habitat: ["ROCKY_REEF", "SEAWEED"], summary: "수심 20~100m 암초와 해조류 지역에 서식한다.", depth: { min: 20, max: 100 }, spawn: { months: [10, 11, 12, 1], summary: "산란기는 10~1월이다." } },
};

const readinessByExistingStatus = {
  PREFERRED_EVIDENCE_ENRICHED: "PROFILE_READY",
  PARTIAL: "PROFILE_PARTIAL",
  PREFERRED_NOT_FOUND: "PROFILE_PARTIAL",
  CONFLICT_REVIEW_REQUIRED: "PROFILE_LIMITED",
};

function evidenceClass(sourceType) {
  if (["MBRIS", "NIFS", "FAO", "OTHER_OFFICIAL"].includes(sourceType)) return "DIRECT_OFFICIAL";
  if (["PAPER", "RESEARCH_INSTITUTE_REPORT"].includes(sourceType)) return "DIRECT_SCIENTIFIC";
  if (sourceType === "FISHBASE") return "SECONDARY_REFERENCE";
  return "UNKNOWN";
}

function wrapExisting(candidate, inventoryRow, sourceProfile, sourceSpeciesId = candidate.speciesId) {
  const limitations = [...sourceProfile.unsupportedFields.map((field) => `UNKNOWN:${field}`)];
  if (sourceProfile.unsupportedFields.includes("salinity.numeric")) limitations.push("UNIT_AMBIGUITY:salinity:UNIT_NOT_DOCUMENTED");
  if (sourceProfile.conflicts.length) limitations.push(...sourceProfile.conflicts.map((item) => `SOURCE_CONFLICT:${item.field}`));
  if (sourceSpeciesId !== candidate.speciesId) limitations.push(`TAXONOMY_MISMATCH:CROSS_SYSTEM_PROFILE_REUSE:${sourceSpeciesId}`);
  const readiness = sourceSpeciesId === candidate.speciesId ? readinessByExistingStatus[sourceProfile.profileStatus] : "PROFILE_LIMITED";
  const evidenceRefs = sourceProfile.evidence.map((item) => ({ ...item, evidenceClass: evidenceClass(item.sourceType) }));
  if (sourceSpeciesId !== candidate.speciesId) {
    const nifsRef = inventoryRow.sourceRefs.find((item) => item.provider === "NIFS");
    evidenceRefs.push({ id: `${candidate.speciesId}-nifs-identity`, sourceType: "NIFS", evidenceClass: "DIRECT_OFFICIAL", title: "NIFS canonical identity preserved for cross-system profile reuse", sourceId: nifsRef.sourceId, artifact: nifsRef.artifact });
  }
  return {
    speciesId: candidate.speciesId,
    koreanName: candidate.koreanName,
    scientificName: inventoryRow.scientificName,
    fishingSpotUsageCount: candidate.fishingSpotUsageCount,
    currentConditionEnabled: candidate.currentConditionEnabled,
    existingProfile: { reused: true, sourceSpeciesId, sourceArtifact: inputs.existingProfiles, evidenceRefresh: false, sourceValuesChanged: false },
    temperature: { observedRange: sourceProfile.temperature.observed, preferredRange: sourceProfile.temperature.preferred, optimumRange: [], status: sourceProfile.temperature.observed.length || sourceProfile.temperature.preferred.length ? "EVIDENCE_AVAILABLE" : "UNKNOWN" },
    depth: { habitatDepth: [...sourceProfile.depth.adult, ...sourceProfile.depth.juvenile], fishingDepth: sourceProfile.depth.typicalFishing, observedDepth: sourceProfile.depth.observed, status: Object.values(sourceProfile.depth).some((value) => Array.isArray(value) && value.length) ? "EVIDENCE_AVAILABLE" : "UNKNOWN" },
    salinity: { ranges: sourceProfile.salinity.ranges, qualitative: sourceProfile.salinity.qualitative, status: sourceProfile.salinity.ranges.length || sourceProfile.salinity.qualitative.length ? "EVIDENCE_AVAILABLE" : "UNKNOWN" },
    dissolvedOxygen: { ranges: sourceProfile.dissolvedOxygen.observations, qualitative: sourceProfile.dissolvedOxygen.sensitivity ? [sourceProfile.dissolvedOxygen.sensitivity] : [], status: sourceProfile.dissolvedOxygen.observations.length || sourceProfile.dissolvedOxygen.sensitivity ? "EVIDENCE_AVAILABLE" : "UNKNOWN" },
    spawning: { periods: sourceProfile.spawning, status: sourceProfile.spawning.length ? "EVIDENCE_AVAILABLE" : "UNKNOWN" },
    migration: { records: sourceProfile.migration, status: sourceProfile.migration.length ? "EVIDENCE_AVAILABLE" : "UNKNOWN" },
    habitat: { types: sourceProfile.habitats, substrates: sourceProfile.substrates, summary: [], status: sourceProfile.habitats.length ? "EVIDENCE_AVAILABLE" : "UNKNOWN" },
    evidenceRefs,
    profileReadiness: readiness,
    limitations,
    exceptionCategories: [...new Set(limitations.map((item) => item.split(":")[0]))],
  };
}

function buildNew(candidate, inventoryRow, note) {
  const fishbase = note.fishbase || note.depth?.source === "FISHBASE" || note.depthConflict?.source === "FISHBASE" || note.preferredTemperature;
  const evidenceRefs = [];
  if (note.sourceId) evidenceRefs.push({ id: `${candidate.speciesId}-mbris`, sourceType: "MBRIS", evidenceClass: "DIRECT_OFFICIAL", title: `MBRIS 생물종 상세정보: ${candidate.koreanName}`, url: mbrisUrl(note.sourceId), accessedOn: generatedOn });
  if (fishbase) evidenceRefs.push({ id: `${candidate.speciesId}-fishbase`, sourceType: "FISHBASE", evidenceClass: "SECONDARY_REFERENCE", title: `FishBase Species Summary: ${inventoryRow.scientificName}`, url: fishBaseUrl(inventoryRow.scientificName), accessedOn: generatedOn });
  const depthId = note.depth?.source === "FISHBASE" ? `${candidate.speciesId}-fishbase` : `${candidate.speciesId}-mbris`;
  const limitations = ["UNKNOWN:salinity", "UNKNOWN:dissolvedOxygen"];
  if (!note.preferredTemperature) limitations.push("UNKNOWN:temperature");
  if (!note.depth) limitations.push("UNKNOWN:depth");
  if (!note.spawn) limitations.push(note.seasonal ? "SEASONAL_AMBIGUITY:spawning" : "UNKNOWN:spawning");
  if (!note.migration) limitations.push("UNKNOWN:migration");
  if (note.depthConflict) limitations.push("SOURCE_CONFLICT:depth", "INCOMPATIBLE_DEPTH_DEFINITIONS:observedDepth");
  return {
    speciesId: candidate.speciesId,
    koreanName: candidate.koreanName,
    scientificName: inventoryRow.scientificName,
    fishingSpotUsageCount: candidate.fishingSpotUsageCount,
    currentConditionEnabled: candidate.currentConditionEnabled,
    existingProfile: { reused: false, sourceSpeciesId: null, sourceArtifact: null, evidenceRefresh: false, sourceValuesChanged: false },
    temperature: note.preferredTemperature
      ? { observedRange: [], preferredRange: [range(note.preferredTemperature.min, note.preferredTemperature.max, "degC", note.preferredTemperature.context, `${candidate.speciesId}-fishbase`, "SECONDARY_REFERENCE")], optimumRange: [], status: "EVIDENCE_AVAILABLE" }
      : unknown({ observedRange: [], preferredRange: [], optimumRange: [] }),
    depth: note.depth
      ? { habitatDepth: [], fishingDepth: [], observedDepth: [range(note.depth.min, note.depth.max, "m", "SPECIES_DEPTH_RANGE", depthId, note.depth?.source === "FISHBASE" ? "SECONDARY_REFERENCE" : "DIRECT_OFFICIAL")], conflictingObservedDepth: note.depthConflict ? [range(note.depthConflict.min, note.depthConflict.max, "m", "SPECIES_DEPTH_RANGE", `${candidate.speciesId}-fishbase`, "SECONDARY_REFERENCE")] : [], status: note.depthConflict ? "CONFLICT" : "EVIDENCE_AVAILABLE" }
      : unknown({ habitatDepth: [], fishingDepth: [], observedDepth: [], conflictingObservedDepth: [] }),
    salinity: unknown({ ranges: [], qualitative: [] }),
    dissolvedOxygen: unknown({ ranges: [], qualitative: [] }),
    spawning: note.spawn
      ? { periods: [{ months: note.spawn.months, seasons: [], summary: note.spawn.summary, evidenceId: `${candidate.speciesId}-mbris`, evidenceClass: "DIRECT_OFFICIAL" }], status: "EVIDENCE_AVAILABLE" }
      : unknown({ periods: [], preservedSeasonalNote: note.seasonal ?? null }),
    migration: note.migration
      ? { records: [{ summary: note.migration, evidenceId: fishbase && !note.sourceId ? `${candidate.speciesId}-fishbase` : `${candidate.speciesId}-mbris`, evidenceClass: fishbase && !note.sourceId ? "SECONDARY_REFERENCE" : "DIRECT_OFFICIAL" }], status: "EVIDENCE_AVAILABLE" }
      : unknown({ records: [] }),
    habitat: { types: note.habitat, substrates: [], summary: [note.summary], status: "EVIDENCE_AVAILABLE" },
    evidenceRefs,
    profileReadiness: "PROFILE_LIMITED",
    limitations,
    exceptionCategories: [...new Set(limitations.map((item) => item.split(":")[0]))],
  };
}

const candidates = priorityPool.candidates;
if (priorityPool.candidateCount !== 38 || candidates.length !== 38) throw new Error("Priority pool must contain exactly 38 candidates.");
if (new Set(candidates.map((row) => row.speciesId)).size !== 38) throw new Error("Priority pool species IDs must be unique.");

const profiles = candidates.map((candidate, index) => {
  const directExisting = existingById.get(candidate.speciesId);
  const inventoryRow = inventoryById.get(candidate.speciesId) ?? (directExisting ? { scientificName: directExisting.scientificName } : null);
  if (!inventoryRow) throw new Error(`Missing canonical identity: ${candidate.speciesId}`);
  let profile;
  if (directExisting) profile = wrapExisting(candidate, inventoryRow, directExisting);
  else if (candidate.speciesId === "47aa9b93-2b32-4df4-9a2a-45ed3abbd484") profile = wrapExisting(candidate, inventoryRow, existingById.get("BM-SPECIES-003107"), "BM-SPECIES-003107");
  else profile = buildNew(candidate, inventoryRow, research[candidate.speciesId]);
  return { ...profile, batch: index < 19 ? "A" : "B", priorityRank: index + 1 };
});

const sourceMeta = Object.fromEntries(Object.entries(inputs).map(([key, artifact]) => [key, { artifact, sha256: sha256(artifact) }]));
const invariants = { scoring: 0, ranking: 0, probability: 0, runtimeMutation: 0, productionMutation: 0, databaseWrite: 0, supabaseWrite: 0 };
const readinessCounts = (rows) => Object.fromEntries(["PROFILE_READY", "PROFILE_PARTIAL", "PROFILE_LIMITED", "INSUFFICIENT_EVIDENCE"].map((status) => [status, rows.filter((row) => row.profileReadiness === status).length]));
const has = (row, domain) => row[domain].status === "EVIDENCE_AVAILABLE" || row[domain].status === "CONFLICT";
const domains = ["temperature", "depth", "salinity", "dissolvedOxygen", "spawning", "migration", "habitat"];

function batchArtifact(batchId, rows) {
  return { schemaVersion: 1, program: "Fishing Condition Profile Expansion V1", generatedOn, batch: batchId, total: rows.length, selectionOrder: "PRIORITY_POOL_ORDER", readiness: readinessCounts(rows), profiles: rows, sources: sourceMeta, invariants };
}

const exceptionRows = profiles.filter((row) => row.exceptionCategories.length).map((row) => ({ speciesId: row.speciesId, koreanName: row.koreanName, batch: row.batch, categories: row.exceptionCategories, limitations: row.limitations }));
const categoryOrder = ["SOURCE_CONFLICT", "UNIT_AMBIGUITY", "TAXONOMY_MISMATCH", "INSUFFICIENT_EVIDENCE", "INCOMPATIBLE_DEPTH_DEFINITIONS", "SEASONAL_AMBIGUITY", "UNKNOWN"];
const categoryGroups = Object.fromEntries(categoryOrder.map((category) => [category, exceptionRows.filter((row) => row.categories.includes(category)).map((row) => row.speciesId)]));
const evidence = profiles.flatMap((row) => row.evidenceRefs);
const sourceClasses = ["NIFS", "MBRIS", "NIBR", "WORMS", "FISHBASE", "FAO", "PAPER"];
const sourceCoverage = Object.fromEntries(sourceClasses.map((type) => [type, evidence.filter((item) => item.sourceType === type || (type === "PAPER" && item.evidenceClass === "DIRECT_SCIENTIFIC")).length]));

const report = {
  schemaVersion: 1,
  program: "Fishing Condition Profile Expansion V1",
  generatedOn,
  decision: "PROFILE_EXPANSION_READY_WITH_EXCEPTIONS",
  total: profiles.length,
  batches: { A: { total: 19, readiness: readinessCounts(profiles.slice(0, 19)) }, B: { total: 19, readiness: readinessCounts(profiles.slice(19)) } },
  readiness: readinessCounts(profiles),
  domainCoverage: Object.fromEntries(domains.map((domain) => [domain, { covered: profiles.filter((row) => has(row, domain)).length, unknown: profiles.filter((row) => !has(row, domain)).length }])),
  sourceCoverage: { speciesWithEvidence: profiles.filter((row) => row.evidenceRefs.length).length, evidenceRefCount: evidence.length, bySource: sourceCoverage },
  existingConditionProfiles: { protectedCount: 10, directIdReused: 9, crossSystemReused: 1, evidenceRefreshed: 0, sourceValuesChanged: 0, unchanged: 10 },
  exceptions: { totalSpecies: exceptionRows.length, categoryCounts: Object.fromEntries(Object.entries(categoryGroups).map(([key, ids]) => [key, ids.length])), artifact: outputs.exceptions },
  sources: sourceMeta,
  invariants,
};

const exceptions = { schemaVersion: 1, program: "Fishing Condition Profile Expansion V1", generatedOn, totalSpecies: exceptionRows.length, categoryCounts: report.exceptions.categoryCounts, categoryGroups, rows: exceptionRows, policy: { oneSpeciesFollowup: false, categoryBatchOnly: true, unknownValuesRemainNullOrEmpty: true }, sources: sourceMeta, invariants };
const artifacts = { [outputs.batchA]: batchArtifact("A", profiles.slice(0, 19)), [outputs.batchB]: batchArtifact("B", profiles.slice(19)), [outputs.report]: report, [outputs.exceptions]: exceptions };

if (process.argv.includes("--check")) {
  let valid = true;
  for (const [relativePath, value] of Object.entries(artifacts)) {
    if (!fs.existsSync(path.join(root, relativePath)) || fs.readFileSync(path.join(root, relativePath), "utf8") !== serialize(value)) {
      console.error(`${relativePath} is missing or out of date.`);
      valid = false;
    }
  }
  if (!valid) process.exit(1);
  console.log("Fishing Condition Profile Expansion V1 artifacts are deterministic and current.");
} else {
  for (const [relativePath, value] of Object.entries(artifacts)) {
    fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    fs.writeFileSync(path.join(root, relativePath), serialize(value));
    console.log(`Wrote ${relativePath}`);
  }
}

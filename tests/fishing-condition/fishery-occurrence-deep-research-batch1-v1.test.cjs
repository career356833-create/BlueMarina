const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const tool = require(path.join(root, "tools/fishing-condition/build-fishery-occurrence-batch1.cjs"));
const datasetPath = path.join(root, "data/fishing-condition/seasonality/research/fishery-occurrence-batch1-v1.json");
const reportPath = path.join(root, "reports/fishing-condition/fishery-occurrence-deep-research-batch1-v1.json");
const seasonalityPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const savedDataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const savedReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("batch contains exactly the three requested canonical species", () => {
  assert.deepEqual(savedDataset.species.map((item) => item.canonicalKoreanName), ["고등어", "갈치", "주꾸미"]);
  assert.deepEqual(savedDataset.species.map((item) => item.canonicalSpeciesId), ["BM-SPECIES-000417", "BM-SPECIES-000444", "BM-SPECIES-003107"]);
});

test("source identity mappings and KOSIS codes are explicit", () => {
  assert.deepEqual(savedDataset.species.map((item) => item.sourceSpeciesCode), ["110015", "110009", "140415"]);
  assert.deepEqual(savedDataset.species.map((item) => item.matchStatus), ["EXACT", "COMMERCIAL_CATEGORY", "EXACT"]);
  assert.ok(savedDataset.species.every((item) => item.source.speciesIdentity.sourceSpeciesName));
});

test("KOSIS records preserve month, national region, fishery, metric and unit", () => {
  assert.equal(savedReport.sourcesChecked[0].tableId, "DT_1EW0004");
  assert.ok(savedDataset.species.every((item) => item.source.temporalResolution === "MONTH"));
  assert.ok(savedDataset.species.every((item) => item.source.records.every((record) => /^202[3-5]-\d{2}$/.test(record.period))));
  assert.ok(savedDataset.species.every((item) => item.source.records.every((record) => record.geography === "대한민국 전국 계" && record.fishery === "연근해어업" && record.unit === "METRIC_TON")));
});

test("multi-year series remain independent and missing 2023-08 jukkumi is not zero-filled", () => {
  const jukkumi = savedDataset.species.find((item) => item.canonicalKoreanName === "주꾸미");
  assert.deepEqual(jukkumi.source.missingPeriods, ["2023-08"]);
  assert.equal(jukkumi.source.records.some((record) => record.period === "2023-08"), false);
  assert.equal(jukkumi.source.records.length, 35);
});

test("MOF contract capability is not promoted without retained product-code records", () => {
  assert.equal(savedReport.sourcesChecked[1].result, "CONTRACT_ONLY_NO_SPECIES_RECORD_RETAINED");
  assert.ok(savedReport.species.every((item) => item.mof.classification === "REJECTED_FOR_OCCURRENCE"));
});

test("NIFS forecast and interpretive outlook are never historical occurrence", () => {
  assert.deepEqual(savedReport.sourcesChecked[2].requiredClasses, ["OBSERVATION", "FORECAST", "INTERPRETIVE_OUTLOOK"]);
  assert.equal(savedReport.sourcesChecked[2].automaticHistoricalOccurrenceConversion, false);
  assert.ok(savedReport.species.every((item) => item.nifs.classification === "REJECTED_FOR_OCCURRENCE"));
});

test("strict candidates require exact identity and commercial hairtail remains limited", () => {
  const strict = savedDataset.species.filter((item) => item.evidenceClass === "STRICT_OCCURRENCE_CANDIDATE");
  assert.deepEqual(strict.map((item) => item.canonicalKoreanName), ["고등어", "주꾸미"]);
  assert.ok(strict.every((item) => item.matchStatus === "EXACT"));
  assert.equal(savedDataset.species.find((item) => item.canonicalKoreanName === "갈치").evidenceClass, "LIMITED_OCCURRENCE_EVIDENCE");
});

test("effort and regulation limitations are present for every species", () => {
  assert.ok(savedDataset.species.every((item) => item.limitations.includes("EFFORT_UNKNOWN")));
  assert.ok(savedDataset.species.every((item) => item.limitations.includes("REGULATION_AFFECTED")));
  assert.ok(savedDataset.species.every((item) => item.regulationReview.length > 40));
});

test("landing and CPUE semantics never become abundance or probability", () => {
  assert.equal(savedDataset.boundaries.landingIsAbundance, false);
  assert.equal(savedDataset.boundaries.cpueIsCatchProbability, false);
  assert.equal(savedDataset.definition.includes("catch probability"), true);
});

test("production artifacts and runtime remain immutable", () => {
  assert.equal(sha256(seasonalityPath), "923319a8f96a6960b41a67397d1beb3273e55333c8a540aca70011a8f79a6d1a");
  assert.equal(sha256(v2Path), "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98");
  assert.equal(sha256(v3Path), "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376");
  assert.equal(savedDataset.boundaries.seasonalityArtifactModified, false);
  assert.equal(savedDataset.boundaries.runtimeModified, false);
});

test("artifacts are deterministic", () => {
  assert.deepEqual(tool.buildDataset(), savedDataset);
  assert.deepEqual(tool.buildReport(savedDataset), savedReport);
});

test("no scoring, probability output, normalization, weighting, ranking or recommendation is emitted", () => {
  const serialized = JSON.stringify({ savedDataset, savedReport });
  for (const key of ["\"score\":", "\"catchProbability\":", "\"weight\":", "\"rank\":", "\"recommendation\":"]) assert.equal(serialized.includes(key), false);
  assert.equal(savedDataset.boundaries.normalization, false);
  assert.equal(savedDataset.boundaries.numericScoring, false);
  assert.equal(savedDataset.boundaries.probability, false);
  assert.equal(savedDataset.boundaries.weighting, false);
  assert.equal(savedDataset.boundaries.productOrdering, false);
  assert.equal(savedDataset.boundaries.advice, false);
});

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const tool = require(path.join(root, "tools/fishing-condition/promote-fishery-occurrence-v1.cjs"));
const artifactPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const researchPath = path.join(root, "data/fishing-condition/seasonality/research/fishery-occurrence-batch1-v1.json");
const reportPath = path.join(root, "reports/fishing-condition/fishery-occurrence-promotion-review-v1.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const research = JSON.parse(fs.readFileSync(researchPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const occurrences = artifact.species.flatMap((species) => species.entries.map((entry) => ({ speciesId: species.speciesId, koreanName: species.koreanName, ...entry }))).filter((entry) => entry.context === "FISHERY_OCCURRENCE");
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("promotion scope is exactly mackerel and webfoot octopus", () => {
  assert.deepEqual(occurrences.map((entry) => entry.speciesId), ["BM-SPECIES-000417", "BM-SPECIES-003107"]);
  assert.deepEqual(report.speciesReviewed.map((species) => species.koreanName), ["고등어", "주꾸미"]);
  assert.equal(artifact.species.find((species) => species.koreanName === "갈치").entries.some((entry) => entry.context === "FISHERY_OCCURRENCE"), false);
});

test("both source identities are exact and retain their KOSIS codes", () => {
  assert.deepEqual(occurrences.map((entry) => entry.source.matchStatus), ["EXACT", "EXACT"]);
  assert.deepEqual(occurrences.map((entry) => entry.source.sourceSpeciesCode), ["110015", "140415"]);
});

test("monthly source records remain complete without canonical month-range compression", () => {
  assert.deepEqual(occurrences.map((entry) => entry.records.length), [36, 35]);
  assert.ok(occurrences.every((entry) => entry.evidenceMode === "MONTHLY_RECORD_SERIES"));
  assert.ok(occurrences.every((entry) => entry.months.length === 0 && entry.startMonth === null && entry.endMonth === null));
});

test("missing and explicit zero remain distinct", () => {
  const jukkumi = occurrences.find((entry) => entry.koreanName === "주꾸미");
  assert.deepEqual(jukkumi.missingPeriods, ["2023-08"]);
  assert.equal(jukkumi.records.some((record) => record.period === "2023-08"), false);
  assert.equal(jukkumi.records.filter((record) => record.value === 0).length, 0);
});

test("regulation and effort limitations are preserved", () => {
  const mackerel = occurrences.find((entry) => entry.koreanName === "고등어");
  const jukkumi = occurrences.find((entry) => entry.koreanName === "주꾸미");
  assert.ok(mackerel.limitations.includes("EFFORT_UNKNOWN"));
  assert.ok(mackerel.limitations.includes("FLEET_COMPOSITION_CHANGED"));
  assert.ok(mackerel.limitations.includes("QUOTA_AFFECTED"));
  assert.ok(jukkumi.limitations.includes("EFFORT_UNKNOWN"));
  assert.ok(jukkumi.limitations.includes("CLOSED_SEASON_AFFECTED"));
  assert.ok(jukkumi.limitations.includes("RECREATIONAL_CATCH_NOT_INCLUDED"));
});

test("occurrence remains factual catch data and never abundance or probability", () => {
  assert.ok(occurrences.every((entry) => entry.evidenceSemantic === "MONTHLY_CATCH_DATA"));
  assert.equal(report.boundaries.landingIsAbundance, false);
  assert.equal(report.boundaries.occurrenceIsCatchProbability, false);
});

test("existing spawning and migration entries are byte-equivalent to the approved baseline", () => {
  const baseline = tool.baselineArtifact(artifact);
  assert.equal(crypto.createHash("sha256").update(tool.serialized(baseline)).digest("hex"), tool.BASELINE_SHA256);
});

test("promotion is deterministic and idempotent", () => {
  const rebuilt = tool.promoteArtifact(artifact, research);
  assert.deepEqual(rebuilt, artifact);
  assert.deepEqual(tool.buildReport(rebuilt, research), report);
});

test("coverage and readiness are recalculated without automatic READY promotion", () => {
  assert.deepEqual(report.coverage, { occurrenceBefore: 0, occurrenceAfter: 2, totalSpecies: 10 });
  assert.equal(report.seasonalityReadiness.status, "SEASONALITY_PARTIALLY_READY");
  assert.equal(artifact.promotion.decision, "PROMOTE_BOTH");
});

test("lineage identifies KOSIS, the research batch, and promotion review", () => {
  assert.ok(occurrences.every((entry) => entry.lineage.provider === "KOSIS"));
  assert.ok(occurrences.every((entry) => entry.lineage.researchSourceId === "blue-marina-fishery-occurrence-batch1-v1"));
  assert.ok(occurrences.every((entry) => entry.lineage.promotionReview === "Fishery Occurrence Promotion Review V1"));
});

test("profile V2 and V3 remain immutable", () => {
  assert.equal(hash(v2Path), "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98");
  assert.equal(hash(v3Path), "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376");
});

test("no scoring, probability, normalization, weighting, ranking, or recommendation is emitted", () => {
  const serialized = JSON.stringify({ artifact, report });
  for (const key of ["\"score\":", "\"catchProbability\":", "\"normalization\":true", "\"weight\":", "\"rank\":", "\"recommendation\":true"]) assert.equal(serialized.includes(key), false);
  assert.equal(report.boundaries.numericScoring, false);
  assert.equal(report.boundaries.probability, false);
  assert.equal(report.boundaries.normalization, false);
  assert.equal(report.boundaries.weighting, false);
  assert.equal(report.boundaries.ranking, false);
  assert.equal(report.boundaries.recommendation, false);
  assert.equal(report.boundaries.runtimeModified, false);
});

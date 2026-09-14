const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const toolPath = path.join(root, "tools/fishing-condition/audit-fishery-occurrence-gaps.cjs");
const reportPath = path.join(root, "reports/fishing-condition/fishery-occurrence-evidence-gap-audit-v1.json");
const seasonalityPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const tool = require(toolPath);
const saved = JSON.parse(fs.readFileSync(reportPath, "utf8"));

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("all ten canonical species are audited with at least one gap", () => {
  assert.equal(saved.coverage.speciesCount, 10);
  assert.equal(saved.species.length, 10);
  assert.equal(new Set(saved.species.map((item) => item.speciesId)).size, 10);
  assert.ok(saved.species.every((item) => item.gaps.length >= 1));
});

test("the historical gap snapshot remains zero while production now has two promoted series", () => {
  assert.equal(saved.coverage.currentOccurrenceCoverage, 0);
  assert.equal(saved.coverage.currentOccurrenceEntries, 0);
  const seasonality = JSON.parse(fs.readFileSync(seasonalityPath, "utf8"));
  assert.equal(seasonality.species.flatMap((item) => item.entries).filter((entry) => entry.context === "FISHERY_OCCURRENCE").length, 2);
});

test("spawning and migration are explicitly prohibited as occurrence substitutes", () => {
  assert.ok(saved.prohibitedConversions.includes("SPAWNING_TO_OCCURRENCE"));
  assert.ok(saved.prohibitedConversions.includes("MIGRATION_TO_OCCURRENCE"));
  assert.ok(saved.prohibitedConversions.includes("CONSUMER_GUIDANCE_TO_OCCURRENCE"));
});

test("landing, abundance, CPUE and survey semantics stay separate", () => {
  assert.equal(saved.biasContract.landingIsAbundance, false);
  assert.equal(saved.biasContract.cpueIsCatchProbability, false);
  assert.ok(saved.acceptedEvidenceSemantics.includes("MARKET_LANDING_RECORD"));
  assert.ok(saved.acceptedEvidenceSemantics.includes("FISHERY_INDEPENDENT_SURVEY"));
  assert.ok(saved.acceptedEvidenceSemantics.includes("CPUE_MONTHLY_PATTERN"));
});

test("effort, regulation, aggregate-taxon, month and region gaps are represented", () => {
  assert.deepEqual(saved.gapTaxonomy, ["SOURCE_GAP", "TEMPORAL_GAP", "GEOGRAPHIC_GAP", "EFFORT_GAP", "SEMANTIC_GAP", "AGGREGATED_TAXON", "REGULATION_BIAS"]);
  assert.equal(saved.gapSummary.effort, 10);
  assert.ok(saved.gapSummary.regulation > 0);
  assert.ok(saved.gapSummary.aggregateTaxon > 0);
  assert.equal(saved.gapSummary.temporal, 10);
  assert.equal(saved.gapSummary.geographic, 10);
  assert.ok(saved.species.every((item) => item.monthlyResolutionPotential));
  assert.ok(saved.species.every((item) => item.regionResolutionPotential));
});

test("NIFS outlook observation, forecast and interpretation remain distinct", () => {
  assert.deepEqual(saved.nifsOutlookContract.requiredClasses, ["OBSERVATION", "FORECAST", "INTERPRETIVE_OUTLOOK"]);
  assert.equal(saved.nifsOutlookContract.automaticHistoricalOccurrenceConversion, false);
});

test("NIFS environmental and consumer guidance assets are not occurrence evidence", () => {
  const nifs = saved.existingNifsAssets;
  assert.equal(nifs.biologicalSpeciesApi.occurrenceEligible, false);
  assert.equal(nifs.realtimeFishingEnvironment.occurrenceEligible, false);
  assert.equal(nifs.fisheryEnvironmentObservation.occurrenceEligible, false);
  assert.equal(nifs.oceanSectionAndCoastalObservation.occurrenceEligible, false);
  assert.equal(nifs.fishResourceDetail.periodListMeaning, "CONSUMER_GUIDANCE");
  assert.equal(nifs.fishResourceDetail.occurrenceEligible, false);
});

test("research batch is bounded to three non-ranked targets", () => {
  assert.equal(saved.nextResearchBatch.length, 3);
  assert.deepEqual(saved.nextResearchBatch.map((item) => item.koreanName), ["고등어", "갈치", "주꾸미"]);
  assert.equal("rank" in saved.nextResearchBatch[0], false);
});

test("immutable seasonality and profile artifacts retain exact checksums", () => {
  assert.equal(sha256(seasonalityPath), "8069306c5157c7c6ab9fd3e1bfdc849bf06b21869cb5860b22f29935e5d9b018");
  assert.equal(sha256(v2Path), "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98");
  assert.equal(sha256(v3Path), "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376");
});

test("audit is deterministic and does not enter runtime", () => {
  assert.deepEqual(tool.buildAudit(), saved);
  const srcFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else srcFiles.push(file);
    }
  };
  walk(path.join(root, "src"));
  assert.ok(srcFiles.every((file) => !fs.readFileSync(file, "utf8").includes("fishery-occurrence-evidence-gap-audit-v1")));
  assert.equal(saved.boundaries.runtimeModified, false);
  assert.equal(saved.boundaries.evidencePromoted, false);
});

test("report contains no scoring, probability, normalization, weighting, ordering, or advice output", () => {
  const serialized = JSON.stringify(saved);
  for (const key of ["\"score\":", "\"catchProbability\":", "\"weight\":", "\"rank\":", "\"recommendation\":"]) assert.equal(serialized.includes(key), false);
  assert.equal(saved.boundaries.numericScoring, false);
  assert.equal(saved.boundaries.probability, false);
  assert.equal(saved.boundaries.normalization, false);
  assert.equal(saved.boundaries.weighting, false);
  assert.equal(saved.boundaries.productOrdering, false);
  assert.equal(saved.boundaries.advice, false);
});

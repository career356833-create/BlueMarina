const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const builder = require(path.join(root, "tools/fishing-condition/build-seasonality-evidence-interpretation-v1.cjs"));
const artifactPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const reportPath = path.join(root, "reports/fishing-condition/seasonality-evidence-interpretation-v1.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const entries = artifact.species.flatMap((species) => species.entries.map((entry) => ({ speciesId: species.speciesId, ...entry })));
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("artifact preserves all ten canonical identities and three separate contexts", () => {
  assert.equal(artifact.species.length, 10);
  assert.equal(new Set(artifact.species.map((item) => item.speciesId)).size, 10);
  assert.ok(entries.some((item) => item.context === "SPAWNING"));
  assert.ok(entries.some((item) => item.context === "MIGRATION"));
  assert.equal(entries.some((item) => item.context === "FISHERY_OCCURRENCE"), false);
  assert.equal(report.coverage.contexts.spawningSpecies, 7);
  assert.equal(report.coverage.contexts.migrationSpecies, 9);
  assert.equal(report.coverage.contexts.fisheryOccurrenceSpecies, 0);
});

test("exact month produces context-local MATCH and MISMATCH", () => {
  const match = builder.evaluateEntries(entries, { speciesId: "BM-SPECIES-000755", context: "SPAWNING", month: 5 });
  const mismatch = builder.evaluateEntries(entries, { speciesId: "BM-SPECIES-000755", context: "SPAWNING", month: 9 });
  assert.equal(match.evidence[0].relation, "MATCH");
  assert.equal(match.evidence[0].status, "SEASONAL_MATCH");
  assert.equal(mismatch.evidence[0].relation, "MISMATCH");
  assert.equal(mismatch.evidence[0].status, "SEASONAL_MISMATCH");
});

test("cross-year ranges retain circular order", () => {
  const webfoot = entries.find((item) => item.speciesId === "BM-SPECIES-003107" && item.context === "SPAWNING");
  const octopus = entries.find((item) => item.speciesId === "BM-SPECIES-003111" && item.months[0] === 12);
  assert.deepEqual(webfoot.months, [12, 1, 2]);
  assert.equal(webfoot.crossesYearBoundary, true);
  assert.equal(webfoot.startMonth, 12);
  assert.equal(webfoot.endMonth, 2);
  assert.deepEqual(octopus.months, [12, 1, 2, 3, 4]);
  assert.equal(octopus.crossesYearBoundary, true);
});

test("season-only evidence remains unresolved without invented months", () => {
  const seabass = entries.find((item) => item.speciesId === "BM-SPECIES-000188" && item.context === "SPAWNING");
  const result = builder.evaluateEntries(entries, { speciesId: seabass.speciesId, context: "SPAWNING", month: 11 });
  assert.deepEqual(seabass.months, []);
  assert.equal(seabass.precision, "SEASON_ONLY");
  assert.equal(result.evidence[0].status, "MONTH_UNRESOLVED");
  assert.equal(result.evidence[0].relation, null);
});

test("regional and life-stage limitations are retained", () => {
  const redSeaBreamMigration = entries.find((item) => item.speciesId === "BM-SPECIES-000755" && item.context === "MIGRATION");
  assert.equal(redSeaBreamMigration.geographicContext, "NORTHWEST_PACIFIC");
  assert.equal(redSeaBreamMigration.lifeStage, "ADULT");
  assert.ok(redSeaBreamMigration.limitations.includes("REGIONAL_SCOPE_NORTHWEST_PACIFIC_NOT_AUTOMATICALLY_GENERALIZED"));
  assert.ok(redSeaBreamMigration.limitations.includes("LIFE_STAGE_ADULT"));
  const evaluated = builder.evaluateEntries(entries, { speciesId: "BM-SPECIES-003111", context: "MIGRATION", month: 12, geographicContext: "KOREA" });
  assert.equal(evaluated.evidence.find((item) => item.relation === "MATCH").status, "REGIONAL_LIMITATION");
});

test("multiple evidence is preserved independently and never merged", () => {
  const mackerel = entries.filter((item) => item.speciesId === "BM-SPECIES-000417" && item.context === "MIGRATION");
  assert.equal(mackerel.length, 2);
  assert.deepEqual(mackerel[0].months, [2, 3]);
  assert.deepEqual(mackerel[1].months, [9, 10, 11, 12, 1]);
  const result = builder.evaluateEntries(entries, { speciesId: "BM-SPECIES-000417", context: "MIGRATION", month: 2 });
  assert.deepEqual(result.evidence.map((item) => item.relation), ["MATCH", "MISMATCH"]);
  assert.equal("relation" in result, false);
});

test("missing context is explicit and evidence references are preserved", () => {
  const missing = builder.evaluateEntries(entries, { speciesId: "BM-SPECIES-000755", context: "FISHERY_OCCURRENCE", month: 5 });
  const spawning = entries.find((item) => item.speciesId === "BM-SPECIES-000755" && item.context === "SPAWNING");
  assert.equal(missing.status, "NO_SEASONAL_EVIDENCE");
  assert.deepEqual(spawning.evidenceRefs, ["pagrus-mbris"]);
});

test("synthetic conflicting sources remain separate", () => {
  const synthetic = [
    { speciesId: "test", entryId: "a", context: "SPAWNING", precision: "MONTH_RESOLVED", months: [3, 4, 5], startMonth: 3, endMonth: 5, evidenceRefs: ["a"], limitations: [] },
    { speciesId: "test", entryId: "b", context: "SPAWNING", precision: "MONTH_RESOLVED", months: [9, 10], startMonth: 9, endMonth: 10, evidenceRefs: ["b"], limitations: ["CONFLICT_REVIEW_REQUIRED"] },
  ];
  const result = builder.evaluateEntries(synthetic, { speciesId: "test", context: "SPAWNING", month: 4 });
  assert.equal(result.evidence.length, 2);
  assert.deepEqual(result.evidence.map((item) => item.relation), ["MATCH", "MISMATCH"]);
  assert.equal(result.evidence[1].status, "CONFLICT_REVIEW_REQUIRED");
});

test("output is deterministic and profile V2/V3 remain immutable", () => {
  const before = fs.readFileSync(artifactPath, "utf8");
  builder.build();
  assert.equal(fs.readFileSync(artifactPath, "utf8"), before);
  assert.equal(hash(v2Path), "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98");
  assert.equal(hash(v3Path), "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376");
});

test("artifact has no numeric scoring, probability, ranking or recommendation output", () => {
  const serialized = JSON.stringify(artifact);
  for (const key of ["\"score\":", "\"seasonalityScore\":", "\"catchProbability\":", "\"weight\":", "\"rank\":"]) assert.equal(serialized.includes(key), false);
  assert.equal(artifact.boundaries.numericScoring, false);
  assert.equal(artifact.boundaries.probability, false);
  assert.equal(artifact.boundaries.ranking, false);
  assert.equal(artifact.boundaries.recommendation, false);
  assert.equal(report.forbiddenWordingScan.findings, 0);
  const explanations = report.representativeVerification.flatMap((item) => item.result.evidence.map((entry) => entry.explanation)).join(" ");
  assert.doesNotMatch(explanations, /잘 잡힙니다|낚시하기 좋은|출조 추천|GOOD|FAVORABLE|HIGH_PROBABILITY|PEAK_CATCH/);
});

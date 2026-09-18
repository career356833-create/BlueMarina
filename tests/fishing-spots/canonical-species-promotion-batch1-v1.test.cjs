const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const reportPath = path.join(root, "reports/fishing-spots/canonical-species-promotion-review-batch1-v1.json");
const datasetPath = path.join(root, "data/fishing-spots/enrichment/research/canonical-species-promotion-batch1-v1.json");
const sourcePath = path.join(root, "src/data/fishing-spots.json");
const toolPath = path.join(root, "tools/fishing-spots/review-canonical-species-promotion-batch1.mjs");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

test("reviews exactly the fixed three species", () => {
  assert.deepEqual(dataset.targetSpecies, ["붕장어", "숭어", "짱뚱어"]);
  assert.equal(dataset.species.length, 3);
  assert.equal(report.counts.reviewedSpecies, 3);
});

test("records an accepted identity and authoritative evidence for each species", () => {
  for (const species of dataset.species) {
    assert.equal(species.acceptedTaxon.status, "ACCEPTED");
    assert.match(species.scientificName, /^[A-Z][a-z]+ [a-z]+$/);
    assert.ok(species.authoritativeSources.length >= 3);
    assert.ok(species.authoritativeSources.every((source) => source.authorityClass === "AUTHORITATIVE" && source.url.startsWith("https://")));
  }
});

test("reuses all three existing Fish canonical identities without creating IDs", () => {
  assert.equal(report.duplicateCheck.existingFishCanonicalIdentities, 3);
  assert.equal(report.duplicateCheck.newIdsCreated, 0);
  assert.deepEqual(dataset.species.map((item) => item.existingCanonicalDuplicateCheck.internalId), ["BM-SPECIES-000908", "BM-SPECIES-000097", "BM-SPECIES-000385"]);
  assert.ok(dataset.species.every((item) => item.existingCanonicalDuplicateCheck.action === "REUSE_EXISTING_INTERNAL_ID"));
});

test("does not collide with the current ten Fishing Spot canonical species", () => {
  assert.ok(dataset.species.every((item) => item.existingCanonicalDuplicateCheck.productionFishingSpotCanonical10 === false));
  assert.equal(report.duplicateCheck.productionFishingSpotCanonicalCount, 10);
});

test("keeps aggregate and commercial aliases out of promotion", () => {
  assert.deepEqual(dataset.aliasCandidates, []);
  assert.ok(dataset.species.every((item) => item.aliasReview.proposedAliases.length === 0));
  assert.ok(dataset.species.find((item) => item.rawName === "붕장어").aliasReview.excludedAliases.includes("아나고"));
});

test("marks 숭어 ambiguity as review required", () => {
  const mullet = dataset.species.find((item) => item.rawName === "숭어");
  assert.equal(mullet.scientificName, "Mugil cephalus");
  assert.equal(mullet.ambiguityReview.commercialNameAmbiguity, "REVIEW_REQUIRED");
  assert.equal(mullet.promotionStatus, "REVIEW_REQUIRED");
  assert.ok(mullet.aliasReview.excludedAliases.includes("가숭어"));
  assert.ok(mullet.aliasReview.excludedAliases.includes("참숭어"));
});

test("separates exact 짱뚱어 from aggregate 망둑어", () => {
  const mudskipper = dataset.species.find((item) => item.rawName === "짱뚱어");
  assert.equal(mudskipper.scientificName, "Boleophthalmus pectinirostris");
  assert.equal(mudskipper.ambiguityReview.aggregateRisk, "SEPARATED_FROM_AGGREGATE");
  assert.ok(mudskipper.aliasReview.excludedAliases.includes("망둑어"));
  assert.equal(mudskipper.promotionStatus, "PROMOTION_READY");
});

test("computes unique coverage impact without double counting overlapping spots", () => {
  assert.deepEqual(dataset.impact.current, { mapped: 1386, total: 1405, unmapped: 19 });
  assert.equal(dataset.impact.promotionReadyOnly.newlyMapped, 14);
  assert.equal(dataset.impact.promotionReadyOnly.mapped, 1400);
  assert.equal(dataset.impact.allThreeConditional.newlyMapped, 16);
  assert.equal(dataset.impact.allThreeConditional.mapped, 1402);
});

test("creates no canonical, runtime, profile, alias, database, or Supabase mutation", () => {
  assert.equal(sha256(sourcePath), "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA");
  assert.deepEqual(report.invariants, {
    canonicalMutation: 0,
    runtimeMutation: 0,
    conditionProfileCreation: 0,
    databaseWrite: 0,
    supabaseWrite: 0,
    productionAliasMutation: 0,
  });
});

test("persists deterministic research and report artifacts", () => {
  execFileSync(process.execPath, [toolPath, "--check"], { cwd: root, stdio: "pipe" });
});

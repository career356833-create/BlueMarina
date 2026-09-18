const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const hash = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();
const inventory = read("data/fish-canonical/bulk/v1/canonical-inventory-v1.json");
const batch1 = read("data/fish-canonical/bulk/v1/batch-001.json");
const audit = read("reports/fish-canonical/bulk-normalization-audit-v1.json");
const plan = read("reports/fish-canonical/bulk-normalization-batch-plan-v1.json");
const exceptions = read("reports/fish-canonical/bulk-normalization-exceptions-v1.json");
const conditionPool = read("reports/fish-canonical/condition-profile-priority-pool-v1.json");
const completion = read("reports/fish-canonical/bulk-normalization-completion-v1.json");
const batchArtifacts = Array.from({ length: 7 }, (_, index) => read(`data/fish-canonical/bulk/v1/batch-${String(index + 1).padStart(3, "0")}.json`));
const tool = path.join(root, "tools/fish-canonical/audit-and-build-bulk-normalization.mjs");

test("reconstructs the frozen 1,258 canonical identities", () => {
  assert.equal(inventory.total, 1258);
  assert.equal(inventory.species.length, 1258);
  assert.deepEqual(audit.canonical.sourceComposition, { MBRIS: 1250, NIFS: 8 });
});

test("keeps every canonical species ID unique", () => {
  assert.equal(new Set(inventory.species.map((row) => row.speciesId)).size, 1258);
  assert.ok(inventory.species.every((row) => row.speciesId));
});

test("detects scientific-name and Korean-name collisions without merging", () => {
  assert.deepEqual(audit.canonical.duplicateScientificNameGroups, []);
  assert.deepEqual(audit.canonical.duplicateKoreanNameGroups, []);
  assert.equal(inventory.invariants.automaticMergeOrDelete, 0);
});

test("provides the required bulk audit fields and source traceability", () => {
  const required = ["speciesId", "koreanName", "scientificName", "acceptedScientificName", "rank", "family", "genus", "aliases", "synonyms", "sourceRefs", "taxonomyStatus", "identityStatus", "duplicateStatus", "fishingSpotUsageCount", "conditionProfileStatus"];
  for (const row of inventory.species) {
    for (const key of required) assert.ok(Object.hasOwn(row, key), `${row.speciesId} missing ${key}`);
    assert.ok(row.sourceRefs.length >= 1);
  }
  assert.deepEqual(audit.canonical.sourceCoverage, { withAtLeastOneSource: 1258, sourceGap: 0 });
});

test("extracts all 53 raw Fishing Spot names and their distribution", () => {
  assert.equal(audit.fishingSpots.total, 1405);
  assert.equal(audit.fishingSpots.rawUniqueNames, 53);
  assert.equal(audit.fishingSpots.rawInventory.length, 53);
  assert.ok(audit.fishingSpots.rawInventory.every((row) => row.occurrenceCount >= row.spotCount && row.regions.length > 0));
});

test("reproduces current mapped and unmapped coverage", () => {
  assert.equal(audit.fishingSpots.currentMappedSpots, 1386);
  assert.equal(audit.fishingSpots.currentUnmappedSpots, 19);
  assert.equal(audit.fishingSpots.potentialMappingGain, 19);
  assert.equal(audit.fishingSpots.potentialMappedSpotsWithFishBaseline, 1405);
});

test("classifies aggregate, ambiguous, typo, and unresolved names without fuzzy mapping", () => {
  const names = new Map(audit.fishingSpots.rawInventory.map((row) => [row.rawName, row]));
  assert.equal(names.get("갑오징어").nameClassification, "AGGREGATED_TAXON");
  assert.equal(names.get("망둑어").nameClassification, "AGGREGATED_TAXON");
  assert.equal(names.get("농어/  삼치").nameClassification, "AMBIGUOUS");
  assert.equal(names.get("학꽁치").nameClassification, "TYPO_VARIANT");
  assert.equal(names.get("무늬오징어").nameClassification, "REGIONAL_NAME");
});

test("preserves the 우럭 runtime alias while flagging the cross-domain homonym", () => {
  const rockfish = audit.fishingSpots.rawInventory.find((row) => row.rawName === "우럭");
  assert.equal(rockfish.currentRuntimeMatch, true);
  assert.equal(rockfish.canonicalName, "조피볼락");
  assert.ok(exceptions.exceptions.some((row) => row.speciesId === "CROSS-SYSTEM:우럭" && row.categories.includes("CROSS_DOMAIN_HOMONYM")));
});

test("covers all 1,258 species exactly once across valid bulk batches", () => {
  assert.equal(plan.batchCount, 7);
  assert.deepEqual(plan.batches.map((batch) => batch.size), [200, 200, 200, 200, 200, 200, 58]);
  const ids = plan.batches.flatMap((batch) => batch.speciesIds);
  assert.equal(ids.length, 1258);
  assert.equal(new Set(ids).size, 1258);
  assert.ok(plan.batches.slice(0, -1).every((batch) => batch.size >= 150 && batch.size <= 250));
});

test("generates Batch 1 with 200 normalized research rows", () => {
  assert.equal(batch1.batchId, "BATCH-001");
  assert.equal(batch1.processed, 200);
  assert.equal(batch1.rows.length, 200);
  assert.ok(batch1.rows.every((row) => row.original && row.normalized && row.identityStatus && row.changeType && Array.isArray(row.sourceRefs)));
});

test("persists all seven planned batch artifacts with exact sizes", () => {
  assert.equal(batchArtifacts.length, 7);
  assert.deepEqual(batchArtifacts.map((batch) => batch.processed), [200, 200, 200, 200, 200, 200, 58]);
  assert.deepEqual(batchArtifacts.map((batch) => batch.batchId), ["BATCH-001", "BATCH-002", "BATCH-003", "BATCH-004", "BATCH-005", "BATCH-006", "BATCH-007"]);
});

test("reconciles all batch IDs as a disjoint exact inventory union", () => {
  const ids = batchArtifacts.flatMap((batch) => batch.rows.map((row) => row.speciesId));
  const inventoryIds = inventory.species.map((row) => row.speciesId);
  assert.equal(ids.length, 1258);
  assert.equal(new Set(ids).size, 1258);
  assert.deepEqual(new Set(ids), new Set(inventoryIds));
  assert.equal(completion.reconciliation.inventoryIdSetMatch, true);
  assert.equal(completion.reconciliation.planExactMatch, true);
});

test("preserves the complete row contract in every batch", () => {
  for (const row of batchArtifacts.flatMap((batch) => batch.rows)) {
    assert.ok(row.speciesId);
    assert.ok(Object.hasOwn(row.original, "koreanName"));
    assert.ok(Object.hasOwn(row.normalized, "koreanName"));
    assert.ok(Object.hasOwn(row.original, "scientificName"));
    assert.ok(Object.hasOwn(row.normalized, "acceptedScientificName"));
    assert.ok(row.taxonomyStatus && row.identityStatus);
    assert.ok(Array.isArray(row.normalized.aliases));
    assert.ok(Array.isArray(row.normalized.synonyms));
    assert.ok(Array.isArray(row.sourceRefs) && row.sourceRefs.length > 0);
    assert.equal(typeof row.fishingSpotUsageCount, "number");
    assert.ok(Array.isArray(row.exceptionReasons));
  }
});

test("completes scientific, Korean, synonym, and taxonomy collision checks", () => {
  assert.deepEqual(completion.collisions.acceptedScientificNameGroups, []);
  assert.deepEqual(completion.collisions.koreanNameGroups, []);
  assert.deepEqual(completion.collisions.synonymGroups, []);
  assert.equal(completion.collisions.taxonomyConflictSpeciesIds.length, 1);
});

test("reconciles all 15 expansion candidates in the bulk context", () => {
  assert.equal(completion.expansionCandidates.total, 15);
  assert.equal(completion.expansionCandidates.linkedFishCanonical, 14);
  assert.equal(completion.expansionCandidates.outsideFishBaseline, 1);
  assert.equal(completion.expansionCandidates.rows.find((row) => row.canonicalName === "흰꼴뚜기").status, "OUTSIDE_FISH_1258_BASELINE");
});

test("groups exceptions for category-batch review without losing entries", () => {
  const grouped = Object.values(exceptions.categoryGroups).flat();
  assert.equal(grouped.length, exceptions.exceptionCount);
  assert.equal(new Set(grouped).size, exceptions.exceptionCount);
  assert.equal(exceptions.policy.nextReviewMode, "CATEGORY_BATCH");
});

test("records full completion with exceptions and no apply", () => {
  assert.equal(completion.decision, "BULK_NORMALIZATION_COMPLETE_WITH_EXCEPTIONS");
  assert.equal(completion.reconciliation.totalBatchRows, 1258);
  assert.equal(completion.exceptions.total, 43);
  assert.equal(completion.conditionProfilePool.candidateCount, 38);
  assert.equal(completion.invariants.productionMutation, 0);
  assert.equal(completion.invariants.runtimeMutation, 0);
  assert.equal(completion.invariants.databaseWrite, 0);
  assert.equal(completion.invariants.supabaseWrite, 0);
});

test("keeps manual review in a bounded exception queue", () => {
  assert.ok(exceptions.exceptionCount > 0 && exceptions.exceptionCount < 1258);
  assert.equal(exceptions.policy.manualReviewOnlyForExceptions, true);
  assert.equal(exceptions.policy.automaticMerge, false);
  assert.equal(exceptions.policy.automaticDelete, false);
  assert.ok(exceptions.categoryCounts.AGGREGATED_TAXON > 0);
  assert.ok(exceptions.categoryCounts.CONFLICT > 0);
});

test("creates a 30-50 species condition priority pool without profile research", () => {
  assert.ok(conditionPool.candidateCount >= 30 && conditionPool.candidateCount <= 50);
  assert.equal(conditionPool.scope, "PRIORITY_ONLY_NO_PROFILE_RESEARCH");
  assert.ok(conditionPool.candidates.some((row) => row.koreanName === "주꾸미" && row.currentConditionEnabled));
  assert.ok(conditionPool.candidates.some((row) => row.koreanName === "문어" && row.currentConditionEnabled));
});

test("does not mutate production, runtime, condition profiles, DB, or Supabase", () => {
  assert.equal(hash("src/data/fishing-spots.json"), "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA");
  assert.equal(hash("src/lib/fishing-condition/fishing-spot-integration.ts"), "3D09BE7E708BFBD7DA83E213238D662024F32B424F3DC839D5A78BE3D04DEB0E");
  assert.equal(hash("data/fishing-condition/species-environment/v2/species-environment-profiles.json"), "EB365314A15444D7407B7C88B3FD58D95004EAEAFE6723EFFF620B2C7F705F98");
  assert.deepEqual(audit.invariants, { productionMutation: 0, runtimeMutation: 0, databaseWrite: 0, supabaseWrite: 0, automaticMergeOrDelete: 0, oneByOneWorkflow: 0, conditionProfileResearch: 0 });
});

test("rebuilds every bulk artifact deterministically", () => {
  execFileSync(process.execPath, [tool, "--check"], { cwd: root, stdio: "pipe" });
});

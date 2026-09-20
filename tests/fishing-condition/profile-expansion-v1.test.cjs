const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const hash = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();
const batchA = read("data/fishing-condition/profiles/v1/batch-a-19.json");
const batchB = read("data/fishing-condition/profiles/v1/batch-b-19.json");
const report = read("reports/fishing-condition/profile-expansion-v1.json");
const exceptions = read("reports/fishing-condition/profile-expansion-exceptions-v1.json");
const pool = read("reports/fish-canonical/condition-profile-priority-pool-v1.json");
const inventory = read("data/fish-canonical/bulk/v1/canonical-inventory-v1.json");
const tool = path.join(root, "tools/fishing-condition/build-profile-expansion-v1.mjs");
const profiles = [...batchA.profiles, ...batchB.profiles];

test("processes the complete 38-species priority pool", () => {
  assert.equal(report.total, 38);
  assert.equal(profiles.length, 38);
  assert.deepEqual(profiles.map((row) => row.speciesId), pool.candidates.map((row) => row.speciesId));
});

test("splits the pool into two exact 19-species priority batches", () => {
  assert.equal(batchA.total, 19);
  assert.equal(batchB.total, 19);
  assert.deepEqual(batchA.profiles.map((row) => row.priorityRank), Array.from({ length: 19 }, (_, index) => index + 1));
  assert.deepEqual(batchB.profiles.map((row) => row.priorityRank), Array.from({ length: 19 }, (_, index) => index + 20));
});

test("has no duplicate, missing, or extra species IDs", () => {
  const ids = profiles.map((row) => row.speciesId);
  assert.equal(new Set(ids).size, 38);
  assert.deepEqual(new Set(ids), new Set(pool.candidates.map((row) => row.speciesId)));
});

test("uses canonical scientific identities or protected condition identities", () => {
  const canonicalIds = new Set(inventory.species.map((row) => row.speciesId));
  const protectedOutsideBaseline = new Set(["BM-SPECIES-003107", "BM-SPECIES-003111"]);
  assert.ok(profiles.every((row) => canonicalIds.has(row.speciesId) || protectedOutsideBaseline.has(row.speciesId)));
  assert.ok(profiles.every((row) => row.scientificName));
});

test("preserves the minimum profile contract for every species", () => {
  for (const row of profiles) {
    for (const key of ["speciesId", "koreanName", "scientificName", "temperature", "depth", "salinity", "dissolvedOxygen", "spawning", "migration", "habitat", "evidenceRefs", "profileReadiness", "limitations"]) assert.ok(Object.hasOwn(row, key), `${row.speciesId}:${key}`);
  }
});

test("keeps observed, preferred, and optimum temperature separate", () => {
  assert.ok(profiles.every((row) => Array.isArray(row.temperature.observedRange)));
  assert.ok(profiles.every((row) => Array.isArray(row.temperature.preferredRange)));
  assert.ok(profiles.every((row) => Array.isArray(row.temperature.optimumRange)));
  const mudskipper = profiles.find((row) => row.speciesId === "BM-SPECIES-000385");
  assert.equal(mudskipper.temperature.status, "UNKNOWN");
});

test("keeps habitat, fishing, and observed depth separate", () => {
  assert.ok(profiles.every((row) => Array.isArray(row.depth.habitatDepth)));
  assert.ok(profiles.every((row) => Array.isArray(row.depth.fishingDepth)));
  assert.ok(profiles.every((row) => Array.isArray(row.depth.observedDepth)));
  assert.ok(profiles.every((row) => row.depth.fishingDepth.length === 0));
});

test("preserves conflicting conger depth definitions without averaging", () => {
  const conger = profiles.find((row) => row.speciesId === "BM-SPECIES-000908");
  assert.equal(conger.depth.status, "CONFLICT");
  assert.deepEqual(conger.depth.observedDepth.map(({ min, max }) => ({ min, max })), [{ min: 0, max: 800 }]);
  assert.deepEqual(conger.depth.conflictingObservedDepth.map(({ min, max }) => ({ min, max })), [{ min: 320, max: 830 }]);
});

test("requires an explicit unit or unit-bearing key for numeric range values", () => {
  const walk = (value, location = "root") => {
    if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${location}[${index}]`));
    if (!value || typeof value !== "object") return;
    const keys = Object.keys(value);
    if (keys.includes("min") || keys.includes("max")) assert.ok(value.unit, `${location} lacks unit`);
    for (const [key, child] of Object.entries(value)) walk(child, `${location}.${key}`);
  };
  walk(profiles);
});

test("retains FEMO salinity unit ambiguity and creates no inferred numeric value", () => {
  assert.equal(report.exceptions.categoryCounts.UNIT_AMBIGUITY, 2);
  for (const id of exceptions.categoryGroups.UNIT_AMBIGUITY) {
    const row = profiles.find((profile) => profile.speciesId === id);
    assert.ok(row.limitations.some((text) => text.includes("UNIT_NOT_DOCUMENTED")));
  }
});

test("does not convert birth or broad seasonal wording into spawning months", () => {
  for (const id of ["BM-SPECIES-000548", "BM-SPECIES-000800", "BM-SPECIES-000019", "BM-SPECIES-000223"]) {
    const row = profiles.find((profile) => profile.speciesId === id);
    assert.equal(row.spawning.periods.length, 0);
    assert.equal(row.spawning.status, "UNKNOWN");
  }
});

test("preserves an evidence reference and evidence class for every species", () => {
  const allowed = new Set(["DIRECT_OFFICIAL", "DIRECT_SCIENTIFIC", "DERIVED_FROM_OFFICIAL", "SECONDARY_REFERENCE", "UNKNOWN"]);
  assert.ok(profiles.every((row) => row.evidenceRefs.length > 0));
  assert.ok(profiles.flatMap((row) => row.evidenceRefs).every((item) => allowed.has(item.evidenceClass)));
  assert.equal(report.sourceCoverage.speciesWithEvidence, 38);
});

test("reports the reviewed readiness and domain coverage", () => {
  assert.deepEqual(report.readiness, { PROFILE_READY: 5, PROFILE_PARTIAL: 3, PROFILE_LIMITED: 30, INSUFFICIENT_EVIDENCE: 0 });
  assert.deepEqual(report.domainCoverage.temperature, { covered: 11, unknown: 27 });
  assert.deepEqual(report.domainCoverage.depth, { covered: 27, unknown: 11 });
  assert.deepEqual(report.domainCoverage.habitat, { covered: 38, unknown: 0 });
});

test("reuses ten protected identities without refreshing or changing source values", () => {
  assert.deepEqual(report.existingConditionProfiles, { protectedCount: 10, directIdReused: 9, crossSystemReused: 1, evidenceRefreshed: 0, sourceValuesChanged: 0, unchanged: 10 });
  const crossSystem = profiles.find((row) => row.speciesId === "47aa9b93-2b32-4df4-9a2a-45ed3abbd484");
  assert.equal(crossSystem.existingProfile.sourceSpeciesId, "BM-SPECIES-003107");
  assert.equal(crossSystem.profileReadiness, "PROFILE_LIMITED");
});

test("groups all limitations by category instead of one-species follow-ups", () => {
  assert.equal(exceptions.policy.oneSpeciesFollowup, false);
  assert.equal(exceptions.policy.categoryBatchOnly, true);
  assert.equal(exceptions.categoryCounts.SOURCE_CONFLICT, 2);
  assert.equal(exceptions.categoryCounts.INCOMPATIBLE_DEPTH_DEFINITIONS, 1);
  assert.equal(exceptions.categoryCounts.SEASONAL_AMBIGUITY, 4);
});

test("contains no scoring, ranking, probability, or recommendation fields", () => {
  const forbidden = new Set(["score", "scores", "ranking", "rankings", "probability", "probabilities", "recommendation", "recommendations", "suitability"]);
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.has(key), false, `forbidden field: ${key}`);
      walk(child);
    }
  };
  walk(profiles);
  assert.equal(report.invariants.scoring, 0);
  assert.equal(report.invariants.ranking, 0);
  assert.equal(report.invariants.probability, 0);
});

test("keeps the expansion artifact and production profile data immutable", () => {
  assert.deepEqual(report.invariants, { scoring: 0, ranking: 0, probability: 0, runtimeMutation: 0, productionMutation: 0, databaseWrite: 0, supabaseWrite: 0 });
  assert.equal(hash("data/fishing-condition/species-environment/v3/species-environment-profiles.json"), "880066B3EEFD2100EA870A674504492B8D70DA9700A660350FB296EA5BC7A376");
});

test("pins inputs and rebuilds all four JSON artifacts deterministically", () => {
  for (const source of Object.values(report.sources)) assert.equal(source.sha256, hash(source.artifact));
  execFileSync(process.execPath, [tool, "--check"], { cwd: root, stdio: "pipe" });
});

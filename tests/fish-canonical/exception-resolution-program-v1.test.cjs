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
const sourceQueue = read("reports/fish-canonical/bulk-normalization-exceptions-v1.json");
const aggregate = read("reports/fish-canonical/exception-resolution-aggregate-alias-v1.json");
const ambiguity = read("reports/fish-canonical/exception-resolution-alias-ambiguity-v1.json");
const structural = read("reports/fish-canonical/exception-resolution-structural-v1.json");
const summary = read("reports/fish-canonical/exception-resolution-summary-v1.json");
const tool = path.join(root, "tools/fish-canonical/resolve-bulk-exceptions.mjs");

test("processes the complete 43-entry queue in exactly three category batches", () => {
  assert.equal(aggregate.total, 34);
  assert.equal(ambiguity.total, 4);
  assert.equal(structural.total, 5);
  assert.equal(aggregate.total + ambiguity.total + structural.total, 43);
  const ids = [...aggregate.rows.map((row) => row.speciesId), ...ambiguity.rows.map((row) => row.speciesId), ...structural.rows.map((row) => row.exceptionId)];
  assert.equal(ids.length, 43);
  assert.equal(new Set(ids).size, 43);
  assert.deepEqual(new Set(ids), new Set(Object.values(sourceQueue.categoryGroups).flat()));
});

test("classifies all 34 aggregate candidates without a safe or fuzzy alias", () => {
  assert.deepEqual(aggregate.counts, { AGGREGATED_TAXON: 24, SAFE_ALIAS: 0, DO_NOT_MAP: 10, RESEARCH_REQUIRED: 0 });
  assert.ok(aggregate.rows.every((row) => row.resolutionStatus === "RESOLVED"));
  assert.ok(aggregate.rows.every((row) => row.candidates.length >= 1));
  assert.equal(aggregate.policy.fuzzyMapping, false);
  assert.equal(aggregate.policy.aggregateToSingleSpeciesPromotion, false);
});

test("uses DO_NOT_MAP when the queued target lacks one-to-one evidence", () => {
  const rejected = new Set(aggregate.rows.filter((row) => row.decision === "DO_NOT_MAP").map((row) => row.canonicalKoreanName));
  for (const name of ["연어", "개복치", "별복", "황줄돔", "발기", "갈치", "청새치", "참치방어", "대구", "임연수어"]) assert.ok(rejected.has(name));
});

test("finds no safe alias among the four ambiguity entries", () => {
  assert.deepEqual(ambiguity.counts, { SAFE_ALIAS: 0, AMBIGUOUS_ALIAS: 1, REJECT_ALIAS: 3 });
  assert.equal(ambiguity.policy.officialOrPublicEvidenceRequired, true);
  assert.equal(ambiguity.policy.oneToOneIdentityRequiredForSafeAlias, true);
});

test("keeps the two unverified 벵에돔 labels as one open ambiguity", () => {
  const row = ambiguity.rows.find((entry) => entry.speciesId === "BM-SPECIES-000279");
  assert.deepEqual(row.aliasCandidates, ["점벵에돔", "흑벵에돔"]);
  assert.equal(row.decision, "AMBIGUOUS_ALIAS");
  assert.equal(row.resolutionStatus, "REMAINS_OPEN");
  assert.ok(row.evidence.some((entry) => entry.organization === "FishBase"));
});

test("rejects polluted, malformed, and market labels without rewriting them", () => {
  const rejected = ambiguity.rows.filter((row) => row.decision === "REJECT_ALIAS");
  assert.deepEqual(rejected.flatMap((row) => row.aliasCandidates).sort(), ["대삼치", "쏨뱅이 독가시", "쥐치포용 쥐치"].sort());
  assert.ok(rejected.every((row) => row.limitations.some((text) => text.includes("not shortened") || text.includes("not rewritten"))));
});

test("resolves four structural boundaries with limitations and keeps one conflict", () => {
  assert.deepEqual(structural.counts, { RESOLVED: 0, RESOLVED_WITH_LIMITATION: 4, KEEP_EXCEPTION: 1 });
  assert.equal(structural.rows.find((row) => row.type === "TAXONOMY_CONFLICT").resolutionStatus, "REMAINS_OPEN");
  assert.equal(structural.policy.conditionIdProtection, true);
  assert.equal(structural.policy.crossDomainMerge, false);
});

test("preserves authoritative 제주 소라 lineage without applying it", () => {
  const row = structural.rows.find((entry) => entry.type === "ACCEPTED_NAME_PARTIAL");
  assert.equal(row.decision, "RESOLVED_WITH_LIMITATION");
  assert.ok(row.evidence.some((entry) => entry.title.includes("Turbo sazae")));
  assert.match(row.limitation, /does not rewrite/);
});

test("keeps 오분자기 distinct-taxon conflict open", () => {
  const row = structural.rows.find((entry) => entry.type === "TAXONOMY_CONFLICT");
  assert.equal(row.decision, "KEEP_EXCEPTION");
  assert.ok(row.evidence.some((entry) => entry.title.includes("Haliotis diversicolor")));
  assert.ok(row.evidence.some((entry) => entry.title.includes("Haliotis supertexta")));
});

test("protects both condition IDs outside the Fish baseline", () => {
  const rows = structural.rows.filter((entry) => entry.type === "CONDITION_ID_MISMATCH_OR_OUTSIDE_BASELINE");
  assert.deepEqual(rows.map((row) => row.exceptionId).sort(), ["CONDITION:BM-SPECIES-003107", "CONDITION:BM-SPECIES-003111"]);
  assert.ok(rows.every((row) => row.decision === "RESOLVED_WITH_LIMITATION"));
});

test("reconciles 41 resolved entries and two evidence-bound remainders", () => {
  assert.equal(summary.decision, "EXCEPTION_RESOLUTION_COMPLETE_WITH_REMAINDERS");
  assert.deepEqual(summary.exceptions, {
    before: 43,
    resolved: 41,
    remaining: 2,
    remainingIds: ["07e1852e-0675-4090-8675-cd216fb90ba9", "BM-SPECIES-000279"],
    historyPreserved: true,
    sourceQueueMutated: false,
  });
});

test("revalidates all 1,258 identities and complete source coverage", () => {
  assert.deepEqual(summary.canonical, {
    total: 1258,
    uniqueIds: 1258,
    verified: 1256,
    partial: 1,
    conflict: 1,
    unresolved: 0,
    sourceCoverage: 1258,
    identityStatusMutated: false,
  });
  assert.equal(inventory.species.length, 1258);
});

test("finds no scientific, Korean-name, or synonym collisions", () => {
  assert.deepEqual(summary.collisions, { scientificName: [], koreanName: [], synonym: [] });
});

test("preserves the original exception queue and its resolution history", () => {
  assert.equal(sourceQueue.exceptionCount, 43);
  assert.equal(summary.sources.exceptions.sha256, hash("reports/fish-canonical/bulk-normalization-exceptions-v1.json"));
  assert.equal(summary.exceptions.historyPreserved, true);
});

test("makes no production, runtime, condition-profile, database, or Supabase mutation", () => {
  assert.deepEqual(summary.invariants, {
    productionMutation: 0,
    runtimeMutation: 0,
    databaseWrite: 0,
    supabaseWrite: 0,
    automaticMergeOrDelete: 0,
    oneByOneWorkflow: 0,
    conditionProfileResearch: 0,
  });
  assert.equal(hash("src/data/fishing-spots.json"), "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA");
  assert.equal(hash("src/lib/fishing-condition/fishing-spot-integration.ts"), "3D09BE7E708BFBD7DA83E213238D662024F32B424F3DC839D5A78BE3D04DEB0E");
  assert.equal(hash("data/fishing-condition/species-environment/v2/species-environment-profiles.json"), "EB365314A15444D7407B7C88B3FD58D95004EAEAFE6723EFFF620B2C7F705F98");
});

test("rebuilds all four resolution reports deterministically", () => {
  execFileSync(process.execPath, [tool, "--check"], { cwd: root, stdio: "pipe" });
});

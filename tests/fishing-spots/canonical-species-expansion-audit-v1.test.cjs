const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const reportPath = path.join(root, "reports/fishing-spots/canonical-species-expansion-audit-v1.json");
const candidatePath = path.join(root, "reports/fishing-spots/canonical-species-expansion-candidates-v1.json");
const sourcePath = path.join(root, "src/data/fishing-spots.json");
const toolPath = path.join(root, "tools/fishing-spots/audit-canonical-species-expansion.mjs");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const candidates = JSON.parse(fs.readFileSync(candidatePath, "utf8"));

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

test("reproduces exactly 19 unmapped spots and 75 raw occurrences", () => {
  assert.equal(report.counts.totalSpots, 1405);
  assert.equal(report.counts.mappedSpots, 1386);
  assert.equal(report.counts.unmappedSpots, 19);
  assert.equal(report.counts.rawOccurrences, 75);
  assert.equal(report.unmappedSpots.length, 19);
  assert.equal(report.occurrences.length, 75);
});

test("records all 17 unique raw names with occurrence and spot impact", () => {
  assert.equal(report.counts.uniqueRawNames, 17);
  assert.equal(report.uniqueRawNames.length, 17);
  assert.ok(report.uniqueRawNames.every((item) => item.occurrenceCount > 0 && item.affectedSpotCount > 0));
  assert.equal(report.uniqueRawNames.reduce((sum, item) => sum + item.occurrenceCount, 0), 75);
});

test("every occurrence preserves source row, region, type, and provenance", () => {
  for (const item of report.occurrences) {
    assert.match(item.spotId, /^(boat|rock)-\d+$/);
    assert.ok(item.sourceRow.originalId);
    assert.ok(item.sourceRow.sourceSpeciesIndex > 0);
    assert.ok(item.region);
    assert.ok(item.spotType);
    assert.match(item.provenance.sourceUrl, /^https:\/\/www\.data\.go\.kr\//);
    assert.ok(item.provenance.sourceType);
  }
});

test("preserves the two approved aliases and disables fuzzy mapping", () => {
  assert.deepEqual(report.currentCanonical.approvedAliases, { 광어: "넙치", 우럭: "조피볼락" });
  assert.equal(report.currentCanonical.mappingMode, "EXACT_PLUS_APPROVED_ALIAS_ONLY");
  assert.equal(report.currentCanonical.fuzzyMapping, false);
  assert.equal(report.invariants.fuzzyMapping, 0);
});

test("does not invent an alias to the existing ten canonical species", () => {
  assert.equal(report.counts.aliasCandidatesToExistingCanonical, 0);
  assert.deepEqual(report.aliasCandidates.toExistingCanonical, []);
  assert.deepEqual(candidates.aliasCandidatesToExistingCanonical, []);
});

test("keeps aggregate names unmapped and excludes them from candidates", () => {
  assert.deepEqual(candidates.excluded.aggregateNames.sort(), ["갑오징어", "망둑어"].sort());
  assert.equal(report.aggregateCategories.length, 2);
  assert.ok(report.aggregateCategories.every((item) => item.expectedOutcome === "DO_NOT_MAP"));
  assert.ok(candidates.candidates.every((item) => !["갑오징어", "망둑어"].includes(item.canonicalName)));
});

test("does not promote commercial, ambiguous, or unresolved categories", () => {
  assert.equal(report.counts.commercialCategories, 0);
  assert.equal(report.counts.ambiguousNames, 0);
  assert.equal(report.counts.unresolvedNames, 0);
  assert.deepEqual(candidates.excluded.commercialCategories, []);
  assert.deepEqual(candidates.excluded.ambiguousNames, []);
  assert.deepEqual(candidates.excluded.unresolvedNames, []);
});

test("identifies 15 distinct canonical candidates without collapsing species", () => {
  assert.equal(candidates.candidateCount, 15);
  assert.equal(new Set(candidates.candidates.map((item) => item.canonicalName)).size, 15);
  const rockfish = candidates.candidates.find((item) => item.canonicalName === "볼락");
  assert.equal(rockfish.scientificName, "Sebastes inermis");
  assert.ok(!report.aliasCandidates.toExistingCanonical.some((item) => item.rawName === "볼락"));
});

test("keeps explicit proposed aliases separate from fuzzy matching", () => {
  assert.deepEqual(
    candidates.aliasesForProposedCanonicalSpecies.map((item) => [item.alias, item.proposedCanonicalName]),
    [["무늬오징어", "흰꼴뚜기"], ["학꽁치", "학공치"]],
  );
  assert.equal(candidates.aliasesForProposedCanonicalSpecies.reduce((sum, item) => sum + item.affectedSpotCount, 0), 8);
});

test("reports potential full coverage as conditional rather than production promotion", () => {
  assert.equal(report.coverageImpact.potentiallyResolvedSpots, 19);
  assert.equal(report.coverageImpact.potentialMappedSpots, 1405);
  assert.equal(report.coverageImpact.potentialUnmappedSpots, 0);
  assert.match(report.coverageImpact.condition, /require a separate canonical promotion/);
  assert.equal(report.invariants.productionPromotion, 0);
});

test("keeps canonical, runtime, database, and Supabase data unchanged", () => {
  assert.equal(sha256(sourcePath), "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA");
  assert.deepEqual(report.invariants, {
    canonicalMutation: 0,
    runtimeMutation: 0,
    fuzzyMapping: 0,
    databaseWrite: 0,
    supabaseWrite: 0,
    productionPromotion: 0,
  });
});

test("persisted reports are deterministic", () => {
  execFileSync(process.execPath, [toolPath, "--check"], { cwd: root, stdio: "pipe" });
});

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const hash = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();

const report = read("reports/fish-canonical/final-exception-closure-v1.json");
const inventory = read("data/fish-canonical/bulk/v1/canonical-inventory-v1.json");
const prior = read("reports/fish-canonical/exception-resolution-summary-v1.json");
const tool = path.join(root, "tools/fish-canonical/close-final-exceptions.mjs");
const obunjagiId = "07e1852e-0675-4090-8675-cd216fb90ba9";
const girellaId = "BM-SPECIES-000279";

test("closes exactly the two prior remaining exceptions", () => {
  assert.deepEqual(report.scope.exactExceptionIds, [obunjagiId, girellaId]);
  assert.deepEqual(prior.exceptions.remainingIds, report.scope.exactExceptionIds);
  assert.equal(report.cases.length, 2);
});

test("finishes with one evidence-bound remainder", () => {
  assert.equal(report.decision, "EXCEPTION_CLOSURE_COMPLETE_WITH_REMAINDERS");
  assert.equal(report.scope.before, 2);
  assert.equal(report.scope.resolved, 1);
  assert.equal(report.scope.remaining, 1);
  assert.deepEqual(report.scope.remainingIds, [girellaId]);
});

test("preserves the conflicting 오분자기 canonical identity as the reviewed input", () => {
  const row = report.cases.find((entry) => entry.exceptionId === obunjagiId);
  assert.equal(row.currentIdentity.scientificName, "Sulculus diversicolor");
  assert.equal(row.currentIdentity.taxonomyStatus, "TAXONOMY_CONFLICT");
  assert.equal(row.currentIdentity.identityStatus, "CONFLICT");
});

test("distinguishes both accepted abalone species and the obsolete combination", () => {
  const row = report.cases.find((entry) => entry.exceptionId === obunjagiId);
  assert.deepEqual(row.competingAcceptedNames.map((entry) => entry.scientificName), ["Haliotis diversicolor", "Haliotis supertexta"]);
  assert.equal(row.synonymAssessment.relationship, "SUPERSEDED_COMBINATION");
  assert.equal(row.synonymAssessment.synonymOfHaliotisSupertexta, false);
  assert.ok(row.authoritativeEvidence.some((entry) => entry.authority === "WoRMS/MolluscaBase" && entry.acceptedStatus === "ACCEPTED"));
});

test("resolves 오분자기 only as unapplied research metadata", () => {
  const row = report.cases.find((entry) => entry.exceptionId === obunjagiId);
  assert.equal(row.resolution, "RESOLVED_WITH_LIMITATION");
  assert.equal(row.resolutionMetadata.researchAcceptedScientificName, "Haliotis supertexta");
  assert.equal(row.resolutionMetadata.displacedScientificIdentity, "Haliotis diversicolor");
  assert.equal(row.resolutionMetadata.canonicalApplyStatus, "NOT_APPLIED");
});

test("keeps the 벵에돔 canonical identity fixed", () => {
  const row = report.cases.find((entry) => entry.exceptionId === girellaId);
  assert.equal(row.currentIdentity.scientificName, "Girella punctata");
  assert.equal(row.currentIdentity.identityStatus, "VERIFIED");
  assert.equal(row.resolution, "KEEP_EXCEPTION");
});

test("does not approve 점벵에돔 or 흑벵에돔 as aliases", () => {
  const row = report.cases.find((entry) => entry.exceptionId === girellaId);
  assert.deepEqual(row.aliasCandidates.map((entry) => entry.alias), ["점벵에돔", "흑벵에돔"]);
  assert.ok(row.aliasCandidates.every((entry) => entry.decision === "NOT_APPROVED"));
  assert.ok(row.aliasCandidates.every((entry) => entry.exactAuthoritativeSupportForGirellaPunctata === false));
});

test("fails every safe-alias gate for BM-SPECIES-000279", () => {
  const row = report.cases.find((entry) => entry.exceptionId === girellaId);
  assert.equal(row.aliasSafety, "NOT_SAFE");
  assert.deepEqual(row.safeAliasGate, {
    oneToOneSpeciesIdentity: false,
    authoritativeSynonymOrCommonNameSupport: false,
    noOtherSpeciesConflict: false,
    passed: false,
  });
  assert.equal(row.relationship.separateSpeciesRisk, true);
});

test("records public-institution evidence for the separate Girella leonina identity", () => {
  const row = report.cases.find((entry) => entry.exceptionId === girellaId);
  const longtail = row.authoritativeEvidence.filter((entry) => entry.observedIdentity?.scientificName === "Girella leonina");
  assert.deepEqual(new Set(longtail.map((entry) => entry.authority)), new Set(["NIFS", "MBRIS"]));
});

test("reconciles all 1,258 canonical records without collisions", () => {
  assert.equal(report.canonical.total, 1258);
  assert.equal(report.canonical.uniqueIds, 1258);
  assert.equal(report.canonical.sourceCoverage, 1258);
  assert.deepEqual(report.canonical.collisions, { scientificName: [], koreanName: [], synonym: [] });
  assert.equal(inventory.species.length, 1258);
});

test("leaves frozen identity counts unchanged", () => {
  assert.equal(report.canonical.verified, 1256);
  assert.equal(report.canonical.partial, 1);
  assert.equal(report.canonical.conflict, 1);
  assert.equal(report.canonical.unresolved, 0);
  assert.equal(report.canonical.identityStatusMutated, false);
});

test("pins every local source input by checksum", () => {
  for (const source of Object.values(report.sources)) assert.equal(source.sha256, hash(source.artifact));
  assert.equal(report.scope.priorHistoryPreserved, true);
});

test("makes no ID, production, runtime, database, or Supabase mutation", () => {
  assert.deepEqual(report.invariants, {
    idMutation: 0,
    newId: 0,
    idMerge: 0,
    idDelete: 0,
    productionMutation: 0,
    runtimeMutation: 0,
    databaseWrite: 0,
    supabaseWrite: 0,
  });
  assert.equal(hash("src/data/fishing-spots.json"), "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA");
  assert.equal(hash("src/lib/fishing-condition/fishing-spot-integration.ts"), "3D09BE7E708BFBD7DA83E213238D662024F32B424F3DC839D5A78BE3D04DEB0E");
});

test("rebuilds the final closure report deterministically", () => {
  execFileSync(process.execPath, [tool, "--check"], { cwd: root, stdio: "pipe" });
});

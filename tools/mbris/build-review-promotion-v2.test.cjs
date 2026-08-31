const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildArtifacts,
  classifyReviewRecords,
  slugifyScientificName,
} = require("./build-review-promotion-v2.cjs");

function emptyRemote(species = []) {
  return {
    identity: { currentUser: "blue_marina_readonly_auditor", readOnly: "on", bypassRls: false },
    species,
    sources: [],
    relations: [],
    aliases: [],
    slugAliases: [],
    logs: [],
    fingerprints: {},
  };
}

test("scientific names produce stable ASCII slugs", () => {
  assert.equal(slugifyScientificName("Sebastes inermis"), "sebastes-inermis");
});

test("legacy UI linkage creates a new canonical candidate instead of a merge", () => {
  const record = {
    mbrisSourceId: "MBRIS:test:1",
    internalId: "BM-SPECIES-TEST-1",
    koreanName: "테스트어",
    scientificName: "Testus marina",
    normalizedScientificName: "Testus marina",
    taxonomy: { family: "Testidae", genus: "Testus Author", species: "marina" },
    legacyLocalMatch: "LEGACY_LOCAL_NAME_MATCH",
    secondaryFlags: [],
  };
  const [result] = classifyReviewRecords({ reviewRecords: [record], legacyRecords: [record], remote: emptyRemote() });
  assert.equal(result.primaryClass, "LINK_LEGACY_AND_PROMOTE_NEW");
  assert.equal(result.legacyMappingRequired, true);
});

test("missing Korean name stays blocked", () => {
  const record = {
    mbrisSourceId: "MBRIS:test:2",
    internalId: "BM-SPECIES-TEST-2",
    koreanName: null,
    scientificName: "Testus marina",
    normalizedScientificName: "Testus marina",
    taxonomy: { family: "Testidae", genus: "Testus Author", species: "marina" },
    legacyLocalMatch: "NONE",
    secondaryFlags: [],
  };
  const [result] = classifyReviewRecords({ reviewRecords: [record], legacyRecords: [], remote: emptyRemote() });
  assert.equal(result.primaryClass, "KOREAN_NAME_REVIEW");
});

test("existing staging scientific identity is never admitted as new", () => {
  const record = {
    mbrisSourceId: "MBRIS:test:3",
    internalId: "BM-SPECIES-TEST-3",
    koreanName: "테스트어",
    scientificName: "Testus marina",
    normalizedScientificName: "Testus marina",
    taxonomy: { family: "Testidae", genus: "Testus Author", species: "marina" },
    legacyLocalMatch: "NONE",
    secondaryFlags: [],
  };
  const species = [{ species_id: "uuid", internal_id: null, korean_name: "테스트어", scientific_name: "Testus marina", normalized_scientific_name: "Testus marina", slug: "testus-marina" }];
  const [result] = classifyReviewRecords({ reviewRecords: [record], legacyRecords: [], remote: emptyRemote(species) });
  assert.equal(result.primaryClass, "EXISTING_CANONICAL_EXACT");
});

test("repository inputs build 137 classifications and isolate malformed five", () => {
  const artifacts = buildArtifacts(emptyRemote());
  assert.equal(artifacts.promotion.rows.length, 137);
  assert.equal(artifacts.blocked.malformedScientific.length, 5);
  assert.equal(artifacts.promotion.verification.unclassified, 0);
  assert.equal(artifacts.readyManifest.rows.length, artifacts.promotion.readyNewTotal);
  assert.equal(artifacts.readyManifest.rows.some((row) => row.koreanName === "참홍어"), false);
});

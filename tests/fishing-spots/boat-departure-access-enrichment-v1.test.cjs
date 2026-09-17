/* eslint-disable @typescript-eslint/no-require-imports -- Node's existing .test.cjs suite uses CommonJS. */
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const sha256 = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();

const artifact = readJson("data/fishing-spots/enrichment/v1/boat-departure-access.json");
const report = readJson("reports/fishing-spots/boat-departure-access-enrichment-v1.json");
const spots = readJson("src/data/fishing-spots.json");
const hold = readJson("reports/fishing-spots/navigation-coordinate-hold-v1.json");
const boatSpots = spots.filter((spot) => spot.type === "boat-fishing-point");

test("enrichment covers exactly all 329 boat spots in canonical order", () => {
  assert.equal(artifact.records.length, 329);
  assert.deepEqual(artifact.records.map((record) => record.spotId), boatSpots.map((spot) => spot.id));
  assert.equal(new Set(artifact.records.map((record) => record.spotId)).size, 329);
});

test("every boat record traces one official raw source row", () => {
  for (const record of artifact.records) {
    const official = record.evidence.find((item) => item.authority === "OFFICIAL");
    assert.ok(official);
    assert.equal(official.sourceType, "MOF_SHARED_BOAT_FISHING_POINT");
    assert.match(official.sourceRef, /^work\/fishing-spots-boat-raw\.csv#공간정보일련번호=\d+$/);
    assert.ok(official.fields.pointName1 || official.fields.pointName2);
  }
});

test("departure status remains evidence-conservative", () => {
  const counts = artifact.records.reduce((result, record) => {
    result[record.departure.status] = (result[record.departure.status] ?? 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, { CANDIDATE: 20, UNRESOLVED: 309 });
  assert.equal(artifact.records.some((record) => record.departure.status === "CONFIRMED"), false);
  for (const record of artifact.records.filter((item) => item.departure.status === "CANDIDATE")) {
    assert.ok(record.departure.name);
    assert.ok(record.departure.evidenceSource);
    assert.ok(record.departure.sourceRef);
  }
});

test("all 119 legacy free-text candidates are reclassified without scope expansion", () => {
  const review = report.freeTextCandidateReview;
  assert.equal(review.baselineCandidates, 119);
  assert.equal(review.boatInScope, 31);
  assert.equal(review.nonBoatExcluded, 88);
  assert.deepEqual(review.boatClassifications, {
    AMBIGUOUS_LOCALITY: 8,
    EXPLICIT_PORT_NAME: 20,
    GENERIC_HARBOR_MENTION: 3,
  });
  assert.deepEqual(review.allClassifications, {
    AMBIGUOUS_LOCALITY: 8,
    EXPLICIT_PORT_NAME: 20,
    GENERIC_HARBOR_MENTION: 3,
    NO_NAMED_DEPARTURE: 88,
  });
});

test("public-institution matches corroborate feature identity only", () => {
  const corroborated = artifact.records.filter((record) => record.evidence.some((item) => item.authority === "PUBLIC_INSTITUTION"));
  assert.equal(corroborated.length, 8);
  for (const record of corroborated) {
    const references = record.evidence.filter((item) => item.authority === "PUBLIC_INSTITUTION");
    assert.ok(references.every((item) => item.supports.includes("NAMED_FEATURE_IDENTITY")));
    assert.ok(references.every((item) => item.doesNotSupport.includes("CONFIRMED_DEPARTURE_RELATION")));
    assert.equal(record.departure.status, "CANDIDATE");
  }
});

test("boat access mode is partial while unknown access fields stay null", () => {
  for (const record of artifact.records) {
    assert.equal(record.access.mode, "BOAT_REQUIRED");
    assert.equal(record.access.status, "PARTIAL");
    assert.equal(record.access.parking, null);
    assert.equal(record.access.boardingInfo, null);
    assert.equal(record.access.restriction, null);
    assert.equal(record.access.permitRequired, null);
  }
  assert.deepEqual(report.access, {
    confirmed: 0,
    partial: 329,
    unknown: 0,
    boatRequired: 329,
    parkingKnown: 0,
    boardingInfoKnown: 0,
    permitRequirementKnown: 0,
  });
});

test("control and restriction values are never inferred", () => {
  assert.deepEqual(report.control, { restrictionCoverage: 0, permitCoverage: 0, inferredRestrictions: 0 });
});

test("enrichment contains no departure coordinate fields or canonical mutation", () => {
  const forbiddenKeys = new Set(["lat", "lng", "latitude", "longitude", "coordinate", "coordinates"]);
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `unexpected coordinate field ${key}`);
      visit(child);
    }
  };
  visit(artifact.records);
  assert.equal(sha256("src/data/fishing-spots.json"), "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA");
  assert.equal(sha256("work/fishing-spots-boat-raw.csv"), "5AE7CFB4280214667583724B8C0531A7018B0ABDE47CB82C60F6C491B9DFA20D");
});

test("the four coordinate safety holds remain unchanged and unreleased", () => {
  assert.deepEqual(report.coordinateSafetyHold.spotIds, ["boat-60", "boat-128", "boat-129", "boat-321"]);
  assert.deepEqual(report.coordinateSafetyHold.policies, hold.holds.map(({ spotId, mapPolicy, navigationPolicy }) => ({ spotId, mapPolicy, navigationPolicy })));
  assert.equal(report.coordinateSafetyHold.navigationHoldReleased, 0);
  assert.equal(report.coordinateSafetyHold.unchanged, true);
});

test("artifact remains audit-only with no runtime, DB, or Supabase mutation", () => {
  assert.equal(report.output.runtimeIntegrated, false);
  assert.deepEqual(report.invariants, {
    canonicalCoordinateMutation: 0,
    sourceMutation: 0,
    departureCoordinateInference: 0,
    duplicateMergeDelete: 0,
    navigationHoldRelease: 0,
    runtimeMutation: 0,
    databaseWrite: 0,
    supabaseWrite: 0,
  });
});

test("tool output is deterministic and exactly matches persisted artifacts", async () => {
  const tool = await import(pathToFileURL(path.join(root, "tools/fishing-spots/build-boat-departure-access-enrichment.mjs")).href);
  const rebuilt = tool.buildEnrichment();
  assert.deepEqual(rebuilt.artifact, artifact);
  assert.deepEqual(rebuilt.report, report);
});

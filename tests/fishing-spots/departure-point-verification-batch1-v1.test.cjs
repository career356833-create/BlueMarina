const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const DATA_PATH = path.join(
  ROOT,
  "data/fishing-spots/enrichment/research/departure-point-batch1-v1.json",
);
const REPORT_PATH = path.join(
  ROOT,
  "reports/fishing-spots/departure-point-verification-batch1-v1.json",
);
const INPUT_PATH = path.join(
  ROOT,
  "data/fishing-spots/enrichment/v1/boat-departure-access.json",
);
const HOLD_PATH = path.join(ROOT, "reports/fishing-spots/navigation-coordinate-hold-v1.json");

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
const input = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
const hold = JSON.parse(fs.readFileSync(HOLD_PATH, "utf8"));

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

test("batch contains exactly the 20 original named departure candidates", () => {
  const expectedIds = input.records
    .filter((record) => record.departure.status === "CANDIDATE")
    .map((record) => record.spotId);
  assert.equal(expectedIds.length, 20);
  assert.deepEqual(data.records.map((record) => record.spotId), expectedIds);
  assert.equal(new Set(data.records.map((record) => record.spotId)).size, 20);
});

test("no record is promoted without an exact authoritative departure relation", () => {
  assert.deepEqual(data.counts, {
    total: 20,
    confirmed: 0,
    geographicNameOnly: 17,
    unresolved: 3,
    conflicts: 0,
    departureCoordinatesAdded: 0,
  });
  assert.equal(
    data.records.some((record) => record.departureRelationStatus === "DEPARTURE_CONFIRMED"),
    false,
  );
});

test("general fishing-departure use stays unresolved for the exact spot", () => {
  const unresolved = data.records
    .filter((record) => record.departureRelationStatus === "DEPARTURE_RELATION_UNRESOLVED")
    .map((record) => record.spotId);
  assert.deepEqual(unresolved, ["boat-125", "boat-160", "boat-290"]);
  for (const record of data.records.filter((item) => unresolved.includes(item.spotId))) {
    assert.ok(
      record.evidence.some((item) => item.supports.includes("GENERAL_FISHING_VESSEL_DEPARTURE_USE")),
    );
    assert.ok(record.evidence.every((item) => item.doesNotSupport.includes("EXACT_SPOT_DEPARTURE_RELATION")));
  }
});

test("every record has the required review fields and authoritative source reference", () => {
  for (const record of data.records) {
    assert.equal(typeof record.spotId, "string");
    assert.equal(typeof record.spotName, "string");
    assert.equal(typeof record.candidateDepartureName, "string");
    assert.equal(typeof record.region, "string");
    assert.ok(Array.isArray(record.evidence) && record.evidence.length >= 1);
    assert.ok(record.evidence.every((item) => item.sourceUrl || item.sourceRef));
    assert.ok(Array.isArray(record.limitations) && record.limitations.length >= 3);
  }
});

test("fishing spot coordinates are never reused as departure coordinates", () => {
  for (const record of data.records) assert.equal(record.departureCoordinate, null);
  assert.equal(report.invariants.coordinateInference, 0);
  assert.equal(report.counts.departureCoordinatesAdded, 0);
});

test("the production enrichment and canonical data remain byte-identical", () => {
  assert.equal(
    sha256(INPUT_PATH),
    "9E4BE97368A2EA45017D0A82DBCF7ED00173A0598ACCA3C3AA309CB7F0A4D951",
  );
  assert.equal(
    sha256(path.join(ROOT, "src/data/fishing-spots.json")),
    "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA",
  );
  assert.equal(report.artifacts.productionEnrichmentPromoted, false);
  assert.equal(report.invariants.originalEnrichmentMutation, 0);
  assert.equal(report.invariants.canonicalCoordinateMutation, 0);
});

test("all four coordinate safety holds remain unchanged and unreleased", () => {
  assert.deepEqual(
    hold.holds.map((item) => item.spotId),
    ["boat-60", "boat-128", "boat-129", "boat-321"],
  );
  assert.ok(hold.holds.every((item) => item.applied === false));
  assert.deepEqual(report.coordinateSafetyHold.spotIds, ["boat-60", "boat-128", "boat-129", "boat-321"]);
  assert.equal(report.coordinateSafetyHold.released, 0);
  assert.equal(report.coordinateSafetyHold.unchanged, true);
});

test("research remains offline and makes no runtime, database, or Supabase change", () => {
  assert.equal(report.invariants.runtimeMutation, 0);
  assert.equal(report.invariants.databaseWrite, 0);
  assert.equal(report.invariants.supabaseWrite, 0);
  assert.equal(report.invariants.navigationHoldRelease, 0);
});

test("builder output is deterministic and matches persisted artifacts", async () => {
  const moduleUrl = pathToFileURL(
    path.join(ROOT, "tools/fishing-spots/build-departure-point-verification-batch1.mjs"),
  ).href;
  const { buildVerification } = await import(moduleUrl);
  const rebuilt = buildVerification();
  assert.deepEqual(rebuilt.data, data);
  assert.deepEqual(rebuilt.report, report);
});

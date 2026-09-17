const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const DATA_PATH = path.join(ROOT, "data/fishing-spots/enrichment/research/boat-access-control-v1.json");
const REPORT_PATH = path.join(ROOT, "reports/fishing-spots/boat-access-control-enrichment-v1.json");
const INPUT_PATH = path.join(ROOT, "data/fishing-spots/enrichment/v1/boat-departure-access.json");
const HOLD_PATH = path.join(ROOT, "reports/fishing-spots/navigation-coordinate-hold-v1.json");

const dataset = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
const input = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
const hold = JSON.parse(fs.readFileSync(HOLD_PATH, "utf8"));

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

test("dataset covers exactly all 329 boat spots in source order", () => {
  const expectedIds = input.records.map((record) => record.spotId);
  assert.equal(expectedIds.length, 329);
  assert.deepEqual(dataset.records.map((record) => record.spotId), expectedIds);
  assert.equal(new Set(expectedIds).size, 329);
});

test("every access record traces the official source row", () => {
  for (const record of dataset.records) {
    assert.equal(record.evidence.authority, "OFFICIAL");
    assert.equal(record.evidence.sourceName, "해양수산부 공동활용체계 선상낚시포인트");
    assert.equal(record.access.sourceRefs.length, 2);
    assert.ok(record.access.sourceRefs[0].startsWith("https://www.data.go.kr/"));
    assert.ok(record.access.sourceRefs[1].includes(`공간정보일련번호=${record.spotId.slice(5)}`));
  }
  assert.equal(dataset.sourceCoverage.officialSourceRowsTraced, 329);
});

test("access stays partial only because BOAT_REQUIRED is source-backed", () => {
  assert.deepEqual(dataset.counts.access, { confirmed: 0, partial: 329, unknown: 0 });
  for (const record of dataset.records) {
    assert.equal(record.access.mode, "BOAT_REQUIRED");
    assert.equal(record.access.accessStatus, "PARTIAL");
    assert.deepEqual(record.evidence.supports, ["BOAT_REQUIRED", "SOURCE_ROW_TRACEABILITY"]);
  }
});

test("parking and boarding remain unknown without dedicated source fields", () => {
  assert.deepEqual(dataset.counts.parking, { confirmed: 0, unknown: 329 });
  assert.deepEqual(dataset.counts.boarding, { confirmed: 0, partial: 0, unknown: 329 });
  for (const record of dataset.records) {
    assert.equal(record.access.parking, null);
    assert.equal(record.access.boardingInfo, null);
    assert.equal(record.evidence.dedicatedAccessControlFieldsPresent, false);
  }
});

test("restriction and permit fields remain unknown and are never inferred", () => {
  assert.deepEqual(dataset.counts.control, {
    restrictionsConfirmed: 0,
    permitsConfirmed: 0,
    unknown: 329,
  });
  for (const record of dataset.records) {
    assert.equal(record.access.restriction, null);
    assert.equal(record.access.permitRequired, null);
    assert.deepEqual(record.control, {
      closedArea: null,
      timeRestriction: null,
      permitType: null,
      authority: null,
      status: "UNKNOWN",
    });
  }
  assert.equal(report.invariants.restrictionInference, 0);
  assert.equal(report.invariants.permitInference, 0);
});

test("29 regional notices are preserved but never misapplied to boat spots", () => {
  const noticeRecords = dataset.records.filter((record) => record.evidence.sourceFields.notice !== null);
  assert.equal(noticeRecords.length, 29);
  assert.ok(noticeRecords.every((record) => record.evidence.noticeApplicableToExactSpot === false));
  assert.ok(noticeRecords.every((record) => record.evidence.noticeExclusionReason));
  assert.equal(dataset.sourceCoverage.sourceNoticesApplicableToExactBoatSpot, 0);
  assert.equal(report.exclusions.sourceNoticeMisappliedToBoatSpot, 0);
});

test("departure evidence is not converted into access confirmation", () => {
  assert.equal(dataset.sourceCoverage.publicInstitutionGeographicEvidenceReviewed, 16);
  assert.equal(dataset.sourceCoverage.spotSpecificDetailedAccessSources, 0);
  assert.equal(dataset.sourceCoverage.unresolvedDetailedAccess, 329);
  assert.equal(report.exclusions.geographicIdentityAppliedAsAccess, 0);
  assert.equal(report.exclusions.generalPortRuleAppliedToSpot, 0);
});

test("production enrichment and coordinates remain byte-identical", () => {
  assert.equal(
    sha256(INPUT_PATH),
    "9E4BE97368A2EA45017D0A82DBCF7ED00173A0598ACCA3C3AA309CB7F0A4D951",
  );
  assert.equal(
    sha256(path.join(ROOT, "src/data/fishing-spots.json")),
    "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA",
  );
  assert.equal(report.output.productionIntegrated, false);
  assert.equal(report.invariants.productionEnrichmentMutation, 0);
  assert.equal(report.invariants.coordinateMutation, 0);
});

test("all four coordinate safety holds remain unchanged and unreleased", () => {
  const expected = ["boat-60", "boat-128", "boat-129", "boat-321"];
  assert.deepEqual(hold.holds.map((item) => item.spotId), expected);
  assert.ok(hold.holds.every((item) => item.applied === false));
  assert.deepEqual(report.coordinateSafetyHold.spotIds, expected);
  assert.equal(report.coordinateSafetyHold.released, 0);
  assert.equal(report.coordinateSafetyHold.unchanged, true);
});

test("research makes no runtime, database, or Supabase change", () => {
  assert.equal(report.invariants.runtimeMutation, 0);
  assert.equal(report.invariants.databaseWrite, 0);
  assert.equal(report.invariants.supabaseWrite, 0);
  assert.equal(report.invariants.navigationHoldRelease, 0);
});

test("builder output is deterministic and matches persisted artifacts", async () => {
  const moduleUrl = pathToFileURL(
    path.join(ROOT, "tools/fishing-spots/build-boat-access-control-enrichment.mjs"),
  ).href;
  const { buildAccessControlEnrichment } = await import(moduleUrl);
  const rebuilt = buildAccessControlEnrichment();
  assert.deepEqual(rebuilt.dataset, dataset);
  assert.deepEqual(rebuilt.report, report);
});

/* eslint-disable @typescript-eslint/no-require-imports -- Node's existing .test.cjs suite uses CommonJS. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "../..");
const modulePromise = import(pathToFileURL(path.join(root, "tools/fishing-spots/review-coordinate-repairs.mjs")));

function candidateFixture(record) {
  const r = structuredClone(record);
  // Synthetic validation fixture only: reuses the preserved coordinate, never an asserted repair.
  const id = "TEST_ONLY_PRIMARY";
  r.candidateCoordinate = { ...r.currentCoordinate, crs: "EPSG:4326", unit: "decimal degrees", derivation: "EXPLICIT_AUTHORITY_COORDINATE", evidenceIds: [id], sourceRecordIdentifiers: {[id]: "TEST_ONLY_ROW"} };
  r.officialEvidence.push({evidenceId: id, authorityType: "PUBLIC_AUTHORITY", coordinateAuthorityEligible: true, exactLocationMatch: true, regionConsistent: true, conflictResolved: true, url: "https://example.invalid/test-only", independenceGroup: "TEST_ONLY_A", sourceRecordIdentifier: "TEST_ONLY_ROW", explicitCoordinate: {...r.currentCoordinate, crs: "EPSG:4326", unit: "decimal degrees"}});
  r.coordinateDeltaMeters = 0;
  r.repairStatus = "REPAIR_CANDIDATE_NEEDS_SECOND_SOURCE";
  return r;
}

test("repair review locks exactly four unique records and rejects scope expansion", async () => {
  const {buildReview, validateReport, REVIEW_IDS} = await modulePromise;
  const {report} = buildReview();
  assert.deepEqual(report.records.map(r => r.spotId), ["boat-60", "boat-128", "boat-129", "boat-321"]);
  assert.equal(report.scope.otherSpotsReviewed, 0);
  assert.deepEqual(report.scope.spotIds, REVIEW_IDS);
  report.records.push(structuredClone(report.records[0]));
  assert.throws(() => validateReport(report), /exactly four/);
});

test("repair review captures exact current coordinates and original row identity", async () => {
  const {buildReview, validateRecord} = await modulePromise;
  const {report} = buildReview();
  const current = JSON.parse(fs.readFileSync(path.join(root, "src/data/fishing-spots.json")));
  for (const r of report.records) {
    const spot = current.find(s => s.id === r.spotId);
    assert.deepEqual(r.currentCoordinate, {lat: Number(spot.lat), lon: Number(spot.lng)});
    assert.equal(r.currentRecord.sourceRowId, r.originalSourceRow["공간정보일련번호"]);
    assert.equal(r.currentRecord.rawProjectedCoordinates, spot.originalPoint);
  }
  const changed = structuredClone(report.records[0]);
  changed.currentCoordinate.lat += 1;
  assert.throws(() => validateRecord(changed), /current coordinates/);
});

test("repair review rejects candidate coordinates without accepted sources", async () => {
  const {buildReview, validateRecord} = await modulePromise;
  const fixture = candidateFixture(buildReview().report.records[0]);
  fixture.candidateCoordinate.evidenceIds = [];
  assert.throws(() => validateRecord(fixture), /requires source/);
  fixture.candidateCoordinate.evidenceIds = ["AKS-DUMIDO"];
  assert.throws(() => validateRecord(fixture), /not coordinate authority/);
});

test("repair review rejects arbitrary geocoding and undeclared CRS", async () => {
  const {buildReview, validateRecord} = await modulePromise;
  const record = buildReview().report.records[0];
  const geocoded = candidateFixture(record);
  geocoded.candidateCoordinate.derivation = "GENERIC_GEOCODING";
  assert.throws(() => validateRecord(geocoded), /geocoding/);
  const unknownCrs = candidateFixture(record);
  unknownCrs.candidateCoordinate.crs = "UNKNOWN";
  assert.throws(() => validateRecord(unknownCrs), /WGS84/);
});

test("repair review requires exact feature and region consistency", async () => {
  const {buildReview, validateRecord} = await modulePromise;
  const record = buildReview().report.records[0];
  for (const [field, message] of [["exactLocationMatch", /exact location/], ["regionConsistent", /region consistency/], ["conflictResolved", /conflict remains/]]) {
    const fixture = candidateFixture(record);
    fixture.officialEvidence.at(-1)[field] = false;
    assert.throws(() => validateRecord(fixture), message);
  }
});

test("repair approval requires independent second source; republication is not independent", async () => {
  const {buildReview, validateRecord} = await modulePromise;
  const fixture = candidateFixture(buildReview().report.records[0]);
  assert.doesNotThrow(() => validateRecord(fixture));
  fixture.repairStatus = "REPAIR_APPROVED";
  assert.throws(() => validateRecord(fixture), /two independent/);
  const copy = {...fixture.officialEvidence.at(-1), evidenceId: "TEST_ONLY_COPY"};
  fixture.officialEvidence.push(copy);
  fixture.candidateCoordinate.evidenceIds.push(copy.evidenceId);
  fixture.candidateCoordinate.sourceRecordIdentifiers[copy.evidenceId] = copy.sourceRecordIdentifier;
  assert.throws(() => validateRecord(fixture), /two independent/);
});

test("map policies are separate, complete, and do not silently enable navigation", async () => {
  const {buildReview, validateRecord} = await modulePromise;
  const {report} = buildReview();
  assert.deepEqual(report.summary.map, {allowed: 0, warning: 2, blocked: 2});
  assert.deepEqual(report.records.filter(r => r.mapPolicy === "MAP_DISPLAY_BLOCKED").map(r => r.spotId), ["boat-60", "boat-321"]);
  for (const field of ["mapPolicy", "navigationPolicy"]) {
    const fixture = structuredClone(report.records[0]);
    delete fixture[field];
    assert.throws(() => validateRecord(fixture), /policy required/);
  }
});

test("unresolved and approved-but-unapplied coordinates cannot become navigation allowed", async () => {
  const {buildReview, validateRecord} = await modulePromise;
  const record = structuredClone(buildReview().report.records[1]);
  record.navigationPolicy = "NAVIGATION_ALLOWED";
  assert.throws(() => validateRecord(record), /cannot enable current navigation/);
  const fixture = candidateFixture(record);
  const second = {...fixture.officialEvidence.at(-1), evidenceId: "TEST_ONLY_SECOND", independenceGroup: "TEST_ONLY_B"};
  fixture.officialEvidence.push(second);
  fixture.candidateCoordinate.evidenceIds.push(second.evidenceId);
  fixture.candidateCoordinate.sourceRecordIdentifiers[second.evidenceId] = second.sourceRecordIdentifier;
  fixture.repairStatus = "REPAIR_APPROVED";
  assert.throws(() => validateRecord(fixture), /cannot enable current navigation/);
});

test("hold list contains exactly the recommended holds and is explicitly unenforced", async () => {
  const {buildReview} = await modulePromise;
  const {report, hold} = buildReview();
  assert.deepEqual(hold.holds.map(h => h.spotId), report.records.filter(r => r.navigationPolicy === "NAVIGATION_BLOCKED_PENDING_REVIEW").map(r => r.spotId));
  assert.equal(hold.count, 4);
  assert.equal(hold.runtimeEnforced, false);
  assert(hold.holds.every(h => h.applied === false));
  assert.equal(report.policyApplication, "RECOMMENDATION_ONLY_NOT_APPLIED");
});

test("repair artifacts are deterministic and exactly match the persisted review", async () => {
  const {buildReview, REPORT_PATH, HOLD_PATH} = await modulePromise;
  const first = buildReview();
  assert.deepEqual(first, buildReview());
  assert.equal(`${JSON.stringify(first.report, null, 2)}\n`, fs.readFileSync(path.join(root, REPORT_PATH), "utf8"));
  assert.equal(`${JSON.stringify(first.hold, null, 2)}\n`, fs.readFileSync(path.join(root, HOLD_PATH), "utf8"));
  assert.equal(first.report.decision, "NO_AUTHORITATIVE_REPAIR_AVAILABLE");
  assert(first.report.records.every(r => r.candidateCoordinate === null && r.coordinateDeltaMeters === null));
});

test("building repair review does not mutate canonical, source, runtime, or prior audit files", async () => {
  const {buildReview} = await modulePromise;
  const protectedFiles = ["src/data/fishing-spots.json", "src/lib/geo/projection.ts", "work/fishing-spots-boat-raw.csv", "work/fishing-spots-rock-raw.csv", "reports/fishing-spots/coordinate-lineage-duplicate-verification-v1.json", "reports/fishing-spots/coordinate-review-candidates-v1.json"];
  const before = protectedFiles.map(p => fs.readFileSync(path.join(root, p)));
  const {report} = buildReview();
  protectedFiles.forEach((p, i) => assert.deepEqual(fs.readFileSync(path.join(root, p)), before[i], p));
  assert(Object.values(report.invariants).every(v => v === 0));
  assert(report.records.every(r => r.policyApplied === false));
});

test("source conflict is preserved in both projected and DMS fields without ownership inference", async () => {
  const {buildReview} = await modulePromise;
  const {report} = buildReview();
  for (const group of report.groups) {
    const [a, b] = group.spotIds.map(id => report.records.find(r => r.spotId === id));
    assert.equal(a.originalSourceRow["공간정보"], b.originalSourceRow["공간정보"]);
    assert.deepEqual(a.sourceCoordinateCheck.originalDms, b.sourceCoordinateCheck.originalDms);
    assert.notEqual(a.currentRecord.region, b.currentRecord.region);
    assert.equal(group.cause, "SOURCE_LEVEL_CROSS_REGION_COORDINATE_REUSE");
    assert.equal(a.currentCoordinateConfirmed, false);
    assert.equal(b.currentCoordinateConfirmed, false);
  }
});

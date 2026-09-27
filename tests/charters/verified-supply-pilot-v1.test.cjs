const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const file = (relative) => path.join(root, relative);
const read = (relative) => JSON.parse(fs.readFileSync(file(relative), 'utf8'));
const pilot = read('data/charters/pilot/v1/verified-supply-pilot-v1.json');
const preview = read('data/charters/pilot/v1/public-listing-candidates-v1.json');
const report = read('reports/charters/verified-supply-pilot-v1.json');
const exceptions = read('reports/charters/verified-supply-pilot-exceptions-v1.json');
const evidence = read('data/charters/pilot/v1/source-evidence-v1.json');

test('12 factual offer entities are distinct and connected to five source-backed operators', () => {
  assert.ok(pilot.charters.length >= 10);
  assert.equal(pilot.charters.length, 12);
  assert.equal(pilot.operators.length, 5);
  assert.equal(new Set(pilot.charters.map((item) => item.id)).size, pilot.charters.length);
  const operatorIds = new Set(pilot.operators.map((item) => item.id));
  const boatIds = new Set(pilot.boats.map((item) => item.id));
  const portIds = new Set(pilot.ports.map((item) => item.id));
  for (const item of pilot.charters) {
    assert.ok(operatorIds.has(item.operatorId));
    assert.ok(!item.boatId || boatIds.has(item.boatId));
    assert.ok(!item.departurePortId || portIds.has(item.departurePortId));
    assert.match(item.id, /^BM-PILOT-CHARTER-[A-Z0-9-]+$/);
    assert.equal(new URL(item.sourceUrl).protocol, 'https:');
    assert.equal(item.readiness, 'REVIEW_REQUIRED');
    assert.equal(item.verificationStatus, 'SOURCE_BACKED');
  }
});

test('contact path, source boundary, and permitted species mapping are explicit', () => {
  for (const operator of pilot.operators) {
    assert.match(operator.phone, /^\d{9,12}$/);
    assert.equal(operator.partnerApproval, false);
    assert.ok(operator.sourceRefs.length);
  }
  for (const item of pilot.charters) {
    assert.equal(item.bookingMethod, 'PHONE');
    for (const species of item.speciesMatches) {
      assert.ok(['EXACT_CANONICAL', 'SAFE_ALIAS', 'UNRESOLVED'].includes(species.matchType));
      assert.equal(species.canonicalId === null, species.matchType === 'UNRESOLVED');
    }
  }
  assert.equal(evidence.operators.length, pilot.operators.length);
  assert.ok(evidence.operators.every((item) => !/(sunsang24|seantour|fishapp|yeyakhaja)/i.test(new URL(item.sourceUrl).hostname)));
});

test('live availability, seats, schedules, and publication remain absent', () => {
  assert.equal(pilot.decision, 'CHARTER_VERIFIED_SUPPLY_PILOT_BLOCKED');
  assert.equal(pilot.schedules.length, 0);
  assert.equal(pilot.authenticatedAdminApprovals, 0);
  assert.equal(pilot.promotionCandidates.length, 0);
  assert.equal(pilot.productionActivated, false);
  assert.equal(preview.candidates.length, 0);
  assert.equal(preview.productionEligible, false);
  assert.ok(preview.researchPreviewEntries.every((item) => item.label === 'PILOT RESEARCH / NOT APPROVED' && item.contact.href.startsWith('tel:')));
  for (const item of pilot.charters) {
    assert.equal(item.status, 'INQUIRY_REQUIRED');
    assert.equal(item.remainingSeats, null);
    assert.equal(item.scheduleId, null);
    assert.notEqual(item.price.amount, 0);
  }
  const registry = fs.readFileSync(file('src/lib/charters/registry.ts'), 'utf8');
  assert.match(registry, /operators: \[\], boats: \[\], ports: \[\], charters: \[\], schedules: \[\]/);
});

test('offline intake is unsubmitted and MOF crosswalk never auto-approves', () => {
  assert.equal(pilot.submissions.length, 5);
  for (const item of pilot.submissions) {
    assert.equal(item.normalizedPayload.state, 'DRAFT');
    assert.equal(item.normalizedPayload.verificationStatus, 'UNVERIFIED');
    assert.equal(item.authenticatedAdminReview, false);
    assert.equal(item.crosswalk.autoApproved, false);
    assert.ok(['EXACT_MATCH', 'HIGH_CONFIDENCE', 'CANDIDATE', 'NO_MATCH'].includes(item.crosswalk.status));
    assert.equal(item.validation.errors.length, 0);
  }
  assert.equal(report.review.reviewRequired, 12);
  assert.equal(report.publicListingCandidates, 0);
  assert.equal(report.promotionCandidates, 0);
  assert.equal(exceptions.total, exceptions.exceptions.length);
});

test('all generated artifacts are deterministic', () => {
  const paths = [
    'data/charters/pilot/v1/verified-supply-pilot-v1.json',
    'data/charters/pilot/v1/public-listing-candidates-v1.json',
    'reports/charters/verified-supply-pilot-v1.json',
    'reports/charters/verified-supply-pilot-exceptions-v1.json',
  ];
  const digest = (p) => crypto.createHash('sha256').update(fs.readFileSync(file(p))).digest('hex');
  const before = paths.map(digest);
  const result = spawnSync(process.execPath, ['tools/charters/build-verified-supply-pilot-v1.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(paths.map(digest), before);
});

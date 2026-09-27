const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const targets = JSON.parse(read("data/charters/partners/v1/outreach-targets-sprint-001-v1.json")).targets;
const report = JSON.parse(read("reports/charters/outreach-sprint-001-v1.json"));
const csvRows = (text) => text.trimEnd().split(/\r?\n/).map((line) => {
  const fields = [];
  const re = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
  for (const match of line.matchAll(re)) {
    const raw = match[1];
    fields.push(raw.startsWith('"') ? raw.slice(1, -1).replace(/""/g, '"') : raw);
  }
  return fields;
});
const tracker = csvRows(read("data/charters/partners/v1/partner-outreach-tracker.csv"));
const queue = csvRows(read("data/charters/partners/v1/outreach-sprint-001.csv"));

test("exactly twenty distinct research targets are ordered 7/7/6", () => {
  assert.equal(targets.length, 20);
  assert.equal(new Set(targets.map((x) => x.partnerId)).size, 20);
  assert.deepEqual([0, 7, 14].map((start, i) =>
    targets.slice(start, [7, 14, 20][i]).every((x) => x.priority === ["A_PRIORITY", "B_PRIORITY", "C_PRIORITY"][i])), [true, true, true]);
  assert.equal(new Set(targets.map((x) => x.operatorName)).size, 20);
});

test("each prospect has a traceable operator source and explicit contact path", () => {
  for (const x of targets) {
    assert.match(x.officialUrl, /^https:\/\//);
    assert.ok(x.sourceRefs.includes(x.officialUrl));
    assert.match(x.phone, /^010-\d{4}-\d{4}$/);
    assert.ok(x.knownOfferEvidence.length > 0);
    assert.ok(x.priorityReason);
    assert.ok(x.riskNotes.length > 0);
    assert.ok(["PHONE", "SMS", "EMAIL", "CONTACT_FORM", "DM"].includes(x.preferredContactMethod));
    assert.ok(["DIRECT_ONBOARDING", "CSV", "PUBLIC_INFO_WITH_PERMISSION"].includes(x.recommendedSubmissionMethod));
  }
});

test("tracker remains an untouched-contact execution register", () => {
  assert.equal(tracker.length, 21);
  const h = tracker[0];
  const at = (row, key) => row[h.indexOf(key)];
  for (let i = 0; i < targets.length; i++) {
    const row = tracker[i + 1];
    assert.equal(at(row, "partner_id"), targets[i].partnerId);
    assert.equal(at(row, "contacted_at"), "");
    assert.equal(at(row, "response_status"), "NOT_CONTACTED");
    assert.equal(at(row, "submission_status"), "NONE");
    assert.equal(at(row, "review_status"), "NONE");
    assert.equal(at(row, "public_info_reuse_approved"), "PENDING");
  }
});

test("queue has one actionable route per prospect and A-only personalized openings", () => {
  assert.equal(queue.length, 21);
  const h = queue[0];
  const at = (row, key) => row[h.indexOf(key)];
  for (let i = 0; i < targets.length; i++) {
    const row = queue[i + 1];
    assert.equal(Number(at(row, "order")), i + 1);
    assert.equal(at(row, "partner_id"), targets[i].partnerId);
    assert.equal(at(row, "contact_destination"), targets[i].phone);
    assert.equal(at(row, "source_url"), targets[i].officialUrl);
    assert.equal(Boolean(at(row, "personalized_opening")), i < 7);
  }
});

test("report separates actual zero outcomes from numeric sprint targets", () => {
  assert.equal(report.targets.total, 20);
  assert.deepEqual(report.targets.priority, { A_PRIORITY: 7, B_PRIORITY: 7, C_PRIORITY: 6 });
  assert.equal(report.targets.livePageRecheckUnavailable, 2);
  assert.equal(report.targets.publicInfoReuseApproved.PENDING, 20);
  assert.deepEqual(report.currentKpi, {
    contacted: 0, responses: 0, submissions: 0, approvedOperators: 0, publishedOffers: 0,
  });
  assert.equal(report.sprintKpiTargets.contacts, 20);
  assert.equal(report.invariants.productionPublish, 0);
  assert.equal(report.invariants.dbSupabaseMutation, 0);
});

test("documentation keeps fee, consent and no-send boundaries explicit", () => {
  const doc = read("docs/BLUE_MARINA_CHARTER_OUTREACH_SPRINT_001_V1.md");
  for (const phrase of ["등록 비용 정책", "명시 동의", "3–5영업일", "실제 발송은 0", "승인 전"]) {
    assert.ok(doc.includes(phrase), phrase);
  }
  assert.equal(targets.filter((x) => x.publicInfoReuseApproved !== "PENDING").length, 0);
  assert.equal(targets.filter((x) => x.outreachStatus !== "NOT_CONTACTED").length, 0);
});

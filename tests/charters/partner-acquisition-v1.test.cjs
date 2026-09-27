const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("reports/charters/partner-acquisition-v1.json"));
const landing = read("src/app/charters/partners/page.tsx");
const onboarding = read("src/app/charters/onboarding/onboarding-client.tsx");
const template = read("data/charters/templates/charter-partner-pilot-template.csv").trim().split(/\r?\n/);

test("partner route is public, discoverable and links to existing onboarding", () => {
  assert.match(landing, /Blue Marina 출조상품 등록/);
  assert.match(landing, /href="\/charters\/onboarding"/);
  assert.match(read("src/app/charters/page.tsx"), /href="\/charters\/partners"/);
  assert.match(landing, /canonicalMetadata\("\/charters\/partners"\)/);
});

test("CSV download serves the on-disk template with attachment headers", () => {
  const route = read("src/app/charters/partners/template.csv/route.ts");
  assert.match(route, /charter-partner-pilot-template\.csv/);
  assert.match(route, /Content-Disposition/);
  assert.match(landing, /href="\/charters\/partners\/template\.csv"/);
});

test("partner template contains requested fields and every existing import column", () => {
  const headers = template[0].split(",");
  const existing = read("src/lib/charters/onboarding/csv-import.ts").match(/CHARTER_IMPORT_COLUMNS = \[(.*?)\] as const/s);
  assert.ok(existing);
  const parserColumns = [...existing[1].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
  for (const column of [...parserColumns, "business_name", "notes"]) assert.ok(headers.includes(column), column);
  assert.equal(template.length, 2);
  assert.equal(template[1].split(",").length, headers.length);
  assert.match(template[1], /DEMO_PLACEHOLDER/);
  assert.doesNotMatch(template[1], /@SUM|=HYPERLINK/);
});

test("outreach tracker retains no fabricated contact activity after prospect selection", () => {
  const tracker = read("data/charters/partners/v1/partner-outreach-tracker.csv").trim().split(/\r?\n/);
  assert.equal(tracker.length, 21);
  assert.ok(tracker[0].startsWith("partner_id,operator_name,region,source_url,phone,email,contacted_at,contact_method,response_status,submission_status,review_status,notes"));
  for (const row of tracker.slice(1)) assert.match(row, /"NOT_CONTACTED","NONE","NONE"/);
  assert.equal(report.pilot.currentContacted, 0);
  assert.equal(report.tracker.rows, 0);
});

test("submission consent is acknowledged before direct or CSV submit", () => {
  assert.match(onboarding, /partnerConsent/);
  assert.match(onboarding, /if\(!partnerConsent\)/);
  assert.match(onboarding, /업체·상품 정보와 제공한 전화번호/);
  assert.match(onboarding, /disabled=\{!partnerConsent\}/);
  assert.match(onboarding, /importResult\.invalid>0\|\|!partnerConsent/);
  assert.match(read("docs/BLUE_MARINA_CHARTER_PARTNER_SUBMISSION_GUIDE_V1.md"), /서버에 별도 동의 이력/);
});

test("review checklist and publication gate require supplier evidence and admin review", () => {
  const checklist = read("docs/BLUE_MARINA_CHARTER_PARTNER_REVIEW_CHECKLIST_V1.md");
  for (const field of ["업체명", "전화", "웹사이트", "선박", "출항항", "상품", "대상어종", "가격", "일정", "MOF crosswalk", "중복", "출처", "공개 동의", "최종 판정"]) assert.ok(checklist.includes(field), field);
  assert.equal(report.publicationGate.supplierSubmissionOrExplicitApproval, true);
  assert.equal(report.publicationGate.adminReview, true);
  assert.equal(report.publicationGate.autoPublish, false);
  assert.equal(report.publicationGate.productionListings, 0);
});

test("FAQ answers nine pilot questions without false promises or fake contact action", () => {
  const questions = ["등록 비용", "어떤 정보", "가격과 일정", "예약 링크", "상품 수정", "승인까지", "실시간 잔여석", "정보는 어떻게 검증", "삭제 요청"];
  for (const question of questions) assert.ok(landing.includes(question), question);
  assert.match(landing, /운영 연락처는 아직 공개되지 않았습니다/);
  assert.doesNotMatch(landing, /mailto:|tel:|매출 증가를 보장|예약 증가를 보장/);
});

test("all outreach formats and one-pager are drafts, with target metrics separate from outcomes", () => {
  const outreach = read("docs/BLUE_MARINA_CHARTER_PARTNER_OUTREACH_V1.md");
  for (const channel of ["전화 첫 멘트", "문자", "이메일", "카카오톡/DM"]) assert.ok(outreach.includes(channel), channel);
  assert.match(outreach, /미발송 초안/);
  assert.match(read("docs/BLUE_MARINA_CHARTER_PARTNER_ONE_PAGER_V1.md"), /현재 승인된 공개 출조상품은 없습니다/);
  assert.deepEqual(report.pilot.operatorContactRange, [10, 30]);
  assert.equal(report.pilot.targets.contactedOperators, 20);
  assert.equal(report.pilot.currentPublished, 0);
});

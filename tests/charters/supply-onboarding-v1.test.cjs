const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const toolPromise = import(pathToFileURL(path.join(root, "tools/charters/build-supply-onboarding-v1.mjs")));

test("builds the onboarding report deterministically", () => {
  const before = read("reports/charters/supply-onboarding-v1.json");
  cp.execFileSync(process.execPath, ["tools/charters/build-supply-onboarding-v1.mjs"], { cwd: root });
  assert.equal(read("reports/charters/supply-onboarding-v1.json"), before);
});

test("keeps all seven truth states and promotion gate explicit", () => {
  const report = json("reports/charters/supply-onboarding-v1.json");
  assert.deepEqual(report.states, ["DRAFT", "SUBMITTED", "VALIDATION_FAILED", "REVIEW_REQUIRED", "APPROVED", "REJECTED", "PROMOTED"]);
  assert.equal(report.promotion.requiresApproved, true);
  assert.equal(report.promotion.productionActivation, 0);
});

test("ships three clearly marked placeholder template rows", async () => {
  const tool = await toolPromise;
  const result = tool.inspectTemplate(read("data/charters/templates/charter-import-template.csv"));
  assert.deepEqual(result, { rows: 3, demoPlaceholders: 3, formulaCells: 0, unsafeSourceUrls: 0 });
});

test("rejects spreadsheet formula cells", async () => {
  const tool = await toolPromise;
  assert.equal(tool.hasFormula(" =HYPERLINK(\"bad\")"), true);
  assert.equal(tool.hasFormula("@SUM(A1)"), true);
  assert.equal(tool.hasFormula("ordinary text"), false);
});

test("allows only HTTP and HTTPS source URLs", async () => {
  const tool = await toolPromise;
  assert.equal(tool.safeUrl("https://example.invalid/source"), true);
  assert.equal(tool.safeUrl("http://example.invalid/source"), true);
  assert.equal(tool.safeUrl("javascript:alert(1)"), false);
  assert.equal(tool.safeUrl("file:///tmp/source"), false);
});

test("enforces template column completeness", async () => {
  const tool = await toolPromise;
  assert.throws(() => tool.inspectTemplate("operator_name,source_url\nA,https://example.invalid"), /MISSING_COLUMNS/);
});

test("enforces file and row limits", async () => {
  const tool = await toolPromise;
  assert.equal(tool.MAX_IMPORT_BYTES, 1_048_576);
  assert.equal(tool.MAX_IMPORT_ROWS, 1_000);
});

test("classifies structurally valid and invalid CSV rows", async () => {
  const tool = await toolPromise;
  const header = tool.EXPECTED_COLUMNS.join(",");
  const values = Object.fromEntries(tool.EXPECTED_COLUMNS.map((name) => [name, ""]));
  Object.assign(values, { operator_name: "DEMO", boat_name: "DEMO_BOAT", port_name: "DEMO_PORT", charter_title: "DEMO_CHARTER", source_url: "https://example.invalid/source" });
  const valid = `${header}\n${tool.EXPECTED_COLUMNS.map((name) => values[name]).join(",")}`;
  assert.deepEqual(tool.dryRunCsv(valid), { totalRows: 1, validRows: 1, warningRows: 0, invalidRows: 0, operators: 1, boats: 1, ports: 1, charters: 1, schedules: 0, speciesMapped: 0, speciesUnmapped: 0, duplicates: 0, issueCount: 0 });
  values.source_url = "javascript:alert(1)";
  const invalid = tool.dryRunCsv(`${header}\n${tool.EXPECTED_COLUMNS.map((name) => values[name]).join(",")}`);
  assert.equal(invalid.invalidRows, 1);
});

test("keeps blank numeric values unknown instead of zero", () => {
  const source = read("src/lib/charters/onboarding/validation.ts");
  assert.match(source, /if \(!value\.trim\(\)\) return null/);
});

test("defines exact species resolution without fuzzy matching", () => {
  const source = read("src/lib/charters/onboarding/validation.ts");
  assert.match(source, /EXACT_CANONICAL/);
  assert.match(source, /SAFE_ALIAS/);
  assert.match(source, /UNRESOLVED/);
  assert.doesNotMatch(source, /levenshtein|fuzzy/i);
});

test("keeps user coordinates unverified", () => {
  const source = read("src/lib/charters/onboarding/csv-import.ts");
  assert.match(source, /USER_SUBMITTED/);
  assert.doesNotMatch(source, /coordinateStatus:\s*"VERIFIED"/);
});

test("does not auto-approve any MOF crosswalk result", () => {
  const source = read("src/lib/charters/onboarding/crosswalk.ts");
  assert.match(source, /EXACT_MATCH/);
  assert.match(source, /HIGH_CONFIDENCE/);
  assert.match(source, /CANDIDATE/);
  assert.match(source, /NO_MATCH/);
  assert.ok((source.match(/autoApproved: false/g) || []).length >= 4);
});

test("requires approved state and review before promotion candidate output", () => {
  const source = read("src/lib/charters/onboarding/promotion.ts");
  assert.match(source, /submission\.state !== "APPROVED"/);
  assert.match(source, /review\.decision !== "APPROVE"/);
  assert.match(source, /PROMOTION_CANDIDATE/);
  assert.match(source, /productionActivated: false/);
});

test("official connector remains interface-only", () => {
  const report = json("reports/charters/supply-onboarding-v1.json");
  const boundary = read("src/lib/charters/onboarding/official-connector.ts");
  assert.equal(report.channels.officialConnector.implemented, 0);
  assert.match(boundary, /contractOnly: true/);
  assert.doesNotMatch(boundary, /fetch\(|apiKey|process\.env/);
});

test("exposes the six-step local review UI", () => {
  const source = read("src/app/charters/onboarding/onboarding-client.tsx");
  for (const label of ["업체", "선박", "출항항", "출조상품", "일정·가격", "검토"]) assert.match(source, new RegExp(label.replace("·", "\\·")));
  assert.match(source, /서버로 전송하지 않습니다/);
  assert.match(source, /min-h-11/);
});

test("preserves production, database, auth, and reservation boundaries", () => {
  const report = json("reports/charters/supply-onboarding-v1.json");
  for (const value of Object.values(report.invariants)) assert.equal(value, 0);
  assert.match(read("src/lib/charters/registry.ts"), /operators: \[\], boats: \[\], ports: \[\], charters: \[\], schedules: \[\]/);
  assert.doesNotMatch(read("src/app/reservations/page.tsx"), /onboarding/);
});

test("documents review semantics and backend limitations", () => {
  const docs = read("docs/BLUE_MARINA_CHARTER_SUPPLY_ONBOARDING_V1.md");
  assert.match(docs, /SUPPLY_ONBOARDING_READY_WITH_BACKEND_LIMITATIONS/);
  assert.match(docs, /VALID.*not approval/s);
  assert.match(docs, /No database or Supabase/);
});

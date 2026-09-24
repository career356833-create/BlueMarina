const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("reports/release/blue-marina-release-readiness-v1.json"));

test("release inventory keeps required public and account route files", () => {
  for (const file of ["src/app/page.tsx", "src/app/sea/navigation/page.tsx", "src/app/fishing-spots/[id]/page.tsx", "src/app/charters/[id]/page.tsx", "src/app/market/[id]/page.tsx", "src/app/community/[id]/page.tsx", "src/app/account/login/page.tsx", "src/app/study/page.tsx", "src/app/practice/page.tsx", "src/app/past/page.tsx"]) assert.equal(fs.existsSync(path.join(root, file)), true, file);
});
test("backend flags and empty transactional data stay fail closed", () => {
  assert.equal(report.flags.ACCOUNT_BACKEND_ENABLED, "FAIL_CLOSED");
  assert.equal(report.flags.MARKET_BACKEND_ENABLED, "FAIL_CLOSED");
  assert.equal(report.data.charterProductionRecords, 0);
  assert.equal(report.data.marketProductionListings, 0);
  assert.equal(report.data.communityProductionPosts, 0);
});
test("audit records migration and public release limitations without claiming activation", () => {
  for (const file of ["20260920103020_charter_supply_intake_backend_v1.sql", "20260920115127_market_supply_backend_v1.sql", "20260923100000_blue_marina_account_v1.sql"]) assert.equal(fs.existsSync(path.join(root, "supabase/migrations", file)), true, file);
  assert.equal(report.gates.runtimeBackend, "BLOCKED");
  assert.equal(report.gates.seoPwa, "PASS_WITH_LIMITATIONS");
  assert.equal(report.invariants.dbApply, 0);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20260923100000_blue_marina_account_v1.sql");
const server = read("src/lib/account/server.ts");
const api = read("src/app/api/account/route.ts");
const client = read("src/app/account/account-client.tsx");
const report = JSON.parse(read("reports/account/account-v1.json"));

test("Account V1 exposes the four required account routes", () => {
  for (const route of ["page.tsx", "profile/page.tsx", "saved/page.tsx", "activity/page.tsx"]) assert.ok(fs.existsSync(path.join(root, "src/app/account", route)));
});

test("existing profiles table is extended instead of duplicated", () => {
  assert.match(migration, /alter table public\.profiles add column if not exists display_name/);
  assert.doesNotMatch(migration, /create table[^;]*profiles/i);
});

test("saved items have an idempotent per-user entity key", () => {
  assert.match(migration, /unique \(user_id, entity_type, entity_id\)/);
  assert.match(server, /onConflict: "user_id,entity_type,entity_id"/);
});

test("saved item RLS is own-only for every operation", () => {
  assert.match(migration, /auth\.uid\(\)\) = user_id/g);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.user_saved_items from anon/);
});

test("server revalidates bearer tokens and never accepts body userId", () => {
  assert.match(server, /auth\.getUser\(token\)/);
  assert.doesNotMatch(server, /input\.userId|value\.userId/);
});

test("account backend defaults fail closed", () => {
  assert.match(server, /ACCOUNT_BACKEND_ENABLED === "true"/);
  assert.match(server, /503, "ACCOUNT_BACKEND_DISABLED"/);
});

test("service-role reads retain explicit ownership filters", () => {
  assert.match(server, /eq\("id", user\.id\)/);
  assert.match(server, /eq\("user_id", user\.id\)/);
  assert.match(server, /eq\("seller_id", user\.id\)/);
});

test("profile and saved writes are payload limited and validated", () => {
  assert.match(api, /16_384/);
  assert.match(server, /validateProfilePatch/);
  assert.match(server, /validateSavedItem/);
});

test("client has explicit session and backend failure states", () => {
  for (const state of ["loading", "signed-out", "signed-in", "expired"]) assert.match(client, new RegExp(state));
  assert.match(client, /계정 서버가 아직 활성화되지 않았습니다/);
});

test("authenticated UI preview is development-only and never calls the backend", () => {
  const page = read("src/app/account/page.tsx");
  assert.match(page, /process\.env\.NODE_ENV === "development"/);
  assert.match(client, /개발 환경의 인증 화면 미리보기/);
  assert.match(client, /if \(previewAuthenticated\)/);
});

test("logout clears fetched server state", () => {
  assert.match(client, /setModel\(null\); setToken\(null\); setAuthState\("signed-out"\)/);
});

test("recent history is local, capped, and deduplicated", () => {
  const recent = read("src/lib/account/recent.ts");
  assert.match(recent, /ACCOUNT_RECENT_LIMIT = 30/);
  assert.match(recent, /item\.entityType === next\.entityType && item\.entityId === next\.entityId/);
});

test("save integrations cover spots, canonical fish, charter, and market", () => {
  const joined = [read("src/app/fishing-spots/[id]/page.tsx"), read("src/app/charters/[id]/page.tsx"), read("src/app/market/[id]/page.tsx")].join("\n");
  for (const type of ["FISHING_SPOT", "FISH", "CHARTER", "MARKET_LISTING"]) assert.match(joined, new RegExp(`entityType=\\"${type}\\"`));
});

test("recent history covers spots, fish, charters, market, and community", () => {
  const joined = [read("src/app/fishing-spots/[id]/page.tsx"), read("src/app/fishing-spots/conditions/page.tsx"), read("src/app/charters/[id]/page.tsx"), read("src/app/market/[id]/page.tsx"), read("src/app/community/[id]/page.tsx")].join("\n");
  for (const type of ["FISHING_SPOT", "FISH", "CHARTER", "MARKET_LISTING", "COMMUNITY_POST"]) assert.match(joined, new RegExp(`entityType:\\"${type}\\"|entityType: \\"${type}\\"`));
});

test("report records no remote migration or fake saved data", () => {
  assert.equal(report.security.remoteMigrationApplied, false);
  assert.equal(report.savedContent.fakeSavedData, 0);
  assert.equal(report.profile.duplicateTableCreated, false);
});

test("out-of-scope social and personalization features remain absent", () => {
  assert.deepEqual(report.invariants, { followFriendDm: 0, pointsSubscription: 0, homePersonalization: 0, productionDataMutation: 0, existingPlatformUxMutationOutsideAccountEntry: 0, navigationHudMutation: 0 });
});

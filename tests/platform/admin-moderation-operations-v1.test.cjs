const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const load = file => {
  const source = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, URL });
  return module.exports;
};

test("Community OAuth return target is internal and exact", () => {
  const { safeAuthReturnTo } = load("src/lib/account/auth-return.ts");
  assert.equal(safeAuthReturnTo("/community/new"), "/community/new");
  assert.equal(safeAuthReturnTo("/community/new?draft=1"), "/community/new?draft=1");
  for (const input of ["https://evil.example/community/new", "//evil.example", "javascript:alert(1)", "data:text/plain,a", "/community/new/../../admin/operations", "/community/new\\evil.example", "/community/new/child"]) {
    assert.equal(safeAuthReturnTo(input), "/account", input);
  }
  assert.match(read("src/app/community/new/community-post-form.tsx"), /returnTo=%2Fcommunity%2Fnew/);
});

test("role contract isolates all three moderation domains", () => {
  const { moderationRoles, canReadModeration, canActModeration } = load("src/lib/operations/moderation-access.ts");
  const normal = moderationRoles({ community_role: "community_admin", market_role: "market_admin" });
  assert.equal(canActModeration(normal, "community"), true);
  assert.equal(canActModeration(normal, "market"), true);
  assert.equal(canActModeration(normal, "charter"), false);
  for (const [key, domain] of [["charter_role", "charter"], ["market_role", "market"], ["community_role", "community"]]) {
    const roles = moderationRoles({ [key]: `${domain}_admin` });
    for (const candidate of ["charter", "market", "community"]) {
      assert.equal(canActModeration(roles, candidate), candidate === domain);
    }
  }
  const operations = moderationRoles({ operations_role: "operations_admin" });
  for (const domain of ["charter", "market", "community"]) {
    assert.equal(canReadModeration(operations, domain), true);
    assert.equal(canActModeration(operations, domain), false);
  }
  assert.equal(Object.values(moderationRoles({})).some(Boolean), false);
});

test("moderation transitions are atomic and auditor records previous and next state", () => {
  const sql = read("supabase/migrations/20261003094425_community_moderation_operations_v1.sql");
  assert.match(sql, /create table public\.community_moderation_events/);
  assert.match(sql, /actor_id uuid not null references auth\.users\(id\)/);
  assert.match(sql, /previous_status text not null/);
  assert.match(sql, /next_status text not null/);
  assert.match(sql, /created_at timestamptz not null default now\(\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /raw_app_meta_data ->> 'community_role' = 'community_admin'/);
  assert.match(sql, /grant execute on function public\.community_review_post\(uuid,uuid,text\) to service_role/);
  assert.doesNotMatch(sql, /grant execute on function public\.community_review_post\([^;]+to authenticated/);
  assert.match(sql, /previous_row\.status <> 'SUBMITTED'/);
  assert.match(sql, /previous_row\.status <> 'ACTIVE'/);
});

test("Community approve/reject/report endpoints require authenticated community_admin", () => {
  for (const file of ["src/app/api/community/admin/posts/[id]/review/route.ts", "src/app/api/community/admin/reports/[id]/review/route.ts"]) {
    const route = read(file);
    assert.match(route, /communityActor\(request\)/);
    assert.match(route, /if \(!isAdmin\) throw new CommunityError\("FORBIDDEN", 403\)/);
    assert.match(route, /client\.rpc\("community_review_/);
    assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY|console\.log/);
  }
  assert.match(read("src/lib/community/backend.ts"), /"Cache-Control": "private, no-store"/);
  assert.match(read("src/lib/community/backend.ts"), /"X-Robots-Tag": "noindex, nofollow"/);
});

test("public feed excludes review and rejected submissions", () => {
  const backend = read("src/lib/community/backend.ts");
  assert.match(backend, /eq\("status", "ACTIVE"\)\.eq\("moderation_status", "APPROVED"\)/);
  const charter = read("src/lib/charters/registry.ts");
  const market = read("src/lib/market/backend/supabase-repository.ts");
  assert.match(charter, /productionCharterDataset/);
  assert.match(market, /\.eq\("status","ACTIVE"\)/);
});

test("integrated queue preserves domain action boundaries and existing review APIs", () => {
  const dashboard = read("src/app/admin/operations/moderation/moderation-dashboard.tsx");
  assert.match(dashboard, /roles\[domain\]/);
  assert.match(dashboard, /api\/charters\/supply\/submissions/);
  assert.match(dashboard, /api\/market\/listings/);
  assert.match(dashboard, /api\/community\/admin\/posts/);
  assert.match(dashboard, /api\/community\/admin\/reports/);
  assert.match(dashboard, /promotion candidate/);
  const queue = read("src/lib/operations/moderation.ts");
  assert.match(queue, /count: "exact"/);
  for (const domain of ["charter", "market", "community", "reports"]) {
    assert.match(queue, new RegExp(`${domain}: roles\\.${domain === "reports" ? "community" : domain} \\? ${domain} : \\{ \\.\\.\\.${domain}, items: \\[\\] \\}`));
  }
  assert.match(queue, /eq\("status", "REVIEW_REQUIRED"\)/);
  assert.match(queue, /eq\("status", "SUBMITTED"\)\.eq\("moderation_status", "REVIEW_REQUIRED"\)/);
});

test("operations moderation is private and omitted from public navigation", () => {
  assert.ok(fs.existsSync(path.join(root, "src/app/admin/operations/moderation/page.tsx")));
  const api = read("src/app/api/operations/moderation/route.ts");
  const layout = read("src/app/admin/operations/layout.tsx");
  assert.match(api, /"Cache-Control": "private, no-store"/);
  assert.match(api, /"X-Robots-Tag": "noindex, nofollow"/);
  assert.match(layout, /robots: \{ index: false, follow: false \}/);
  for (const file of ["src/lib/platform/navigation.ts", "src/components/boat/AppFrame.tsx"]) {
    assert.doesNotMatch(read(file), /admin\/operations\/moderation/);
  }
});

test("operational evidence distinguishes API success from browser and supply limitations", () => {
  const report = JSON.parse(read("reports/platform/admin-moderation-operations-v1.json"));
  assert.equal(report.migrationVersion, "20261003094425");
  assert.equal(report.community.approveThenPublicThenHide, "PASS");
  assert.equal(report.community.finalPublicQaPosts, 0);
  assert.equal(report.market.finalPublicQaListings, 0);
  assert.equal(report.charter.activatedPromotionCandidates, 0);
  assert.equal(report.communityReturnTo.kakaoBrowserRoundTrip, "BLOCKED_KAKAO_BROWSER_SETTINGS");
  assert.equal(report.operations.adminDesktopVisual, "NOT_TESTED_BROWSER_PORT_BLOCKED");
  assert.equal(report.isolatedPublicRoutesRemaining.length, 4);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20261002054704_community_backend_production_v1.sql");
const backend = read("src/lib/community/backend.ts");

test("four community tables are owned by Auth users and protected by RLS", () => {
  for (const table of ["posts", "comments", "reactions", "reports"]) {
    assert.match(migration, new RegExp(`create table public\\.community_${table} \\(`));
    assert.match(migration, new RegExp(`alter table public\\.community_${table} enable row level security`));
  }
  assert.equal((migration.match(/references auth\.users\(id\)/g) || []).length, 4);
  assert.match(migration, /revoke all on public\.community_posts[^;]+from public, anon, authenticated/);
});

test("unreviewed submissions remain private and direct users cannot change moderation", () => {
  assert.match(migration, /status text not null default 'SUBMITTED'/);
  assert.match(migration, /moderation_status text not null default 'REVIEW_REQUIRED'/);
  assert.match(migration, /status <> 'ACTIVE' or moderation_status = 'APPROVED'/);
  assert.match(migration, /community_posts_public_read[^;]+status = 'ACTIVE' and moderation_status = 'APPROVED'/);
  assert.doesNotMatch(migration, /grant update \([^)]*status/);
  assert.doesNotMatch(migration, /grant insert \([^)]*moderation_status/);
  assert.match(backend, /COMMUNITY_BACKEND_ENABLED !== "true"/);
});

test("one actor cannot mutate another actor's posts comments or reactions", () => {
  const detail = read("src/app/api/community/posts/[id]/route.ts");
  const comment = read("src/app/api/community/comments/[id]/route.ts");
  const reaction = read("src/app/api/community/posts/[id]/reactions/route.ts");
  assert.match(detail, /\.eq\("author_id", userId\)/);
  assert.match(comment, /\.eq\("author_id", userId\)/);
  assert.match(reaction, /\.eq\("actor_id", userId\)/);
  assert.match(backend, /client\.auth\.getUser\(token\)/);
});

test("reactions are unique and reports cannot be self reports", () => {
  assert.match(migration, /primary key \(post_id, actor_id, type\)/);
  assert.match(migration, /unique \(target_type, target_id, reporter_id, reason\)/);
  assert.match(migration, /p\.author_id <> \(select auth\.uid\(\)\)/);
  assert.match(read("src/app/api/community/posts/[id]/reports/route.ts"), /SELF_REPORT_NOT_ALLOWED/);
});

test("server validates explicit links and never uploads local images implicitly", () => {
  assert.match(backend, /validateCommunityPostDraft\(value as CommunityPostDraft, catalog\(\)\)/);
  assert.match(backend, /IMAGE_UPLOAD_UNAVAILABLE/);
  assert.match(read("src/app/community/new/community-post-form.tsx"), /기기 내 임시 작성물 저장/);
  assert.match(read("src/app/community/new/community-post-form.tsx"), /서버에 검토용 제출/);
});

test("private APIs use no-store and noindex; public feed is active-only", () => {
  assert.match(backend, /Cache-Control": "private, no-store"/);
  assert.match(backend, /X-Robots-Tag": "noindex, nofollow"/);
  assert.match(backend, /\.eq\("status", "ACTIVE"\)\.eq\("moderation_status", "APPROVED"\)/);
  assert.match(read("src/app/community/page.tsx"), /force-dynamic/);
});

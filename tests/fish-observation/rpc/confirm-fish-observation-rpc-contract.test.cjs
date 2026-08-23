const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../..");
const sqlPath = path.join(root, "supabase/migrations/drafts/202608030002_confirm_fish_observation_rpc.sql");
const docPath = path.join(root, "docs/data/confirm-fish-observation-rpc-design.md");
const sql = fs.readFileSync(sqlPath, "utf8");
const documentation = fs.readFileSync(docPath, "utf8");

test("draft defines an RPC-only idempotency and achievement boundary", () => {
  assert.match(sql, /create table if not exists public\.fish_observation_confirmations/i);
  assert.match(sql, /idempotency_key text not null unique/i);
  assert.match(sql, /request_hash text not null/i);
  assert.match(sql, /result_payload jsonb/i);
  assert.match(sql, /create table if not exists public\.fish_achievement_events/i);
  assert.match(sql, /unique \(observation_id, achievement_type\)/i);
});

test("draft RPC preserves the confirmation transaction order", () => {
  const verification = sql.indexOf("insert into public.fish_observation_verifications");
  const observation = sql.indexOf("update public.fish_observations");
  const collection = sql.indexOf("insert into public.fish_collections");
  const achievement = sql.indexOf("insert into public.fish_achievement_events");
  const changeLog = sql.indexOf("insert into public.fish_change_logs");

  assert.ok(verification >= 0);
  assert.ok(verification < observation);
  assert.ok(observation < collection);
  assert.ok(collection < achievement);
  assert.ok(achievement < changeLog);
});

test("draft defends the SECURITY DEFINER boundary and protects retries", () => {
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public, extensions, pg_temp/i);
  assert.match(sql, /p_verified_by is distinct from v_caller/i);
  assert.match(sql, /idempotency_key_request_mismatch/i);
  assert.match(sql, /return v_existing_result \|\| jsonb_build_object\('idempotent', true\)/i);
  assert.match(sql, /selected_species_is_not_an_ai_candidate/i);
  assert.match(sql, /grant execute on function public\.confirm_fish_observation/i);
});

test("documentation records automatic rollback and the reviewer role mapping", () => {
  assert.match(documentation, /must not issue manual `BEGIN` or `COMMIT`/i);
  assert.match(documentation, /fish_reviewer/i);
  assert.match(documentation, /recomputes that old species aggregate/i);
});

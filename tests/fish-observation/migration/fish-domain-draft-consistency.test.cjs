const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const schema = read("supabase/migrations/drafts/202608030001_blue_marina_fish_domain_final_schema.sql");
const rpc = read("supabase/migrations/drafts/202608030002_confirm_fish_observation_rpc.sql");
const storage = read("supabase/migrations/drafts/202608030003_fish_observation_storage_policy.sql");
const report = JSON.parse(read("reports/fish-supabase-draft-consistency-audit.json"));

test("draft order supplies every RPC dependency before the RPC", () => {
  assert.match(schema, /create table public\.fish_observations/i);
  assert.match(schema, /create table public\.fish_media/i);
  assert.match(schema, /create table public\.fish_collections/i);
  assert.match(schema, /create table public\.fish_observation_private_locations/i);
  assert.match(rpc, /add column if not exists verification_status/i);
  assert.match(rpc, /create table if not exists public\.fish_observation_confirmations/i);
  assert.match(rpc, /create table if not exists public\.fish_achievement_events/i);
  assert.match(rpc, /create or replace function public\.confirm_fish_observation/i);
});

test("preflight removes browser bypasses of confirmation and collection state", () => {
  assert.doesNotMatch(schema, /fish_observations_owner_all/);
  assert.doesNotMatch(schema, /fish_collections_owner_all/);
  assert.match(schema, /fish_observations_owner_insert[\s\S]*species_id is null/i);
  assert.match(schema, /fish_collections_owner_select/i);
  assert.match(rpc, /guard_fish_observation_protected_fields/i);
  assert.match(rpc, /set_config\('fish\.observation_mutation_context', 'confirm_fish_observation', true\)/i);
});

test("deletion and public user-catch boundaries remain explicit", () => {
  assert.match(rpc, /observation_id uuid not null references public\.fish_observations\(id\) on delete cascade/i);
  assert.match(rpc, /verified_by uuid references auth\.users\(id\) on delete set null/i);
  assert.match(schema, /storage_bucket text check/i);
  assert.match(schema, /storage_bucket = 'fish-observation-public'/i);
  assert.match(schema, /generation_metadata ->> 'variantType' = 'public_watermarked'/i);
});

test("storage is gateway-only and the preflight report remains not ready", () => {
  assert.doesNotMatch(storage, /create policy/i);
  assert.match(storage, /on conflict \(id\) do nothing/i);
  assert.equal(report.overallStatus, "NOT_READY");
  assert.equal(report.blockers.length >= 4, true);
  assert.deepEqual(report.recommendedExecutionOrder, ["202608030001", "202608030002", "202608030003"]);
});

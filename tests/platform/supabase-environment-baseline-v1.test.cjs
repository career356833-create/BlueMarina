const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort();
const baselineName = '20260920100000_blue_marina_profile_baseline_v1.sql';
const baseline = read(`supabase/migrations/${baselineName}`);
const grants = read('supabase/migrations/20260927023446_blue_marina_account_service_role_grants_v1.sql');
const account = read('supabase/migrations/20260923100000_blue_marina_account_v1.sql');
const server = read('src/lib/account/server.ts');
const report = JSON.parse(read('reports/platform/supabase-environment-baseline-v1.json'));

test('fresh chain installs the profile baseline before Account without renumbering committed migrations', () => {
  assert.ok(migrations.includes(baselineName));
  assert.ok(migrations.indexOf(baselineName) < migrations.indexOf('20260923100000_blue_marina_account_v1.sql'));
  assert.ok(migrations.includes('20260920103020_charter_supply_intake_backend_v1.sql'));
  assert.ok(migrations.includes('20260920115127_market_supply_backend_v1.sql'));
  assert.ok(migrations.includes('20260927023446_blue_marina_account_service_role_grants_v1.sql'));
  assert.match(account, /alter table public\.profiles/);
});

test('profile baseline supports actual Account columns and keeps Auth ownership private', () => {
  for (const column of ['id', 'email', 'full_name', 'display_name', 'avatar_url', 'region', 'bio', 'created_at', 'updated_at']) {
    assert.match(baseline, new RegExp(`\\b${column}\\b`));
  }
  assert.match(server, /select\("full_name,display_name,avatar_url,region,bio,updated_at"\)/);
  assert.match(baseline, /references auth\.users\(id\) on delete cascade/);
  assert.match(baseline, /enable row level security/);
  assert.match(baseline, /revoke all on table public\.profiles from public, anon, authenticated/);
  assert.match(baseline, /for select to authenticated using \(\(select auth\.uid\(\)\) = id\)/);
  assert.match(baseline, /for update to authenticated[\s\S]+with check \(\(select auth\.uid\(\)\) = id\)/);
  assert.doesNotMatch(baseline, /grant .* on table public\.profiles to anon/i);
});

test('Auth trigger is private, creates one minimal profile, and has no metadata privilege dependency', () => {
  assert.match(baseline, /create function blue_marina_private\.create_profile_for_auth_user\(\)/);
  assert.match(baseline, /security definer set search_path = ''/);
  assert.match(baseline, /insert into public\.profiles \(id\) values \(new\.id\)/);
  assert.match(baseline, /on conflict \(id\) do nothing/);
  assert.match(baseline, /after insert on auth\.users/);
  assert.doesNotMatch(baseline, /raw_user_meta_data|raw_app_meta_data/);
});

test('Account service-role grants match server operations without browser grants', () => {
  assert.match(server, /createServiceClient\(\)/);
  for (const table of ['profiles', 'user_saved_items']) assert.match(server, new RegExp(`from\\("${table}"\\)`));
  assert.match(grants, /grant select, insert, update on table public\.profiles to service_role;/);
  assert.match(grants, /grant select, insert, update, delete on table public\.user_saved_items to service_role;/);
  assert.doesNotMatch(grants, /^\s*grant\s+.+\s+to\s+(anon|authenticated)\s*;/im);
  assert.doesNotMatch(grants, /\b(create|alter|drop)\s+table\b/i);
});

test('report preserves remote and deployment boundaries', () => {
  assert.equal(report.decision, 'SUPABASE_BACKEND_BASELINE_FROZEN_WITH_LIMITATIONS');
  assert.equal(report.staging.projectRef, 'mlfvpaikfpjrgrhwlrjn');
  assert.equal(report.production.projectCreated, false);
  assert.equal(report.mutations.remoteMigrationApplies, 0);
  assert.equal(report.mutations.vercelEnvChanges, 0);
  assert.equal(report.localFreshDatabase.appliedMigrationCount, 6);
});

test('fresh local Supabase verifies Auth-row insert, duplicate, owner RLS, service role, and cascade', { skip: !process.env.BLUE_MARINA_BASELINE_DOCKER_CONTAINER }, () => {
  const container = process.env.BLUE_MARINA_BASELINE_DOCKER_CONTAINER;
  assert.match(container, /^supabase_db_blue-marina-(?:baseline-v1-[a-z0-9-]+|backend-freeze-fresh)$/);
  const sql = `\\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
select 'created=' || count(*) from public.profiles where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
do $$ begin begin insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'); raise exception 'duplicate unexpected'; exception when unique_violation then null; end; end $$;
select 'unique=' || count(*) from public.profiles where id='11111111-1111-4111-8111-111111111111';
select 'anon=' || has_table_privilege('anon','public.profiles','SELECT')::text || ',' || has_table_privilege('anon','public.profiles','INSERT')::text;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select 'visible=' || count(*) from public.profiles;
update public.profiles set display_name='own' where id='11111111-1111-4111-8111-111111111111';
update public.profiles set display_name='cross' where id='22222222-2222-4222-8222-222222222222';
reset role;
select 'cross=' || (display_name is null)::text from public.profiles where id='22222222-2222-4222-8222-222222222222';
set local role service_role;
select 'service=' || count(*) from public.profiles where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
reset role;
delete from auth.users where id='11111111-1111-4111-8111-111111111111';
select 'cascade=' || count(*) from public.profiles where id='11111111-1111-4111-8111-111111111111';
rollback;`;
  const output = execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-At'], { input: sql, encoding: 'utf8' });
  for (const expected of ['created=2', 'unique=1', 'anon=false,false', 'visible=1', 'UPDATE 1', 'UPDATE 0', 'cross=true', 'service=2', 'cascade=0']) {
    assert.ok(output.includes(expected), `missing ${expected}`);
  }
});

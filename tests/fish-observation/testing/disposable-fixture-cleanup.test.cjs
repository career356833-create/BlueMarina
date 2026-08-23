const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTs, readyConfig } = require("./_load.cjs");

const { createDisposableFishSmokeFixture } = loadTs("src/server/fish-observation/testing/create-disposable-fish-smoke-fixture.ts");
const { cleanupDisposableFishSmokeFixture } = loadTs("src/server/fish-observation/testing/cleanup-disposable-fish-smoke-fixture.ts");
const { withDisposableFishSmokeFixture } = loadTs("src/server/fish-observation/testing/with-disposable-fish-smoke-fixture.ts");
const { DISPOSABLE_SMOKE_DB_CLEANUP_ORDER } = loadTs("src/domain/fish-observation/testing/ports/disposable-smoke-cleanup-repository.ts");
const { FakeDisposableAuthAdminProvider } = loadTs("src/infrastructure/fish-observation/testing/supabase/testing/fake-disposable-auth-admin-provider.ts");
const { FakeDisposableSpeciesFixtureRepository } = loadTs("src/infrastructure/fish-observation/testing/supabase/testing/fake-disposable-species-fixture-repository.ts");
const { SupabaseDisposableSpeciesFixtureRepository } = loadTs("src/infrastructure/fish-observation/testing/supabase/supabase-disposable-species-fixture-repository.ts");

async function fixtureContext() {
  const authProvider = new FakeDisposableAuthAdminProvider();
  const repository = new FakeDisposableSpeciesFixtureRepository();
  const ids = ["12345678-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"];
  const fixture = await createDisposableFishSmokeFixture({ allowDisposableFixture: true, config: readyConfig(), authProvider, speciesRepository: repository, createId: () => ids.shift() });
  return { fixture, authProvider, repository };
}

test("cleanup contract orders RPC artifacts before fixture identity rows", () => {
  assert.ok(DISPOSABLE_SMOKE_DB_CLEANUP_ORDER.indexOf("fish_observation_confirmations") < DISPOSABLE_SMOKE_DB_CLEANUP_ORDER.indexOf("fish_observations"));
  assert.ok(DISPOSABLE_SMOKE_DB_CLEANUP_ORDER.indexOf("fish_observations") < DISPOSABLE_SMOKE_DB_CLEANUP_ORDER.indexOf("fish_species_sources"));
  assert.deepEqual(DISPOSABLE_SMOKE_DB_CLEANUP_ORDER.slice(-3), ["fish_species_sources", "fish_species", "fish_source_records"]);
});

test("cleanup is idempotent", async () => {
  const context = await fixtureContext();
  const input = { fixture: context.fixture, allowDisposableFixture: true, config: readyConfig(), authProvider: context.authProvider, cleanupRepository: context.repository };
  await cleanupDisposableFishSmokeFixture(input);
  await cleanupDisposableFishSmokeFixture(input);
  assert.equal(context.repository.fixtures.size, 0);
  assert.equal(context.authProvider.users.size, 0);
});

test("failed DB cleanup can be retried and never deletes Auth first", async () => {
  const context = await fixtureContext();
  context.repository.failCleanupCount = 1;
  const input = { fixture: context.fixture, allowDisposableFixture: true, config: readyConfig(), authProvider: context.authProvider, cleanupRepository: context.repository };
  await assert.rejects(() => cleanupDisposableFishSmokeFixture(input), /DB_CLEANUP_FAILED/);
  assert.equal(context.authProvider.users.size, 1);
  await cleanupDisposableFishSmokeFixture(input);
  assert.equal(context.authProvider.users.size, 0);
});

test("failed Auth deletion can be retried after idempotent DB cleanup", async () => {
  const context = await fixtureContext();
  context.authProvider.failDeleteCount = 1;
  const input = { fixture: context.fixture, allowDisposableFixture: true, config: readyConfig(), authProvider: context.authProvider, cleanupRepository: context.repository };
  await assert.rejects(() => cleanupDisposableFishSmokeFixture(input), /AUTH_DELETE_FAILED/);
  assert.equal(context.repository.fixtures.size, 0);
  await cleanupDisposableFishSmokeFixture(input);
  assert.equal(context.authProvider.users.size, 0);
});

test("server cleanup uses one transaction, parameterized identifiers, and guarded fixture deletes", async () => {
  const statements = [];
  const repository = new SupabaseDisposableSpeciesFixtureRepository({
    transaction: async (work) => work({ query: async (sql, parameters) => { statements.push({ sql, parameters }); return { rows: [] }; } }),
  });
  await repository.cleanupInTransaction({ fixtureId: "fixture", authUserId: "auth", sourceRecordId: "11111111-1111-4111-8111-111111111111", speciesId: "22222222-2222-4222-8222-222222222222" });
  assert.equal(statements.length, DISPOSABLE_SMOKE_DB_CLEANUP_ORDER.length);
  assert.equal(statements.every(({ sql }) => !sql.includes("auth-fixture") && /\$1|\$2/.test(sql)), true);
  assert.match(statements.at(-2).sql, /slug like 'smoke-test-%'/);
  assert.match(statements.at(-1).sql, /source_provider='internal_smoke_test'/);
});

test("functional smoke wrapper always cleans up in finally", async () => {
  const authProvider = new FakeDisposableAuthAdminProvider();
  const repository = new FakeDisposableSpeciesFixtureRepository();
  const ids = ["12345678-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"];
  await assert.rejects(() => withDisposableFishSmokeFixture({
    allowDisposableFixture: true,
    config: readyConfig(),
    authProvider,
    speciesRepository: repository,
    cleanupRepository: repository,
    createId: () => ids.shift(),
    run: async () => { throw new Error("SMOKE_BODY_FAILED"); },
  }), /SMOKE_BODY_FAILED/);
  assert.equal(repository.fixtures.size, 0);
  assert.equal(authProvider.users.size, 0);
});

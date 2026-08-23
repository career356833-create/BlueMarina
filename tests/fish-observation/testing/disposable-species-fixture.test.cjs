const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTs, readyConfig } = require("./_load.cjs");

const { createDisposableFishSmokeFixture } = loadTs("src/server/fish-observation/testing/create-disposable-fish-smoke-fixture.ts");
const { FakeDisposableAuthAdminProvider } = loadTs("src/infrastructure/fish-observation/testing/supabase/testing/fake-disposable-auth-admin-provider.ts");
const { FakeDisposableSpeciesFixtureRepository } = loadTs("src/infrastructure/fish-observation/testing/supabase/testing/fake-disposable-species-fixture-repository.ts");
const { SupabaseDisposableSpeciesFixtureRepository } = loadTs("src/infrastructure/fish-observation/testing/supabase/supabase-disposable-species-fixture-repository.ts");

test("creates only an approved/published internal smoke species contract", async () => {
  const authProvider = new FakeDisposableAuthAdminProvider();
  const speciesRepository = new FakeDisposableSpeciesFixtureRepository();
  const ids = ["12345678-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"];
  const fixture = await createDisposableFishSmokeFixture({
    allowDisposableFixture: true,
    config: readyConfig(),
    authProvider,
    speciesRepository,
    createId: () => ids.shift(),
    now: () => "2026-08-17T00:00:00.000Z",
  });
  const record = speciesRepository.fixtures.get(fixture.fixtureId);
  assert.equal(record.sourceProvider, "internal_smoke_test");
  assert.equal(record.factReviewStatus, "approved");
  assert.equal(record.publishStatus, "published");
  assert.equal(record.marker.isTestFixture, true);
  assert.equal(record.slug, "smoke-test-12345678");
  assert.equal(record.scientificName, "Smokeus testensis");
});

test("NIFS provider cannot enter the disposable repository", async () => {
  const repository = new FakeDisposableSpeciesFixtureRepository();
  await assert.rejects(() => repository.createInTransaction({ sourceProvider: "NIFS" }), /NIFS_PROVIDER_BLOCKED/);
});

test("server repository creates source, species, and link in one injected transaction", async () => {
  const statements = [];
  let transactions = 0;
  const repository = new SupabaseDisposableSpeciesFixtureRepository({
    transaction: async (work) => {
      transactions += 1;
      let insert = 0;
      return work({ query: async (sql, parameters) => {
        statements.push({ sql, parameters });
        insert += 1;
        return { rows: insert === 1 ? [{ id: "source-1" }] : insert === 2 ? [{ id: "species-1" }] : [] };
      } });
    },
  });
  const result = await repository.createInTransaction({
    fixtureId: "12345678-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sourceProvider: "internal_smoke_test",
    sourceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    koreanName: "스모크테스트어종",
    scientificName: "Smokeus testensis",
    slug: "smoke-test-12345678",
    factReviewStatus: "approved",
    publishStatus: "published",
    marker: { isTestFixture: true, purpose: "confirm_fish_observation_functional_smoke" },
    createdAt: "2026-08-17T00:00:00.000Z",
  });
  assert.deepEqual(result, { sourceRecordId: "source-1", speciesId: "species-1" });
  assert.equal(transactions, 1);
  assert.equal(statements.length, 3);
  assert.match(statements[0].sql, /insert into public\.fish_source_records/i);
  assert.match(statements[1].sql, /insert into public\.fish_species/i);
  assert.match(statements[2].sql, /insert into public\.fish_species_sources/i);
  assert.equal(statements.some(({ sql }) => /NIFS/i.test(sql)), false);
});

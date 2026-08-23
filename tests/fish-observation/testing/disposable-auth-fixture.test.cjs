const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTs, readyConfig } = require("./_load.cjs");

const { createDisposableAuthUser } = loadTs("src/server/fish-observation/testing/create-disposable-auth-user.ts");
const { deleteDisposableAuthUser } = loadTs("src/server/fish-observation/testing/delete-disposable-auth-user.ts");
const { SupabaseDisposableAuthAdminProvider } = loadTs("src/infrastructure/fish-observation/testing/supabase/supabase-disposable-auth-admin-provider.ts");
const { FakeDisposableAuthAdminProvider } = loadTs("src/infrastructure/fish-observation/testing/supabase/testing/fake-disposable-auth-admin-provider.ts");

test("fake Auth user is created and deleted without exposing identity credentials", async () => {
  const provider = new FakeDisposableAuthAdminProvider();
  const result = await createDisposableAuthUser({ fixtureId: "fixture-1", allowDisposableFixture: true, config: readyConfig(), provider });
  assert.deepEqual(Object.keys(result), ["userId"]);
  assert.equal(provider.users.size, 1);
  await deleteDisposableAuthUser({ userId: result.userId, allowDisposableFixture: true, config: readyConfig(), provider });
  assert.equal(provider.users.size, 0);
});

test("live provider fails closed without an injected Auth Admin client", async () => {
  const provider = new SupabaseDisposableAuthAdminProvider();
  await assert.rejects(() => provider.createDisposableUser({ fixtureId: "x", purpose: "confirm_fish_observation_functional_smoke" }), /CLIENT_MISSING/);
});

test("Auth Admin provider returns only userId and never logs email, password, or token", async () => {
  let captured;
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  try {
    const provider = new SupabaseDisposableAuthAdminProvider({ auth: { admin: {
      createUser: async (attributes) => { captured = attributes; return { data: { user: { id: "auth-1" } }, error: null }; },
      deleteUser: async () => ({ data: {}, error: null }),
    } } });
    assert.deepEqual(await provider.createDisposableUser({ fixtureId: "fixture-1", purpose: "confirm_fish_observation_functional_smoke" }), { userId: "auth-1" });
    assert.match(captured.email, /^fish-smoke-/);
    assert.ok(captured.password);
    assert.equal(logs.length, 0);
  } finally {
    console.log = originalLog;
  }
});

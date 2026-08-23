const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadTs, readyConfig, root } = require("./_load.cjs");

const { assertDisposableFishSmokeFixtureAllowed, assertDisposableSpeciesIdentity } = loadTs("src/server/fish-observation/testing/disposable-fixture-safety.ts");
const { getFishSmokeFixtureConfig } = loadTs("src/server/fish-observation/testing/disposable-auth-fixture-types.ts");

test("defaults are disabled and empty", () => {
  assert.deepEqual(getFishSmokeFixtureConfig({}), { enabled: false, environment: "", projectRef: "" });
});

test("requires staging, exact project, feature flag, and explicit permission", () => {
  assert.doesNotThrow(() => assertDisposableFishSmokeFixtureAllowed(readyConfig(), true));
  assert.throws(() => assertDisposableFishSmokeFixtureAllowed(readyConfig({ enabled: false }), true), /DISABLED/);
  assert.throws(() => assertDisposableFishSmokeFixtureAllowed(readyConfig({ environment: "production" }), true), /STAGING_ONLY/);
  assert.throws(() => assertDisposableFishSmokeFixtureAllowed(readyConfig({ projectRef: "foreign" }), true), /PROJECT_REF_MISMATCH/);
  assert.throws(() => assertDisposableFishSmokeFixtureAllowed(readyConfig(), false), /EXPLICIT_ALLOW_REQUIRED/);
});

test("blocks a foreign or production Supabase URL and non-test identities", () => {
  assert.doesNotThrow(() => assertDisposableFishSmokeFixtureAllowed(readyConfig({ targetUrl: "https://mlfvpaikfpjrgrhwlrjn.supabase.co" }), true));
  assert.throws(() => assertDisposableFishSmokeFixtureAllowed(readyConfig({ targetUrl: "https://productionref.supabase.co" }), true), /FOREIGN_URL_BLOCKED/);
  assert.throws(() => assertDisposableSpeciesIdentity("NIFS", "smoke-test-12345678"), /SOURCE_PROVIDER_BLOCKED/);
  assert.throws(() => assertDisposableSpeciesIdentity("internal_smoke_test", "red-snow-crab"), /SLUG_INVALID/);
});

test("fixture infrastructure contains no route, remote client composition, or confirm RPC call", () => {
  const directory = path.join(root, "src/server/fish-observation/testing");
  const source = fs.readdirSync(directory).filter((name) => name.endsWith(".ts")).map((name) => fs.readFileSync(path.join(directory, name), "utf8")).join("\n");
  assert.doesNotMatch(source, /confirm_fish_observation\s*\(/);
  assert.doesNotMatch(source, /createClient\s*\(/);
  assert.equal(fs.existsSync(path.join(root, "src/app/api/fish-observations/smoke/route.ts")), false);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const readText = (file) => fs.readFileSync(path.join(root, file), "utf8");
const profiles = [
  ...readJson("data/fishing-condition/profiles/v1/batch-a-19.json").profiles,
  ...readJson("data/fishing-condition/profiles/v1/batch-b-19.json").profiles,
];
const report = readJson("reports/fishing-condition/runtime-activation-v1.json");

test("activates exactly 38 reviewed profile IDs without duplicates", () => {
  assert.equal(profiles.length, 38);
  assert.equal(new Set(profiles.map((profile) => profile.speciesId)).size, 38);
  assert.equal(report.registry.coverage, 38);
  assert.equal(report.registry.duplicateIds, 0);
});

test("preserves reviewed readiness and source-backed limitations", () => {
  assert.deepEqual(report.activation, { species: 38, PROFILE_READY: 5, PROFILE_PARTIAL: 3, PROFILE_LIMITED: 30 });
  assert.ok(profiles.every((profile) => ["PROFILE_READY", "PROFILE_PARTIAL", "PROFILE_LIMITED"].includes(profile.profileReadiness)));
  assert.ok(profiles.every((profile) => profile.evidenceRefs.length > 0 && profile.limitations.length > 0));
});

test("keeps the read model additive and routes registry-only species without a comparator", () => {
  const server = readText("src/lib/fishing-condition/read-model-server.ts");
  const model = readText("src/lib/fishing-condition/read-model.ts");
  assert.match(server, /getFactualConditionProfile/);
  assert.match(server, /buildProfileOnlyFishingConditionReadModel/);
  assert.match(model, /profileContext/);
  assert.match(model, /PROFILE_REFERENCE_ONLY_NO_AUTOMATIC_SUITABILITY_VERDICT/);
});

test("keeps unknown values, undocumented units, and safety boundaries intact", () => {
  assert.ok(profiles.some((profile) => profile.salinity.status === "UNKNOWN"));
  assert.ok(profiles.some((profile) => profile.limitations.some((item) => item.includes("UNIT_NOT_DOCUMENTED"))));
  assert.deepEqual(report.safetyInvariants, { scoring: 0, ranking: 0, probability: 0, recommendation: 0, automaticSuitabilityVerdict: 0, databaseWrite: 0, supabaseWrite: 0 });
});

test("uses the profile registry in the selector and fishing-spot projection", () => {
  const integration = readText("src/lib/fishing-condition/fishing-spot-integration.ts");
  const client = readText("src/app/fishing-spots/conditions/fishing-condition-client.tsx");
  assert.match(integration, /getFishingConditionProfileSpecies/);
  assert.match(client, /ProfileContext/);
  assert.match(client, /제한된 생태 정보/);
});

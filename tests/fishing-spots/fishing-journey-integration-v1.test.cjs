const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("reports/fishing-journey/integration-v1.json"));

test("defines one internal URL journey contract", () => {
  const contract = read("src/lib/fishing-spots/journey.ts");
  assert.deepEqual(report.stateContract, ["spotId", "speciesId", "source", "returnTo"]);
  assert.match(contract, /safeJourneyReturnTo/);
  assert.match(contract, /getFishingConditionProfile/);
  assert.doesNotMatch(contract, /https?:\/\//);
});

test("keeps spot and registry species through detail, conditions, and sea", () => {
  const detail = read("src/lib/fishing-condition/fishing-spot-integration.ts");
  const conditions = read("src/app/fishing-spots/conditions/fishing-condition-client.tsx");
  const sea = read("src/components/sea/MapView.tsx");
  assert.match(detail, /buildFishingJourneyConditionsHref/);
  assert.match(conditions, /router\.replace\(buildFishingJourneyConditionsHref/);
  assert.match(conditions, /buildFishingJourneySeaHref/);
  assert.match(sea, /journeySpeciesId/);
});

test("preserves adapter navigation and all four coordinate holds", () => {
  const adapter = read("src/lib/marine-navigation/adapters/navigation-destination-adapter.ts");
  const safety = read("src/lib/fishing-spots/coordinate-safety.ts");
  const sea = read("src/components/sea/MapView.tsx");
  assert.match(adapter, /navigationDestinationFromFishingSpot/);
  for (const id of ["boat-60", "boat-321", "boat-128", "boat-129"]) assert.match(safety, new RegExp(id));
  assert.match(sea, /MAP_DISPLAY_BLOCKED/);
  assert.match(sea, /NAVIGATION_BLOCKED_PENDING_REVIEW/);
});

test("keeps the journey free of automated condition or route verdicts", () => {
  assert.deepEqual(report.boundaries, { scoring: 0, ranking: 0, probability: 0, automaticSuitability: 0, safeRouteInference: 0, databaseWrite: 0, supabaseWrite: 0 });
});

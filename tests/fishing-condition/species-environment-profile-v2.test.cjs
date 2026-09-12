const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const v1Path = path.join(root, "data/fishing-condition/species-environment/v1/species-environment-profiles.json");
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const auditPath = path.join(root, "reports/fishing-condition/species-environment-profile-audit-v2.json");
const diffPath = path.join(root, "reports/fishing-condition/species-environment-v2-diff.json");
const modulePath = path.join(root, "src/lib/fishing-condition/species-environment.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/species-environment/route.ts");
const comparatorPath = path.join(root, "src/lib/fishing-condition/comparator.ts");
const explanationPath = path.join(root, "src/lib/fishing-condition/explanation.ts");
const v1Text = fs.readFileSync(v1Path, "utf8");
const v1 = JSON.parse(v1Text);
const v2 = JSON.parse(fs.readFileSync(v2Path, "utf8"));

function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

function references(profile) {
  const ids = [];
  for (const key of ["observed", "preferred", "spawning"]) for (const item of profile.temperature[key]) ids.push(...item.evidenceIds);
  for (const key of ["observed", "typicalFishing", "spawning", "juvenile", "adult"]) for (const item of profile.depth[key]) ids.push(...item.evidenceIds);
  for (const item of profile.salinity.ranges) ids.push(...item.evidenceIds);
  for (const item of profile.dissolvedOxygen.observations) ids.push(...item.evidenceIds);
  for (const item of [...profile.spawning, ...profile.migration, ...profile.seasonality]) ids.push(...item.evidenceIds);
  ids.push(...profile.feeding.evidenceIds, ...profile.conflicts.flatMap((item) => item.evidenceIds));
  return ids;
}

test("V2 preserves the frozen V1 artifact and all ten canonical identities", () => {
  assert.equal(crypto.createHash("sha256").update(v1Text).digest("hex"), "095f481cad0f7350b75d6264231443cca576ff161edaf9290418a2610184d99f");
  assert.equal(v2.baseArtifactSha256, "095f481cad0f7350b75d6264231443cca576ff161edaf9290418a2610184d99f");
  assert.equal(v2.profileCount, 10);
  const before = new Map(v1.profiles.map((item) => [item.speciesId, item]));
  for (const item of v2.profiles) {
    const original = before.get(item.speciesId);
    assert.ok(original);
    for (const field of ["speciesId", "slug", "scientificName", "koreanName"]) assert.equal(item[field], original[field]);
  }
});

test("every V2 structured field resolves to evidence and new evidence records access metadata", () => {
  const originalIds = new Set(v1.profiles.flatMap((profile) => profile.evidence.map((item) => item.id)));
  for (const profile of v2.profiles) {
    const ids = new Set(profile.evidence.map((item) => item.id));
    for (const id of references(profile)) assert.ok(ids.has(id), `${profile.speciesId}:${id}`);
    for (const evidence of profile.evidence.filter((item) => !originalIds.has(item.id))) {
      assert.match(evidence.url, /^https:\/\//);
      assert.equal(evidence.accessedAt, "2026-09-11");
      assert.ok(evidence.quoteOrSummary.length > 10);
    }
  }
});

test("temperature context separates modelled preference, aquaculture and wild occurrence", () => {
  const redSeabream = v2.profiles.find((item) => item.koreanName === "참돔");
  assert.equal(redSeabream.temperature.preferred[0].context, "MODELLED_PREFERRED_TEMPERATURE_AQUAMAPS");
  const amberjack = v2.profiles.find((item) => item.koreanName === "방어");
  assert.match(amberjack.temperature.preferred[0].context, /AQUACULTURE_ADULT/);
  assert.equal(amberjack.temperature.preferred[0].lifeStage, "ADULT");
  assert.equal(amberjack.temperature.preferred[1].lifeStage, "JUVENILE");
  const octopus = v2.profiles.find((item) => item.koreanName === "문어");
  assert.equal(octopus.temperature.observed[0].context, "WILD_IMMATURE_OCCURRENCE_TEMPERATURE");
  assert.equal(octopus.temperature.observed[0].lifeStage, "IMMATURE");
  assert.match(octopus.temperature.preferred[0].context, /CAPTIVE_HUSBANDRY/);
  assert.equal(octopus.temperature.canonicalPreferredMinC, null);
});

test("salinity and DO preserve source units and threshold meanings", () => {
  const amberjack = v2.profiles.find((item) => item.koreanName === "방어");
  assert.equal(amberjack.salinity.unit, "permille");
  assert.deepEqual([amberjack.salinity.canonicalMin, amberjack.salinity.canonicalMax], [30, 36]);
  assert.equal(amberjack.dissolvedOxygen.minimumMgL, 4.3);
  assert.match(amberjack.dissolvedOxygen.observations[0].context, /BEHAVIORAL_ABNORMALITY_THRESHOLD_NOT_MORTALITY/);
  assert.deepEqual([amberjack.spawning[0].depthMinM, amberjack.spawning[0].depthMaxM], [200, 200]);
  assert.equal(amberjack.migration.at(-1).movement, "SOUTHWARD_SPAWNING_MIGRATION");
  const octopus = v2.profiles.find((item) => item.koreanName === "문어");
  assert.equal(octopus.dissolvedOxygen.minimumMgL, null);
  assert.match(octopus.dissolvedOxygen.observations[0].context, /PERCENT_SATURATION_NOT_CONVERTED/);
});

test("the amberjack depth conflict remains unresolved and unmerged", () => {
  const amberjack = v2.profiles.find((item) => item.koreanName === "방어");
  assert.equal(amberjack.profileStatus, "CONFLICT_REVIEW_REQUIRED");
  assert.deepEqual(amberjack.depth.observed.map((item) => item.maxM), [200, 100]);
  assert.equal(amberjack.depth.canonicalObservedMinM, null);
  assert.equal(amberjack.depth.canonicalObservedMaxM, null);
  assert.equal(amberjack.conflicts[0].status, "CONFLICT_REVIEW_REQUIRED");
});

test("runtime defaults to V2 and exposes the explicit version without mutation", () => {
  const moduleText = fs.readFileSync(modulePath, "utf8");
  const routeText = fs.readFileSync(routePath, "utf8");
  assert.match(moduleText, /species-environment\/v2\/species-environment-profiles\.json/);
  assert.match(moduleText, /blue-marina-species-environment-v2/);
  assert.match(routeText, /version: SPECIES_ENVIRONMENT_VERSION/);
  assert.doesNotMatch(routeText, /POST|PUT|PATCH|DELETE|supabase|insert\(|update\(|delete\(/i);
});

test("Comparator and Explanation consume V2 ranges without score or recommendation", () => {
  const comparator = loadTs(comparatorPath);
  const explanation = loadTs(explanationPath);
  const redSeabream = v2.profiles.find((item) => item.koreanName === "참돔");
  const result = comparator.compareFishingCondition(redSeabream, {
    sourceId: "nifs-risa", provider: "NIFS", qualityClass: "OBSERVED", stationOrSiteId: "test", observedAt: "2026-09-11T00:00:00Z", freshness: "fresh", depthContext: "SURFACE", exactDepthM: 20, stationWaterDepthM: 40,
    temperature: { value: 20, unit: "degC" }, salinity: { value: null, unit: null }, dissolvedOxygen: { value: null, unit: null }, chlorophyllA: { value: null, unit: null },
  });
  assert.equal(result.comparisons.temperature.relation, "WITHIN_RANGE");
  assert.equal(result.sourceLineage.speciesProfileSource, "blue-marina-species-environment-v2");
  assert.deepEqual(result.comparisons.temperature.evidenceIds, ["pagrus-fishbase-temperature-v2"]);
  const explained = explanation.explainFishingCondition(result);
  assert.deepEqual(explained.explanations.find((item) => item.field === "temperature").evidenceRefs, ["pagrus-fishbase-temperature-v2"]);
  assert.equal("score" in result, false);
  assert.equal("probability" in result, false);
  assert.equal("recommendation" in result, false);
});

test("audit and diff reports prove improved coverage without semantic uplift", () => {
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  const diff = JSON.parse(fs.readFileSync(diffPath, "utf8"));
  assert.equal(audit.species.total, 10);
  assert.equal(audit.evidence.v1Total, 22);
  assert.equal(audit.evidence.v2Total, 32);
  assert.equal(audit.coverage.after.temperature, 9);
  assert.equal(audit.comparator.temperatureComparableBefore, 2);
  assert.equal(audit.comparator.temperatureComparableAfter, 9);
  assert.equal(audit.comparator.salinityRuntimeComparable, 0);
  assert.equal(audit.conflicts.unresolved, 1);
  assert.equal(diff.identityPreserved, true);
  assert.equal(audit.boundaries.suitabilityScore, false);
  assert.equal(audit.boundaries.fishingProbability, false);
  assert.equal(audit.boundaries.ranking, false);
  assert.equal(audit.boundaries.recommendation, false);
});

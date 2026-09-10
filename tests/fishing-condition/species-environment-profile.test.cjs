const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const artifactPath = path.join(root, "data/fishing-condition/species-environment/v1/species-environment-profiles.json");
const reportPath = path.join(root, "reports/fishing-condition/species-environment-profile-audit-v1.json");
const modulePath = path.join(root, "src/lib/fishing-condition/species-environment.ts");
const routePath = path.join(root, "src/app/api/fishing-condition/species-environment/route.ts");
const canonicalPath = path.join(root, "data/mbris/normalized/taxonomy-master.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

function allEvidenceReferences(profile) {
  const refs = [];
  for (const key of ["observed", "preferred", "spawning"]) for (const item of profile.temperature[key]) refs.push(...item.evidenceIds);
  for (const key of ["observed", "typicalFishing", "spawning", "juvenile", "adult"]) for (const item of profile.depth[key]) refs.push(...item.evidenceIds);
  for (const item of profile.salinity.ranges) refs.push(...item.evidenceIds);
  for (const item of profile.dissolvedOxygen.observations) refs.push(...item.evidenceIds);
  for (const item of [...profile.spawning, ...profile.migration, ...profile.seasonality]) refs.push(...item.evidenceIds);
  refs.push(...profile.feeding.evidenceIds, ...profile.conflicts.flatMap((item) => item.evidenceIds));
  return refs;
}

function assertRange(min, max) {
  if (min !== null && min !== undefined) assert.ok(Number.isFinite(min) && min >= 0);
  if (max !== null && max !== undefined) assert.ok(Number.isFinite(max) && max >= 0);
  if (min !== null && min !== undefined && max !== null && max !== undefined) assert.ok(min <= max);
}

test("V1 artifact has ten unique source-backed canonical profiles", () => {
  assert.equal(artifact.schemaVersion, "1.0.0");
  assert.equal(artifact.sourceId, "blue-marina-species-environment-v1");
  assert.equal(artifact.profileCount, 10);
  assert.equal(artifact.profiles.length, 10);
  assert.equal(new Set(artifact.profiles.map((p) => p.speciesId)).size, 10);
  assert.equal(new Set(artifact.profiles.map((p) => p.slug)).size, 10);
  for (const profile of artifact.profiles) {
    assert.match(profile.speciesId, /^BM-SPECIES-\d{6}$/);
    assert.match(profile.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(profile.evidence.length >= 1);
  }
});
test("all profiles join the frozen MBRIS identity registry without name-only matching", () => {
  const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
  const byId = new Map(canonical.map((item) => [item.internalId, item]));
  for (const profile of artifact.profiles) {
    const match = byId.get(profile.speciesId);
    assert.ok(match, profile.speciesId);
    assert.equal(match.koreanName, profile.koreanName);
    assert.equal(match.scientificNameCanonical, profile.scientificName);
  }
});

test("missing data stays explicit and is never inferred", () => {
  const redSeabream = artifact.profiles.find((p) => p.koreanName === "참돔");
  assert.equal(redSeabream.temperature.canonicalPreferredMinC, null);
  assert.equal(redSeabream.salinity.canonicalMin, null);
  assert.equal(redSeabream.dissolvedOxygen.minimumMgL, null);
  assert.ok(redSeabream.unsupportedFields.includes("temperature.preferred"));
});

test("every structured fact resolves to profile evidence", () => {
  for (const profile of artifact.profiles) {
    const ids = new Set(profile.evidence.map((item) => item.id));
    assert.equal(ids.size, profile.evidence.length);
    for (const id of allEvidenceReferences(profile)) assert.ok(ids.has(id), `${profile.speciesId}:${id}`);
    for (const item of profile.evidence) {
      assert.ok(item.title);
      assert.ok(item.quoteOrSummary);
      assert.ok(["NIFS", "MBRIS", "FAO", "FISHBASE", "PAPER", "OTHER_OFFICIAL"].includes(item.sourceType));
    }
  }
});

test("temperature, depth, salinity and DO ranges are ordered and contextual", () => {
  for (const profile of artifact.profiles) {
    for (const key of ["observed", "preferred", "spawning"]) for (const range of profile.temperature[key]) {
      assertRange(range.minC, range.maxC);
      assert.ok(range.context && range.regionScope && range.lifeStage);
    }
    for (const key of ["observed", "typicalFishing", "spawning", "juvenile", "adult"]) for (const range of profile.depth[key]) {
      assertRange(range.minM, range.maxM);
      assert.ok(range.context && range.regionScope && range.lifeStage);
    }
    for (const range of profile.salinity.ranges) assertRange(range.min, range.max);
    for (const range of profile.dissolvedOxygen.observations) assertRange(range.minMgL, range.maxMgL);
  }
});

test("season and activity enums remain bounded", () => {
  const activities = new Set(["DIURNAL", "NOCTURNAL", "CREPUSCULAR", "MIXED", "UNKNOWN"]);
  for (const profile of artifact.profiles) {
    assert.ok(activities.has(profile.activityPeriod));
    for (const fact of [...profile.spawning, ...profile.migration, ...profile.seasonality]) {
      assert.ok(fact.months.every((month) => Number.isInteger(month) && month >= 1 && month <= 12));
    }
  }
});

test("conflicting authority ranges are not averaged", () => {
  const amberjack = artifact.profiles.find((p) => p.koreanName === "방어");
  assert.equal(amberjack.profileStatus, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(amberjack.depth.canonicalObservedMinM, null);
  assert.equal(amberjack.depth.canonicalObservedMaxM, null);
  assert.deepEqual(amberjack.depth.observed.map((item) => item.maxM), [200, 100]);
  assert.equal(amberjack.conflicts[0].status, "CONFLICT_REVIEW_REQUIRED");
});

test("captive rearing values are not promoted to wild preferences or thresholds", () => {
  const webfoot = artifact.profiles.find((p) => p.koreanName === "주꾸미");
  assert.match(webfoot.temperature.observed[0].context, /CAPTIVE_REARING/);
  assert.equal(webfoot.temperature.preferred.length, 0);
  assert.equal(webfoot.temperature.canonicalPreferredMinC, null);
  assert.equal(webfoot.salinity.canonicalMin, null);
  assert.equal(webfoot.dissolvedOxygen.minimumMgL, null);
});

test("artifact and runtime contain no suitability or probability output", () => {
  const artifactText = fs.readFileSync(artifactPath, "utf8");
  const moduleText = fs.readFileSync(modulePath, "utf8");
  const routeText = fs.readFileSync(routePath, "utf8");
  assert.equal(artifact.noScoreBoundary, true);
  assert.doesNotMatch(artifactText, /"(?:suitabilityScore|fishingProbability|recommendationRank|hotSpotScore)"\s*:/i);
  assert.doesNotMatch(routeText, /calculate|ranking|recommendation/i);
  assert.match(moduleText, /PROFILE_ONLY_NO_COMPARISON/);
});

test("read-only route is exact-filtered and bounded to the local artifact", () => {
  const route = fs.readFileSync(routePath, "utf8");
  const moduleText = fs.readFileSync(modulePath, "utf8");
  assert.match(route, /speciesId/);
  assert.match(route, /slug/);
  assert.match(route, /EXACTLY_ONE_FILTER_REQUIRED/);
  assert.match(route, /PROFILE_NOT_FOUND/);
  assert.doesNotMatch(route, /POST|PUT|PATCH|DELETE|fetch\(|supabase/i);
  assert.match(moduleText, /species-environment-profiles\.json/);
});

test("audit report matches artifact and preserves no-score boundaries", () => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.species.total, 10);
  assert.equal(report.species.canonicalMatches, 10);
  assert.equal(report.species.conflictReviewRequired, 1);
  assert.equal(report.boundaries.suitabilityScoreImplemented, false);
  assert.equal(report.boundaries.fishingProbabilityImplemented, false);
  assert.equal(report.coverage.depth, 10);
});

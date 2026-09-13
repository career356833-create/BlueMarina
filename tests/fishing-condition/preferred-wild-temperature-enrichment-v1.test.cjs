/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const tool = require(path.join(root, "tools/fishing-condition/audit-preferred-temperature-evidence.cjs"));
const v2Path = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const reportPath = path.join(root, "reports/fishing-condition/preferred-wild-temperature-enrichment-v1.json");
const diffPath = path.join(root, "reports/fishing-condition/species-environment-v2-v3-temperature-diff.json");
const fixedAt = "2026-09-13T00:00:00.000Z";

function hash(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function build() {
  return tool.buildArtifacts({ root, generatedAt: fixedAt });
}

function normalizeGeneratedAt(value, generatedAt) {
  const copy = JSON.parse(JSON.stringify(value));
  copy.generatedAt = generatedAt;
  return copy;
}

test("V2 remains byte-for-byte immutable and V3 preserves all ten identities", () => {
  const v2 = JSON.parse(fs.readFileSync(v2Path, "utf8"));
  const { v3 } = build();
  assert.equal(hash(v2Path), tool.EXPECTED_V2_SHA256);
  assert.equal(v3.baseArtifactSha256, tool.EXPECTED_V2_SHA256);
  assert.equal(v3.profileCount, 10);
  const before = new Map(v2.profiles.map((profile) => [profile.speciesId, profile]));
  for (const profile of v3.profiles) {
    const original = before.get(profile.speciesId);
    assert.ok(original, profile.speciesId);
    for (const field of ["speciesId", "slug", "koreanName", "scientificName"])
      assert.equal(profile[field], original[field]);
  }
});

test("five explicit preference experiments satisfy the evidence contract", () => {
  const additions = Object.values(tool.additions);
  assert.equal(additions.length, 5);
  for (const { evidence } of additions) {
    for (const field of ["id", "sourceName", "sourceType", "title", "url", "year", "species", "scientificName", "rangeType", "lifeStage", "geographicContext", "seasonContext", "evidenceStrength", "notes"])
      assert.ok(Object.hasOwn(evidence, field), `${evidence.id}:${field}`);
    assert.match(evidence.url, /^https:\/\//);
    assert.ok(Number.isFinite(evidence.temperature.min));
    assert.ok(Number.isFinite(evidence.temperature.max));
    assert.equal(evidence.temperature.unit, "degC");
    assert.ok(["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(evidence.evidenceStrength));
  }
});

test("new evidence preserves life stage and laboratory or acclimation limitations", () => {
  for (const { range, evidence } of Object.values(tool.additions)) {
    assert.notEqual(range.lifeStage, "UNSPECIFIED");
    assert.equal(evidence.lifeStage, range.lifeStage);
    assert.match(`${range.context} ${range.regionScope} ${evidence.notes}`, /EXPERIMENT|LAB|ACCLIMAT/i);
    assert.notEqual(range.context, "PREFERRED_TEMPERATURE");
    assert.notEqual(range.regionScope, "KOREA");
  }
});

test("canonical temperature ranges do not change and no limited context is promoted", () => {
  const v2 = JSON.parse(fs.readFileSync(v2Path, "utf8"));
  const { v3 } = build();
  const after = new Map(v3.profiles.map((profile) => [profile.speciesId, profile]));
  for (const original of v2.profiles) {
    const profile = after.get(original.speciesId);
    assert.equal(profile.temperature.canonicalPreferredMinC, original.temperature.canonicalPreferredMinC);
    assert.equal(profile.temperature.canonicalPreferredMaxC, original.temperature.canonicalPreferredMaxC);
  }
  const contexts = v3.profiles.flatMap((profile) => profile.temperature.preferred.map((item) => item.context));
  assert.ok(contexts.some((context) => /MODELLED/.test(context)));
  assert.ok(contexts.some((context) => /AQUACULTURE/.test(context)));
  assert.ok(contexts.some((context) => /CAPTIVE/.test(context)));
});

test("spawning and observed temperature evidence remain in their original fields", () => {
  const v2 = JSON.parse(fs.readFileSync(v2Path, "utf8"));
  const { v3 } = build();
  for (const original of v2.profiles) {
    const profile = v3.profiles.find((item) => item.speciesId === original.speciesId);
    assert.deepEqual(profile.temperature.observed, original.temperature.observed);
    assert.deepEqual(profile.temperature.spawning, original.temperature.spawning);
  }
});

test("all structured temperature evidence references resolve", () => {
  const { v3 } = build();
  for (const profile of v3.profiles) {
    const evidenceIds = new Set(profile.evidence.map((evidence) => evidence.id));
    for (const field of ["observed", "preferred", "spawning"])
      for (const range of profile.temperature[field])
        for (const evidenceId of range.evidenceIds)
          assert.ok(evidenceIds.has(evidenceId), `${profile.speciesId}:${evidenceId}`);
  }
});

test("strict readiness remains one and limited evidence expands without scoring approval", () => {
  const { report } = build();
  assert.equal(report.decision, "LIMITED_EVIDENCE_ONLY");
  assert.deepEqual(report.readiness.before, { strict: 1, limited: 6, notReady: 3 });
  assert.deepEqual(report.readiness.after, { strict: 1, limited: 7, notReady: 2 });
  assert.deepEqual(report.readiness.newlyStrictSpecies, []);
  assert.deepEqual(report.readiness.newlyLimitedSpecies, ["방어"]);
  assert.equal(report.scoringBoundary.normalization, "NORMALIZATION_NOT_JUSTIFIED");
  assert.equal(report.scoringBoundary.productionApproval, false);
});

test("the existing yellowtail depth conflict is preserved exactly", () => {
  const v2 = JSON.parse(fs.readFileSync(v2Path, "utf8"));
  const { v3 } = build();
  const before = v2.profiles.find((profile) => profile.koreanName === "방어");
  const after = v3.profiles.find((profile) => profile.koreanName === "방어");
  assert.equal(after.profileStatus, "CONFLICT_REVIEW_REQUIRED");
  assert.deepEqual(after.conflicts, before.conflicts);
  assert.deepEqual(after.depth, before.depth);
});

test("V3 is inactive and runtime continues to reference V2 only", () => {
  const { v3 } = build();
  assert.equal(v3.activationStatus, "INACTIVE_RESEARCH_CANDIDATE");
  assert.equal(v3.enrichmentPolicy.numericScoring, false);
  const runtimeFiles = [
    "src/lib/fishing-condition/species-environment.ts",
    "src/app/api/fishing-condition/species-environment/route.ts",
    "src/app/api/fishing-condition/compare/route.ts",
    "src/app/api/fishing-condition/evidence-bundle/route.ts",
    "src/app/api/fishing-condition/multi-source-evidence/route.ts",
  ];
  for (const file of runtimeFiles) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(text, /species-environment\/v3|preferred-wild-temperature-enrichment/i, file);
  }
});

test("no numeric score, probability, ranking, recommendation or weight field is introduced", () => {
  const artifacts = build();
  const forbidden = new Set(["score", "normalizedscore", "weight", "probability", "ranking", "recommendation"]);
  function inspect(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.has(key.toLowerCase()), false, key);
      inspect(child);
    }
  }
  inspect(artifacts);
});

test("generation is deterministic and saved artifacts match generated content", () => {
  assert.deepEqual(build(), build());
  const expected = build();
  for (const [file, value] of [[v3Path, expected.v3], [reportPath, expected.report], [diffPath, expected.diff]]) {
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.deepEqual(saved, normalizeGeneratedAt(value, saved.generatedAt));
  }
});

test("building the candidate cannot mutate V2", () => {
  const before = hash(v2Path);
  build();
  assert.equal(hash(v2Path), before);
});

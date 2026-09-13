/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const tool = require(path.join(root, "tools/fishing-condition/audit-wild-preferred-temperature-gaps.cjs"));
const reportPath = path.join(root, tool.REPORT_PATH);
const fixedAt = "2026-09-13T00:00:00.000Z";

function hash(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

function build() {
  return tool.buildAudit({ root, generatedAt: fixedAt });
}

test("represents ten canonical species with one strict control and nine non-strict audits", () => {
  const report = build();
  assert.equal(report.speciesTotal, 10);
  assert.equal(report.strictControlCount, 1);
  assert.equal(report.auditedNonStrictCount, 9);
  assert.equal(new Set(report.species.map((item) => item.speciesId)).size, 10);
  assert.equal(report.species.find((item) => item.role === "STRICT_CONTROL").koreanName, "고등어");
});

test("every non-strict species has explicit gaps and a conversion requirement", () => {
  for (const item of build().species.filter((species) => species.role === "NON_STRICT_AUDIT_TARGET")) {
    assert.ok(item.gapCategories.length >= 1, item.koreanName);
    assert.ok(item.strictBlocker.length > 20, item.koreanName);
    assert.ok(item.strictConversionRequirement.length > 20, item.koreanName);
    assert.ok(item.searchTargets.length >= 2, item.koreanName);
    assert.ok(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"].includes(item.researchCost));
    assert.ok(["LOW", "MEDIUM", "HIGH"].includes(item.researchPriority));
  }
});

test("source, semantic, applicability and conflict dimensions remain separate", () => {
  const report = build();
  assert.deepEqual(report.gapDimensionCounts, { sourceGaps: 9, semanticGaps: 4, applicabilityGaps: 8, conflictGaps: 0 });
  const redSeabream = report.species.find((item) => item.koreanName === "참돔");
  assert.equal(redSeabream.gapDimensions.semanticGap, false);
  assert.equal(redSeabream.gapDimensions.applicabilityGap, true);
  const hairtail = report.species.find((item) => item.koreanName === "갈치");
  assert.equal(hairtail.gapDimensions.semanticGap, true);
  assert.equal(hairtail.gapDimensions.applicabilityGap, false);
});

test("juvenile, captive, aquaculture, modelled and observed contexts remain explicit", () => {
  const report = build();
  const categories = (name) => report.species.find((item) => item.koreanName === name).gapCategories;
  assert.ok(categories("참돔").includes("JUVENILE_ONLY"));
  assert.ok(categories("감성돔").includes("CAPTIVE_ONLY"));
  assert.ok(categories("넙치").includes("AQUACULTURE_ONLY"));
  assert.ok(categories("갈치").includes("MODELLED_ONLY"));
  assert.ok(categories("문어").includes("OBSERVED_ONLY"));
});

test("temperature evidence is audited without evidence promotion or canonical changes", () => {
  const report = build();
  assert.equal(report.boundaries.evidenceAdded, false);
  assert.equal(report.boundaries.preferredRangeAdded, false);
  assert.equal(report.boundaries.canonicalRangeChanged, false);
  assert.equal(report.species.find((item) => item.koreanName === "고등어").currentEvidence.canonical.min, 15);
  assert.equal(report.species.find((item) => item.koreanName === "고등어").currentEvidence.canonical.max, 16);
});

test("the yellowtail depth conflict remains explicit and separate from temperature", () => {
  const report = build();
  assert.equal(report.existingConflictNote.status, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(report.existingConflictNote.field, "depth.observed");
  assert.equal(report.existingConflictNote.temperatureEligibilityEffect, "FIELD_SEPARATE_NO_AUTOMATIC_TEMPERATURE_BLOCK");
  assert.equal(report.gapDimensionCounts.conflictGaps, 0);
});

test("next research batch is bounded to three high-priority species without numeric ranking", () => {
  const report = build();
  assert.deepEqual(report.nextResearchBatch.map((item) => item.koreanName), ["참돔", "조피볼락", "방어"]);
  assert.equal(report.nextResearchBatch.every((item) => item.priority === "HIGH"), true);
  assert.equal(report.nextResearchBatch.some((item) => Object.hasOwn(item, "rank")), false);
});

test("all immutable input checksums remain exact", () => {
  const report = build();
  for (const [name, [relativePath, expected]] of Object.entries(tool.INPUTS)) {
    assert.equal(hash(relativePath), expected, name);
    assert.equal(report.immutableInputs[name], expected, name);
  }
});

test("runtime remains V2-only and does not import the gap audit", () => {
  const runtimeFiles = [
    "src/lib/fishing-condition/species-environment.ts",
    "src/app/api/fishing-condition/species-environment/route.ts",
    "src/app/api/fishing-condition/compare/route.ts",
    "src/app/api/fishing-condition/explain/route.ts",
    "src/app/api/fishing-condition/evidence-bundle/route.ts",
    "src/app/api/fishing-condition/source-alignment/route.ts",
    "src/app/api/fishing-condition/multi-source-evidence/route.ts",
  ];
  for (const relativePath of runtimeFiles) {
    const text = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.doesNotMatch(text, /species-environment\/v3|wild-preferred-temperature-source-gap/i, relativePath);
  }
});

test("no numeric assessment, probability, ranking, weighting or product advice is enabled", () => {
  const boundaries = build().boundaries;
  assert.equal(boundaries.numericScoringAllowed, false);
  assert.equal(boundaries.normalization, "NORMALIZATION_NOT_JUSTIFIED");
  assert.equal(boundaries.weightingAllowed, false);
  assert.equal(boundaries.probabilityAllowed, false);
  assert.equal(boundaries.orderingAllowed, false);
  assert.equal(boundaries.productAdviceAllowed, false);
});

test("report generation is deterministic and saved output matches", () => {
  assert.deepEqual(build(), build());
  const saved = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const expected = build();
  expected.generatedAt = saved.generatedAt;
  assert.deepEqual(saved, expected);
});

test("building the audit cannot mutate any immutable input", () => {
  const before = Object.values(tool.INPUTS).map(([relativePath]) => hash(relativePath));
  build();
  const after = Object.values(tool.INPUTS).map(([relativePath]) => hash(relativePath));
  assert.deepEqual(after, before);
});

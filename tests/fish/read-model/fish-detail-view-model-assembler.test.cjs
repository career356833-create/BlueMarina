const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const Module = require("node:module");

const root = path.resolve(__dirname, "../../..");
const moduleCache = new Map();

function loadTs(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (moduleCache.has(absolutePath)) return moduleCache.get(absolutePath).exports;

  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const mod = new Module(absolutePath, module);
  moduleCache.set(absolutePath, mod);
  mod.filename = absolutePath;
  mod.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  const originalRequire = mod.require.bind(mod);
  mod.require = (request) => {
    if (request.startsWith("./") || request.startsWith("../")) {
      const resolved = path.resolve(path.dirname(absolutePath), request);
      if (fs.existsSync(`${resolved}.ts`)) return loadTs(path.relative(root, `${resolved}.ts`));
      if (fs.existsSync(path.join(resolved, "index.ts"))) return loadTs(path.relative(root, path.join(resolved, "index.ts")));
    }
    if (request.startsWith("@/")) {
      const resolved = path.resolve(root, "src", request.slice(2));
      if (fs.existsSync(`${resolved}.ts`)) return loadTs(path.relative(root, `${resolved}.ts`));
    }
    return originalRequire(request);
  };
  mod._compile(output, absolutePath);
  return mod.exports;
}

const assembler = loadTs("src/domain/fish/read-model/fish-detail-view-model-assembler.ts");
const regulationAdapter = loadTs("src/domain/fish-regulation/read-model/regulation-to-fish-detail-view-model.ts");
const nifsPreview = JSON.parse(fs.readFileSync(path.join(root, "reports", "nifs-fish-detail-read-model-preview.json"), "utf8"));

function getPreviewRecord(sourceId) {
  return nifsPreview.previewRecords.find((record) => record.sourceId === sourceId);
}

function buildBaseInput(record, regulationReadModel = { current: [], history: [], all: [] }) {
  return {
    candidateId: record.speciesCandidateId,
    sourceId: record.sourceId,
    identity: record.identity,
    officialFacts: record.officialFacts,
    taxonomy: record.taxonomy ?? null,
    sections: {
      morphology: record.morphology ?? null,
      morphologySummary: record.morphologySummary ?? null,
      morphologySourceStatus: record.morphologySourceStatus ?? undefined,
      morphologySourceText: record.morphologySourceText ?? null,
      distinguishingFeatures: record.distinguishingFeatures ?? null,
      featureSummary: record.featureSummary ?? null,
      featureSourceStatus: record.featureSourceStatus ?? undefined,
      featureSourceText: record.featureSourceText ?? null,
      habitat: record.habitat ?? null,
      habitatSourceStatus: record.habitat ? "present" : "source_missing",
      distribution: record.distribution ?? null,
      distributionSourceStatus: record.distribution ? "present" : "source_missing",
      ecology: record.ecology ?? null,
      ecologySourceStatus: record.ecology ? "present" : "source_missing",
      spawning: typeof record.spawning === "string" ? record.spawning : record.spawning?.text ?? null,
      spawningSourceStatus: record.spawning ? "present" : "source_missing",
      feeding: record.feeding ?? null,
      feedingSourceStatus: record.feeding ? "present" : "source_missing",
      size: record.size ?? null,
      season: record.quickFacts?.season ?? null,
      seasonSourceStatus: record.quickFacts?.seasonSourceStatus ?? undefined,
      seasonDisplayText: record.quickFacts?.seasonDisplayText ?? null,
      seasonFallbackText: record.quickFacts?.seasonFallbackText ?? null,
      quickFactsSummary: record.quickFacts?.summary ?? null,
    },
    fishingGuide: record.fishingGuide ?? { methods: [], tips: [], cautions: [] },
    foodNutrition: record.foodNutrition ?? null,
    aliases: record.aliases ?? [],
    displayCategories: [],
    categoryAssignments: [],
    regulationReadModel,
    media: record.media ?? [],
    relatedSpecies: [],
    generatedContents: [],
    officialSources: record.officialSources ?? [],
    reviewBadges: [],
  };
}

test("assembles current fish detail model with source-missing season and feeding", () => {
  const record = getPreviewRecord("fish_1576639605223");
  const preview = assembler.buildFishDetailViewModelAssemblyPreview(buildBaseInput(record));

  assert.equal(preview.readiness, "ready");
  assert.equal(preview.sectionStates.taxonomy.status, "source_missing");
  assert.equal(preview.sectionStates.feeding.status, "source_missing");
  assert.equal(preview.sectionStates.regulations.status, "empty");
  assert.equal(preview.viewModel.quickFacts.seasonSourceStatus, "source_missing");
  assert.equal(preview.viewModel.quickFacts.seasonDisplayText, "공식 제철 정보 없음");
});

test("separates current and history regulations in the assembly preview", () => {
  const regulationReadModel = regulationAdapter.buildFishDetailRegulationReadModels({
    speciesId: "species-1",
    rules: [
      {
        id: "rule-current",
        sourceRecordId: "source-1",
        sourceVersionId: "version-current",
        regulationType: "PROHIBITED_LENGTH",
        primarySpeciesId: "species-1",
        speciesIds: ["species-1"],
        region: "Jeju",
        waterArea: "South",
        fisheryType: "line",
        prohibitedLength: 24,
        exceptionConditions: [],
        legalBasis: "Official notice",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        factReviewStatus: "approved",
        publishStatus: "published",
        confidence: 0.91,
        version: 1,
      },
      {
        id: "rule-history",
        sourceRecordId: "source-1",
        sourceVersionId: "version-history",
        regulationType: "PROHIBITED_LENGTH",
        primarySpeciesId: "species-1",
        speciesIds: ["species-1"],
        region: "Jeju",
        waterArea: "South",
        fisheryType: "line",
        prohibitedLength: 30,
        exceptionConditions: [],
        legalBasis: "Official notice",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2025-12-31",
        factReviewStatus: "approved",
        publishStatus: "published",
        confidence: 0.88,
        version: 1,
      },
    ],
    activeVersions: [
      {
        versionId: "version-current",
        sourceRecordId: "source-1",
        documentVersion: "2026-01",
        revisionDate: "2026-01-01",
        effectiveFrom: "2026-01-01",
        sourceHash: "hash-current",
        status: "active",
      },
      {
        versionId: "version-history",
        sourceRecordId: "source-1",
        documentVersion: "2025-01",
        revisionDate: "2025-01-01",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2025-12-31",
        sourceHash: "hash-history",
        status: "expired",
      },
    ],
    sourceRecords: [
      {
        id: "source-1",
        sourceProvider: "MOF",
        sourceType: "NOTICE",
        documentName: "Official notice",
        documentUrl: "https://example.test/regulation",
        rawHash: "hash",
        collectedAt: "2026-08-01T00:00:00.000Z",
        parserVersion: "v1",
        crawlStatus: "success",
      },
    ],
  });

  const record = getPreviewRecord("fish_1573537097812");
  const preview = assembler.buildFishDetailViewModelAssemblyPreview(buildBaseInput(record, regulationReadModel));

  assert.equal(preview.sectionStates.regulations.status, "available");
  assert.equal(preview.regulationCounts.current, 1);
  assert.equal(preview.regulationCounts.history, 1);
  assert.equal(preview.viewModel.regulations.length, 1);
  assert.equal(preview.warnings.includes("regulations empty"), false);
});

test("keeps taxonomy null and media available for the current preview records", () => {
  const record = getPreviewRecord("fish_1575873437839");
  const preview = assembler.buildFishDetailViewModelAssemblyPreview(buildBaseInput(record));

  assert.equal(preview.viewModel.taxonomy, null);
  assert.equal(preview.sectionStates.media.status, "available");
  assert.equal(preview.sectionStates.sources.status, "available");
  assert.equal(preview.sectionStates.identity.status, "available");
  assert.equal(preview.sectionStates.officialFacts.status, "available");
});

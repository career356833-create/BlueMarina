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
  mod._compile(output, absolutePath);
  return mod.exports;
}

const serviceModule = loadTs("src/domain/fish/application/fish-detail-query-service.ts");

function makeFishSpecies(overrides = {}) {
  return {
    id: "fish-test-1",
    slug: "test-fish",
    koreanName: "테스트어",
    commonName: "Test Fish",
    englishName: "Test Fish",
    scientificName: "Testus fishus",
    taxonomy: {
      kingdom: "Animalia",
      phylum: "Chordata",
      class: "Actinopterygii",
    },
    morphology: "몸이 길다",
    morphologySourceStatus: "present",
    morphologySourceText: "몸이 길다",
    distinguishingFeatures: "지느러미가 길다",
    featureSourceStatus: "present",
    featureSourceText: "지느러미가 길다",
    habitat: "연안",
    distribution: "서해",
    ecology: "회유성",
    spawning: "산란기는 봄",
    feeding: "갑각류",
    size: "30cm",
    season: "봄",
    fishingMethods: ["낚시"],
    foodNutrition: "단백질",
    aliases: ["테스트"],
    officialSourceIds: [{ sourceProvider: "NIFS", sourceId: "fish-test-1" }],
    factReviewStatus: "approved",
    publishStatus: "published",
    version: 3,
    ...overrides,
  };
}

function makeViewModel(input) {
  return {
    identity: input.identity,
    taxonomy: input.taxonomy,
    officialFacts: input.officialFacts,
    quickFacts: {
      summary: input.sections.quickFactsSummary,
      season: input.sections.season,
      seasonSourceStatus: input.sections.seasonSourceStatus,
      seasonDisplayText: input.sections.seasonDisplayText,
      seasonFallbackText: input.sections.seasonFallbackText,
      habitat: input.sections.habitat,
      size: input.sections.size,
      fishingMethods: input.fishingGuide.methods,
    },
    morphology: input.sections.morphology,
    morphologySummary: input.sections.morphologySummary,
    morphologySourceStatus: input.sections.morphologySourceStatus,
    morphologySourceText: input.sections.morphologySourceText,
    distinguishingFeatures: input.sections.distinguishingFeatures,
    featureSummary: input.sections.featureSummary,
    featureSourceStatus: input.sections.featureSourceStatus,
    featureSourceText: input.sections.featureSourceText,
    habitat: input.sections.habitat,
    distribution: input.sections.distribution,
    ecology: input.sections.ecology,
    spawning: input.sections.spawning,
    feeding: input.sections.feeding,
    size: input.sections.size,
    season: input.sections.seasonDisplayText ?? input.sections.seasonFallbackText ?? undefined,
    fishingGuide: input.fishingGuide,
    foodNutrition: input.foodNutrition,
    aliases: input.aliases,
    displayCategories: input.displayCategories,
    categoryAssignments: input.categoryAssignments,
    regulations: input.regulationReadModel.current,
    media: input.media,
    relatedSpecies: input.relatedSpecies,
    generatedContents: input.generatedContents,
    officialSources: input.officialSources,
    reviewBadges: input.reviewBadges,
    publishMetadata: {
      factReviewStatus: input.officialFacts.factReviewStatus,
      publishStatus: input.officialFacts.publishStatus,
      version: input.officialFacts.version,
    },
    seoMetadata: {
      title: input.identity.displayName,
      description: input.identity.displayName,
      canonicalUrl: `/fish/${input.identity.slug}`,
    },
  };
}

test("resolves fish detail by slug and calls the assembler", async () => {
  const calls = [];
  const service = serviceModule.createFishDetailQueryService({
    speciesRepository: {
      findBySlug: async (slug) => {
        calls.push(["findBySlug", slug]);
        return makeFishSpecies();
      },
      findById: async (speciesId) => {
        calls.push(["findById", speciesId]);
        return null;
      },
      findPublished: async () => [],
      findSources: async () => [{ sourceProvider: "NIFS", sourceId: "fish-test-1", sourceUrl: "https://example.test/fish/1", fetchedAt: "2026-08-01T00:00:00.000Z", contentHash: "hash", parserVersion: "v1", crawlStatus: "success" }],
      findMedia: async () => [],
      findRelations: async () => [],
    },
    regulationRepository: {
      findActiveBySpeciesId: async (speciesId) => {
        calls.push(["findActiveBySpeciesId", speciesId]);
        return { rules: [], sourceRecords: [], activeVersions: [], allVersions: [] };
      },
      findHistoryBySpeciesId: async (speciesId) => {
        calls.push(["findHistoryBySpeciesId", speciesId]);
        return { rules: [], sourceRecords: [], activeVersions: [], allVersions: [] };
      },
    },
    projectRegulationReadModel: () => ({ current: [], history: [], all: [] }),
    assembleViewModel: (input) => {
      calls.push(["assembleViewModel", input.identity.slug]);
      return makeViewModel(input);
    },
  });

  const resolved = await service.resolve({ slug: "test-fish" });
  assert.ok(resolved);
  assert.deepEqual(calls[0], ["findBySlug", "test-fish"]);
  assert.equal(calls.some(([name]) => name === "findById"), false);
  assert.ok(calls.some(([name]) => name === "assembleViewModel"));
  assert.equal(resolved.viewModel.identity.slug, "test-fish");
  assert.equal(resolved.viewModel.quickFacts.seasonDisplayText, "봄");
  assert.equal(resolved.regulationReadModel.current.length, 0);
});

test("resolves fish detail by speciesId with empty media and regulations", async () => {
  const service = serviceModule.createFishDetailQueryService({
    speciesRepository: {
      findBySlug: async () => null,
      findById: async (speciesId) => makeFishSpecies({ id: speciesId, slug: "test-fish-id" }),
      findPublished: async () => [],
      findSources: async () => [],
      findMedia: async () => [],
      findRelations: async () => [],
    },
    regulationRepository: {
      findActiveBySpeciesId: async () => ({ rules: [], sourceRecords: [], activeVersions: [], allVersions: [] }),
      findHistoryBySpeciesId: async () => ({ rules: [], sourceRecords: [], activeVersions: [], allVersions: [] }),
    },
    projectRegulationReadModel: () => ({ current: [], history: [], all: [] }),
    assembleViewModel: (input) => makeViewModel(input),
  });

  const viewModel = await service.load({ speciesId: "species-123" });
  assert.ok(viewModel);
  assert.equal(viewModel.identity.slug, "test-fish-id");
  assert.equal(viewModel.media.length, 0);
  assert.equal(viewModel.regulations.length, 0);
  assert.equal(viewModel.officialSources.length, 0);
});

test("preserves source-missing fields in the assembler input", async () => {
  const service = serviceModule.createFishDetailQueryService({
    speciesRepository: {
      findBySlug: async () => makeFishSpecies({
        season: undefined,
        feeding: undefined,
        morphologySourceStatus: "source_missing",
        featureSourceStatus: "source_missing",
      }),
      findById: async () => null,
      findPublished: async () => [],
      findSources: async () => [{ sourceProvider: "NIFS", sourceId: "fish-test-1", sourceUrl: "https://example.test/fish/1", fetchedAt: "2026-08-01T00:00:00.000Z", contentHash: "hash", parserVersion: "v1", crawlStatus: "success" }],
      findMedia: async () => [],
      findRelations: async () => [],
    },
    regulationRepository: {
      findActiveBySpeciesId: async () => ({ rules: [], sourceRecords: [], activeVersions: [], allVersions: [] }),
      findHistoryBySpeciesId: async () => ({ rules: [], sourceRecords: [], activeVersions: [], allVersions: [] }),
    },
    projectRegulationReadModel: () => ({ current: [], history: [], all: [] }),
    assembleViewModel: (input) => makeViewModel(input),
  });

  const resolved = await service.resolve({ slug: "test-fish" });
  assert.ok(resolved);
  assert.equal(resolved.assemblerInput.sections.seasonSourceStatus, "source_missing");
  assert.equal(resolved.assemblerInput.sections.seasonFallbackText, "공식 제철 정보 없음");
  assert.equal(resolved.assemblerInput.sections.feedingSourceStatus, "source_missing");
  assert.equal(resolved.assemblerInput.sections.morphologySourceStatus, "source_missing");
  assert.equal(resolved.assemblerInput.sections.featureSourceStatus, "source_missing");
});

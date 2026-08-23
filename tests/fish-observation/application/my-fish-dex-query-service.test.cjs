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
    return originalRequire(request);
  };
  mod._compile(output, absolutePath);
  return mod.exports;
}

const serviceModule = loadTs("src/domain/fish-observation/application/my-fish-dex-query-service.ts");

function makeObservation(overrides = {}) {
  return {
    id: "obs-1",
    userId: "user-1",
    speciesId: "species-1",
    photoMediaId: "media-1",
    capturedAt: "2026-08-02T08:00:00.000Z",
    location: {
      lat: 35.1,
      lng: 129.1,
      accuracyMeters: 8,
      regionLabel: "Busan",
    },
    region: "Busan",
    fishingSpotId: "spot-1",
    marinePlaceId: "place-1",
    length: 42,
    weight: 2.1,
    notes: "private note",
    visibility: "private",
    locationPrivacy: "grid",
    isPersonalRecord: false,
    isAnonymous: false,
    moderationStatus: "approved",
    deletionStatus: "active",
    createdAt: "2026-08-02T08:10:00.000Z",
    ...overrides,
  };
}

function makeCollection(overrides = {}) {
  return {
    userId: "user-1",
    speciesId: "species-1",
    firstDiscoveredAt: "2026-08-02T08:00:00.000Z",
    discoveryCount: 1,
    regions: [{ region: "Busan", firstDiscoveredAt: "2026-08-02T08:00:00.000Z", latestDiscoveredAt: "2026-08-02T08:00:00.000Z", discoveryCount: 1 }],
    achievementStatus: "tracking",
    updatedAt: "2026-08-02T08:10:00.000Z",
    ...overrides,
  };
}

function makeSpecies(overrides = {}) {
  return {
    id: "species-1",
    slug: "flatfish",
    koreanName: "Flatfish",
    commonName: "Flatfish",
    englishName: "Flatfish",
    scientificName: "Paralichthys olivaceus",
    factReviewStatus: "approved",
    publishStatus: "published",
    version: 1,
    ...overrides,
  };
}

function makeService(overrides = {}) {
  const deps = {
    fishCollectionRepository: {
      findByUserId: async () => [makeCollection()],
      findSummaryByUserId: async () => ({ userId: "user-1", totalSpeciesCount: 1, totalObservationCount: 1, activeSpeciesCount: 1, achievementStatus: "tracking", updatedAt: "2026-08-02T08:10:00.000Z" }),
    },
    fishObservationRepository: {
      findByUserId: async () => [makeObservation()],
      findVerificationsByUserId: async () => [],
      findMediaByUserId: async () => [
        {
          id: "media-1",
          fishSpeciesId: "species-1",
          mediaType: "thumbnail",
          sourceUrl: "https://example.com/thumb.jpg",
          copyrightStatus: "verified",
          usageStatus: "ready",
          reviewStatus: "approved",
        },
      ],
      findLocationsByUserId: async () => [],
    },
    fishSpeciesRepository: {
      findPublished: async () => [makeSpecies()],
      findByIds: async () => [makeSpecies()],
      findBySlug: async () => makeSpecies(),
    },
    now: () => "2026-08-02T09:00:00.000Z",
    ...overrides,
  };
  return serviceModule.createMyFishDexQueryService(deps);
}

test("route query normalization keeps filter, sort, search, and region/season", () => {
  const normalized = serviceModule.normalizeMyFishDexRouteQuery({
    filter: "verified",
    sort: "alphabetical",
    search: "  flatfish  ",
    region: ["Busan"],
    season: "summer",
    page: "2",
  });

  assert.equal(normalized.activeFilter, "verified");
  assert.equal(normalized.activeSorting, "alphabetical");
  assert.equal(normalized.search, "flatfish");
  assert.equal(normalized.region, "Busan");
  assert.equal(normalized.season, "summer");
  assert.equal(normalized.page, 2);
});

test("unauthorized user resolves to an unauthorized page state", async () => {
  const service = makeService();
  const state = await service.getPageState({ userId: null, query: {} });
  assert.equal(state.kind, "unauthorized");
});

test("user data with verified records resolves to a success page state", async () => {
  const service = makeService({
    fishObservationRepository: {
      findByUserId: async () => [makeObservation()],
      findVerificationsByUserId: async () => [
        {
          observationId: "obs-1",
          selectedSpeciesId: "species-1",
          verificationType: "user_confirmed",
          verifiedBy: "user-1",
          verifiedAt: "2026-08-02T08:20:00.000Z",
          confidence: 0.95,
        },
      ],
      findMediaByUserId: async () => [
        {
          id: "media-1",
          fishSpeciesId: "species-1",
          mediaType: "thumbnail",
          sourceUrl: "https://example.com/thumb.jpg",
          copyrightStatus: "verified",
          usageStatus: "ready",
          reviewStatus: "approved",
        },
      ],
      findLocationsByUserId: async () => [],
    },
  });

  const state = await service.getPageState({
    userId: "user-1",
    query: { filter: "all", sort: "recent_discovery", search: "" },
  });

  assert.equal(state.kind, "success");
  assert.equal(state.viewModel.summary.discoveredCount, 1);
  assert.equal(state.viewModel.summary.verifiedCount, 1);
  assert.equal(state.viewModel.entries[0].status, "verified");
});

test("AI-only records stay out of discovery totals while the AI panel stays separate", async () => {
  const service = makeService({
    fishCollectionRepository: {
      findByUserId: async () => [],
      findSummaryByUserId: async () => null,
    },
    fishSpeciesRepository: {
      findPublished: async () => [],
      findByIds: async () => [],
      findBySlug: async () => null,
    },
    fishObservationRepository: {
      findByUserId: async () => [makeObservation({ speciesId: null })],
      findVerificationsByUserId: async () => [
        {
          observationId: "obs-1",
          selectedSpeciesId: "species-1",
          verificationType: "ai_only",
          verifiedAt: "2026-08-02T08:20:00.000Z",
          confidence: 0.88,
        },
      ],
      findMediaByUserId: async () => [],
      findLocationsByUserId: async () => [],
    },
  });

  const state = await service.getPageState({
    userId: "user-1",
    query: {},
    recentAiAnalyses: [
      {
        requestId: "req-ai",
        imagePreview: "https://example.com/ai.jpg",
        status: "completed",
        candidates: [{ speciesId: "species-1", speciesName: "Flatfish", confidence: 0.74, rank: 1 }],
        topCandidate: { speciesId: "species-1", speciesName: "Flatfish", confidence: 0.74, rank: 1 },
        warning: "Confirmation needed",
        canConfirm: true,
        canRetry: false,
      },
    ],
  });

  assert.equal(state.kind, "empty");
  assert.equal(state.emptyState.kind, "initial");
  assert.equal(state.viewModel.recentAiAnalyses.length, 1);
});

test("filter and sorting are forwarded into the page model", async () => {
  const service = makeService({
    fishObservationRepository: {
      findByUserId: async () => [makeObservation()],
      findVerificationsByUserId: async () => [
        {
          observationId: "obs-1",
          selectedSpeciesId: "species-1",
          verificationType: "user_confirmed",
          verifiedBy: "user-1",
          verifiedAt: "2026-08-02T08:20:00.000Z",
          confidence: 0.95,
        },
      ],
      findMediaByUserId: async () => [
        {
          id: "media-1",
          fishSpeciesId: "species-1",
          mediaType: "thumbnail",
          sourceUrl: "https://example.com/thumb.jpg",
          copyrightStatus: "verified",
          usageStatus: "ready",
          reviewStatus: "approved",
        },
      ],
      findLocationsByUserId: async () => [],
    },
  });

  const state = await service.getPageState({
    userId: "user-1",
    query: { filter: "verified", sort: "alphabetical", search: "flatfish" },
  });

  assert.equal(state.kind, "success");
  assert.equal(state.viewModel.filters.activeFilter, "verified");
  assert.equal(state.viewModel.filters.activeSorting, "alphabetical");
  assert.equal(state.viewModel.search.query, "flatfish");
});

test("public page data strips exact GPS, EXIF, and private memo fields", async () => {
  const service = makeService();
  const state = await service.getPageState({ userId: "user-1", query: {} });

  assert.equal(state.kind, "success");
  const discovery = state.viewModel.recentDiscoveries[0];
  assert.equal("location" in discovery, false);
  assert.equal("notes" in discovery, false);
  assert.equal("photoMediaId" in discovery, false);
});

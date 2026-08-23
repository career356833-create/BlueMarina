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

const pageModule = loadTs("src/domain/fish-observation/page-model/my-fish-dex-page-assembler.ts");

function makeBaseEntry(overrides = {}) {
  return {
    speciesId: "species-1",
    speciesName: "광어",
    thumbnail: "https://example.com/flatfish.jpg",
    discoveredAt: "2026-08-01T09:00:00.000Z",
    discoveryCount: 2,
    firstPhoto: null,
    latestPhoto: null,
    bestRecord: {
      observationId: "obs-1",
      capturedAt: "2026-08-01T09:00:00.000Z",
      length: 42,
      weight: 2.4,
      photo: null,
    },
    regions: [],
    seasons: [],
    rarity: "common",
    status: "discovered",
    verifiedAt: null,
    verificationType: null,
    regionSummary: "부산",
    seasonSummary: "여름",
    ...overrides,
  };
}

function makePageInput(overrides = {}) {
  return {
    userId: "user-1",
    baseSummary: {
      totalSpecies: 300,
      discoveredSpecies: 1,
      completionRate: 0.3,
    },
    entries: [makeBaseEntry()],
    achievements: [
      { id: "first_discovery", title: "첫 어종 발견", description: "첫 어종 발견", status: "earned", tone: "approved", progress: 100, target: 1, earnedAt: "2026-08-01T09:00:00.000Z" },
    ],
    recentDiscoveries: [
      { observationId: "obs-1", speciesId: "species-1", speciesName: "광어", capturedAt: "2026-08-01T09:00:00.000Z", thumbnail: "https://example.com/flatfish.jpg", status: "discovered" },
    ],
    recentAiAnalyses: [
      {
        requestId: "req-1",
        imagePreview: "https://example.com/photo.jpg",
        status: "awaiting_confirmation",
        candidates: [
          { speciesId: "species-1", speciesName: "광어", thumbnail: "https://example.com/flatfish.jpg", confidence: 0.91, rank: 1 },
        ],
        topCandidate: { speciesId: "species-1", speciesName: "광어", thumbnail: "https://example.com/flatfish.jpg", confidence: 0.91, rank: 1 },
        warning: "확인이 필요합니다.",
        canConfirm: true,
        canRetry: false,
      },
    ],
    activeFilter: "all",
    activeSorting: "recent_discovery",
    searchQuery: "",
    now: "2026-08-02T10:00:00.000Z",
    ...overrides,
  };
}

test("discovery zero shows initial empty state", () => {
  const viewModel = pageModule.buildMyFishDexPageViewModel(
    makePageInput({
      baseSummary: { totalSpecies: 300, discoveredSpecies: 0, completionRate: 0 },
      entries: [],
      recentDiscoveries: [],
      recentAiAnalyses: [],
    }),
  );

  assert.equal(viewModel.summary.discoveredCount, 0);
  assert.equal(viewModel.emptyState.kind, "initial");
  assert.equal(viewModel.emptyState.status, "empty");
  assert.equal(viewModel.entries.length, 0);
});

test("single verified species is reflected in summary and featured card", () => {
  const viewModel = pageModule.buildMyFishDexPageViewModel(
    makePageInput({
      baseSummary: { totalSpecies: 300, discoveredSpecies: 1, completionRate: 0.3 },
      entries: [makeBaseEntry({ status: "verified", verificationStatus: "user_confirmed", verifiedAt: "2026-08-01T09:30:00.000Z" })],
    }),
  );

  assert.equal(viewModel.summary.verifiedCount, 1);
  assert.equal(viewModel.featuredCollection?.status, "verified");
  assert.equal(viewModel.featuredCollection?.reason, "latest_verified");
  assert.equal(viewModel.emptyState.status, "hidden");
});

test("multiple species are sorted by the requested sort key", () => {
  const viewModel = pageModule.buildMyFishDexPageViewModel(
    makePageInput({
      entries: [
        makeBaseEntry({ speciesId: "species-a", speciesName: "우럭", discoveryCount: 5, discoveredAt: "2026-08-01T10:00:00.000Z", bestRecord: { observationId: "obs-a", capturedAt: "2026-08-01T10:00:00.000Z", length: 32, weight: 1.4, photo: null }, regionSummary: "통영", seasonSummary: "가을", status: "discovered" }),
        makeBaseEntry({ speciesId: "species-b", speciesName: "광어", discoveryCount: 2, discoveredAt: "2026-08-02T08:00:00.000Z", bestRecord: { observationId: "obs-b", capturedAt: "2026-08-02T08:00:00.000Z", length: 45, weight: 2.8, photo: null }, regionSummary: "부산", seasonSummary: "여름", status: "verified", verificationStatus: "expert_confirmed" }),
      ],
      baseSummary: { totalSpecies: 300, discoveredSpecies: 2, completionRate: 0.7 },
      activeSorting: "recent_discovery",
    }),
  );

  assert.equal(viewModel.entries[0].speciesId, "species-b");
  assert.equal(viewModel.entries[1].speciesId, "species-a");
  assert.equal(viewModel.filters.sorting.find((item) => item.active)?.key, "recent_discovery");
});

test("AI-only records do not count as discoveries and remain in the AI panel", () => {
  const viewModel = pageModule.buildMyFishDexPageViewModel(
    makePageInput({
      baseSummary: { totalSpecies: 300, discoveredSpecies: 0, completionRate: 0 },
      entries: [],
      recentDiscoveries: [],
      recentAiAnalyses: [
        {
          requestId: "req-ai",
          imagePreview: "https://example.com/ai.jpg",
          status: "completed",
          candidates: [
            { speciesId: "species-1", speciesName: "광어", confidence: 0.74, rank: 1 },
          ],
          topCandidate: { speciesId: "species-1", speciesName: "광어", confidence: 0.74, rank: 1 },
          warning: "사용자 확인이 필요합니다.",
          canConfirm: true,
          canRetry: false,
        },
      ],
    }),
  );

  assert.equal(viewModel.summary.discoveredCount, 0);
  assert.equal(viewModel.recentAiAnalyses.length, 1);
  assert.equal(viewModel.recentAiAnalyses[0].status, "completed");
});

test("filter and search contract expose the expected options", () => {
  const viewModel = pageModule.buildMyFishDexPageViewModel(
    makePageInput({
      searchQuery: "광어",
      activeFilter: "verified",
      activeSorting: "alphabetical",
    }),
  );

  assert.equal(viewModel.filters.activeFilter, "verified");
  assert.equal(viewModel.filters.filters.some((item) => item.key === "verified" && item.active), true);
  assert.equal(viewModel.filters.search.query, "광어");
  assert.equal(viewModel.filters.search.canSearchScientificName, true);
  assert.equal(viewModel.filters.sorting.some((item) => item.key === "alphabetical" && item.active), true);
});

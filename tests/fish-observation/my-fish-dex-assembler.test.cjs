const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const Module = require("node:module");

const root = path.resolve(__dirname, "../..");
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
      if (fs.existsSync(`${resolved}.tsx`)) return loadTs(path.relative(root, `${resolved}.tsx`));
      if (fs.existsSync(path.join(resolved, "index.ts"))) return loadTs(path.relative(root, path.join(resolved, "index.ts")));
    }
    return originalRequire(request);
  };
  mod._compile(output, absolutePath);
  return mod.exports;
}

const assemblerModule = loadTs("src/domain/fish-observation/read-model/my-fish-dex-assembler.ts");

function makeSpecies(overrides = {}) {
  return {
    id: "species-1",
    slug: "flatfish",
    koreanName: "광어",
    commonName: "Flatfish",
    englishName: "Flatfish",
    scientificName: "Paralichthys olivaceus",
    factReviewStatus: "approved",
    publishStatus: "published",
    version: 1,
    ...overrides,
  };
}

function makeObservation(overrides = {}) {
  return {
    id: "obs-1",
    userId: "user-1",
    speciesId: "species-1",
    photoMediaId: "media-1",
    capturedAt: "2026-08-01T10:00:00.000Z",
    location: { regionLabel: "부산", gridCode: "35.1,129.1" },
    region: "부산",
    fishingSpotId: "spot-1",
    marinePlaceId: "place-1",
    length: 40,
    weight: 1.2,
    notes: "first catch",
    visibility: "shared",
    locationPrivacy: "grid",
    isPersonalRecord: true,
    isAnonymous: false,
    moderationStatus: "approved",
    deletionStatus: "active",
    createdAt: "2026-08-01T10:05:00.000Z",
    ...overrides,
  };
}

function makeMedia(overrides = {}) {
  return {
    id: "media-1",
    fishSpeciesId: "species-1",
    mediaType: "image",
    sourceUrl: "https://example.test/photo-1.jpg",
    originType: "user_catch_photo",
    privacy: "private",
    copyrightStatus: "unknown",
    usageStatus: "ready",
    reviewStatus: "approved",
    imageHash: "hash-1",
    ...overrides,
  };
}

test("builds a verified dex entry with repeated catches and best record", () => {
  const viewModel = assemblerModule.buildMyFishDexViewModel({
    userId: "user-1",
    catalogSpeciesCount: 3,
    speciesCatalog: [makeSpecies(), makeSpecies({ id: "species-2", slug: "rockfish", koreanName: "우럭" }), makeSpecies({ id: "species-3", slug: "gizzard-shad", koreanName: "전어" })],
    observations: [
      makeObservation({ id: "obs-1", speciesId: "species-1", length: 40, weight: 1.2, capturedAt: "2026-08-01T10:00:00.000Z", region: "부산", photoMediaId: "media-1" }),
      makeObservation({ id: "obs-2", speciesId: "species-1", length: 55, weight: 2.1, capturedAt: "2026-08-02T10:00:00.000Z", region: "통영", photoMediaId: "media-2" }),
      makeObservation({ id: "obs-3", speciesId: "species-2", length: 25, weight: 0.4, capturedAt: "2026-07-15T10:00:00.000Z", region: "인천", photoMediaId: null }),
      makeObservation({ id: "obs-4", speciesId: "species-3", length: 0, weight: 0, capturedAt: "2026-07-01T10:00:00.000Z", region: "제주", photoMediaId: null, locationPrivacy: "hidden", visibility: "private" }),
    ],
    verifications: [
      { observationId: "obs-1", selectedSpeciesId: "species-1", verificationType: "user_confirmed", verifiedAt: "2026-08-01T11:00:00.000Z", confidence: 0.97 },
      { observationId: "obs-3", selectedSpeciesId: "species-2", verificationType: "ai_only", verifiedAt: "2026-07-15T12:00:00.000Z", confidence: 0.51 },
    ],
    collections: [
      {
        userId: "user-1",
        speciesId: "species-1",
        firstDiscoveredAt: "2026-08-01T10:00:00.000Z",
        discoveryCount: 2,
        firstObservationId: "obs-1",
        latestObservationId: "obs-2",
        firstPhotoId: "media-1",
        latestPhotoId: "media-2",
        firstLength: 40,
        bestLength: 55,
        bestWeight: 2.1,
        regions: [
          { region: "부산", count: 1, firstCaughtAt: "2026-08-01T10:00:00.000Z", latestCaughtAt: "2026-08-01T10:00:00.000Z" },
          { region: "통영", count: 1, firstCaughtAt: "2026-08-02T10:00:00.000Z", latestCaughtAt: "2026-08-02T10:00:00.000Z" },
        ],
        achievementStatus: "unlocked",
        updatedAt: "2026-08-02T10:00:00.000Z",
      },
      {
        userId: "user-1",
        speciesId: "species-2",
        firstDiscoveredAt: "2026-07-15T10:00:00.000Z",
        discoveryCount: 1,
        firstPhotoId: null,
        latestPhotoId: null,
        regions: [
          { region: "인천", count: 1, firstCaughtAt: "2026-07-15T10:00:00.000Z", latestCaughtAt: "2026-07-15T10:00:00.000Z" },
        ],
        achievementStatus: "tracking",
        updatedAt: "2026-07-15T10:00:00.000Z",
      },
    ],
    media: [makeMedia(), makeMedia({ id: "media-2", sourceUrl: "https://example.test/photo-2.jpg" })],
    favoriteSpeciesIds: ["species-1"],
    now: "2026-08-02T12:00:00.000Z",
  });

  assert.equal(viewModel.userId, "user-1");
  assert.equal(viewModel.summary.totalSpecies, 3);
  assert.equal(viewModel.summary.discoveredSpecies, 2);
  assert.equal(viewModel.summary.completionRate, 66.7);
  assert.equal(viewModel.entries.length, 3);
  assert.equal(viewModel.entries[0].speciesId, "species-1");
  assert.equal(viewModel.entries[0].status, "verified");
  assert.equal(viewModel.entries[0].discoveryCount, 2);
  assert.equal(viewModel.entries[0].bestRecord?.length, 55);
  assert.equal(viewModel.entries[0].bestRecord?.weight, 2.1);
  assert.equal(viewModel.entries[0].regions.length, 2);
  assert.equal(viewModel.entries[0].seasons.length > 0, true);
  assert.equal(viewModel.entries[1].status, "discovered");
  assert.equal(viewModel.entries[2].status, "locked");
  assert.equal(viewModel.favoriteSpecies.length, 1);
  assert.equal(viewModel.favoriteSpecies[0].speciesId, "species-1");
  assert.equal(viewModel.recentDiscoveries[0].speciesId, "species-1");
  assert.ok(viewModel.achievements.some((achievement) => achievement.id === "first_discovery"));
  assert.ok(viewModel.achievements.some((achievement) => achievement.id === "first_verified_species"));
});

test("keeps AI-only records locked and does not activate the dex", () => {
  const viewModel = assemblerModule.buildMyFishDexViewModel({
    userId: "user-1",
    catalogSpeciesCount: 1,
    speciesCatalog: [makeSpecies({ id: "species-2", slug: "rockfish", koreanName: "우럭" })],
    observations: [
      makeObservation({ id: "obs-ai", speciesId: "species-2", capturedAt: "2026-08-01T10:00:00.000Z", region: "제주", visibility: "private", locationPrivacy: "hidden" }),
    ],
    verifications: [
      { observationId: "obs-ai", selectedSpeciesId: "species-2", verificationType: "ai_only", verifiedAt: "2026-08-01T11:00:00.000Z", confidence: 0.4 },
    ],
    media: [],
    now: "2026-08-02T12:00:00.000Z",
  });

  assert.equal(viewModel.summary.discoveredSpecies, 0);
  assert.equal(viewModel.entries[0].status, "locked");
  assert.equal(viewModel.entries.length, 1);
  assert.equal(viewModel.recentDiscoveries.length, 0);
});

test("supports private locations without exposing coordinates", () => {
  const viewModel = assemblerModule.buildMyFishDexViewModel({
    userId: "user-1",
    catalogSpeciesCount: 1,
    speciesCatalog: [makeSpecies()],
    observations: [
      makeObservation({
        id: "obs-private",
        speciesId: "species-1",
        region: "부산",
        location: { lat: 35.1, lng: 129.1, gridCode: "35.1,129.1", regionLabel: "부산" },
        locationPrivacy: "hidden",
        visibility: "private",
        photoMediaId: null,
        capturedAt: "2026-08-01T10:00:00.000Z",
      }),
    ],
    verifications: [
      { observationId: "obs-private", selectedSpeciesId: "species-1", verificationType: "user_confirmed", verifiedAt: "2026-08-01T11:00:00.000Z", confidence: 0.9 },
    ],
    collections: [
      {
        userId: "user-1",
        speciesId: "species-1",
        firstDiscoveredAt: "2026-08-01T10:00:00.000Z",
        discoveryCount: 1,
        regions: [
          { region: "부산", count: 1, firstCaughtAt: "2026-08-01T10:00:00.000Z", latestCaughtAt: "2026-08-01T10:00:00.000Z" },
        ],
        achievementStatus: "unlocked",
        updatedAt: "2026-08-01T11:00:00.000Z",
      },
    ],
    media: [],
    now: "2026-08-02T12:00:00.000Z",
  });

  assert.equal(viewModel.entries[0].status, "verified");
  assert.equal(viewModel.entries[0].regions[0].regionId, "부산");
  assert.equal("lat" in viewModel.entries[0], false);
  assert.equal("lng" in viewModel.entries[0], false);
});

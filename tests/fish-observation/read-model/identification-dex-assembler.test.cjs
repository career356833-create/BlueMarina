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

const requestModule = loadTs("src/domain/fish-observation/identification/identification-request.ts");
const resultModule = loadTs("src/domain/fish-observation/identification/identification-result.ts");
const assemblerModule = loadTs("src/domain/fish-observation/read-model/fish-identification-dex-assembler.ts");

function makeRequest(overrides = {}) {
  return {
    ...requestModule.createIdentificationRequest({
    requestId: "req-1",
    userId: "user-1",
    imageMediaId: "media-1",
    imageHash: "hash-1",
    createdAt: "2026-08-02T10:00:00.000Z",
    observationId: "obs-1",
    provider: "openai",
    model: "gpt-vision",
    modelVersion: "2026-08",
    }),
    ...overrides,
  };
}

function makeResult(overrides = {}) {
  return {
    attemptId: "att-1",
    requestId: "req-1",
    provider: "openai",
    model: "gpt-vision",
    modelVersion: "2026-08",
    imageHash: "hash-1",
    candidates: [
      { speciesId: "species-1", confidence: 0.92, rank: 1, label: "광어", reason: "body shape" },
      { speciesId: "species-2", confidence: 0.73, rank: 2, label: "도다리", reason: "similar profile" },
    ],
    confidence: 0.92,
    latencyMs: 700,
    createdAt: "2026-08-02T10:00:30.000Z",
    reviewStatus: "approved",
    selectedSpeciesId: "species-1",
    selectedCandidateRank: 1,
    confirmedLabel: "광어",
    trainingEligible: true,
    ...overrides,
  };
}

const speciesCatalog = [
  { id: "species-1", speciesName: "광어", thumbnail: "https://example.com/hirame.jpg" },
  { id: "species-2", speciesName: "도다리", thumbnail: "https://example.com/flatfish.jpg" },
];

test("AI candidates only keep dex activation disabled", () => {
  const viewModel = assemblerModule.buildFishIdentificationDexViewModel({
    request: makeRequest({ status: "completed" }),
    result: makeResult({ selectedSpeciesId: null }),
    speciesCatalog,
  });

  assert.equal(viewModel.result.requestId, "req-1");
  assert.equal(viewModel.result.candidates.length, 2);
  assert.equal(viewModel.confirmation.status, "ai_only");
  assert.equal(viewModel.confirmation.canActivateDex, false);
  assert.equal(viewModel.myFishDex.newlyDiscovered, false);
});

test("user confirmation activates dex preview and marks discovery", () => {
  const verification = {
    observationId: "obs-1",
    selectedSpeciesId: "species-1",
    verificationType: "user_confirmed",
    verifiedBy: "user-1",
    verifiedAt: "2026-08-02T10:01:00.000Z",
    confidence: 0.94,
    note: "confirmed by user",
  };

  const viewModel = assemblerModule.buildFishIdentificationDexViewModel({
    request: makeRequest({ status: "completed" }),
    result: makeResult(),
    verification,
    speciesCatalog,
    collections: [],
    unlockedAchievements: [{ id: "first_discovery", title: "첫 어종 발견", description: "첫 어종 발견", status: "earned", tone: "approved", progress: 100, target: 1, earnedAt: "2026-08-02T10:01:00.000Z" }],
  });

  assert.equal(viewModel.confirmation.status, "user_confirmed");
  assert.equal(viewModel.confirmation.canActivateDex, true);
  assert.equal(viewModel.confirmation.newlyDiscovered, true);
  assert.equal(viewModel.myFishDex.newlyDiscovered, true);
  assert.equal(viewModel.myFishDex.achievementUnlocked, true);
  assert.equal(viewModel.myFishDex.speciesName, "광어");
});

test("expert confirmation maps to verified collection state", () => {
  const verification = {
    observationId: "obs-1",
    selectedSpeciesId: "species-2",
    verificationType: "expert_confirmed",
    verifiedBy: "expert-1",
    verifiedAt: "2026-08-02T10:02:00.000Z",
    confidence: 0.88,
    note: "expert approved",
  };

  const viewModel = assemblerModule.buildFishIdentificationDexViewModel({
    request: makeRequest({ status: "completed" }),
    result: makeResult({ selectedSpeciesId: "species-2" }),
    verification,
    speciesCatalog,
    collections: [
      {
        userId: "user-1",
        speciesId: "species-2",
        firstDiscoveredAt: "2026-07-31T08:00:00.000Z",
        discoveryCount: 3,
        regions: [],
        achievementStatus: "completed",
        updatedAt: "2026-08-02T10:02:00.000Z",
      },
    ],
  });

  assert.equal(viewModel.confirmation.status, "expert_confirmed");
  assert.equal(viewModel.confirmation.collectionStatus, "completed");
  assert.equal(viewModel.confirmation.newlyDiscovered, false);
  assert.equal(viewModel.myFishDex.collectionStatus, "completed");
});

test("low confidence result warns while keeping confirmation available only after user action", () => {
  const lowConfidenceResult = makeResult({
    confidence: 0.29,
    candidates: [{ speciesId: "species-1", confidence: 0.29, rank: 1, label: "광어", reason: "uncertain" }],
    selectedSpeciesId: null,
    reviewStatus: "reviewed",
  });

  const viewModel = assemblerModule.buildFishIdentificationDexViewModel({
    request: makeRequest({ status: "completed" }),
    result: lowConfidenceResult,
    speciesCatalog,
  });

  assert.equal(viewModel.result.warningCodes.includes("low_confidence"), true);
  assert.equal(viewModel.result.canConfirm, true);
  assert.equal(viewModel.result.status, "awaiting_confirmation");
});

test("no candidates keeps the pipeline safe and retryable when request failed", () => {
  const failedRequest = requestModule.failIdentificationRequest(makeRequest(), "api_failure", "2026-08-02T10:03:00.000Z", "timeout");
  const viewModel = assemblerModule.buildFishIdentificationDexViewModel({
    request: failedRequest,
    result: resultModule.buildFishIdentificationFailure({
      requestId: failedRequest.requestId,
      failureReason: "api_failure",
      retryable: true,
      reportedAt: "2026-08-02T10:03:00.000Z",
    }),
    speciesCatalog,
  });

  assert.equal(viewModel.result.canRetry, true);
  assert.equal(viewModel.result.warningCodes.includes("failed"), true);
  assert.equal(viewModel.confirmation.canActivateDex, false);
});

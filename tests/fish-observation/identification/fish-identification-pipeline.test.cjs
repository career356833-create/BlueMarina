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
const pipelineModule = loadTs("src/domain/fish-observation/identification/identification-pipeline.ts");

function makeRequest(overrides = {}) {
  return requestModule.createIdentificationRequest({
    requestId: "req-1",
    userId: "user-1",
    imageMediaId: "media-1",
    imageHash: "hash-1",
    createdAt: "2026-08-02T10:00:00.000Z",
    observationId: "obs-1",
    maxRetries: 2,
    costBudgetUsd: 0.4,
    provider: "openai",
    model: "gpt-vision",
    modelVersion: "2026-08",
    ...overrides,
  });
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
      { speciesId: "species-1", confidence: 0.91, rank: 1, label: "광어", reason: "shape match" },
      { speciesId: "species-2", confidence: 0.76, rank: 2, label: "넙치", reason: "similar body" },
    ],
    confidence: 0.91,
    latencyMs: 820,
    costMetadata: {
      promptTokens: 1200,
      completionTokens: 120,
      totalTokens: 1320,
      estimatedCostUsd: 0.018,
      currency: "USD",
    },
    createdAt: "2026-08-02T10:00:30.000Z",
    reviewStatus: "approved",
    selectedSpeciesId: "species-1",
    selectedCandidateRank: 1,
    confirmedLabel: "광어",
    trainingEligible: true,
    ...overrides,
  };
}

test("success flow reaches observation link after user confirmation", () => {
  const request = requestModule.markIdentificationRequestProcessing(makeRequest(), "2026-08-02T10:00:10.000Z");
  const completedRequest = requestModule.completeIdentificationRequest(request, "att-1", "2026-08-02T10:00:30.000Z");
  const result = makeResult();
  const verification = {
    observationId: "obs-1",
    selectedSpeciesId: "species-1",
    verificationType: "user_confirmed",
    verifiedBy: "user-1",
    verifiedAt: "2026-08-02T10:01:00.000Z",
    confidence: 0.93,
    note: "confirmed by user",
  };

  const viewModel = pipelineModule.buildFishIdentificationPipelineViewModel({
    request: completedRequest,
    result,
    verification,
    minimumConfidenceToAutoLink: 0.7,
  });

  assert.equal(viewModel.requestStatus, "completed");
  assert.equal(viewModel.readyForCollection, true);
  assert.equal(viewModel.canRetry, false);
  assert.equal(viewModel.link?.selectedSpeciesId, "species-1");
  assert.equal(viewModel.link?.verificationType, "user_confirmed");
  assert.equal(viewModel.warnings.includes("awaiting_user_confirmation"), false);
});

test("empty candidate result stays blocked and warns about no candidates", () => {
  const request = requestModule.completeIdentificationRequest(makeRequest(), "att-empty", "2026-08-02T10:00:20.000Z");
  const viewModel = pipelineModule.buildFishIdentificationPipelineViewModel({
    request,
    result: makeResult({ attemptId: "att-empty", candidates: [], confidence: 0, selectedSpeciesId: null, reviewStatus: "rejected" }),
    minimumConfidenceToAutoLink: 0.7,
  });

  assert.equal(viewModel.readyForCollection, false);
  assert.equal(viewModel.warnings.includes("no_candidates"), true);
  assert.equal(viewModel.link, null);
});

test("low confidence keeps the pipeline from auto-linking until confirmation", () => {
  const request = requestModule.completeIdentificationRequest(makeRequest(), "att-low", "2026-08-02T10:00:20.000Z");
  const result = makeResult({
    attemptId: "att-low",
    confidence: 0.31,
    candidates: [
      { speciesId: "species-1", confidence: 0.31, rank: 1, label: "광어", reason: "uncertain" },
    ],
    selectedSpeciesId: null,
    reviewStatus: "reviewed",
  });

  const viewModel = pipelineModule.buildFishIdentificationPipelineViewModel({
    request,
    result,
    minimumConfidenceToAutoLink: 0.7,
  });

  assert.equal(viewModel.readyForCollection, false);
  assert.equal(viewModel.warnings.includes("low_confidence"), true);
  assert.equal(viewModel.warnings.includes("awaiting_user_confirmation"), true);
});

test("user correction selects a different species and still links the observation", () => {
  const request = requestModule.completeIdentificationRequest(makeRequest(), "att-correct", "2026-08-02T10:00:20.000Z");
  const result = makeResult({
    attemptId: "att-correct",
    selectedSpeciesId: "species-2",
    selectedCandidateRank: 2,
    reviewStatus: "approved",
  });
  const verification = {
    observationId: "obs-1",
    selectedSpeciesId: "species-2",
    verificationType: "user_confirmed",
    verifiedBy: "user-1",
    verifiedAt: "2026-08-02T10:02:00.000Z",
    confidence: 0.86,
    note: "user corrected the candidate",
  };

  const viewModel = pipelineModule.buildFishIdentificationPipelineViewModel({
    request,
    result,
    verification,
    minimumConfidenceToAutoLink: 0.7,
  });

  assert.equal(viewModel.readyForCollection, true);
  assert.equal(viewModel.link?.selectedSpeciesId, "species-2");
  assert.equal(viewModel.link?.verificationType, "user_confirmed");
});

test("retrying a failed request keeps state deterministic", () => {
  const failed = requestModule.failIdentificationRequest(makeRequest(), "api_failure", "2026-08-02T10:00:20.000Z", "timeout");
  const retried = requestModule.retryIdentificationRequest(failed, "2026-08-02T10:02:00.000Z");

  assert.equal(failed.status, "failed");
  assert.equal(failed.failureReason, "api_failure");
  assert.equal(retried.status, "queued");
  assert.equal(retried.retryCount, 1);
  assert.equal(retried.failureReason, "retry_scheduled");

  const retryState = pipelineModule.buildFishIdentificationRetryState(retried, "api_failure", "2026-08-02T10:02:00.000Z");
  assert.equal(retryState.retryable, true);
});

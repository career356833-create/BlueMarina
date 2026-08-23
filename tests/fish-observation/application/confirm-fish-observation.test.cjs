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

const contract = loadTs("src/domain/fish-observation/application/confirm-fish-observation.ts");

function baseSnapshot(overrides = {}) {
  return {
    observation: {
      id: "obs-1",
      userId: "user-1",
      speciesId: null,
      photoMediaId: "media-1",
      moderationStatus: "approved",
      deletionStatus: "active",
      createdAt: "2026-08-02T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
    },
    selectedSpecies: {
      id: "species-1",
      factReviewStatus: "approved",
      publishStatus: "published",
      version: 1,
    },
    candidateSpeciesIds: ["species-1", "species-2"],
    existingVerification: null,
    collectionEntry: null,
    mediaDeleted: false,
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    observationId: "obs-1",
    selectedSpeciesId: "species-1",
    verificationType: "user_confirmed",
    verifiedBy: "user-1",
    actorRole: "user",
    actorUserId: "user-1",
    now: "2026-08-02T10:05:00.000Z",
    ...overrides,
  };
}

test("builds an apply plan with the full atomic sequence", () => {
  const plan = contract.buildConfirmFishObservationPlan(baseInput(), baseSnapshot());

  assert.equal(plan.mode, "apply");
  assert.equal(plan.idempotencyKey, "obs-1:species-1:user_confirmed:user-1:user");
  assert.equal(plan.steps.length, 6);
  assert.equal(plan.steps[0].kind, "insert_verification");
  assert.equal(plan.steps[3].kind, "upsert_collection");
  assert.equal(plan.collectionPolicy.strategy, "insert_or_increment");
  assert.equal(plan.achievementEvent?.achievementType, "fish_observation_confirmed");
});

test("treats an identical repeat confirmation as noop", () => {
  const existingVerification = {
    observationId: "obs-1",
    selectedSpeciesId: "species-1",
    verificationType: "user_confirmed",
    verifiedBy: "user-1",
    verifiedAt: "2026-08-02T10:04:00.000Z",
    confidence: 0.94,
    note: "confirmed",
  };
  const plan = contract.buildConfirmFishObservationPlan(baseInput(), baseSnapshot({ existingVerification }));

  assert.equal(plan.mode, "noop");
  assert.equal(plan.steps.every((step) => step.skipped === true), true);
  assert.equal(plan.blockReasons.length, 0);
});

test("blocks confirmation when the actor does not own the observation", () => {
  const plan = contract.buildConfirmFishObservationPlan(
    baseInput({ actorUserId: "user-2" }),
    baseSnapshot(),
  );

  assert.equal(plan.mode, "blocked");
  assert.equal(plan.blockReasons.includes("not_authorized"), true);
});

test("blocks archived species and candidate mismatches", () => {
  const plan = contract.buildConfirmFishObservationPlan(
    baseInput({ selectedSpeciesId: "species-3" }),
    baseSnapshot({
      selectedSpecies: {
        id: "species-3",
        factReviewStatus: "approved",
        publishStatus: "archived",
        version: 3,
      },
      candidateSpeciesIds: ["species-1", "species-2"],
    }),
  );

  assert.equal(plan.mode, "blocked");
  assert.equal(plan.blockReasons.includes("candidate_mismatch"), true);
  assert.equal(plan.blockReasons.includes("species_archived"), true);
});

test("allows admin override while keeping deleted media as a warning", () => {
  const plan = contract.buildConfirmFishObservationPlan(
    baseInput({
      actorRole: "admin",
      verifiedBy: "admin-1",
      verificationType: "expert_confirmed",
    }),
    baseSnapshot({
      mediaDeleted: true,
      existingVerification: {
        observationId: "obs-1",
        selectedSpeciesId: "species-2",
        verificationType: "user_confirmed",
        verifiedBy: "user-9",
        verifiedAt: "2026-08-02T10:02:00.000Z",
        confidence: 0.81,
      },
    }),
  );

  assert.equal(plan.mode, "apply");
  assert.equal(plan.warnings.includes("deleted_media_detected"), true);
  assert.equal(plan.warnings.includes("admin_override_replaces_existing_verification"), true);
  assert.equal(plan.steps[0].note?.includes("Admin override"), true);
});

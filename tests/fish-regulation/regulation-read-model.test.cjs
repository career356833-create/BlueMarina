const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..", "..");
const moduleCache = new Map();

function loadTs(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (moduleCache.has(absolutePath)) return moduleCache.get(absolutePath).exports;

  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
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

const adapter = loadTs("src/domain/fish-regulation/read-model/regulation-to-fish-detail-view-model.ts");

function baseRule(overrides = {}) {
  return {
    id: "rule-1",
    sourceRecordId: "source-1",
    sourceVersionId: "version-1",
    regulationType: "PROHIBITED_LENGTH",
    primarySpeciesId: "species-1",
    speciesIds: ["species-1"],
    region: "Jeju",
    waterArea: "East coast",
    fisheryType: "mixed",
    closedSeason: null,
    prohibitedLength: 24,
    prohibitedWeight: null,
    exceptionConditions: [],
    legalBasis: "Official notice",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    factReviewStatus: "approved",
    publishStatus: "published",
    confidence: 0.91,
    version: 1,
    note: null,
    ...overrides,
  };
}

const sourceRecords = [
  {
    id: "source-1",
    sourceProvider: "MOF",
    sourceType: "NOTICE",
    documentName: "Notice of minimum length",
    documentUrl: "https://example.test/regulation/1",
    rawHash: "hash-1",
    collectedAt: "2026-08-01T00:00:00.000Z",
    parserVersion: "v1",
    crawlStatus: "success",
  },
];

const activeVersions = [
  {
    versionId: "version-1",
    sourceId: "source-1",
    documentVersion: "2026-01",
    revisionDate: "2026-01-01",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    sourceHash: "version-hash-1",
    status: "active",
  },
];

test("projects active rule into the fish detail read model", () => {
  const result = adapter.buildFishDetailRegulationReadModels({
    speciesId: "species-1",
    rules: [baseRule()],
    activeVersions,
    sourceRecords,
  });

  assert.equal(result.current.length, 1);
  assert.equal(result.history.length, 0);
  assert.equal(result.current[0].sourceName, "Notice of minimum length");
  assert.equal(result.current[0].sourceUrl, "https://example.test/regulation/1");
  assert.equal(result.current[0].sourceVersionId, "version-1");
  assert.equal(result.current[0].historyAvailable, false);
  assert.equal(result.current[0].visibility, "current");
  assert.equal(result.current[0].summary.includes("prohibitedLength: 24"), true);
});

test("marks low-confidence published rules as warning instead of current", () => {
  const result = adapter.buildFishDetailRegulationReadModels({
    speciesId: "species-1",
    rules: [baseRule({ confidence: 0.42 })],
    activeVersions,
    sourceRecords,
  });

  assert.equal(result.current.length, 1);
  assert.equal(result.current[0].visibility, "warning");
  assert.equal(result.current[0].confidence, 0.42);
});

test("separates expired rules into history and excludes archived rules", () => {
  const result = adapter.buildFishDetailRegulationReadModels({
    speciesId: "species-1",
    rules: [
      baseRule(),
      baseRule({
        id: "rule-2",
        sourceVersionId: "version-2",
        publishStatus: "published",
        confidence: 0.88,
      }),
      baseRule({
        id: "rule-3",
        sourceVersionId: "version-3",
        publishStatus: "archived",
        confidence: 0.9,
      }),
    ],
    activeVersions: [
      ...activeVersions,
      {
        versionId: "version-2",
        sourceId: "source-1",
        documentVersion: "2025-01",
        revisionDate: "2025-01-01",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2025-12-31",
        sourceHash: "version-hash-2",
        status: "expired",
      },
      {
        versionId: "version-3",
        sourceId: "source-1",
        documentVersion: "2024-01",
        revisionDate: "2024-01-01",
        effectiveFrom: "2024-01-01",
        effectiveTo: "2024-12-31",
        sourceHash: "version-hash-3",
        status: "archived",
      },
    ],
    sourceRecords,
    includeHistory: true,
  });

  assert.equal(result.all.length, 2);
  assert.equal(result.history.length, 1);
  assert.equal(result.history[0].sourceVersionStatus, "expired");
  assert.equal(result.all.some((item) => item.sourceVersionId === "version-3"), false);
});

test("projects multiple regional rules and keeps source-missing records visible with warnings", () => {
  const result = adapter.buildFishDetailRegulationReadModels({
    speciesId: "species-1",
    rules: [
      baseRule({ id: "rule-1", region: "Jeju", waterArea: "South", fisheryType: "line", confidence: 0.9 }),
      baseRule({
        id: "rule-2",
        sourceRecordId: "source-2",
        sourceVersionId: "version-2",
        region: "Busan",
        waterArea: "Harbor",
        fisheryType: "net",
        confidence: 0.55,
      }),
    ],
    activeVersions: [
      ...activeVersions,
      {
        versionId: "version-2",
        sourceId: "source-2",
        documentVersion: "2026-02",
        revisionDate: "2026-02-01",
        effectiveFrom: "2026-02-01",
        sourceHash: "version-hash-2",
        status: "active",
      },
    ],
    sourceRecords,
  });

  assert.equal(result.current.length, 2);
  assert.equal(result.current[1].sourceMissing, true);
  assert.equal(result.current[1].visibility, "warning");
  assert.equal(result.current[1].sourceName, "Official notice");
});

test("projects to the legacy FishDetailViewModel regulations shape", () => {
  const projected = adapter.projectFishDetailRegulations({
    speciesId: "species-1",
    rules: [baseRule()],
    activeVersions,
    sourceRecords,
  });

  assert.equal(projected.length, 1);
  assert.equal(projected[0].title, "minimum size rule");
  assert.equal(projected[0].sourceVersionId, "version-1");
  assert.equal(projected[0].historyAvailable, false);
  assert.equal(projected[0].visibility, "current");
});

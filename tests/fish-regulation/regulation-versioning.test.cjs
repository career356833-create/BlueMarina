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
    if (request.startsWith("@/")) {
      const resolved = path.resolve(root, "src", request.slice(2));
      if (fs.existsSync(`${resolved}.ts`)) return loadTs(path.relative(root, `${resolved}.ts`));
    }
    return originalRequire(request);
  };
  mod._compile(output, absolutePath);
  return mod.exports;
}

const versioning = loadTs("src/domain/fish-regulation/knowledge/versioning/index.ts");
const ingestion = loadTs("src/domain/fish-regulation/knowledge-ingestion/index.ts");

function candidate(overrides = {}) {
  return {
    candidateId: "candidate:flounder:length",
    sourceId: "source:flounder",
    speciesId: "paralichthys-olivaceus",
    statement: "광어의 금지체장은 24cm 미만이다.",
    regulationType: "PROHIBITED_LENGTH",
    waterArea: "전국/전해역",
    fisheryType: "연근해",
    prohibitedLength: { operator: "LESS_THAN", value: 24, unit: "cm", raw: "24cm 미만" },
    exceptionConditions: ["지역별 상이 가능"],
    sourceLocator: "수산자원관리법 시행령 별표",
    confidence: 0,
    reviewStatus: "needs_fact_check",
    ...overrides
  };
}

test("creates and activates source versions without mutating existing state", () => {
  const initial = { versions: [] };
  const withDraft = versioning.createVersion(initial, {
    sourceId: "source:flounder",
    documentVersion: "2026-01",
    revisionDate: "2026-01-01",
    effectiveFrom: "2026-01-01",
    sourceLocator: { documentName: "수산자원관리법 시행령", table: "별표", page: 12 },
    content: "v1"
  });
  const active = versioning.activateVersion(withDraft, withDraft.versions[0].versionId);

  assert.equal(initial.versions.length, 0);
  assert.equal(active.versions[0].status, "active");
  assert.equal(versioning.getActiveVersion(active, "source:flounder").versionId, active.versions[0].versionId);
});

test("validates locator specificity", () => {
  const weak = versioning.validateRegulationSourceLocator({ documentName: "해양수산부 고시" });
  const strong = versioning.validateRegulationSourceLocator({ documentName: "수산자원관리법 시행령", article: "제6조", table: "별표", page: 12 });

  assert.equal(weak.valid, false);
  assert.equal(strong.valid, true);
  assert.ok(strong.completenessScore > weak.completenessScore);
});

test("detects high-severity regulation diffs", () => {
  const previous = candidate();
  const next = candidate({
    prohibitedLength: { operator: "LESS_THAN", value: 35, unit: "cm", raw: "35cm 미만" },
    statement: "광어의 금지체장은 35cm 미만이다."
  });
  const diff = versioning.diffRegulationCandidates(previous, next);

  assert.equal(diff.severity, "HIGH");
  assert.deepEqual(diff.changed, ["prohibitedLength"]);
});

test("creates change event, impact report, and version review queue", () => {
  const previous = candidate();
  const next = candidate({ closedSeason: { type: "closed_season", start: "12-01", end: "02-28", raw: "12월 1일부터 2월 28일까지" } });
  const diff = versioning.diffRegulationCandidates(previous, next);
  const event = versioning.createRegulationChangeEvent({
    sourceId: "source:flounder",
    previousVersionId: "v1",
    nextVersionId: "v2",
    changeType: "UPDATED",
    changedFields: diff.changed,
    detectedAt: "2026-08-02"
  });
  const impact = versioning.analyzeRegulationImpact({ previous, next, diff });
  const queue = versioning.buildRegulationVersionReviewQueue([{ event, diff }]);

  assert.equal(event.changeType, "UPDATED");
  assert.deepEqual(impact.affectedSpecies, ["paralichthys-olivaceus"]);
  assert.equal(queue[0].diff.severity, "HIGH");
});

test("confidence scorer accepts version and locator signals", () => {
  const source = {
    sourceId: "source:flounder",
    sourceType: "NOTICE",
    title: "수산자원관리 고시",
    issuingAuthority: "해양수산부",
    sourceUrl: "https://example.test",
    sourceLocator: "해양수산부 고시",
    collectedAt: "2026-08-02"
  };
  const sourceVersion = versioning.createRegulationSourceVersion({
    sourceId: source.sourceId,
    documentVersion: "2026-01",
    revisionDate: "2026-01-01",
    effectiveFrom: "2026-01-01",
    status: "active",
    sourceLocator: { documentName: "수산자원관리법 시행령", table: "별표", page: 12 },
    content: "versioned source"
  });
  const target = candidate();
  const validation = ingestion.validateRegulationCandidate(target);
  const confidence = ingestion.scoreRegulationConfidence({
    source,
    candidate: target,
    validation,
    speciesMatches: [{ speciesId: target.speciesId, candidateId: target.candidateId, matchScore: 1, matchReason: "speciesId exact match" }],
    sourceVersion,
    locator: sourceVersion.sourceLocator,
    asOfDate: "2026-08-02"
  });

  assert.ok(confidence > 0.7);
});

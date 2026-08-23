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
      if (fs.existsSync(path.join(resolved, "index.ts"))) return loadTs(path.relative(root, path.join(resolved, "index.ts")));
    }
    return originalRequire(request);
  };
  mod._compile(output, absolutePath);
  return mod.exports;
}

const ingestion = loadTs("src/domain/fish-regulation/knowledge-ingestion/index.ts");

function sampleRegulation(overrides = {}) {
  return {
    id: "regulation-japanese-flounder",
    slug: "japanese-flounder-regulation",
    title: "광어",
    summary: "광어 금어기와 금지체장 안내. 지역별 상이 가능.",
    body: "광어는 12월 1일부터 2월 28일까지 금어기이며 24cm 미만은 포획할 수 없다. 지역별 상이 가능.",
    category: "fishing-regulation",
    sourceName: "수산자원관리 관련 안내",
    sourceUrl: "https://example.test/regulation",
    sourceCheckedAt: "2026-08-02",
    reviewStatus: "needs_fact_check",
    published: false,
    speciesId: "paralichthys-olivaceus",
    region: "전해역",
    prohibitedLength: "24cm 미만",
    closedSeason: "12월 1일부터 2월 28일까지",
    legalBasis: "수산자원관리법 관련 고시",
    ...overrides
  };
}

test("normalizes Korean closed season and prohibited length", () => {
  assert.deepEqual(ingestion.normalizeClosedSeason("5월 1일부터 6월 30일까지"), {
    type: "closed_season",
    start: "05-01",
    end: "06-30",
    raw: "5월 1일부터 6월 30일까지"
  });
  assert.deepEqual(ingestion.normalizeMeasurement("30cm 이하"), {
    operator: "LESS_EQUAL",
    value: 30,
    unit: "cm",
    raw: "30cm 이하"
  });
});

test("extracts candidates from existing FishingRegulation without mutating it", () => {
  const regulation = sampleRegulation();
  const before = JSON.stringify(regulation);
  const source = ingestion.sourceFromFishingRegulation(regulation);
  const result = ingestion.extractRegulationCandidates(source, regulation);

  assert.equal(JSON.stringify(regulation), before);
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map((candidate) => candidate.regulationType).sort(), ["CLOSED_SEASON", "PROHIBITED_LENGTH"]);
  assert.ok(result.candidates.every((candidate) => candidate.reviewStatus === "needs_fact_check"));
});

test("maps candidates to FishSpecies-like records by speciesId", () => {
  const regulation = sampleRegulation();
  const source = ingestion.sourceFromFishingRegulation(regulation);
  const [candidate] = ingestion.extractRegulationCandidates(source, regulation).candidates;
  const matches = ingestion.mapCandidateToSpecies(candidate, [
    { id: "paralichthys-olivaceus", koreanName: "광어", scientificName: "Paralichthys olivaceus", aliases: [] },
    { id: "sebastes-koreanus", koreanName: "우럭", scientificName: "Sebastes schlegelii", aliases: [] }
  ]);

  assert.equal(matches[0].speciesId, "paralichthys-olivaceus");
  assert.ok(matches[0].matchScore >= 0.85);
});

test("validates missing locator or species as high risk", () => {
  const source = ingestion.sourceFromFishingRegulation(sampleRegulation({ legalBasis: undefined }));
  const [candidate] = ingestion.extractRegulationCandidates(source, sampleRegulation({ speciesId: undefined, legalBasis: undefined })).candidates;
  const validation = ingestion.validateRegulationCandidate(candidate);

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === "SOURCE_LOCATOR_MISSING"));
  assert.ok(validation.issues.some((issue) => issue.code === "SPECIES_UNKNOWN"));
});

test("scores confidence and builds low-confidence review queue", () => {
  const regulation = sampleRegulation();
  const source = ingestion.sourceFromFishingRegulation(regulation);
  const result = ingestion.extractRegulationCandidates(source, regulation);
  const species = [{ id: "paralichthys-olivaceus", koreanName: "광어", scientificName: "Paralichthys olivaceus", aliases: [] }];
  const items = result.candidates.map((candidate, index) => {
    const speciesMatches = ingestion.mapCandidateToSpecies(candidate, species);
    const validation = result.validationResults[index];
    const confidence = ingestion.scoreRegulationConfidence({ source, candidate, speciesMatches, validation });
    return { candidate, speciesMatches, validation, confidence };
  });
  const queue = ingestion.buildRegulationReviewQueue(items);

  assert.equal(queue.length, 2);
  assert.ok(queue.every((item) => item.priority > 0));
  assert.ok(queue.every((item) => item.reviewReason.includes("confidence=")));
});

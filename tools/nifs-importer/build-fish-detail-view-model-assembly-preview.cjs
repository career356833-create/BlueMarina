"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { createRequire } = require("node:module");

const ROOT = process.cwd();
const INPUT_PATH = path.join(ROOT, "reports/nifs-fish-detail-read-model-preview.json");
const OUT_JSON = path.join(ROOT, "reports/fish-detail-view-model-assembly-preview.json");
const OUT_MD = path.join(ROOT, "reports/fish-detail-view-model-assembly-preview.md");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function resolveLocalImport(fromFile, request) {
  const basePath = path.resolve(path.dirname(fromFile), request);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function loadTsModule(filePath, cache = new Map()) {
  const resolved = path.resolve(filePath);
  if (cache.has(resolved)) return cache.get(resolved).exports;

  const source = fs.readFileSync(resolved, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: resolved,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      resolveJsonModule: true,
      skipLibCheck: true,
      isolatedModules: true,
    },
  });

  const mod = { exports: {} };
  cache.set(resolved, mod);
  const nativeRequire = createRequire(resolved);

  function localRequire(request) {
    if (request.startsWith(".") || request.startsWith("..")) {
      const candidate = resolveLocalImport(resolved, request);
      if (candidate) {
        if (candidate.endsWith(".ts") || candidate.endsWith(".tsx")) return loadTsModule(candidate, cache);
        return nativeRequire(candidate);
      }
    }
    return nativeRequire(request);
  }

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __filename: resolved,
    __dirname: path.dirname(resolved),
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  require("node:vm").runInNewContext(outputText, sandbox, { filename: resolved });
  return mod.exports;
}

function getAssembler() {
  const mod = loadTsModule(path.join(ROOT, "src", "domain", "fish", "read-model", "fish-detail-view-model-assembler.ts"));
  return mod;
}

function buildPreview() {
  const report = readJson(INPUT_PATH);
  const previewRecords = Array.isArray(report.previewRecords) ? report.previewRecords : [];
  const assembler = getAssembler();

  const assemblyRecords = previewRecords.map((record) => {
    const preview = assembler.buildFishDetailViewModelAssemblyPreview({
      candidateId: record.speciesCandidateId,
      sourceId: record.sourceId,
      identity: record.identity,
      officialFacts: record.officialFacts,
      taxonomy: record.taxonomy ?? null,
      sections: {
        morphology: record.morphology ?? null,
        morphologySummary: record.morphologySummary ?? null,
        morphologySourceStatus: record.morphologySourceStatus ?? undefined,
        morphologySourceText: record.morphologySourceText ?? null,
        distinguishingFeatures: record.distinguishingFeatures ?? null,
        featureSummary: record.featureSummary ?? null,
        featureSourceStatus: record.featureSourceStatus ?? undefined,
        featureSourceText: record.featureSourceText ?? null,
        habitat: record.habitat ?? null,
        habitatSourceStatus: record.habitat ? "present" : "source_missing",
        distribution: record.distribution ?? null,
        distributionSourceStatus: record.distribution ? "present" : "source_missing",
        ecology: record.ecology ?? null,
        ecologySourceStatus: record.ecology ? "present" : "source_missing",
        spawning: typeof record.spawning === "string" ? record.spawning : record.spawning?.text ?? null,
        spawningSourceStatus: record.spawning ? "present" : "source_missing",
        feeding: record.feeding ?? null,
        feedingSourceStatus: record.feeding ? "present" : "source_missing",
        size: record.size ?? null,
        season: record.quickFacts?.season ?? null,
        seasonSourceStatus: record.quickFacts?.seasonSourceStatus ?? undefined,
        seasonDisplayText: record.quickFacts?.seasonDisplayText ?? null,
        seasonFallbackText: record.quickFacts?.seasonFallbackText ?? null,
        quickFactsSummary: record.quickFacts?.summary ?? null,
      },
      fishingGuide: record.fishingGuide ?? { methods: [], tips: [], cautions: [] },
      foodNutrition: record.foodNutrition ?? null,
      aliases: record.aliases ?? [],
      displayCategories: record.displayCategories ?? [],
      categoryAssignments: record.categoryAssignments ?? [],
      regulationReadModel: { current: record.regulations ?? [], history: [] , all: record.regulations ?? [] },
      media: record.media ?? [],
      relatedSpecies: record.relatedSpecies ?? [],
      generatedContents: record.generatedContents ?? [],
      officialSources: record.officialSources ?? [],
      reviewBadges: record.reviewBadges ?? [],
      publishMetadata: record.publishMetadata ?? undefined,
      seoMetadata: record.seoMetadata ?? undefined,
    });

    return {
      candidateId: preview.candidateId,
      sourceId: preview.sourceId,
      readiness: preview.readiness,
      sectionStates: preview.sectionStates,
      missingFields: preview.missingFields,
      warnings: preview.warnings,
      regulationCounts: preview.regulationCounts,
      viewModel: preview.viewModel,
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceFile: "reports/nifs-fish-detail-read-model-preview.json",
    totalCandidates: assemblyRecords.length,
    readinessCounts: {
      ready: assemblyRecords.filter((record) => record.readiness === "ready").length,
      partial: assemblyRecords.filter((record) => record.readiness === "partial").length,
      blocked: assemblyRecords.filter((record) => record.readiness === "blocked").length,
    },
    sectionStateCounts: Object.fromEntries(
      ["identity", "officialFacts", "taxonomy", "morphology", "habitat", "distribution", "ecology", "spawning", "feeding", "regulations", "media", "sources"].map((key) => [
        key,
        {
          available: assemblyRecords.filter((record) => record.sectionStates[key].status === "available").length,
          source_missing: assemblyRecords.filter((record) => record.sectionStates[key].status === "source_missing").length,
          empty: assemblyRecords.filter((record) => record.sectionStates[key].status === "empty").length,
        },
      ])
    ),
    warningsCount: assemblyRecords.reduce((sum, record) => sum + record.warnings.length, 0),
    assemblyRecords,
  };

  writeJson(OUT_JSON, summary);

  const lines = [];
  lines.push("# FishDetailViewModel Assembly Preview");
  lines.push("");
  lines.push(`- Total candidates: ${summary.totalCandidates}`);
  lines.push(`- Ready: ${summary.readinessCounts.ready}`);
  lines.push(`- Partial: ${summary.readinessCounts.partial}`);
  lines.push(`- Blocked: ${summary.readinessCounts.blocked}`);
  lines.push("");
  lines.push("| candidateId | sourceId | readiness | taxonomy | morphology | habitat | distribution | ecology | spawning | feeding | regulations | media | sources | warnings |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const record of assemblyRecords) {
    const s = record.sectionStates;
    lines.push(
      `| ${record.candidateId} | ${record.sourceId} | ${record.readiness} | ${s.taxonomy.status} | ${s.morphology.status} | ${s.habitat.status} | ${s.distribution.status} | ${s.ecology.status} | ${s.spawning.status} | ${s.feeding.status} | ${s.regulations.status} | ${s.media.status} | ${s.sources.status} | ${record.warnings.join(", ") || "-"} |`
    );
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- `identity` and `officialFacts` are available for all eight candidates.");
  lines.push("- `taxonomy` remains source-missing for all eight candidates.");
  lines.push("- `morphology`, `habitat`, `distribution`, `ecology`, and `spawning` are available from the current NIFS preview payload.");
  lines.push("- `feeding` is source-missing in the current preview payload and stays hidden.");
  lines.push("- `regulations` are empty in this preview because no regulation rules are linked for these candidates.");
  lines.push("- `media` and `officialSources` are available for all eight candidates.");
  lines.push("- `season` keeps the explicit source-missing state for `fish_1576639605223`.");
  lines.push("- Current/history split for regulations is handled by the read-model adapter, but no regulation rows are attached in this assembly preview.");

  writeText(OUT_MD, `${lines.join("\n")}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} and ${path.relative(ROOT, OUT_MD)}`);
}

if (require.main === module) {
  buildPreview();
}

module.exports = {
  buildPreview,
};

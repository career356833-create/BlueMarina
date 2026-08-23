"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const ROOT = process.cwd();
const REVIEW_PATH = path.join(ROOT, "reports/nifs-new-species-review.json");
const SLUG_APPROVAL_PATH = path.join(ROOT, "reports/nifs-canonical-slug-approval-8.json");
const SCIENTIFIC_NAME_REVIEW_PATH = path.join(ROOT, "reports/nifs-scientific-name-review-8.json");
const MANIFEST_DIR = path.join(ROOT, "data-import/nifs/manifest");
const RAW_DIR = path.join(ROOT, "data/nifs/raw/fish");
const FISH_DATA_PATH = path.join(ROOT, "src/data/fish-data.ts");
const OUT_JSON = path.join(ROOT, "reports/nifs-fish-species-candidates.json");
const OUT_MD = path.join(ROOT, "reports/nifs-fish-species-candidates.md");

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

function normalizeDisplayName(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeText(value) {
  return normalizeDisplayName(value).toLowerCase();
}

function slugifyCandidate(value) {
  const normalized = normalizeDisplayName(value).toLowerCase();
  return normalized
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\uac00-\ud7a3-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function legacySlugForName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\uac00-\ud7a3-]/g, "");
}

let cachedFishItems;
function loadFishItems() {
  if (cachedFishItems) return cachedFishItems;
  const file = fs.readFileSync(FISH_DATA_PATH, "utf8");
  const js = ts.transpileModule(file, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleStub = { exports: {} };
  const sandbox = {
    module: moduleStub,
    exports: moduleStub.exports,
    require,
    console,
  };
  vm.runInNewContext(js, sandbox, { filename: "fish-data.ts" });
  const fishItems = sandbox.module.exports.fishItems || sandbox.exports.fishItems || [];
  cachedFishItems = fishItems.map((item) => ({ ...item }));
  return cachedFishItems;
}

function loadManifest(sourceId) {
  return readJson(path.join(MANIFEST_DIR, `${sourceId}.json`));
}

function loadRaw(sourceId) {
  return readJson(path.join(RAW_DIR, sourceId, "detail-response.json"));
}

function buildOfficialFacts(manifest, raw) {
  const retMap = raw?.retMap ?? {};
  return {
    title: manifest.title ?? null,
    koreanName: manifest.koreanName ?? retMap.fishName ?? null,
    englishName: retMap.fishNameEn ?? null,
    scientificName: manifest.scientificName ?? retMap.scName ?? null,
    prohibitSize: retMap.prohibitSize ?? null,
    recommendSize: retMap.recommendSize ?? null,
    distribution: retMap.infoDistribution ?? null,
    growth: retMap.infoGrowth ?? null,
    shape: retMap.infoShape ?? null,
    dialect: retMap.infoDialect ?? null,
    catchMethods: retMap.infoCatch ?? null,
    cookCalories: retMap.infoCookCal ?? null,
    cookHow: retMap.infoCookHow ?? null,
    eatNote: retMap.infoEat ?? null,
    display: retMap.display ?? null,
    graphComment: retMap.graphComment ?? null,
  };
}

function buildTextSummary(manifestEntry, rawValue, rawKey) {
  if (manifestEntry && typeof manifestEntry === "object") {
    return {
      source: manifestEntry.source ?? "NIFS",
      rawKey: manifestEntry.rawKey ?? rawKey,
      sourceText: typeof manifestEntry.sourceText === "string" ? manifestEntry.sourceText : null,
      sourceStatus: manifestEntry.sourceStatus ?? (manifestEntry.sourceText ? "present" : "source_missing"),
    };
  }
  if (typeof rawValue === "string" && rawValue.trim()) {
    return {
      source: "NIFS",
      rawKey,
      sourceText: rawValue.trim(),
      sourceStatus: "present",
    };
  }
  return {
    source: "NIFS",
    rawKey,
    sourceText: null,
    sourceStatus: "source_missing",
  };
}

function buildSeason(manifest, raw) {
  const manifestSeason = manifest?.season && typeof manifest.season === "object" ? manifest.season : null;
  const manifestPeriods = Array.isArray(manifestSeason?.periods) ? manifestSeason.periods : [];
  if (manifestPeriods.length) {
    return {
      source: manifestSeason.source ?? "NIFS",
      rawKey: manifestSeason.rawKey ?? "periodList",
      periods: manifestPeriods.map((period) => ({
        month: Number.isFinite(period.month) ? period.month : null,
        sourceValue: period.sourceValue ?? null,
        level: period.level ?? null,
      })),
    };
  }
  const rawPeriods = Array.isArray(raw?.periodList) ? raw.periodList : [];
  if (!rawPeriods.length) return null;
  return {
    source: "NIFS",
    rawKey: "periodList",
    periods: rawPeriods.map((period) => ({
      month: Number.isFinite(Number.parseInt(period?.month, 10)) ? Number.parseInt(period.month, 10) : null,
      sourceValue: typeof period?.month === "string" ? period.month.trim() : period?.month ?? null,
      level: typeof period?.colorLevel === "string" && period.colorLevel.trim() ? period.colorLevel.trim() : null,
    })),
  };
}

function buildSpawning(manifest, raw) {
  const manifestSpawning = manifest?.spawning && typeof manifest.spawning === "object" ? manifest.spawning : null;
  if (manifestSpawning && typeof manifestSpawning.text === "string" && manifestSpawning.text.trim()) {
    return {
      source: manifestSpawning.source ?? "NIFS",
      text: manifestSpawning.text.trim(),
      derivedFrom: manifestSpawning.derivedFrom ?? "infoGrowth",
    };
  }
  const growthText = raw?.retMap?.infoGrowth;
  if (typeof growthText !== "string") return null;
  const normalized = growthText.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const match = normalized.match(/\uC0B0\uB780[^,?\.\n!?]*/);
  if (!match) return null;
  return {
    source: "NIFS",
    text: match[0].trim(),
    derivedFrom: "infoGrowth",
  };
}

function buildSourceReferences(manifest) {
  return [
    {
      sourceProvider: manifest.sourceProvider ?? "NIFS",
      sourceId: manifest.sourceId,
      sourceUrl: manifest.sourceUrl,
      sourceCheckedAt: manifest.sourceCheckedAt ?? manifest.fetchedAt ?? null,
      rawPayloadPath: manifest.rawPayloadPath ?? null,
      rawHtmlPath: manifest.rawHtmlPath ?? null,
      imageUrls: Array.isArray(manifest.imageUrls) ? manifest.imageUrls : [],
      contentHash: manifest.contentHash ?? null,
      parserVersion: manifest.parserVersion ?? null,
    },
  ];
}

function buildDetailModelMapping(candidate) {
  return {
    identity: true,
    officialFacts: true,
    taxonomy: candidate.taxonomy !== null && candidate.taxonomy !== undefined,
    morphology: candidate.morphology?.sourceStatus === "present",
    feature: candidate.feature?.sourceStatus === "present",
    media: Array.isArray(candidate.sourceReferences?.[0]?.imageUrls) && candidate.sourceReferences[0].imageUrls.length > 0,
    sources: true,
  };
}

function main() {
  const review = readJson(REVIEW_PATH);
  const slugApproval = readJson(SLUG_APPROVAL_PATH);
  const slugApprovalsBySourceId = new Map(slugApproval.records.map((record) => [record.sourceId, record]));
  const scientificNameReview = readJson(SCIENTIFIC_NAME_REVIEW_PATH);
  const scientificNamesBySourceId = new Map(scientificNameReview.records.map((record) => [record.sourceId, record]));
  const fishItems = loadFishItems();
  const legacySlugIndex = new Map(fishItems.map((item) => [legacySlugForName(item.name), item.id]));
  const records = review.records.filter((record) => record.decision === "new_species_confirmed");

  const candidates = records.map((record, index) => {
    const manifest = loadManifest(record.sourceId);
    const raw = loadRaw(record.sourceId);
    const previousCandidateSlug = slugifyCandidate(record.koreanName || manifest.koreanName || raw?.retMap?.fishName || record.scientificName || record.sourceId);
    const slugApprovalRecord = slugApprovalsBySourceId.get(record.sourceId);
    if (!slugApprovalRecord || slugApprovalRecord.approvalStatus !== "approved") {
      throw new Error(`missing approved canonical slug for sourceId: ${record.sourceId}`);
    }
    const candidateSlug = slugApprovalRecord.proposedCanonicalSlug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidateSlug)) {
      throw new Error(`invalid approved canonical slug for sourceId: ${record.sourceId}`);
    }
    const exactNameCollision = fishItems.some((item) => normalizeText(item.name) === normalizeText(record.koreanName));
    const aliasCollision = fishItems.some(
      (item) => Array.isArray(item.aliases) && item.aliases.some((alias) => normalizeText(alias) === normalizeText(record.koreanName))
    );
    const slugCollision = legacySlugIndex.has(candidateSlug);
    const slugConflict = Boolean(exactNameCollision || aliasCollision || slugCollision);
    const candidateId = `fish-species-candidate-${record.sourceId}`;
    const sourceReferences = buildSourceReferences(manifest);
    const officialFacts = buildOfficialFacts(manifest, raw);
    const morphology = buildTextSummary(manifest.morphology, raw?.retMap?.infoShape, "infoShape");
    const feature = buildTextSummary(manifest.feature, raw?.retMap?.infoFeature, "infoFeature");
    const season = buildSeason(manifest, raw);
    const rawScientificName = record.scientificName ?? manifest.scientificName ?? raw?.retMap?.scName ?? null;
    const scientificNameReviewRecord = scientificNamesBySourceId.get(record.sourceId);
    const scientificName = scientificNameReviewRecord?.canonicalScientificName ?? rawScientificName;
    const scientificNameReviewStatus = scientificNameReviewRecord?.status === "APPROVED" || scientificNameReviewRecord?.status === "PASS"
      ? "approved"
      : "review_required";
    const candidate = {
      candidateId,
      sourceProvider: manifest.sourceProvider ?? "NIFS",
      sourceId: record.sourceId,
      koreanName: record.koreanName ?? manifest.koreanName ?? raw?.retMap?.fishName ?? null,
      englishName: record.englishName ?? raw?.retMap?.fishNameEn ?? null,
      scientificName,
      rawScientificName,
      scientificNameAliases: scientificNameReviewRecord?.scientificNameAliases ?? [],
      scientificNameLineage: scientificNameReviewRecord?.normalizationType
        ? {
            normalizationType: scientificNameReviewRecord.normalizationType,
            canonicalScientificName: scientificNameReviewRecord.canonicalScientificName,
            rawScientificName,
            verificationSource: scientificNameReviewRecord.verificationSource,
            verificationSourceUrl: scientificNameReviewRecord.verificationSourceUrl,
            verificationSourceId: scientificNameReviewRecord.verificationSourceId,
            alternateName: scientificNameReviewRecord.scientificNameAliases?.[0] ?? null,
            approvedAt: scientificNameReviewRecord.approvedAt,
          }
        : null,
      morphology: morphology.sourceText,
      morphologySummary: morphology,
      morphologySourceStatus: morphology.sourceStatus,
      morphologySourceText: morphology.sourceText,
      distinguishingFeatures: feature.sourceText,
      featureSummary: feature,
      featureSourceStatus: feature.sourceStatus,
      featureSourceText: feature.sourceText,
      season,
      seasonSourceStatus: season ? "present" : "source_missing",
      spawning: buildSpawning(manifest, raw),
      candidateSlug,
      canonicalSlug: candidateSlug,
      previousCandidateSlug,
      slugApprovalStatus: "approved",
      slugConflict,
      scientificNameReviewStatus,
      taxonomy: null,
      officialFacts,
      sourceReferences,
      factReviewStatus: "pending",
      publishStatus: "draft",
      detailModelMapping: buildDetailModelMapping({
        taxonomy: null,
        morphology,
        feature,
        sourceReferences,
      }),
      deterministicIndex: index + 1,
      sourceMatchSummary: {
        exactNameCollision,
        aliasCollision,
        slugCollision,
        legacyFishDataMatchIds: [],
      },
    };
    return candidate;
  });

  const duplicateIds = new Set();
  const duplicateSlugs = new Set();
  for (const candidate of candidates) {
    if (duplicateIds.has(candidate.candidateId)) {
      throw new Error(`duplicate candidateId: ${candidate.candidateId}`);
    }
    duplicateIds.add(candidate.candidateId);
    if (duplicateSlugs.has(candidate.candidateSlug)) {
      throw new Error(`duplicate candidateSlug: ${candidate.candidateSlug}`);
    }
    duplicateSlugs.add(candidate.candidateSlug);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceReviewFile: "reports/nifs-new-species-review.json",
    slugApprovalFile: "reports/nifs-canonical-slug-approval-8.json",
    scientificNameReviewFile: "reports/nifs-scientific-name-review-8.json",
    totalCandidates: candidates.length,
    slugConflictCount: candidates.filter((candidate) => candidate.slugConflict).length,
    mappingCounts: {
      identity: candidates.filter((candidate) => candidate.detailModelMapping.identity).length,
      officialFacts: candidates.filter((candidate) => candidate.detailModelMapping.officialFacts).length,
      taxonomy: candidates.filter((candidate) => candidate.detailModelMapping.taxonomy).length,
      morphology: candidates.filter((candidate) => candidate.detailModelMapping.morphology).length,
      feature: candidates.filter((candidate) => candidate.detailModelMapping.feature).length,
      media: candidates.filter((candidate) => candidate.detailModelMapping.media).length,
      sources: candidates.filter((candidate) => candidate.detailModelMapping.sources).length,
    },
    candidates,
  };

  writeJson(OUT_JSON, summary);

  const lines = [];
  lines.push("# NIFS FishSpecies Candidate Dry Run");
  lines.push("");
  lines.push(`- Total candidates: ${summary.totalCandidates}`);
  lines.push(`- Slug conflicts: ${summary.slugConflictCount}`);
  lines.push(`- Detail model mapping: identity ${summary.mappingCounts.identity}, officialFacts ${summary.mappingCounts.officialFacts}, taxonomy ${summary.mappingCounts.taxonomy}, morphology ${summary.mappingCounts.morphology}, feature ${summary.mappingCounts.feature}, media ${summary.mappingCounts.media}, sources ${summary.mappingCounts.sources}`);
  lines.push("");
  lines.push("| candidateId | sourceId | koreanName | englishName | scientificName | candidateSlug | slugConflict | factReviewStatus | publishStatus | detailModelMapping |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const candidate of candidates) {
    lines.push(
      `| ${candidate.candidateId} | ${candidate.sourceId} | ${candidate.koreanName || ""} | ${candidate.englishName || ""} | ${candidate.scientificName || ""} | ${candidate.candidateSlug} | ${candidate.slugConflict ? "yes" : "no"} | ${candidate.factReviewStatus} | ${candidate.publishStatus} | ${candidate.detailModelMapping.identity ? "identity, " : ""}${candidate.detailModelMapping.officialFacts ? "officialFacts, " : ""}${candidate.detailModelMapping.taxonomy ? "taxonomy, " : ""}${candidate.detailModelMapping.media ? "media, " : ""}${candidate.detailModelMapping.sources ? "sources" : ""} |`
    );
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- `candidateId` is deterministic and separate from NIFS `sourceId`.");
  lines.push("- `candidateSlug` and `canonicalSlug` come from the approved slug report and are joined by immutable NIFS `sourceId`.");
  lines.push("- `previousCandidateSlug` preserves the pre-approval Korean candidate value for audit lineage.");
  lines.push("- `taxonomy` remains null because the source manifest and raw payload used for this dry-run did not expose a taxonomy block.");
  lines.push("- `morphology` preserves the raw `infoShape` text when present and keeps an explicit source status.");
  lines.push("- `feature` remains `source_missing` because the raw payload used for this dry-run did not expose `infoFeature`.");
  lines.push("- `season` is preserved from `manifest.periodList` into a structured candidate field.");
  lines.push("- `spawning` is derived from the first explicit `산란` phrase found in `infoGrowth`, when present.");
  lines.push("- `factReviewStatus` is forced to `pending` and `publishStatus` to `draft` for all candidates.");
  lines.push("- `officialFacts` are derived only from manifest and raw `retMap` fields; no inferred facts were added.");

  writeText(OUT_MD, `${lines.join("\n")}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} and ${path.relative(ROOT, OUT_MD)}`);
}

main();

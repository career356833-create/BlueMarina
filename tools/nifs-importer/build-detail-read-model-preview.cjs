"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const CANDIDATES_PATH = path.join(ROOT, "reports/nifs-fish-species-candidates.json");
const OUT_JSON = path.join(ROOT, "reports/nifs-fish-detail-read-model-preview.json");
const OUT_MD = path.join(ROOT, "reports/nifs-fish-detail-read-model-preview.md");
const MANIFEST_DIR = path.join(ROOT, "data-import/nifs/manifest");
const RAW_DIR = path.join(ROOT, "data/nifs/raw/fish");

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

function splitList(value) {
  if (typeof value !== "string") return [];
  return Array.from(
    new Set(
      value
        .split(/[,\n/·•;]+/g)
        .map((part) => normalizeDisplayName(part))
        .filter(Boolean)
    )
  );
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickOfficialExcerpt(raw) {
  const retMap = raw?.retMap ?? {};
  return firstText(retMap.infoDistribution, retMap.infoGrowth, retMap.infoShape, retMap.infoCatch, retMap.infoCookHow, retMap.infoCookCal, retMap.infoDialect, retMap.graphComment);
}

function buildSizeText(retMap) {
  const prohibit = firstText(retMap.prohibitSize);
  const recommend = firstText(retMap.recommendSize);
  if (prohibit && recommend) return `금지 체장 ${prohibit}cm / 권장 크기 ${recommend}cm`;
  if (prohibit) return `금지 체장 ${prohibit}cm`;
  if (recommend) return `권장 크기 ${recommend}cm`;
  return null;
}

function buildFoodNutrition(retMap) {
  const parts = [];
  if (firstText(retMap.infoCookCal)) parts.push(firstText(retMap.infoCookCal));
  if (firstText(retMap.infoCookHow)) parts.push(firstText(retMap.infoCookHow));
  if (firstText(retMap.infoEat) && firstText(retMap.infoEat) !== "NA") parts.push(firstText(retMap.infoEat));
  return parts.length ? parts.join("\n") : null;
}

function buildSeason(candidate) {
  const season = candidate?.season;
  if (!season || typeof season !== "object" || !Array.isArray(season.periods) || !season.periods.length) {
    return null;
  }
  return {
    source: season.source ?? "NIFS",
    rawKey: season.rawKey ?? "periodList",
    periods: season.periods.map((period) => ({
      month: Number.isFinite(period?.month) ? period.month : null,
      sourceValue: period?.sourceValue ?? null,
      level: period?.level ?? null,
    })),
    sourceStatus: "present",
  };
}

function buildSpawning(candidate) {
  const spawning = candidate?.spawning;
  if (!spawning || typeof spawning !== "object" || typeof spawning.text !== "string" || !spawning.text.trim()) return null;
  return {
    source: spawning.source ?? "NIFS",
    text: spawning.text.trim(),
    derivedFrom: spawning.derivedFrom ?? "infoGrowth",
  };
}

function buildFishingMethods(retMap) {
  const methods = splitList(retMap.infoCatch);
  return methods.length ? methods : [];
}

function buildMedia(manifest) {
  const imageUrls = Array.isArray(manifest.imageUrls) ? Array.from(new Set(manifest.imageUrls.filter(Boolean))) : [];
  const rawMediaPaths = Array.isArray(manifest.rawMediaPaths) ? Array.from(new Set(manifest.rawMediaPaths.filter(Boolean))) : [];
  return imageUrls.map((sourceUrl, index) => ({
    id: null,
    fishSpeciesId: null,
    mediaType: "image",
    sourceUrl,
    storagePath: null,
    referencedSourceMediaId: rawMediaPaths[index] ?? null,
    copyrightStatus: "unknown",
    usageStatus: "pending",
    reviewStatus: "pending",
  }));
}

function buildOfficialSources(manifest, raw) {
  const retMap = raw?.retMap ?? {};
  return [
    {
      sourceProvider: manifest.sourceProvider ?? "NIFS",
      sourceId: manifest.sourceId,
      sourceUrl: manifest.sourceUrl,
      title: manifest.title ?? manifest.koreanName ?? retMap.fishName ?? null,
      checkedAt: manifest.sourceCheckedAt ?? manifest.fetchedAt ?? null,
      excerpt: pickOfficialExcerpt(raw),
    },
  ];
}

function main() {
  const candidates = readJson(CANDIDATES_PATH);
  const records = Array.isArray(candidates.candidates) ? candidates.candidates : [];
  const previewRecords = records.map((candidate) => {
    const manifest = readJson(path.join(MANIFEST_DIR, `${candidate.sourceId}.json`));
    const raw = readJson(path.join(RAW_DIR, candidate.sourceId, "detail-response.json"));
    const retMap = raw?.retMap ?? {};
    const sourceUrls = Array.isArray(manifest.imageUrls) ? Array.from(new Set(manifest.imageUrls.filter(Boolean))) : [];
    const rawMediaPaths = Array.isArray(manifest.rawMediaPaths) ? Array.from(new Set(manifest.rawMediaPaths.filter(Boolean))) : [];
    const media = buildMedia(manifest);
    const officialSources = buildOfficialSources(manifest, raw);
    const fishingMethods = buildFishingMethods(retMap);
    const fishingGuide = {
      methods: fishingMethods,
      tips: [],
      cautions: [],
    };
    const size = buildSizeText(retMap);
    const foodNutrition = buildFoodNutrition(retMap);
    const aliases = splitList(retMap.infoDialect);
    const distribution = firstText(retMap.infoDistribution);
    const ecology = firstText(retMap.infoGrowth);
    const morphologySummary = candidate.morphologySummary ?? {
      source: "NIFS",
      rawKey: "infoShape",
      sourceText: firstText(retMap.infoShape),
      sourceStatus: firstText(retMap.infoShape) ? "present" : "source_missing",
    };
    const featureSummary = candidate.featureSummary ?? {
      source: "NIFS",
      rawKey: "infoFeature",
      sourceText: firstText(retMap.infoFeature),
      sourceStatus: firstText(retMap.infoFeature) ? "present" : "source_missing",
    };
    const season = buildSeason(candidate);
    const spawning = buildSpawning(candidate);
    const seasonSourceStatus = season ? "present" : "source_missing";
    const seasonDisplayText = season ? null : "공식 제철 정보 없음";
    const seasonFallbackText = seasonDisplayText;
    const hasIdentity = Boolean(candidate.koreanName || candidate.scientificName || candidate.englishName);
    const hasOfficialSource = officialSources.length > 0;
    const hasOfficialFacts = Boolean(distribution || ecology || size || fishingMethods.length || foodNutrition || aliases.length);
    const hasMedia = media.length > 0;
    const quickFacts = {
      summary: null,
      season,
      seasonSourceStatus,
      seasonDisplayText,
      seasonFallbackText,
      habitat: distribution,
      size,
      fishingMethods,
    };
    const missingFields = [
      "taxonomy",
      "quickFacts.summary",
      "feeding",
      "regulations",
      "generatedContents",
    ];
    const readiness = hasIdentity && hasOfficialSource && hasOfficialFacts && hasMedia ? "ready" : "partial";

    return {
      speciesCandidateId: candidate.candidateId,
      sourceId: candidate.sourceId,
      identity: {
        id: candidate.candidateId,
        slug: candidate.candidateSlug,
        slugPolicy: {
          strategy: "immutable-readable-short-id",
          stemSource: "koreanName",
          immutable: true,
          collisionSuffixStrategy: "short-id",
          redirectFromSlugs: [],
          note: "dry-run candidate preview",
        },
        slugAliases: [],
        displayName: candidate.koreanName,
        koreanName: candidate.koreanName,
        commonName: candidate.englishName ?? null,
        englishName: candidate.englishName ?? null,
        scientificName: candidate.scientificName ?? null,
      },
      taxonomy: null,
      officialFacts: {
        factReviewStatus: "pending",
        publishStatus: "draft",
        version: 1,
        sourceRefs: officialSources.map((source) => ({
          sourceProvider: source.sourceProvider,
          sourceId: source.sourceId,
          sourceUrl: source.sourceUrl,
        })),
        lastReviewedAt: null,
        reviewNote: null,
      },
      quickFacts,
      morphology: morphologySummary.sourceText,
      morphologySummary,
      morphologySourceStatus: morphologySummary.sourceStatus,
      morphologySourceText: morphologySummary.sourceText,
      distinguishingFeatures: featureSummary.sourceText,
      featureSummary,
      featureSourceStatus: featureSummary.sourceStatus,
      featureSourceText: featureSummary.sourceText,
      habitat: distribution,
      distribution,
      ecology,
      spawning,
      feeding: null,
      size,
      season,
      fishingGuide,
      foodNutrition,
      aliases,
      regulations: [],
      media,
      relatedSpecies: [],
      generatedContents: [],
      officialSources,
      missingFields,
      readiness,
      readinessReason: "taxonomy and dependent detail layers are not yet sourced for this candidate",
      evidence: {
        sourceProvider: manifest.sourceProvider ?? "NIFS",
        sourceUrl: manifest.sourceUrl,
        sourceCheckedAt: manifest.sourceCheckedAt ?? manifest.fetchedAt ?? null,
        imageCount: sourceUrls.length,
        rawMediaCount: rawMediaPaths.length,
        hasDistribution: Boolean(retMap.infoDistribution),
        hasGrowth: Boolean(retMap.infoGrowth),
        hasMorphology: Boolean(morphologySummary.sourceText),
        hasFeature: Boolean(featureSummary.sourceText),
        hasCatch: Boolean(retMap.infoCatch),
        hasCookHow: Boolean(retMap.infoCookHow),
        hasDialect: Boolean(retMap.infoDialect),
        hasSeason: Boolean(season),
        seasonSourceStatus,
        seasonDisplayText,
        seasonFallbackText,
        hasSpawning: Boolean(spawning),
        hasTaxonomy: false,
      },
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceFile: "reports/nifs-fish-species-candidates.json",
    totalCandidates: previewRecords.length,
    readinessCounts: {
      ready: previewRecords.filter((record) => record.readiness === "ready").length,
      partial: previewRecords.filter((record) => record.readiness === "partial").length,
      blocked: previewRecords.filter((record) => record.readiness === "blocked").length,
    },
    mappingCounts: {
      identity: previewRecords.filter((record) => Boolean(record.identity)).length,
      officialFacts: previewRecords.filter((record) => Boolean(record.officialFacts)).length,
      media: previewRecords.filter((record) => Array.isArray(record.media) && record.media.length > 0).length,
      taxonomyMissing: previewRecords.filter((record) => record.taxonomy === null).length,
      regulationsEmpty: previewRecords.filter((record) => Array.isArray(record.regulations) && record.regulations.length === 0).length,
      generatedContentsEmpty: previewRecords.filter((record) => Array.isArray(record.generatedContents) && record.generatedContents.length === 0).length,
      seasonPresent: previewRecords.filter((record) => Boolean(record.season)).length,
      seasonSourceMissing: previewRecords.filter((record) => record.quickFacts?.seasonSourceStatus === "source_missing").length,
      morphologyPresent: previewRecords.filter((record) => Boolean(record.morphologySummary?.sourceText)).length,
      featurePresent: previewRecords.filter((record) => Boolean(record.featureSummary?.sourceText)).length,
      spawningPresent: previewRecords.filter((record) => Boolean(record.spawning)).length,
    },
    previewRecords,
  };

  writeJson(OUT_JSON, summary);

  const lines = [];
  lines.push("# NIFS FishDetailViewModel Preview");
  lines.push("");
  lines.push(`- Total candidates: ${summary.totalCandidates}`);
  lines.push(`- Ready: ${summary.readinessCounts.ready}`);
  lines.push(`- Partial: ${summary.readinessCounts.partial}`);
  lines.push(`- Blocked: ${summary.readinessCounts.blocked}`);
  lines.push("");
  lines.push("| speciesCandidateId | sourceId | koreanName | readiness | missingFields | imageCount |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const record of previewRecords) {
    lines.push(
      `| ${record.speciesCandidateId} | ${record.sourceId} | ${record.identity.koreanName} | ${record.readiness} | ${record.missingFields.join(', ')} | ${record.evidence.imageCount} |`
    );
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- `identity`, `officialFacts`, and `media` are available for all 8 candidates.");
  lines.push("- `taxonomy` is missing for all 8 candidates because it is not exposed in the manifest or raw payload.");
  lines.push("- `morphology` is now exposed from raw `infoShape` with explicit source status.");
  lines.push("- `feature` is exposed as a source-missing field because `infoFeature` is absent in these 8 raw payloads.");
  lines.push("- `regulations` and `generatedContents` remain empty arrays because they are separate layers that are not yet connected.");
  lines.push("- `quickFacts.summary` and `feeding` are not present as explicit source fields and are left missing in this preview.");
  lines.push("- `season` now carries an explicit `seasonSourceStatus` and `seasonDisplayText` so raw absence is visible without fabricating a value.");
  lines.push("- `fish_1576639605223` is the only source-missing season case in this preview, and it shows `공식 제철 정보 없음`.");
  lines.push("- `spawning` is derived from the growth text when an explicit 산란 phrase exists.");

  writeText(OUT_MD, `${lines.join("\n")}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} and ${path.relative(ROOT, OUT_MD)}`);
}

main();

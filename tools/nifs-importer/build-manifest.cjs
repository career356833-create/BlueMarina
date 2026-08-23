#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_INPUT = "data/nifs/raw";
const DEFAULT_OUTPUT = "data-import/nifs/manifest";
const DEFAULT_REPORT_DIR = "data-import/nifs/reports";
const SOURCE_METADATA_FILE = "source-metadata.json";
const PRIMARY_RAW_CANDIDATES = [
  "detail-api-response.json",
  "detail-response.json",
  "parsed-source.json",
  "parsed-preview.json",
];
const HTML_CANDIDATES = [
  "page.html",
  "source.html",
  "detail.html",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function rel(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function sanitizeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function sortByRelativePath(a, b) {
  return rel(a).localeCompare(rel(b));
}

function collectDirectories(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const stack = [path.resolve(process.cwd(), rootDir)];
  const out = [];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    const stat = fs.statSync(current);
    if (!stat.isDirectory()) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    const hasSourceMetadata = entries.some((entry) => entry.isFile() && entry.name === SOURCE_METADATA_FILE);
    if (hasSourceMetadata) {
      out.push(current);
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) stack.push(path.join(current, entry.name));
    }
  }
  return out.sort(sortByRelativePath);
}

function firstExistingFile(dir, names) {
  for (const name of names) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function findHtmlFile(dir) {
  const direct = firstExistingFile(dir, HTML_CANDIDATES);
  if (direct) return direct;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const nested = findHtmlFile(path.join(dir, entry.name));
    if (nested) return nested;
  }
  return null;
}

function collectFilesByName(dir, name, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFilesByName(fullPath, name, out);
    } else if (entry.isFile() && entry.name === name) {
      out.push(fullPath);
    }
  }
  return out;
}

function extractUrlsFromValue(value, urls, mediaPaths) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) extractUrlsFromValue(item, urls, mediaPaths);
    return;
  }
  if (typeof value !== "object") return;
  if (typeof value.sourceUrl === "string" && value.sourceUrl.trim()) {
    urls.add(value.sourceUrl.trim());
  }
  if (typeof value.localPath === "string" && value.localPath.trim()) {
    mediaPaths.add(value.localPath.trim().split(path.sep).join("/"));
  }
  if (typeof value.fileName === "string" && typeof value.localPath !== "string") {
    mediaPaths.add(value.fileName.trim());
  }
  for (const nested of Object.values(value)) extractUrlsFromValue(nested, urls, mediaPaths);
}

function collectImageUrls(sourceDir) {
  const urls = new Set();
  const mediaPaths = new Set();
  const imageMetadataFiles = collectFilesByName(path.join(sourceDir, "images"), "image-metadata.json");
  for (const filePath of imageMetadataFiles) {
    const data = readJson(filePath);
    extractUrlsFromValue(data, urls, mediaPaths);
  }
  const parsedPreviewFiles = collectFilesByName(sourceDir, "parsed-preview.json");
  for (const filePath of parsedPreviewFiles) {
    const data = readJson(filePath);
    extractUrlsFromValue(data, urls, mediaPaths);
  }
  const imageRoot = path.join(sourceDir, "images", "original");
  if (fs.existsSync(imageRoot) && fs.statSync(imageRoot).isDirectory()) {
    const localFiles = fs.readdirSync(imageRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(jpe?g|png|webp|gif)$/i.test(entry.name))
      .map((entry) => path.join(imageRoot, entry.name))
      .sort((a, b) => a.localeCompare(b));
    for (const filePath of localFiles) {
      mediaPaths.add(rel(filePath));
    }
  }
  return {
    imageUrls: [...urls].sort(),
    rawMediaPaths: [...mediaPaths].sort(),
  };
}

function choosePrimaryRawFile(sourceDir) {
  for (const candidate of PRIMARY_RAW_CANDIDATES) {
    const filePath = path.join(sourceDir, candidate);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  }
  return null;
}

function inferSourceUrl(meta) {
  if (typeof meta.sourceUrl === "string" && meta.sourceUrl.trim()) return meta.sourceUrl.trim();
  return null;
}

function deriveTimestamp(meta, primaryRawFile) {
  if (typeof meta.collectedAt === "string" && meta.collectedAt.trim()) {
    return { iso: meta.collectedAt.trim(), source: "metadata_collectedAt" };
  }
  if (primaryRawFile && fs.existsSync(primaryRawFile)) {
    return { iso: fs.statSync(primaryRawFile).mtime.toISOString(), source: "filesystem_mtime" };
  }
  return { iso: null, source: null };
}

function parsePrimaryPayload(primaryRawFile, errors) {
  if (!primaryRawFile) return null;
  try {
    return readJson(primaryRawFile);
  } catch (error) {
    errors.push({
      path: rel(primaryRawFile),
      errorCode: "INVALID_PRIMARY_PAYLOAD",
      message: `Failed to parse JSON: ${error.message}`,
      recoverable: false,
    });
    return null;
  }
}

function pickFishField(payload, key) {
  if (!payload || typeof payload !== "object") return null;
  const retMap = payload.retMap && typeof payload.retMap === "object" ? payload.retMap : {};
  const candidates = [
    retMap[key],
    payload[key],
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractSpawningText(growthText) {
  if (typeof growthText !== "string") return null;
  const normalized = growthText.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const match = normalized.match(/산란[^,。\.\n!?]*/);
  if (!match) return null;
  return match[0].trim() || null;
}

function classifyCrawlStatus({ sourceMetadataExists, primaryRawExists, hasParseError, hasImageUrls }) {
  if (!sourceMetadataExists || !primaryRawExists || hasParseError) return "failed";
  if (!hasImageUrls) return "partial";
  return "success";
}

function buildManifestForSourceDir(sourceDir) {
  const errors = [];
  const sourceMetadataPath = path.join(sourceDir, SOURCE_METADATA_FILE);
  if (!fs.existsSync(sourceMetadataPath)) {
    return {
      manifest: null,
      errors: [{
        path: rel(sourceDir),
        errorCode: "MISSING_SOURCE_METADATA",
        message: "source-metadata.json is missing",
        recoverable: false,
      }],
      summary: { sourceId: null, crawlStatus: "failed" },
    };
  }

  const meta = readJson(sourceMetadataPath);
  const sourceId = typeof meta.sourceId === "string" && meta.sourceId.trim()
    ? meta.sourceId.trim()
    : null;
  const sourceUrl = inferSourceUrl(meta, sourceId);
  const primaryRawFile = choosePrimaryRawFile(sourceDir);
  const rawHtmlFile = findHtmlFile(sourceDir);
  const timestamps = deriveTimestamp(meta, primaryRawFile);
  const payload = parsePrimaryPayload(primaryRawFile, errors);
  const { imageUrls, rawMediaPaths } = collectImageUrls(sourceDir);
  const hasDetailApiResponse = fs.existsSync(path.join(sourceDir, "detail-api-response.json"));
  const rawPeriodList = Array.isArray(payload?.periodList) ? payload.periodList : [];
  const morphologyText = pickFishField(payload, "infoShape");
  const featureText = pickFishField(payload, "infoFeature");
  const growthText = pickFishField(payload, "infoGrowth");
  const spawningText = extractSpawningText(growthText);
  const crawlStatus = classifyCrawlStatus({
    sourceMetadataExists: true,
    primaryRawExists: Boolean(primaryRawFile),
    hasParseError: errors.some((entry) => entry.errorCode === "INVALID_PRIMARY_PAYLOAD"),
    hasImageUrls: imageUrls.length > 0,
  });

  if (!primaryRawFile) {
    errors.push({
      path: rel(sourceDir),
      errorCode: "MISSING_RAW_PAYLOAD",
      message: "No primary raw payload file was found",
      recoverable: false,
    });
  }
  if (!timestamps.iso) {
    errors.push({
      path: rel(sourceMetadataPath),
      errorCode: "MISSING_FETCH_TIMESTAMP",
      message: "Neither collectedAt nor filesystem mtime could be used",
      recoverable: false,
    });
  }

  const contentHash = primaryRawFile ? sha256(fs.readFileSync(primaryRawFile)) : null;
  const sourceMetadataHash = typeof meta.contentHash === "string" && meta.contentHash.trim() ? meta.contentHash.trim() : null;
  const parserVersion = typeof meta.parserVersion === "string" && meta.parserVersion.trim()
    ? meta.parserVersion.trim()
    : "legacy-unversioned";
  const inferredKoreanName =
    pickFishField(payload, "fishName") ||
    pickFishField(payload, "koreanName") ||
    pickFishField(payload, "title") ||
    null;
  const scientificName = pickFishField(payload, "scName") || pickFishField(payload, "scientificName");
  const byteSize = primaryRawFile ? fs.statSync(primaryRawFile).size : null;
  const mimeType = primaryRawFile
    ? (primaryRawFile.endsWith(".html") ? "text/html" : "application/json")
    : null;
  const title = inferredKoreanName || sourceId;

  const manifest = {
    sourceProvider: "NIFS",
    sourceId,
    sourceUrl,
    fetchedAt: timestamps.iso,
    sourceCheckedAt: timestamps.iso,
    ...(timestamps.source === "filesystem_mtime" ? { sourceCheckedAtSource: "filesystem_mtime" } : {}),
    contentHash,
    parserVersion,
    crawlStatus,
    ...(rawPeriodList.length ? { periodList: rawPeriodList } : {}),
    ...(morphologyText
      ? { morphology: { source: "NIFS", rawKey: "infoShape", sourceText: morphologyText, sourceStatus: "present" } }
      : { morphology: { source: "NIFS", rawKey: "infoShape", sourceText: null, sourceStatus: "source_missing" } }),
    ...(featureText
      ? { feature: { source: "NIFS", rawKey: "infoFeature", sourceText: featureText, sourceStatus: "present" } }
      : { feature: { source: "NIFS", rawKey: "infoFeature", sourceText: null, sourceStatus: "source_missing" } }),
    ...(growthText ? { growthText } : {}),
    ...(spawningText ? { spawning: { source: "NIFS", text: spawningText, derivedFrom: "infoGrowth" } } : {}),
    ...(rawHtmlFile ? { rawHtmlPath: rel(rawHtmlFile) } : {}),
    ...(primaryRawFile ? { rawPayloadPath: rel(primaryRawFile) } : {}),
    imageUrls,
    ...(rawMediaPaths.length ? { rawMediaPaths } : {}),
    ...(byteSize !== null ? { byteSize } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(title ? { title } : {}),
    ...(inferredKoreanName ? { koreanName: inferredKoreanName } : {}),
    ...(scientificName ? { scientificName } : {}),
  };

  const manifestErrors = [...errors];
  if (!manifest.sourceId) {
    manifestErrors.push({
      path: rel(sourceMetadataPath),
      errorCode: "MISSING_SOURCE_ID",
      message: "sourceId is missing",
      recoverable: false,
    });
  }
  if (!manifest.sourceUrl) {
    manifestErrors.push({
      path: rel(sourceMetadataPath),
      errorCode: "MISSING_SOURCE_URL",
      message: "sourceUrl is missing",
      recoverable: false,
    });
  }
  const blocking = manifestErrors.some((entry) =>
    ["MISSING_SOURCE_ID", "MISSING_SOURCE_URL", "MISSING_RAW_PAYLOAD", "MISSING_FETCH_TIMESTAMP", "INVALID_PRIMARY_PAYLOAD"].includes(entry.errorCode)
  );

  if (blocking) {
    return {
      manifest: null,
      errors: manifestErrors,
      summary: {
        sourceId: manifest.sourceId || path.basename(sourceDir),
        sourceUrl: manifest.sourceUrl || null,
        primaryRawPath: primaryRawFile ? rel(primaryRawFile) : null,
        rawHtmlPath: rawHtmlFile ? rel(rawHtmlFile) : null,
        contentHash,
        parserVersion,
        crawlStatus: "failed",
        imageUrlCount: imageUrls.length,
        rawMediaPathCount: rawMediaPaths.length,
        hasDetailApiResponse,
        sourceCheckedAtSource: timestamps.source,
        scientificName: scientificName || null,
        title,
      },
    };
  }

  if (sourceMetadataHash && contentHash && sourceMetadataHash !== contentHash) {
    manifestErrors.push({
      path: rel(sourceMetadataPath),
      errorCode: "METADATA_HASH_MISMATCH",
      message: "source-metadata.json contentHash differs from the primary raw payload hash",
      recoverable: true,
    });
  }

  return {
    manifest,
    errors: manifestErrors,
    summary: {
      sourceId,
      sourceUrl,
      primaryRawPath: primaryRawFile ? rel(primaryRawFile) : null,
      rawHtmlPath: rawHtmlFile ? rel(rawHtmlFile) : null,
      contentHash,
      parserVersion,
      crawlStatus,
      imageUrlCount: imageUrls.length,
      rawMediaPathCount: rawMediaPaths.length,
      hasDetailApiResponse,
      sourceCheckedAtSource: timestamps.source,
      scientificName: scientificName || null,
      title,
      periodListCount: rawPeriodList.length,
      hasMorphologyText: Boolean(morphologyText),
      hasFeatureText: Boolean(featureText),
      hasGrowthText: Boolean(growthText),
      hasSpawningText: Boolean(spawningText),
    },
  };
}

function buildManifests(inputRoot) {
  const sourceDirs = collectDirectories(inputRoot);
  const results = [];
  const errors = [];
  const summaries = [];

  for (const sourceDir of sourceDirs) {
    const built = buildManifestForSourceDir(sourceDir);
    summaries.push(built.summary);
    if (built.errors.length) errors.push(...built.errors.map((error) => ({
      sourceCandidate: built.summary.sourceId || path.basename(sourceDir),
      ...error,
    })));
    if (!built.manifest) continue;
    results.push({
      sourceDir,
      manifest: built.manifest,
      summary: built.summary,
    });
  }

  results.sort((left, right) => left.manifest.sourceId.localeCompare(right.manifest.sourceId));
  summaries.sort((left, right) => String(left.sourceId || "").localeCompare(String(right.sourceId || "")));
  errors.sort((left, right) => `${left.sourceCandidate}:${left.errorCode}`.localeCompare(`${right.sourceCandidate}:${right.errorCode}`));

  return {
    sourceDirs: sourceDirs.map((dir) => rel(dir)),
    manifests: results,
    errors,
    summary: {
      totalSourceDirs: sourceDirs.length,
      manifestCount: results.length,
      successCount: summaries.filter((entry) => entry.crawlStatus === "success").length,
      partialCount: summaries.filter((entry) => entry.crawlStatus === "partial").length,
      failedCount: summaries.filter((entry) => entry.crawlStatus === "failed").length,
      sourceMetadataCount: sourceDirs.length,
      detailApiResponseCount: summaries.filter((entry) => entry.hasDetailApiResponse).length,
      sourceCheckedAtFromMetadataCount: summaries.filter((entry) => entry.sourceCheckedAtSource === "metadata_collectedAt").length,
      sourceCheckedAtFromMtimeCount: summaries.filter((entry) => entry.sourceCheckedAtSource === "filesystem_mtime").length,
      imageUrlTotal: summaries.reduce((sum, entry) => sum + (entry.imageUrlCount || 0), 0),
      imageMediaPathTotal: summaries.reduce((sum, entry) => sum + (entry.rawMediaPathCount || 0), 0),
      periodListTotal: summaries.reduce((sum, entry) => sum + (entry.periodListCount || 0), 0),
      morphologyTextCount: summaries.filter((entry) => Boolean(entry.hasMorphologyText)).length,
      featureTextCount: summaries.filter((entry) => Boolean(entry.hasFeatureText)).length,
      growthTextCount: summaries.filter((entry) => entry.hasGrowthText).length,
      spawningTextCount: summaries.filter((entry) => entry.hasSpawningText).length,
      metadataHashMismatchCount: errors.filter((error) => error.errorCode === "METADATA_HASH_MISMATCH").length,
      parseErrorCount: errors.filter((error) => error.errorCode === "INVALID_PRIMARY_PAYLOAD").length,
      missingSourceIdCount: errors.filter((error) => error.errorCode === "MISSING_SOURCE_ID").length,
      missingSourceUrlCount: errors.filter((error) => error.errorCode === "MISSING_SOURCE_URL").length,
      missingRawPayloadCount: errors.filter((error) => error.errorCode === "MISSING_RAW_PAYLOAD").length,
    },
  };
}

function reportMarkdown(report) {
  const lines = [];
  lines.push("# NIFS Manifest Build Summary");
  lines.push("");
  lines.push(`- Input root: \`${report.inputRoot}\``);
  lines.push(`- Output dir: \`${report.outputDir}\``);
  lines.push(`- Report dir: \`${report.reportDir}\``);
  lines.push(`- Database touched: ${report.databaseTouched}`);
  lines.push(`- Supabase called: ${report.supabaseCalled}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Item | Count |");
  lines.push("| --- | ---: |");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push("");
  lines.push("## Raw structure notes");
  lines.push("");
  lines.push(`- Source directories discovered: ${report.summary.totalSourceDirs}`);
  lines.push(`- Detail API responses present: ${report.summary.detailApiResponseCount}`);
  lines.push(`- Image URLs collected: ${report.summary.imageUrlTotal}`);
  lines.push(`- Local media paths collected: ${report.summary.imageMediaPathTotal}`);
  lines.push(`- periodList entries collected: ${report.summary.periodListTotal}`);
  lines.push(`- morphology text present: ${report.summary.morphologyTextCount}`);
  lines.push(`- feature text present: ${report.summary.featureTextCount}`);
  lines.push(`- growth text present: ${report.summary.growthTextCount}`);
  lines.push(`- spawning text extracted: ${report.summary.spawningTextCount}`);
  lines.push(`- Hash mismatches against source-metadata: ${report.summary.metadataHashMismatchCount}`);
  lines.push("");
  lines.push("## Errors");
  lines.push("");
  lines.push(`- Recoverable or blocking errors: ${report.errors.length}`);
  if (!report.errors.length) {
    lines.push("- None");
  } else {
    for (const error of report.errors) {
      lines.push(`- ${error.sourceCandidate}: ${error.errorCode} (${error.recoverable ? "recoverable" : "blocking"})`);
    }
  }
  lines.push("");
  lines.push("## Idempotency");
  lines.push("");
  lines.push("The converter sorts source directories by sourceId, sorts manifest keys by insertion order, deduplicates image URLs and media paths, and uses SHA-256 of the chosen primary payload bytes. Re-running the same input produces the same manifest files.");
  return lines.join("\n") + "\n";
}

function writeOutputs(report, outputDir, reportDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });
  for (const entry of report.manifestEntries || []) {
    const fileName = `${sanitizeFileName(entry.manifest.sourceId)}.json`;
    writeJson(path.join(outputDir, fileName), entry.manifest);
  }
  writeJson(path.join(reportDir, "manifest-build-errors.json"), {
    generatedAt: report.generatedAt,
    errors: report.errors,
  });
  writeText(path.join(reportDir, "manifest-build-summary.md"), reportMarkdown(report));
}

function parseArgs(args) {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    reportDir: DEFAULT_REPORT_DIR,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input") options.input = args[++index];
    else if (arg === "--output") options.output = args[++index];
    else if (arg === "--report-dir") options.reportDir = args[++index];
  }
  return options;
}

function runBuildManifest(options = {}) {
  const inputRoot = options.input || DEFAULT_INPUT;
  const outputDir = options.output || DEFAULT_OUTPUT;
  const reportDir = options.reportDir || DEFAULT_REPORT_DIR;
  const built = buildManifests(inputRoot);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "build-manifest",
    inputRoot: rel(path.resolve(process.cwd(), inputRoot)),
    outputDir: rel(path.resolve(process.cwd(), outputDir)),
    reportDir: rel(path.resolve(process.cwd(), reportDir)),
    databaseTouched: false,
    supabaseCalled: false,
    summary: built.summary,
    manifestEntries: built.manifests,
    manifests: built.manifests.map((entry) => ({
      sourceId: entry.manifest.sourceId,
      sourceUrl: entry.manifest.sourceUrl,
      crawlStatus: entry.manifest.crawlStatus,
      rawPayloadPath: entry.manifest.rawPayloadPath || null,
      rawHtmlPath: entry.manifest.rawHtmlPath || null,
      imageUrlCount: entry.manifest.imageUrls.length,
      rawMediaPathCount: entry.manifest.rawMediaPaths ? entry.manifest.rawMediaPaths.length : 0,
      contentHash: entry.manifest.contentHash,
      parserVersion: entry.manifest.parserVersion,
      sourceCheckedAtSource: entry.summary.sourceCheckedAtSource,
      title: entry.summary.title,
      scientificName: entry.summary.scientificName,
    })),
    errors: built.errors,
  };
  writeOutputs(report, outputDir, reportDir);
  return report;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = runBuildManifest(options);
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
}

if (require.main === module) main();

module.exports = {
  buildManifestForSourceDir,
  buildManifests,
  collectDirectories,
  collectImageUrls,
  choosePrimaryRawFile,
  runBuildManifest,
  reportMarkdown,
  sanitizeFileName,
};

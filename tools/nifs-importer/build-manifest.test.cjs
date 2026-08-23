"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { runBuildManifest, buildManifestForSourceDir } = require("./build-manifest.cjs");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function readManifestDir(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => JSON.parse(fs.readFileSync(path.join(dir, entry.name), "utf8")))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function createSourceFixture(root, name, options = {}) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  if (!options.omitSourceMetadata) {
    writeJson(path.join(dir, "source-metadata.json"), {
      sourceProvider: "NIFS",
      sourceId: options.sourceId,
      sourceUrl: options.sourceUrl,
      collectedAt: options.collectedAt,
      contentHash: options.metadataHash,
      parserVersion: options.parserVersion,
    });
  }
  if (options.detailApiResponse !== false) {
    writeJson(path.join(dir, "detail-api-response.json"), options.detailApiResponse || {
      retMap: {
        fishId: options.sourceId,
        fishName: options.koreanName || "Sample Fish",
        scName: options.scientificName || "Sampleus fishus",
      },
      imgList: [{ sourceUrl: "https://example.invalid/fish.jpg" }],
    });
  }
  if (options.detailResponse !== false) {
    writeJson(path.join(dir, "detail-response.json"), options.detailResponse || {
      retMap: {
        fishId: options.sourceId,
        fishName: options.koreanName || "Sample Fish",
        scName: options.scientificName || "Sampleus fishus",
      },
      imgList: [{ fileName: "sample.jpg" }],
    });
  }
  if (options.parsedSource !== false) {
    writeJson(path.join(dir, "parsed-source.json"), options.parsedSource || {
      sourceId: options.sourceId,
      title: options.koreanName || "Sample Fish",
    });
  }
  if (options.includeHtml) {
    writeText(path.join(dir, "page.html"), "<html><body>sample</body></html>");
  }
  if (options.imageMetadata !== false) {
    writeJson(path.join(dir, "images", "image-metadata.json"), options.imageMetadata || [
      {
        sourceUrl: "https://example.invalid/fish.jpg",
        localPath: `data/nifs/raw/fish/${name}/images/original/image-001.jpg`,
      },
      {
        sourceUrl: "https://example.invalid/fish.jpg",
        localPath: `data/nifs/raw/fish/${name}/images/original/image-001.jpg`,
      },
    ]);
  }
  if (options.imageFiles !== false) {
    fs.mkdirSync(path.join(dir, "images", "original"), { recursive: true });
    fs.writeFileSync(path.join(dir, "images", "original", "image-001.jpg"), Buffer.from("sample-image"));
  }
  return dir;
}

test("build-manifest converts the current raw tree deterministically", () => {
  const tempA = fs.mkdtempSync(path.join(os.tmpdir(), "nifs-manifest-a-"));
  const tempB = fs.mkdtempSync(path.join(os.tmpdir(), "nifs-manifest-b-"));
  const reportA = runBuildManifest({
    input: "data/nifs/raw/fish",
    output: path.join(tempA, "manifest"),
    reportDir: path.join(tempA, "reports"),
  });
  const reportB = runBuildManifest({
    input: "data/nifs/raw/fish",
    output: path.join(tempB, "manifest"),
    reportDir: path.join(tempB, "reports"),
  });
  assert.equal(reportA.summary.totalSourceDirs, 25);
  assert.equal(reportA.summary.manifestCount, 25);
  assert.equal(reportA.summary.successCount, 25);
  assert.equal(reportA.summary.partialCount, 0);
  assert.equal(reportA.summary.failedCount, 0);
  assert.deepEqual(reportA.summary, reportB.summary);
  assert.deepEqual(readManifestDir(path.join(tempA, "manifest")), readManifestDir(path.join(tempB, "manifest")));
});

test("build-manifest isolates schema errors and keeps valid sources", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nifs-manifest-synthetic-"));
  createSourceFixture(root, "sample-001", {
    sourceId: "fish-good",
    sourceUrl: "https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId=fish-good",
    collectedAt: "2026-07-31T00:00:00.000Z",
    metadataHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    parserVersion: "nifs-detail-v1.0.0",
    koreanName: "Sample Fish",
    scientificName: "Sampleus fishus",
    includeHtml: true,
    detailApiResponse: {
      retMap: {
        fishId: "fish-good",
        fishName: "Sample Fish",
        scName: "Sampleus fishus",
        infoShape: "몸은 가늘고 길다.",
        infoGrowth: "산란기 3~4월, 연안 서식",
      },
      periodList: [
        { month: "1", colorLevel: "1" },
        { month: "2", colorLevel: "2" },
      ],
      imgList: [{ sourceUrl: "https://example.invalid/fish.jpg" }],
    },
    detailResponse: {
      retMap: {
        fishId: "fish-good",
        fishName: "Sample Fish",
        scName: "Sampleus fishus",
        infoShape: "몸은 가늘고 길다.",
        infoGrowth: "산란기 3~4월, 연안 서식",
      },
      periodList: [
        { month: "1", colorLevel: "1" },
        { month: "2", colorLevel: "2" },
      ],
      imgList: [{ sourceUrl: "https://example.invalid/fish.jpg" }],
    },
  });
  createSourceFixture(root, "sample-002", {
    sourceId: undefined,
    sourceUrl: "https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId=fish-missing-id",
    collectedAt: "2026-07-31T00:00:00.000Z",
    metadataHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    parserVersion: "legacy-unversioned",
    detailApiResponse: false,
    detailResponse: {
      retMap: {
        fishId: "fish-fallback-mtime",
        fishName: "Fallback Fish",
        scName: "Fallbackus mtime",
      },
      imgList: [],
    },
    parsedSource: false,
  });
  createSourceFixture(root, "sample-003", {
    sourceId: "fish-missing-url",
    sourceUrl: "",
    collectedAt: "2026-07-31T00:00:00.000Z",
    metadataHash: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    parserVersion: "legacy-unversioned",
    detailApiResponse: false,
    detailResponse: false,
    parsedSource: false,
  });
  createSourceFixture(root, "sample-004", {
    sourceId: "fish-fallback-mtime",
    sourceUrl: "https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId=fish-fallback-mtime",
    metadataHash: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    parserVersion: "",
    detailApiResponse: false,
    detailResponse: {
      retMap: {
        fishId: "fish-fallback-mtime",
        fishName: "Fallback Fish",
        scName: "Fallbackus mtime",
      },
      imgList: [],
    },
    imageMetadata: [],
  });
  const sourceDir = path.join(root, "sample-001");
  const built = buildManifestForSourceDir(sourceDir);
  assert.equal(built.manifest.crawlStatus, "success");
  assert.equal(built.manifest.sourceCheckedAtSource, undefined);
  assert.equal(built.manifest.rawHtmlPath.endsWith("page.html"), true);
  assert.equal(built.manifest.imageUrls.length, 1);
  assert.equal(built.manifest.rawMediaPaths.length, 2);
  assert.deepEqual(built.manifest.morphology, {
    source: "NIFS",
    rawKey: "infoShape",
    sourceText: "몸은 가늘고 길다.",
    sourceStatus: "present",
  });
  assert.deepEqual(built.manifest.feature, {
    source: "NIFS",
    rawKey: "infoFeature",
    sourceText: null,
    sourceStatus: "source_missing",
  });
  assert.deepEqual(built.manifest.periodList, [
    { month: "1", colorLevel: "1" },
    { month: "2", colorLevel: "2" },
  ]);
  assert.deepEqual(built.manifest.spawning, {
    source: "NIFS",
    text: "산란기 3~4월",
    derivedFrom: "infoGrowth",
  });
  assert.equal(built.manifest.growthText, "산란기 3~4월, 연안 서식");

  const report = runBuildManifest({
    input: root,
    output: path.join(root, "manifest"),
    reportDir: path.join(root, "reports"),
  });
  assert.equal(report.summary.totalSourceDirs, 4);
  assert.equal(report.summary.manifestCount, 2);
  assert.equal(report.summary.successCount, 1);
  assert.equal(report.summary.partialCount, 1);
  assert.equal(report.summary.failedCount, 2);
  assert.equal(report.summary.missingSourceIdCount, 1);
  assert.equal(report.summary.missingSourceUrlCount, 1);
  assert.equal(report.summary.metadataHashMismatchCount >= 0, true);
  assert.equal(report.errors.length >= 2, true);
  assert.equal(fs.existsSync(path.join(root, "manifest", "fish-good.json")), true);
});

test("build-manifest falls back to filesystem mtime and legacy parser version", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nifs-manifest-mtime-"));
  const dir = createSourceFixture(root, "sample-001", {
    sourceId: "fish-mtime",
    sourceUrl: "https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId=fish-mtime",
    collectedAt: "",
    metadataHash: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    parserVersion: "",
    detailApiResponse: false,
    detailResponse: {
      retMap: {
        fishId: "fish-mtime",
        fishName: "Fallback Fish",
        scName: "Fallbackus mtime",
      },
      imgList: [],
    },
    parsedSource: false,
    imageMetadata: [],
  });
  const built = buildManifestForSourceDir(dir);
  assert.equal(built.manifest.sourceCheckedAtSource, "filesystem_mtime");
  assert.equal(built.manifest.parserVersion, "legacy-unversioned");
  assert.equal(built.manifest.crawlStatus, "partial");
  assert.equal(Array.isArray(built.manifest.imageUrls), true);
});

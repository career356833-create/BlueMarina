const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildStagingSchemaDiff,
  loadLegacyFishItems,
  loadManifestRecords,
  runStagingSchemaDiff,
} = require("./staging-schema-diff.cjs");

function makeRecord(overrides = {}) {
  return {
    sourceProvider: "NIFS",
    sourceId: "fish_test",
    sourceUrl: "https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId=fish_test",
    fetchedAt: "2026-07-30T00:00:00.000Z",
    sourceCheckedAt: "2026-07-30T00:00:00.000Z",
    contentHash: "a".repeat(64),
    parserVersion: "legacy-unversioned",
    crawlStatus: "success",
    rawPayloadPath: "data/nifs/raw/fish/fish_test/detail-response.json",
    imageUrls: [],
    koreanName: "\uB3C4\uBBF8",
    scientificName: "Sparus aurata",
    ...overrides,
  };
}

test("staging schema diff classifies the current manifest deterministically", () => {
  const records = loadManifestRecords("data-import/nifs/manifest");
  const fishItems = loadLegacyFishItems();
  const first = buildStagingSchemaDiff({ records, fishItems });
  const second = buildStagingSchemaDiff({ records, fishItems });

  assert.equal(first.summary.totalRecords, 25);
  assert.equal(first.summary.matchedCount, 17);
  assert.equal(first.summary.unmatchedCount, 8);
  assert.equal(first.summary.ambiguousCount, 0);
  assert.equal(first.summary.existingSpeciesCandidateCount, 17);
  assert.equal(first.summary.newSpeciesCandidateCount, 8);
  assert.equal(first.summary.slugCollisionCount, 17);
  assert.equal(first.summary.reviewQueueCount, 0);
  assert.deepEqual(first.summary, second.summary);
  assert.deepEqual(
    first.diffRecords.map((record) => record.sourceId),
    second.diffRecords.map((record) => record.sourceId)
  );
});

test("staging schema diff flags name, taxonomy, duplicate, and missing-field cases", () => {
  const fishItems = [
    { id: "do-mi-a", name: "\uB3C4\uBBF8", category: "cat-a", relatedFish: ["\uAC08\uCE58"] },
    { id: "do-mi-b", name: "\uB3C4\uBBF8", category: "cat-b", relatedFish: [] },
    { id: "galchi", name: "\uAC08\uCE58", category: "cat-c", relatedFish: ["\uB3C4\uBBF8"] },
  ];
  const records = [
    makeRecord({ sourceId: "fish_a", koreanName: "\uB3C4\uBBF8", scientificName: "Sparus aurata" }),
    makeRecord({ sourceId: "fish_b", koreanName: "\uC0C8\uC5B4\uC885", scientificName: "Sparus aurata" }),
    makeRecord({ sourceId: "fish_c", koreanName: "\uC644\uC804\uC2E0\uADDC", scientificName: "Newus species" }),
    makeRecord({ sourceId: "fish_d", sourceUrl: "", koreanName: "\uACB0\uCE21", scientificName: "Missingus fieldus" }),
  ];

  const result = buildStagingSchemaDiff({ records, fishItems });

  assert.equal(result.summary.totalRecords, 4);
  assert.equal(result.summary.existingSpeciesCandidateCount, 0);
  assert.equal(result.summary.newSpeciesCandidateCount, 2);
  assert.equal(result.summary.scientificNameConflictCount, 2);
  assert.equal(result.summary.koreanNameConflictCount, 0);
  assert.equal(result.summary.possibleDuplicateCount, 0);
  assert.equal(result.summary.reviewQueueCount, 3);
  assert.ok(result.diffRecords.find((record) => record.sourceId === "fish_a")?.legacyMatchCount === 2);
  assert.ok(result.diffRecords.find((record) => record.sourceId === "fish_b")?.action === "scientific_name_conflict");
  assert.ok(result.diffRecords.find((record) => record.sourceId === "fish_c")?.action === "new_species_candidate");
  assert.ok(result.diffRecords.find((record) => record.sourceId === "fish_d")?.conflicts.includes("missing_required_field"));
  assert.equal(result.reviewQueue.some((item) => item.type === "duplicate_candidate"), true);
  assert.equal(result.reviewQueue.some((item) => item.type === "taxonomy_conflict"), true);
  assert.equal(result.reviewQueue.some((item) => item.type === "missing_required_field"), true);
});

test("runStagingSchemaDiff writes reports and review queue files", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nifs-diff-"));
  const outputJson = path.join(tmpDir, "schema-diff.json");
  const outputMd = path.join(tmpDir, "schema-diff.md");
  const reviewQueue = path.join(tmpDir, "review-queue.json");

  const payload = runStagingSchemaDiff({
    inputDir: "data-import/nifs/manifest",
    outputJson,
    outputMd,
    reviewQueuePath: reviewQueue,
  });

  assert.equal(fs.existsSync(outputJson), true);
  assert.equal(fs.existsSync(outputMd), true);
  assert.equal(fs.existsSync(reviewQueue), true);
  assert.equal(payload.summary.totalRecords, 25);
  assert.equal(JSON.parse(fs.readFileSync(reviewQueue, "utf8")).length, payload.reviewQueue.length);
});

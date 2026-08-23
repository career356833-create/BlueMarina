#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const DEFAULT_INPUT = "data-import/nifs/manifest";
const DEFAULT_OUTPUT_JSON = "reports/nifs-staging-schema-diff.json";
const DEFAULT_OUTPUT_MD = "reports/nifs-staging-schema-diff.md";
const DEFAULT_REVIEW_QUEUE = "reports/nifs-review-queue.json";
const FISH_DATA_PATH = path.join(process.cwd(), "src/data/fish-data.ts");

function rel(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

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

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeDisplayName(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeScientificName(value) {
  return normalizeText(value).replace(/\s+/g, " ");
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

function sortBySourceId(a, b) {
  return normalizeText(a.sourceId).localeCompare(normalizeText(b.sourceId));
}

function collectJsonFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const stack = [path.resolve(process.cwd(), rootDir)];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    const stat = fs.statSync(current);
    if (!stat.isDirectory()) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        out.push(fullPath);
      }
    }
  }
  return out.sort((a, b) => rel(a).localeCompare(rel(b)));
}

function loadManifestRecords(inputDir) {
  const records = [];
  for (const filePath of collectJsonFiles(inputDir)) {
    const value = readJson(filePath);
    const list = Array.isArray(value) ? value : Array.isArray(value.records) ? value.records : [value];
    for (const record of list) {
      records.push({ ...record, __file: rel(filePath) });
    }
  }
  return records.sort(sortBySourceId);
}

let cachedLegacyFishItems;
function loadLegacyFishItems() {
  if (cachedLegacyFishItems) return cachedLegacyFishItems;
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
  cachedLegacyFishItems = fishItems.map((item) => ({ ...item }));
  return cachedLegacyFishItems;
}

function requiredFieldMissing(record, field) {
  return record[field] === undefined || record[field] === null || record[field] === "";
}

function validateManifestRecord(record) {
  const missing = [];
  for (const field of [
    "sourceProvider",
    "sourceId",
    "sourceUrl",
    "fetchedAt",
    "contentHash",
    "parserVersion",
    "crawlStatus",
    "sourceCheckedAt",
    "imageUrls",
  ]) {
    if (requiredFieldMissing(record, field)) missing.push(field);
  }
  if (!Array.isArray(record.imageUrls)) missing.push("imageUrls_not_array");
  return missing;
}

function buildLegacyIndexes(fishItems) {
  const byName = new Map();
  const bySlug = new Map();
  const byId = new Map();
  const relatedByName = new Map();

  for (const item of fishItems) {
    const nameKey = normalizeText(item.name);
    const slugKey = legacySlugForName(item.name);
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(item);
    bySlug.set(slugKey, item);
    byId.set(item.id, item);
  }

  for (const item of fishItems) {
    const relations = Array.isArray(item.relatedFish) ? item.relatedFish : [];
    const resolved = [];
    for (const relatedName of relations) {
      const key = normalizeText(relatedName);
      const related = byName.get(key);
      if (related?.length) {
        for (const target of related) {
          resolved.push(target.id);
        }
      }
    }
    relatedByName.set(item.id, Array.from(new Set(resolved)));
  }

  return { byName, bySlug, byId, relatedByName };
}

function buildRelationCandidates(legacyItem, legacyIndexes) {
  if (!legacyItem) return [];
  const relatedIds = legacyIndexes.relatedByName.get(legacyItem.id) || [];
  return relatedIds.map((targetId) => {
    const target = legacyIndexes.byId.get(targetId);
    return {
      sourceSpeciesId: legacyItem.id,
      targetSpeciesId: targetId,
      relationType: "co_search",
      reason: "legacy_relatedFish_reference",
      sourceType: "official",
      reviewStatus: "approved",
      displayOrder: 0,
      targetDisplayName: target?.name || targetId,
    };
  });
}

function buildDiffRecord(record, legacyIndexes, allRecordsByScientific, allRecordsByName) {
  const koreanName = normalizeDisplayName(record.koreanName || record.title || "");
  const scientificName = normalizeDisplayName(record.scientificName || "");
  const manifestNameKey = normalizeText(koreanName);
  const scientificKey = normalizeScientificName(scientificName);
  const legacyMatches = legacyIndexes.byName.get(manifestNameKey) || [];
  const legacyMatchIds = legacyMatches.map((item) => item.id);
  const legacyMatchCategories = Array.from(new Set(legacyMatches.map((item) => item.category).filter(Boolean)));
  const candidateSlug = slugifyCandidate(koreanName || scientificName || record.sourceId);
  const candidateSlugCollision = Boolean(legacyIndexes.bySlug.get(candidateSlug));
  const relatedCandidates = legacyMatches.length === 1 ? buildRelationCandidates(legacyMatches[0], legacyIndexes) : [];

  const sameScientific = scientificKey ? allRecordsByScientific.get(scientificKey) || [] : [];
  const sameName = manifestNameKey ? allRecordsByName.get(manifestNameKey) || [] : [];
  const scientificConflicts = sameScientific.filter((item) => item.sourceId !== record.sourceId && normalizeText(item.koreanName) !== manifestNameKey);
  const koreanConflicts = sameName.filter((item) => item.sourceId !== record.sourceId && normalizeScientificName(item.scientificName) !== scientificKey);

  const missingRequiredFields = validateManifestRecord(record);
  const conflicts = [];
  if (candidateSlugCollision) conflicts.push("slug_collision");
  if (legacyMatches.length > 1) conflicts.push("name_conflict");
  if (scientificConflicts.length > 0) conflicts.push("taxonomy_conflict");
  if (koreanConflicts.length > 0) conflicts.push("korean_name_conflict");
  if (missingRequiredFields.length > 0) conflicts.push("missing_required_field");

  let action = "new_species_candidate";
  if (scientificConflicts.length > 0) {
    action = "scientific_name_conflict";
  } else if (koreanConflicts.length > 0) {
    action = "korean_name_conflict";
  } else if (legacyMatches.length > 0) {
    action = legacyMatches.length === 1 ? "existing_species_candidate" : "possible_duplicate";
  } else if (candidateSlugCollision) {
    action = "possible_duplicate";
  }

  const matchStatus = action === "existing_species_candidate"
    ? "matched"
    : action === "new_species_candidate"
      ? "unmatched"
      : "ambiguous";

  const confidence =
    action === "existing_species_candidate"
      ? "high"
      : action === "new_species_candidate"
        ? "medium"
        : action === "possible_duplicate"
          ? "medium"
          : "low";

  const suggestedAction =
    action === "existing_species_candidate"
      ? "link_existing_species"
      : action === "new_species_candidate"
        ? "create_species_draft"
        : action === "possible_duplicate"
          ? "manual_review_duplicate_candidate"
          : action === "scientific_name_conflict"
            ? "manual_review_taxonomy"
            : "manual_review_name";

  return {
    sourceId: record.sourceId,
    koreanName: koreanName || null,
    scientificName: scientificName || null,
    action,
    confidence,
    conflicts,
    suggestedAction,
    matchStatus,
    candidateSlug,
    candidateSlugCollision,
    legacyMatchIds,
    legacyMatchCategories,
    relationCandidates: relatedCandidates,
    reviewQueueTypes: Array.from(new Set([
      ...((candidateSlugCollision && legacyMatches.length === 0) ? ["duplicate_candidate"] : []),
      ...(legacyMatches.length > 1 ? ["duplicate_candidate"] : []),
      ...(scientificConflicts.length > 0 ? ["taxonomy_conflict"] : []),
      ...(koreanConflicts.length > 0 ? ["name_conflict"] : []),
      ...(missingRequiredFields.length > 0 ? ["missing_required_field"] : []),
    ])),
    missingRequiredFields,
    legacyMatchCount: legacyMatches.length,
  };
}

function buildStagingSchemaDiff({ records, fishItems }) {
  const legacyIndexes = buildLegacyIndexes(fishItems);
  const allRecordsByScientific = new Map();
  const allRecordsByName = new Map();
  for (const record of records) {
    const scientificKey = normalizeScientificName(record.scientificName || "");
    const nameKey = normalizeText(record.koreanName || record.title || "");
    if (scientificKey) {
      const list = allRecordsByScientific.get(scientificKey) || [];
      list.push(record);
      allRecordsByScientific.set(scientificKey, list);
    }
    if (nameKey) {
      const list = allRecordsByName.get(nameKey) || [];
      list.push(record);
      allRecordsByName.set(nameKey, list);
    }
  }

  const diffRecords = records.map((record) => buildDiffRecord(record, legacyIndexes, allRecordsByScientific, allRecordsByName));
  const reviewQueue = diffRecords
    .filter((record) => record.reviewQueueTypes.length > 0)
    .map((record) => ({
      sourceId: record.sourceId,
      koreanName: record.koreanName,
      scientificName: record.scientificName,
      type: record.reviewQueueTypes[0],
      conflicts: record.conflicts,
      reason: record.reviewQueueTypes.join(", "),
      confidence: record.confidence,
      suggestedAction: record.suggestedAction,
      candidateSlug: record.candidateSlug,
      candidateSlugCollision: record.candidateSlugCollision,
      legacyMatchIds: record.legacyMatchIds,
    }));

  const summary = {
    inputDir: DEFAULT_INPUT,
    totalRecords: records.length,
    matchedCount: diffRecords.filter((record) => record.matchStatus === "matched").length,
    unmatchedCount: diffRecords.filter((record) => record.matchStatus === "unmatched").length,
    ambiguousCount: diffRecords.filter((record) => record.matchStatus === "ambiguous").length,
    newSpeciesCandidateCount: diffRecords.filter((record) => record.action === "new_species_candidate").length,
    existingSpeciesCandidateCount: diffRecords.filter((record) => record.action === "existing_species_candidate").length,
    possibleDuplicateCount: diffRecords.filter((record) => record.action === "possible_duplicate").length,
    scientificNameConflictCount: diffRecords.filter((record) => record.action === "scientific_name_conflict").length,
    koreanNameConflictCount: diffRecords.filter((record) => record.action === "korean_name_conflict").length,
    slugCollisionCount: diffRecords.filter((record) => record.candidateSlugCollision).length,
    reviewQueueCount: reviewQueue.length,
    reviewQueueTypes: {
      name_conflict: reviewQueue.filter((item) => item.type === "name_conflict").length,
      taxonomy_conflict: reviewQueue.filter((item) => item.type === "taxonomy_conflict").length,
      duplicate_candidate: reviewQueue.filter((item) => item.type === "duplicate_candidate").length,
      missing_required_field: reviewQueue.filter((item) => item.type === "missing_required_field").length,
    },
  };

  return { summary, diffRecords, reviewQueue };
}

function reportMarkdown(report) {
  const s = report.summary;
  const lines = [];
  lines.push("# NIFS Staging Schema Diff");
  lines.push("");
  lines.push(`- Input dir: \`${report.inputDir}\``);
  lines.push(`- Legacy fish-data source: \`src/data/fish-data.ts\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Item | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| totalRecords | ${s.totalRecords} |`);
  lines.push(`| matchedCount | ${s.matchedCount} |`);
  lines.push(`| unmatchedCount | ${s.unmatchedCount} |`);
  lines.push(`| ambiguousCount | ${s.ambiguousCount} |`);
  lines.push(`| newSpeciesCandidateCount | ${s.newSpeciesCandidateCount} |`);
  lines.push(`| existingSpeciesCandidateCount | ${s.existingSpeciesCandidateCount} |`);
  lines.push(`| possibleDuplicateCount | ${s.possibleDuplicateCount} |`);
  lines.push(`| scientificNameConflictCount | ${s.scientificNameConflictCount} |`);
  lines.push(`| koreanNameConflictCount | ${s.koreanNameConflictCount} |`);
  lines.push(`| slugCollisionCount | ${s.slugCollisionCount} |`);
  lines.push(`| reviewQueueCount | ${s.reviewQueueCount} |`);
  lines.push("");
  lines.push("## Review queue");
  lines.push("");
  if (!report.reviewQueue.length) {
    lines.push("_No manual review items were generated from the current manifest set._");
  } else {
    lines.push("| sourceId | type | confidence | candidateSlug | reason |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of report.reviewQueue) {
      lines.push(`| ${item.sourceId} | ${item.type} | ${item.confidence} | ${item.candidateSlug || ""} | ${item.reason || ""} |`);
    }
  }
  lines.push("");
  lines.push("## Candidate notes");
  lines.push("");
  lines.push(`- Legacy name matches: ${s.existingSpeciesCandidateCount}`);
  lines.push(`- New species candidates: ${s.newSpeciesCandidateCount}`);
  lines.push(`- Slug collisions against legacy fish-data: ${s.slugCollisionCount}`);
  lines.push("");
  lines.push("## Determinism");
  lines.push("");
  lines.push("Records are sorted by sourceId. Candidate slugs and conflict lists are derived from normalized text only.");
  lines.push("");
  return lines.join("\n");
}

function runStagingSchemaDiff({ inputDir = DEFAULT_INPUT, outputJson = DEFAULT_OUTPUT_JSON, outputMd = DEFAULT_OUTPUT_MD, reviewQueuePath = DEFAULT_REVIEW_QUEUE } = {}) {
  const fishItems = loadLegacyFishItems();
  const records = loadManifestRecords(inputDir);
  const report = buildStagingSchemaDiff({ records, fishItems });
  const payload = {
    generatedAt: new Date().toISOString(),
    mode: "staging-schema-diff",
    inputDir: rel(path.resolve(process.cwd(), inputDir)),
    legacyFishDataPath: rel(FISH_DATA_PATH),
    summary: report.summary,
    records: report.diffRecords,
    reviewQueue: report.reviewQueue,
  };
  writeJson(path.resolve(process.cwd(), outputJson), payload);
  writeText(path.resolve(process.cwd(), outputMd), reportMarkdown(payload));
  writeJson(path.resolve(process.cwd(), reviewQueuePath), report.reviewQueue);
  return payload;
}

function main(argv = process.argv.slice(2)) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(arg, next);
      i += 1;
    } else {
      args.set(arg, true);
    }
  }
  const inputDir = args.get("--input") || DEFAULT_INPUT;
  const outputJson = args.get("--output-json") || DEFAULT_OUTPUT_JSON;
  const outputMd = args.get("--output-md") || DEFAULT_OUTPUT_MD;
  const reviewQueuePath = args.get("--review-queue") || DEFAULT_REVIEW_QUEUE;
  const payload = runStagingSchemaDiff({ inputDir, outputJson, outputMd, reviewQueuePath });
  process.stdout.write(`${JSON.stringify(payload.summary)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildStagingSchemaDiff,
  runStagingSchemaDiff,
  loadLegacyFishItems,
  loadManifestRecords,
  normalizeText,
  normalizeScientificName,
  normalizeDisplayName,
  slugifyCandidate,
  legacySlugForName,
};

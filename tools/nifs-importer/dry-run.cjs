#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_FIELDS = [
  "sourceProvider",
  "sourceId",
  "sourceUrl",
  "fetchedAt",
  "contentHash",
  "parserVersion",
  "crawlStatus",
  "imageUrls",
  "sourceCheckedAt",
];

const CRAWL_STATUSES = new Set([
  "pending",
  "crawling",
  "success",
  "complete",
  "partial",
  "failed",
  "missing",
  "archived",
]);

const FORBIDDEN_STAGING_FIELDS = ["id", "slug", "publishStatus", "factReviewStatus"];

function sourceKey(record) {
  return `${record.sourceProvider}\u0000${record.sourceId}`;
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

function readManifestRecords(inputDirectory) {
  return listJsonFiles(inputDirectory).flatMap((filePath) => {
    const value = readJson(filePath);
    const records = Array.isArray(value) ? value : Array.isArray(value.records) ? value.records : [value];
    return records.map((record) => ({ ...record, __file: path.relative(process.cwd(), filePath) }));
  });
}

function readBaseline(baselinePath) {
  if (!baselinePath || !fs.existsSync(baselinePath)) return [];
  const value = readJson(baselinePath);
  return Array.isArray(value) ? value : value.records || [];
}

function validateRecord(record) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      errors.push(`MISSING_${field}`);
    }
  }
  if (!record.rawHtmlPath && !record.rawPayloadPath) errors.push("MISSING_RAW_PATH");
  if (record.imageUrls !== undefined && !Array.isArray(record.imageUrls)) errors.push("INVALID_imageUrls");
  if (record.crawlStatus && !CRAWL_STATUSES.has(record.crawlStatus)) errors.push("INVALID_crawlStatus");
  if (record.fetchedAt && !isIsoDate(record.fetchedAt)) errors.push("INVALID_fetchedAt");
  if (record.sourceCheckedAt && !isIsoDate(record.sourceCheckedAt)) errors.push("INVALID_sourceCheckedAt");
  if (record.contentHash && !/^[a-f0-9]{64}$/i.test(record.contentHash)) errors.push("INVALID_contentHash");
  for (const field of FORBIDDEN_STAGING_FIELDS) {
    if (record[field] !== undefined) errors.push(`FORBIDDEN_${field}`);
  }
  return errors;
}

function normalizeName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";
}

function recordCandidate(record) {
  const candidate = record.normalizedCandidate;
  if (!candidate || typeof candidate !== "object") return null;
  const forbidden = FORBIDDEN_STAGING_FIELDS.filter((field) => candidate[field] !== undefined);
  return { candidate, forbidden };
}

function diffCandidate(current, next) {
  if (!next) return [];
  const prior = current?.normalizedCandidate || {};
  const keys = new Set([...Object.keys(prior), ...Object.keys(next)]);
  return [...keys].filter((key) => JSON.stringify(prior[key]) !== JSON.stringify(next[key]));
}

function buildTransactionPlan(record, current) {
  if (!current) {
    return ["insert_source_version", "create_change_log", "queue_normalization_review"];
  }
  if (current.contentHash === record.contentHash) return ["update_last_seen_only"];
  return [
    "insert_source_version",
    "unset_previous_current_version",
    "set_new_current_version",
    "create_change_log",
    "queue_normalization_review",
  ];
}

function simulateTransaction(plan, failAt) {
  const executed = [];
  for (const operation of plan) {
    if (operation === failAt) {
      return { committed: false, rolledBack: true, executed: [] };
    }
    executed.push(operation);
  }
  return { committed: true, rolledBack: false, executed };
}

function runDryRun(records, baseline) {
  const currentByKey = new Map(baseline.map((record) => [sourceKey(record), record]));
  const seenKeys = new Map();
  const names = new Map();
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    databaseTouched: false,
    supabaseCalled: false,
    totals: {
      stagingRecords: records.length,
      validRecords: 0,
      newSourceRecords: 0,
      sameHashSkips: 0,
      changedHashVersions: 0,
      sourceMissingCandidates: 0,
      schemaErrors: 0,
      duplicateSourceKeys: 0,
      scientificNameDuplicateCandidates: 0,
      slugCollisionCandidates: 0,
      normalizationCandidateDiffs: 0,
      manualReviewOverwriteRisks: 0,
    },
    schemaErrors: [],
    duplicateSourceKeys: [],
    scientificNameDuplicateCandidates: [],
    slugCollisionCandidates: [],
    normalizationCandidateDiffs: [],
    manualReviewOverwriteRisks: [],
    sourcePlans: [],
    sourceMissingCandidates: [],
    transactionPolicy: {
      newHash: [
        "insert_source_version",
        "unset_previous_current_version",
        "set_new_current_version",
        "create_change_log",
        "queue_normalization_review",
      ],
      failure: "rollback_all_and_keep_existing_current_and_published_data",
    },
  };

  for (const record of records) {
    const errors = validateRecord(record);
    const key = record.sourceProvider && record.sourceId ? sourceKey(record) : null;
    if (key) {
      const earlier = seenKeys.get(key);
      if (earlier) {
        report.duplicateSourceKeys.push({ sourceProvider: record.sourceProvider, sourceId: record.sourceId, files: [earlier.__file, record.__file] });
      } else {
        seenKeys.set(key, record);
      }
    }
    if (errors.length) {
      report.schemaErrors.push({ file: record.__file, sourceProvider: record.sourceProvider, sourceId: record.sourceId, errors });
      continue;
    }
    report.totals.validRecords += 1;
    const candidateWrapper = recordCandidate(record);
    if (candidateWrapper?.forbidden.length) {
      report.schemaErrors.push({
        file: record.__file,
        sourceProvider: record.sourceProvider,
        sourceId: record.sourceId,
        errors: candidateWrapper.forbidden.map((field) => `FORBIDDEN_normalizedCandidate.${field}`),
      });
      continue;
    }
    const current = currentByKey.get(key);
    const plan = buildTransactionPlan(record, current);
    const status = !current ? "new" : current.contentHash === record.contentHash ? "same_hash_skip" : "new_version";
    report.sourcePlans.push({ sourceProvider: record.sourceProvider, sourceId: record.sourceId, status, transactionPlan: plan });
    if (status === "new") report.totals.newSourceRecords += 1;
    if (status === "same_hash_skip") report.totals.sameHashSkips += 1;
    if (status === "new_version") report.totals.changedHashVersions += 1;
    if (record.crawlStatus === "missing") report.sourceMissingCandidates.push({ sourceProvider: record.sourceProvider, sourceId: record.sourceId, file: record.__file });

    const name = normalizeName(candidateWrapper?.candidate.koreanName || record.koreanName);
    if (name) {
      const group = names.get(name) || [];
      group.push({ sourceProvider: record.sourceProvider, sourceId: record.sourceId });
      names.set(name, group);
    }
    const candidateDiff = diffCandidate(current, candidateWrapper?.candidate);
    if (candidateDiff.length) {
      report.normalizationCandidateDiffs.push({ sourceProvider: record.sourceProvider, sourceId: record.sourceId, fields: candidateDiff, status });
    }
    for (const field of current?.manualProtectedFields || []) {
      if (candidateWrapper?.candidate && candidateDiff.includes(field)) {
        report.manualReviewOverwriteRisks.push({ sourceProvider: record.sourceProvider, sourceId: record.sourceId, field, action: "manual_review_required" });
      }
    }
  }

  for (const group of names.values()) {
    if (group.length > 1) {
      report.slugCollisionCandidates.push({ reason: "same_display_name_requires_admin_slug_resolution", records: group });
    }
  }
  const scientificNames = new Map();
  for (const record of records) {
    const scientificName = normalizeName(record.normalizedCandidate?.scientificName);
    if (!scientificName) continue;
    const group = scientificNames.get(scientificName) || [];
    group.push({ sourceProvider: record.sourceProvider, sourceId: record.sourceId });
    scientificNames.set(scientificName, group);
  }
  for (const [scientificName, group] of scientificNames) {
    if (group.length > 1) report.scientificNameDuplicateCandidates.push({ scientificName, records: group });
  }

  report.totals.schemaErrors = report.schemaErrors.length;
  report.totals.duplicateSourceKeys = report.duplicateSourceKeys.length;
  report.totals.sourceMissingCandidates = report.sourceMissingCandidates.length;
  report.totals.scientificNameDuplicateCandidates = report.scientificNameDuplicateCandidates.length;
  report.totals.slugCollisionCandidates = report.slugCollisionCandidates.length;
  report.totals.normalizationCandidateDiffs = report.normalizationCandidateDiffs.length;
  report.totals.manualReviewOverwriteRisks = report.manualReviewOverwriteRisks.length;
  return report;
}

function reportMarkdown(report) {
  const total = report.totals;
  return `# NIFS Import Dry Run\n\n` +
    `- Mode: ${report.mode}\n` +
    `- Database touched: ${report.databaseTouched}\n` +
    `- Supabase called: ${report.supabaseCalled}\n\n` +
    `## Summary\n\n` +
    `| Item | Count |\n| --- | ---: |\n` +
    Object.entries(total).map(([key, value]) => `| ${key} | ${value} |`).join("\n") + "\n\n" +
    `## Transaction safety\n\n` +
    `A changed source hash would run: ${report.transactionPolicy.newHash.join(" -> ")}. ` +
    `Any failure rolls the transaction back; the previous current version and published data remain unchanged.\n\n` +
    `## Review queues\n\n` +
    `- Schema errors: ${report.schemaErrors.length}\n` +
    `- Duplicate source keys: ${report.duplicateSourceKeys.length}\n` +
    `- Scientific-name duplicate candidates: ${report.scientificNameDuplicateCandidates.length}\n` +
    `- Slug collision candidates: ${report.slugCollisionCandidates.length}\n` +
    `- Manual overwrite risks: ${report.manualReviewOverwriteRisks.length}\n`;
}

function writeReports(report, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "nifs-import-dry-run.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDirectory, "nifs-import-dry-run.md"), reportMarkdown(report));
}

function parseArgs(args) {
  const options = { input: "data-import/nifs/manifest", baseline: null, output: "reports" };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--input") options.input = args[++index];
    else if (value === "--baseline") options.baseline = args[++index];
    else if (value === "--output") options.output = args[++index];
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = runDryRun(readManifestRecords(options.input), readBaseline(options.baseline));
  writeReports(report, options.output);
  process.stdout.write(`${JSON.stringify(report.totals)}\n`);
}

if (require.main === module) main();

module.exports = {
  buildTransactionPlan,
  readManifestRecords,
  runDryRun,
  simulateTransaction,
  validateRecord,
};

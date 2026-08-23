"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { readManifestRecords, runDryRun, simulateTransaction } = require("./dry-run.cjs");

const root = path.join(__dirname, "fixtures");
const records = readManifestRecords(path.join(root, "manifests"));
const baseline = require("./fixtures/current-source-records.json");
const report = runDryRun(records, baseline);

test("dry run separates same hash, changed hash, and new source versions", () => {
  assert.equal(report.totals.sameHashSkips, 1);
  assert.equal(report.totals.changedHashVersions, 1);
  assert.equal(report.totals.newSourceRecords, 1);
});

test("dry run reports contract errors without DB work", () => {
  assert.equal(report.databaseTouched, false);
  assert.equal(report.supabaseCalled, false);
  assert.equal(report.totals.schemaErrors, 1);
  assert.match(report.schemaErrors[0].errors.join(" "), /MISSING_sourceCheckedAt/);
});

test("dry run protects manual fields and identifies source missing candidates", () => {
  assert.equal(report.totals.manualReviewOverwriteRisks, 1);
  assert.equal(report.totals.sourceMissingCandidates, 1);
});

test("transaction failure is a complete rollback simulation", () => {
  const changedPlan = report.sourcePlans.find((plan) => plan.status === "new_version").transactionPlan;
  const result = simulateTransaction(changedPlan, "create_change_log");
  assert.deepEqual(result, { committed: false, rolledBack: true, executed: [] });
});

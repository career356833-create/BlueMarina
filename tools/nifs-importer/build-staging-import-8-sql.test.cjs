"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "tools/nifs-importer/build-staging-import-8-sql.cjs");
const SQL_PATH = path.join(ROOT, "data-import/nifs/reports/staging-import-8.sql");

test("staging import SQL is fixed to the approved eight-record transaction", () => {
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const sourceIds = [...new Set([...sql.matchAll(/fish_\d+/g)].map((match) => match[0]))];

  assert.equal(sourceIds.length, 8);
  assert.match(sql, /begin;/i);
  assert.match(sql, /commit;/i);
  assert.match(sql, /\\set ON_ERROR_STOP on/);
  assert.doesNotMatch(sql, /fish_generated_contents|fish_observations\s*\(|fish_collections\s*\(|regulation_rules\s*\(|storage\./i);
  assert.doesNotMatch(sql, /postgres(?:ql)?:\/\/|password|service_role/i);
});

test("approved candidate keeps Jeju normalization and oil flounder source missing", () => {
  const candidates = JSON.parse(
    fs.readFileSync(path.join(ROOT, "reports/nifs-fish-species-candidates.json"), "utf8")
  ).candidates;
  const jeju = candidates.find((candidate) => candidate.sourceId === "fish_1575880014320");
  const oil = candidates.find((candidate) => candidate.sourceId === "fish_1576639605223");

  assert.equal(candidates.length, 8);
  assert.equal(jeju.scientificName, "Turbo cornutus");
  assert.equal(jeju.rawScientificName, "Turbo cornutus, Batillus cornutus");
  assert.equal(jeju.officialFacts.scientificName, jeju.rawScientificName);
  assert.deepEqual(jeju.scientificNameAliases, ["Batillus cornutus"]);
  assert.equal(oil.season, null);
  assert.equal(oil.seasonSourceStatus, "source_missing");
});

#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "../..");
const OUTPUT_ROOT = path.join(ROOT, "data/nifs/fishing-condition/ocean-section/climatology/v1");
const REPORT_PATH = path.join(ROOT, "reports/nifs/ocean-section-climatology-quality-v1.json");
const START_YEAR = 2016;
const END_YEAR = 2025;
const TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 8_000_000;
const MAX_YEAR_ROWS = 25_000;
const REQUEST_DELAY_MS = 250;
const moduleCache = new Map();

function loadTs(file) {
  const resolved = path.resolve(file);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved).exports;
  const source = fs.readFileSync(resolved, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  moduleCache.set(resolved, module);
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) return require(specifier);
    const candidate = path.resolve(path.dirname(resolved), specifier);
    return loadTs(fs.existsSync(candidate) ? candidate : `${candidate}.ts`);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, module, module.exports, resolved, path.dirname(resolved));
  return module.exports;
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function rows(payload) {
  const item = payload?.body?.item;
  if (Array.isArray(item)) return item.filter((row) => row && typeof row === "object");
  return item && typeof item === "object" ? [item] : [];
}

async function fetchRows(baseUrl, apiKey, params) {
  const url = new URL(baseUrl);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const started = Date.now();
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_RESPONSE_BYTES) throw new Error("UPSTREAM_RESPONSE_TOO_LARGE");
  const payload = JSON.parse(buffer.toString("utf8"));
  if (String(payload?.header?.resultCode) !== "00") throw new Error("UPSTREAM_CONTRACT_ERROR");
  return { rows: rows(payload), latencyMs: Date.now() - started, responseBytes: buffer.byteLength };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const buildStarted = Date.now();
  loadEnvLocal();
  const apiKey = process.env.NIFS_SOO_API_KEY;
  if (!apiKey) throw new Error("NIFS_SOO_API_KEY_MISSING");
  const codeUrl = process.env.NIFS_SOO_CODE_URL ?? "https://www.nifs.go.kr/OpenAPI_json?id=sooCode";
  const listUrl = process.env.NIFS_SOO_LIST_URL ?? "https://www.nifs.go.kr/OpenAPI_json?id=sooList";
  const ocean = loadTs(path.join(ROOT, "src/lib/fishing-condition/nifs-ocean-section.ts"));
  const climatology = loadTs(path.join(ROOT, "src/lib/fishing-condition/nifs-ocean-section-climatology.ts"));

  const metadataRows = {};
  const metadataFetches = [];
  for (const region of ocean.NIFS_OCEAN_SECTION_REGIONS) {
    const result = await fetchRows(codeUrl, apiKey, { gru_nam: region });
    metadataRows[region] = result.rows;
    metadataFetches.push({ region, rows: result.rows.length, latencyMs: result.latencyMs, responseBytes: result.responseBytes });
    await sleep(REQUEST_DELAY_MS);
  }

  const profiles = [];
  const annualFetches = [];
  let rawRows = 0;
  let normalizedDepthRows = 0;
  let exactDuplicateRows = 0;
  let conflictingDuplicateRows = 0;
  let invalidRows = 0;
  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const startDate = `${year}0101`;
    const endDate = `${year}1231`;
    const result = await fetchRows(listUrl, apiKey, { sdate: startDate, edate: endDate });
    if (result.rows.length > MAX_YEAR_ROWS) throw new Error(`YEAR_ROW_LIMIT_${year}`);
    const normalized = ocean.buildNifsOceanSectionDataset(metadataRows, result.rows);
    if (normalized.quality.conflictingDuplicateRows > 0) throw new Error(`CONFLICTING_SOURCE_ROWS_${year}`);
    profiles.push(...normalized.profiles);
    rawRows += result.rows.length;
    normalizedDepthRows += normalized.quality.depthSamples;
    exactDuplicateRows += normalized.quality.exactDuplicateRows;
    conflictingDuplicateRows += normalized.quality.conflictingDuplicateRows;
    invalidRows += normalized.quality.invalidProfileRows;
    annualFetches.push({ year, startDate, endDate, rows: result.rows.length, profiles: normalized.profiles.length, latencyMs: result.latencyMs, responseBytes: result.responseBytes });
    await sleep(REQUEST_DELAY_MS);
  }

  const built = climatology.buildOceanSectionTemperatureClimatology(profiles, climatology.NIFS_OCEAN_SECTION_CLIMATOLOGY_MIN_SAMPLES);
  if (built.quality.conflictingDuplicateSamples > 0) throw new Error("CONFLICTING_CLIMATOLOGY_SAMPLES");
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const files = [];
  for (let month = 1; month <= 12; month += 1) {
    const fileName = `month-${String(month).padStart(2, "0")}.ndjson`;
    const content = built.cells.filter((cell) => cell.month === month).map((cell) => JSON.stringify(cell)).join("\n") + "\n";
    fs.writeFileSync(path.join(OUTPUT_ROOT, fileName), content, "utf8");
    files.push({ month, path: fileName, cells: built.cells.filter((cell) => cell.month === month).length, bytes: Buffer.byteLength(content), sha256: sha256(content) });
  }
  const artifactSha256 = sha256(files.map((file) => `${file.month}:${file.sha256}`).join("\n"));
  const generatedAt = new Date().toISOString();
  const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, index) => START_YEAR + index);
  const manifest = {
    schemaVersion: "1.0",
    generatedAt,
    source: { provider: "NIFS", sourceId: "nifs-soo-climatology", qualityClass: "DERIVED_HISTORICAL_BASELINE", derivedFrom: "nifs-soo" },
    historyWindow: { startYear: START_YEAR, endYear: END_YEAR, years },
    minSamples: climatology.NIFS_OCEAN_SECTION_CLIMATOLOGY_MIN_SAMPLES,
    cellCount: built.cells.length,
    files,
    artifactSha256,
  };
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  fs.writeFileSync(path.join(OUTPUT_ROOT, "manifest.json"), manifestText, "utf8");
  const artifactBytes = files.reduce((sum, file) => sum + file.bytes, 0) + Buffer.byteLength(manifestText);
  const report = {
    reportVersion: "1.0",
    generatedAt,
    status: "MONTHLY_DEPTH_CLIMATOLOGY_V1_READY_ANOMALY_BLOCKED",
    historyWindow: { startYear: START_YEAR, endYear: END_YEAR, years, selectionReason: "LATEST_TEN_COMPLETE_CALENDAR_YEARS_FOR_STATION_CONTINUITY_COST_CONTROL_AND_CURRENT_CLIMATE_RELEVANCE" },
    fetch: { strategy: "SEQUENTIAL_ONE_CALENDAR_YEAR_PER_REQUEST_NO_RETRY", delayMs: REQUEST_DELAY_MS, metadata: metadataFetches, annual: annualFetches, errors: [] },
    source: { rawRows, profiles: profiles.length, normalizedDepthRows, stations: new Set(profiles.map((profile) => profile.stationId)).size, exactDuplicateRows, conflictingDuplicateRows, invalidRows },
    climatology: built.quality,
    policy: { key: "stationId+calendarMonth+exactSourceDepth", minSamples: climatology.NIFS_OCEAN_SECTION_CLIMATOLOGY_MIN_SAMPLES, standardDeviation: "SAMPLE_N_MINUS_1", qcFiltering: false, qcReason: "NIFS_QC_DICTIONARY_NOT_CONFIRMED", unit: "UNIT_NOT_DOCUMENTED", salinityBaselineEmitted: false, dissolvedOxygenBaselineEmitted: false },
    mapping: { risaToSooStation: "ANOMALY_MAPPING_BLOCKED", reason: "NO_OFFICIAL_EXACT_CROSSWALK", depth: "DEPTH_MAPPING_BLOCKED", depthReason: "RISA_LAYER_TO_SOO_EXACT_DEPTH_CROSSWALK_NOT_FOUND", unitCompatibility: "UNIT_COMPATIBILITY_BLOCKED", unitReason: "RISA_DEGC_BUT_SOO_TEMPERATURE_UNIT_NOT_DOCUMENTED", anomalyEnabled: false },
    artifact: { format: "MONTH_CHUNKED_NDJSON_WITH_JSON_MANIFEST", files: 13, cells: built.cells.length, bytes: artifactBytes, sha256: artifactSha256, root: "data/nifs/fishing-condition/ocean-section/climatology/v1" },
    build: { durationMs: Date.now() - buildStarted, reproducible: true, rawOfficialPayloadPersisted: false, databaseWrites: 0, supabaseChanges: 0, scoreImplemented: false, recommendationImplemented: false },
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify({ status: report.status, years: years.length, rawRows, profiles: profiles.length, cells: built.cells.length, excluded: built.quality.excludedLowSampleCells, artifactBytes, artifactSha256, durationMs: report.build.durationMs }));
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ status: "BUILD_FAILED", code: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});

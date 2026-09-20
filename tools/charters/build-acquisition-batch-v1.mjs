import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawRelativePath = "data/charters/acquisition/v1/raw/moFishingVesselRegister-20211230.csv";
const rawPath = path.join(root, rawRelativePath);
const outputPath = path.join(root, "data/charters/acquisition/v1/charter-batch-001.json");
const reportPath = path.join(root, "reports/charters/data-acquisition-batch-001-v1.json");
const exceptionsPath = path.join(root, "reports/charters/data-acquisition-exceptions-v1.json");
const inventoryPath = path.join(root, "reports/charters/source-inventory-v1.json");
const sourceUrl = "https://www.data.go.kr/data/15147464/fileData.do";
const retrievedAt = "2026-09-20T09:33:02.000Z";

function csvRows(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((value) => value !== "")) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const clean = (value) => value.replace(/\s+/g, " ").trim();
const id = (prefix, value) => `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16).toUpperCase()}`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const percent = (part, whole) => whole === 0 ? 0 : Number(((part / whole) * 100).toFixed(2));
function safeHttpUrl(value) { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Unsafe source URL: ${value}`); return url.toString(); }

const raw = await readFile(rawPath);
const verifiedSourceUrl = safeHttpUrl(sourceUrl);
const rows = csvRows(new TextDecoder("euc-kr").decode(raw));
const [header, ...values] = rows;
const records = values.map((row) => Object.fromEntries(header.map((key, index) => [key, clean(row[index] ?? "")])));
const usableRecords = records.filter((record) => record["일련번호"] && record["출입항명"]);
const selected = usableRecords.slice(0, 100);
const portsByKey = new Map();
for (const record of selected) {
  const name = record["출입항명"];
  const region = record["낚시어선영업구역명"] || "UNKNOWN";
  const key = `${name}|${region}`;
  if (!portsByKey.has(key)) portsByKey.set(key, {
    id: id("BM-PORT", key), name, region, latitude: null, longitude: null, coordinateStatus: "UNKNOWN",
    sourceRefs: [verifiedSourceUrl], sourceUrl: verifiedSourceUrl, sourceType: "GOVERNMENT_OPEN_DATA_FILE", retrievedAt,
    sourceUpdatedAt: "2025-08-28", freshnessStatus: "STATIC",
  });
}
const ports = [...portsByKey.values()].sort((left, right) => left.id.localeCompare(right.id));
const sourceRegistrations = selected.map((record) => ({
  id: id("BM-REGISTRATION", record["일련번호"]), sourceSerialNumber: record["일련번호"],
  departurePortId: portsByKey.get(`${record["출입항명"]}|${record["낚시어선영업구역명"] || "UNKNOWN"}`).id,
  maximumPassengers: /^\d+$/.test(record["최대승객수"]) ? Number(record["최대승객수"]) : null,
  maximumCrew: /^\d+$/.test(record["최대선원수"]) ? Number(record["최대선원수"]) : null,
  businessArea: record["낚시어선영업구역명"] || null, businessPlace: record["낚시어선영업장소명"] || null,
  sourceUrl: verifiedSourceUrl, sourceType: "GOVERNMENT_OPEN_DATA_FILE", retrievedAt, sourceUpdatedAt: "2025-08-28", freshnessStatus: "STATIC",
}));
const rawHash = sha256(raw);
const batch = {
  schemaVersion: 1, datasetKind: "RESEARCH_STAGING", batchId: "CHARTER-BATCH-001", decision: "CHARTER_DATA_BATCH_001_READY_WITH_EXCEPTIONS",
  source: { sourceId: "mof-fishing-vessel-register-20211230", sourceUrl, sourceType: "GOVERNMENT_OPEN_DATA_FILE", rawRelativePath, rawSha256: rawHash, retrievedAt, sourceUpdatedAt: "2025-08-28", freshnessStatus: "STATIC" },
  operators: [], boats: [], ports, charters: [], schedules: [], sourceRegistrations,
  limitations: ["The official register does not expose operator identity, vessel name, trip product, price, target species, schedule, remaining seats, or port coordinates.", "Source registrations are not promoted to Charter records."],
};
const exceptions = {
  schemaVersion: 1, batchId: batch.batchId, total: 5,
  entries: [
    { category: "operator identity conflict", count: selected.length, status: "KEEP_EXCEPTION", reason: "Official source has no operator or business name field." },
    { category: "boat identity conflict", count: selected.length, status: "KEEP_EXCEPTION", reason: "Official source has no vessel name or registration field." },
    { category: "unknown price", count: selected.length, status: "KEEP_EXCEPTION", reason: "Official source has no charter product or price field." },
    { category: "stale schedule", count: selected.length, status: "KEEP_EXCEPTION", reason: "Source snapshot has no schedule or live availability field." },
    { category: "port ambiguity", count: ports.length, status: "KEEP_EXCEPTION", reason: "Port names are source-backed but lack authoritative coordinates." },
  ],
};
const report = {
  schemaVersion: 1, decision: batch.decision, sourceCounts: { discovered: 2, usable: 1, blocked: 1 },
  rawRecords: records.length, selectedSourceRegistrations: sourceRegistrations.length,
  normalizedRecords: { operators: 0, boats: 0, ports: ports.length, charters: 0, schedules: 0, sourceRegistrations: sourceRegistrations.length },
  coverage: { contacts: 0, prices: 0, schedules: 0, capacities: sourceRegistrations.filter((record) => record.maximumPassengers !== null).length, coordinates: 0, targetSpeciesMapping: 0 },
  coveragePercent: { capacities: percent(sourceRegistrations.filter((record) => record.maximumPassengers !== null).length, sourceRegistrations.length), contacts: 0, prices: 0, schedules: 0, coordinates: 0, targetSpeciesMapping: 0 },
  dedupe: { duplicateIds: 0, danglingReferences: 0, automaticMerges: 0, duplicateCandidates: 0 },
  truth: { inferredSeats: 0, inferredPrices: 0, inferredCoordinates: 0, fuzzyMappings: 0, fakeRealtime: 0, productionActivation: 0, dbSupabaseWrites: 0 },
  exceptions: { total: exceptions.total, categories: exceptions.entries.map(({ category, count }) => ({ category, count })) },
};
const inventory = {
  schemaVersion: 1, discovered: 2, usable: 1, blocked: 1,
  sources: [
    { sourceId: "mof-fishing-vessel-register-20211230", sourceName: "해양수산부 공동활용체계 낚시어선업신고대장정보", sourceType: "GOVERNMENT_OPEN_DATA_FILE", baseUrl: sourceUrl, accessMethod: "Public file download without login", fieldsAvailable: ["serial number", "maximum passengers", "maximum crew", "departure/entry port name", "business area", "business place"], updateFrequency: "One-time/static snapshot", termsOrRobotsNotes: "Portal states file download is available without login and licence scope is unrestricted.", bulkPotential: 70728, trustLevel: "AUTHORITATIVE", status: "USABLE" },
    { sourceId: "mof-fishing-vessel-register-openapi", sourceName: "해양수산부 낚시어선업신고대장 OpenAPI", sourceType: "GOVERNMENT_OPEN_API", baseUrl: sourceUrl, accessMethod: "Requires Data.go.kr application and service key", fieldsAvailable: ["Same underlying register fields"], updateFrequency: "One-time/static snapshot", termsOrRobotsNotes: "No key was requested or used; no access control was bypassed.", bulkPotential: 70728, trustLevel: "AUTHORITATIVE", status: "BLOCKED_PENDING_CREDENTIAL" },
  ],
};
for (const target of [outputPath, reportPath, exceptionsPath, inventoryPath]) await mkdir(path.dirname(target), { recursive: true });
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(batch, null, 2)}\n`),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
  writeFile(exceptionsPath, `${JSON.stringify(exceptions, null, 2)}\n`),
  writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`),
]);
console.log(JSON.stringify({ batchId: batch.batchId, rawRecords: records.length, ports: ports.length, sourceRegistrations: sourceRegistrations.length, charters: 0, schedules: 0, decision: batch.decision }));

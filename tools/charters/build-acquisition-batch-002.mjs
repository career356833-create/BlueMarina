import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const observationsPath = path.join(root, "data/charters/acquisition/v1/raw/batch-002/source-observations.json");
const batch001Path = path.join(root, "data/charters/acquisition/v1/charter-batch-001.json");
const batchPath = path.join(root, "data/charters/acquisition/v1/charter-batch-002.json");
const inventoryPath = path.join(root, "reports/charters/source-inventory-v2.json");
const reportPath = path.join(root, "reports/charters/data-acquisition-batch-002-v1.json");
const exceptionsPath = path.join(root, "reports/charters/data-acquisition-exceptions-v2.json");
const parse = async (target) => JSON.parse(await readFile(target, "utf8"));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const safeUrl = (value) => { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Unsafe URL: ${value}`); return url.toString(); };

const observations = await parse(observationsPath);
const batch001 = await parse(batch001Path);
for (const source of observations.sources) source.url = safeUrl(source.url);
const usable = observations.sources.filter((source) => source.status === "USABLE");
const blocked = observations.sources.filter((source) => source.status !== "USABLE");

const batch = {
  schemaVersion: 1,
  datasetKind: "RESEARCH_STAGING",
  batchId: "CHARTER-OFFER-BATCH-002",
  decision: "CHARTER_OFFER_SOURCE_INSUFFICIENT",
  sourceObservationSha256: digest(JSON.stringify(observations)),
  operators: [], boats: [], ports: [], charters: [], schedules: [],
  sourceRefs: observations.sources.map((source) => source.url),
  batch001Crosswalk: { exactMatch: 0, highConfidence: 0, candidate: 0, noMatch: 0, candidateAutoPromoted: 0, registrationsReviewed: 0, availableBatch001Registrations: batch001.sourceRegistrations.length },
  promotion: { promotionReady: 0, promotionReadyWithLimitations: 0, reviewRequired: 0, notEligible: 0 },
  policies: { sourceUrlRequired: true, numericUnknown: null, availabilityDefault: "UNKNOWN", fuzzySpeciesMapping: false, candidateCrosswalkProductionSafe: false, registrationWithoutServiceEvidenceBecomesCharter: false },
  limitations: ["No source met both the bulk target and the documented access/reuse boundary.", "No operator, boat, offer, price, schedule, remaining-seat, coordinate, or availability value was inferred."],
};
const inventory = {
  schemaVersion: 2, discovered: observations.sources.length, usable: usable.length, blocked: blocked.length,
  sources: observations.sources.map((source) => ({ ...source, domain: new URL(source.url).hostname })),
};
const exceptions = {
  schemaVersion: 2, batchId: batch.batchId, total: blocked.length,
  entries: blocked.map((source) => ({ category: "blocked source", sourceId: source.sourceId, status: "KEEP_EXCEPTION", reason: source.reason })),
  categoryBatches: [{ category: "blocked source", count: blocked.length, nextAction: "Resolve access/licensing or obtain an authorized documented bulk feed before collection." }],
};
const report = {
  schemaVersion: 1, decision: batch.decision,
  sources: { discovered: observations.sources.length, usable: usable.length, blocked: blocked.length },
  entities: { operators: 0, boats: 0, ports: 0, charters: 0, schedules: 0 },
  coverage: { contacts: 0, prices: 0, schedules: 0, capacities: 0, targetSpecies: 0, verifiedCoordinates: 0, externalBookingLinks: 0 },
  crosswalk: batch.batch001Crosswalk, promotion: batch.promotion,
  exceptions: { total: exceptions.total, categories: exceptions.categoryBatches },
  truth: { fakeRealtime: 0, inferredPrices: 0, inferredSeats: 0, inferredSchedules: 0, inferredCoordinates: 0, fuzzyMappings: 0, productionActivation: 0, runtimeListingMutation: 0, dbSupabaseWrites: 0 },
};
for (const target of [batchPath, inventoryPath, reportPath, exceptionsPath]) await mkdir(path.dirname(target), { recursive: true });
await Promise.all([
  writeFile(batchPath, `${JSON.stringify(batch, null, 2)}\n`),
  writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
  writeFile(exceptionsPath, `${JSON.stringify(exceptions, null, 2)}\n`),
]);
console.log(JSON.stringify({ decision: batch.decision, discovered: observations.sources.length, usable: usable.length, blocked: blocked.length, charters: batch.charters.length }));

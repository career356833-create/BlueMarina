import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crosswalkMofBatch001 } from "../../src/lib/charters/onboarding/crosswalk.ts";
import { isSafeHttpUrl, normalizePhone, resolveSpeciesExact, validateSubmission } from "../../src/lib/charters/onboarding/validation.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};

const evidence = read("data/charters/pilot/v1/source-evidence-v1.json");
const inventory = read("data/fish-canonical/bulk/v1/canonical-inventory-v1.json");
const approvedAliases = read("data/mbris/mappings/fish-data-approved-aliases.json");
const mof = read("data/charters/acquisition/v1/charter-batch-001.json");
const canonical = inventory.species.map(({ speciesId, koreanName }) => ({ id: speciesId, name: koreanName }));
const aliases = approvedAliases.filter((item) => item.approvalStatus === "approved")
  .map((item) => ({ alias: item.sourceName, canonicalId: item.internalId, safe: true }));
const mofPorts = new Map(mof.ports.map((item) => [item.id, item]));
const registrations = mof.sourceRegistrations.map((item) => ({
  id: item.id,
  portName: mofPorts.get(item.departurePortId)?.name ?? item.businessPlace ?? "",
  capacity: item.maximumPassengers,
  registrationInfo: item.sourceSerialNumber,
}));

const operators = [];
const boats = [];
const ports = [];
const charters = [];
const submissions = [];
const exceptions = [];
const researchPreviewEntries = [];
const seenPhones = new Set();
const seenOffers = new Set();
for (const raw of evidence.operators) {
  const operatorId = `BM-PILOT-OP-${raw.key.toUpperCase()}`;
  const boatId = raw.boatName ? `BM-PILOT-BOAT-${raw.key.toUpperCase()}` : null;
  const portId = raw.portName ? `BM-PILOT-PORT-${raw.key.toUpperCase()}` : null;
  const phone = normalizePhone(raw.phone ?? "");
  const sourceUrlValid = isSafeHttpUrl(raw.sourceUrl) && isSafeHttpUrl(raw.websiteUrl);
  if (!sourceUrlValid || !phone || seenPhones.has(phone)) throw new Error(`Operator source/contact conflict: ${raw.key}`);
  if (raw.capacity !== null && (!Number.isInteger(raw.capacity) || raw.capacity < 1 || raw.capacity > 1000))
    throw new Error(`Invalid documented capacity: ${raw.key}`);
  seenPhones.add(phone);
  operators.push({ id: operatorId, name: raw.name, region: raw.region, phone, websiteUrl: raw.websiteUrl,
    bookingUrl: null, verificationStatus: "SOURCE_BACKED", partnerApproval: false, sourceRefs: [raw.sourceUrl] });
  if (boatId) boats.push({ id: boatId, operatorId, name: raw.boatName, capacity: raw.capacity,
    verificationStatus: "SOURCE_BACKED", registrationVerified: false, sourceRefs: [raw.sourceUrl] });
  if (portId) ports.push({ id: portId, name: raw.portName, region: raw.region, latitude: null, longitude: null,
    coordinateStatus: "UNKNOWN", sourceRefs: [raw.sourceUrl] });

  const rawPayload = { submissionType: "BULK_IMPORT", sourceIdentity: { sourceName: raw.name, sourceUrl: raw.sourceUrl },
    operator: { name: raw.name, phone: raw.phone, websiteUrl: raw.websiteUrl, region: raw.region },
    boats: [{ name: raw.boatName, capacity: raw.capacity, registrationInfo: null }],
    ports: [{ name: raw.portName, region: raw.region, latitude: null, longitude: null }],
    charters: raw.offers.map(({ title, species, price, priceUnit }) => ({ title, targetSpecies: species, price, priceUnit,
      bookingMethod: "PHONE", bookingUrl: null })), schedules: [] };
  const normalized = { submissionId: `BM-PILOT-SUB-${raw.key.toUpperCase()}`, submissionType: "BULK_IMPORT",
    submittedAt: null, state: "DRAFT", verificationStatus: "UNVERIFIED",
    sourceIdentity: { sourceType: "BULK_IMPORT", sourceName: raw.name, sourceUrl: raw.sourceUrl, submittedAt: null },
    operator: { name: raw.name, representativeName: null, phone, email: null, websiteUrl: raw.websiteUrl, region: raw.region },
    boats: [{ name: raw.boatName, capacity: raw.capacity, vesselType: null, registrationInfo: null }],
    ports: [{ name: raw.portName, region: raw.region, address: null, latitude: null, longitude: null, coordinateStatus: "UNKNOWN" }],
    charters: raw.offers.map((offer) => ({ title: offer.title,
      targetSpecies: offer.species.map((name) => resolveSpeciesExact(name, canonical, aliases)), price: offer.price,
      priceUnit: offer.priceUnit, departureTime: null, returnTime: null, bookingMethod: "PHONE", bookingUrl: null })),
    schedules: [], documents: [{ kind: "PUBLIC_OPERATOR_PAGE", reference: raw.name, sourceUrl: raw.sourceUrl }],
    validationIssues: [] };
  // Reuse the same field validator and MOF crosswalk as the intake contract. Offline review never impersonates an admin.
  const issues = validateSubmission(normalized);
  for (const [index, offer] of normalized.charters.entries()) {
    if (!offer.title) issues.push({ field: `charters[${index}].title`, code: "REQUIRED", severity: "ERROR", message: "출조상품명은 필수입니다." });
    if (offer.price !== null && (!Number.isFinite(offer.price) || offer.price < 0 || offer.price > 100_000_000))
      issues.push({ field: `charters[${index}].price`, code: "INVALID_PRICE", severity: "ERROR", message: "가격 범위를 확인하세요." });
  }
  const crosswalk = crosswalkMofBatch001(normalized, registrations);
  submissions.push({ submissionId: normalized.submissionId, rawPayload, normalizedPayload: normalized,
    validation: { errors: issues.filter((issue) => issue.severity === "ERROR"), warnings: issues.filter((issue) => issue.severity === "WARNING") },
    crosswalk, offlineReview: "REVIEW_REQUIRED", authenticatedAdminReview: false });
  if (crosswalk.status !== "EXACT_MATCH") exceptions.push({ category: "crosswalk candidate", operatorId,
    detail: `${crosswalk.status}: registration identity not verified`, sourceUrl: raw.sourceUrl });
  if (!raw.portName) exceptions.push({ category: "port ambiguity", operatorId, detail: "Exact departure port not stated", sourceUrl: raw.sourceUrl });
  for (const offer of raw.offers) {
    const id = `BM-PILOT-CHARTER-${raw.key.toUpperCase()}-${offer.key.toUpperCase()}`;
    const duplicateKey = `${raw.key}|${offer.title.normalize("NFKC")}`;
    if (seenOffers.has(duplicateKey)) throw new Error(`Duplicate offer: ${duplicateKey}`);
    seenOffers.add(duplicateKey);
    const species = offer.species.map((name) => resolveSpeciesExact(name, canonical, aliases));
    const unresolved = species.filter((item) => item.matchType === "UNRESOLVED");
    const limitations = ["공급자 제휴·공개 승인 미확인", "실시간 일정·잔여석 미연동"];
    if (offer.freshness !== "RECENT") limitations.push("가격·시즌 재확인 필요");
    if (unresolved.length) limitations.push(`어종 미해결: ${unresolved.map((item) => item.rawName).join(", ")}`);
    if (!raw.portName) limitations.push("정확한 출항항 미확인");
    const record = { id, operatorId, boatId, departurePortId: portId, title: offer.title,
      targetSpeciesIds: species.filter((item) => item.canonicalId).map((item) => item.canonicalId),
      targetSpeciesRawNames: offer.species, speciesMatches: species, tripType: offer.tripType,
      price: { amount: offer.price, currency: "KRW", unit: offer.priceUnit, sourceFreshness: offer.freshness },
      bookingMethod: "PHONE", status: "INQUIRY_REQUIRED", remainingSeats: null, scheduleId: null,
      sourceUrl: raw.sourceUrl, sourceRefs: [raw.sourceUrl], evidence: offer.evidence, verificationStatus: "SOURCE_BACKED",
      freshness: offer.freshness, readiness: "REVIEW_REQUIRED", businessReadiness: "CONTACTABLE", limitations };
    charters.push(record);
    researchPreviewEntries.push({ id, label: "PILOT RESEARCH / NOT APPROVED", title: record.title,
      operator: raw.name, region: raw.region, port: raw.portName, targetSpeciesRawNames: record.targetSpeciesRawNames,
      sourcePrice: offer.price, priceDisplay: offer.freshness === "RECENT" ? offer.price : null,
      contact: { type: "tel", href: `tel:${phone}` }, sourceUrl: raw.sourceUrl, limitations });
    if (offer.price === null) exceptions.push({ category: "price missing", charterId: id, detail: "INQUIRY; no zero-price inference", sourceUrl: raw.sourceUrl });
    if (offer.freshness !== "RECENT") exceptions.push({ category: "source freshness", charterId: id,
      detail: offer.freshness === "SEASONAL" ? "Seasonal offer; current dates and availability unverified" :
        "Static course or price needs supplier reconfirmation", sourceUrl: raw.sourceUrl });
    for (const item of unresolved) exceptions.push({ category: "species ambiguity", charterId: id,
      detail: `Raw name preserved: ${item.rawName}`, sourceUrl: raw.sourceUrl });
  }
}

const pilot = { schemaVersion: 1, datasetKind: "RESEARCH_STAGING", decision: "CHARTER_VERIFIED_SUPPLY_PILOT_BLOCKED",
  reviewedOn: evidence.reviewedOn, sourcePolicy: evidence.sourcePolicy, operators, boats, ports, charters,
  schedules: [], submissions, productionActivated: false, authenticatedAdminApprovals: 0,
  promotionCandidates: [] };
const report = { schemaVersion: 1, decision: pilot.decision, reason: "No supplier publication consent or authenticated charter_admin review; source-backed research is not an approved supply pilot.",
  totalSourceEntities: charters.length, normalized: charters.length, suppliers: operators.length,
  review: { ready: 0, readyWithLimitations: 0, reviewRequired: charters.length, rejected: 0 },
  coverage: { operator: operators.length, boat: boats.length, port: ports.length,
    species: charters.filter((item) => item.targetSpeciesIds.length).length,
    price: charters.filter((item) => item.price.amount !== null).length,
    schedule: 0, contact: charters.filter((item) => operators.find((op) => op.id === item.operatorId)?.phone).length },
  crosswalk: Object.fromEntries(["EXACT_MATCH", "HIGH_CONFIDENCE", "CANDIDATE", "NO_MATCH"].map((status) =>
    [status, submissions.filter((item) => item.crosswalk.status === status).length])),
  publicListingCandidates: 0, promotionCandidates: 0, productionActivated: false,
  limitations: ["Formal supplier identity/consent review pending", "MOF vessel matching is not established by name alone",
    "No authenticated admin review or server persistence", "No current schedule or live availability copied"],
  sourceRefs: [...new Set(operators.flatMap((item) => item.sourceRefs))].sort() };
write("data/charters/pilot/v1/verified-supply-pilot-v1.json", pilot);
write("data/charters/pilot/v1/public-listing-candidates-v1.json", { schemaVersion: 1, candidates: [],
  researchPreviewEntries, productionEligible: false, note: "Research cards only; no approved public listings." });
write("reports/charters/verified-supply-pilot-v1.json", report);
write("reports/charters/verified-supply-pilot-exceptions-v1.json", { schemaVersion: 1, total: exceptions.length, exceptions });
console.log(JSON.stringify({ decision: report.decision, operators: operators.length, offers: charters.length,
  publicCandidates: 0, exceptions: exceptions.length }));

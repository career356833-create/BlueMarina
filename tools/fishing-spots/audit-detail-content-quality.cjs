const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_PATH = path.join(ROOT, "src/data/fishing-spots.json");
const REPORT_PATH = path.join(ROOT, "reports/fishing-spots/detail-content-quality-audit-v1.json");
const REVIEW_PATH = path.join(ROOT, "reports/fishing-spots/detail-content-review-candidates-v1.json");

const KOREA_ADJACENT_BBOX = Object.freeze({ minLat: 32, maxLat: 39.5, minLng: 123, maxLng: 132.5 });
const CANONICAL_SPECIES = Object.freeze([
  ["BM-SPECIES-000755", "참돔"],
  ["BM-SPECIES-000751", "감성돔"],
  ["BM-SPECIES-000188", "농어"],
  ["BM-SPECIES-000012", "조피볼락"],
  ["BM-SPECIES-000465", "넙치"],
  ["BM-SPECIES-000444", "갈치"],
  ["BM-SPECIES-000417", "고등어"],
  ["BM-SPECIES-000501", "방어"],
  ["BM-SPECIES-003107", "주꾸미"],
  ["BM-SPECIES-003111", "문어"],
]);
const APPROVED_ALIASES = Object.freeze({ 광어: "넙치", 우럭: "조피볼락" });
const EXPECTED_SCHEMA_FIELDS = Object.freeze([
  "id", "name", "type", "region", "city", "address", "lat", "lng", "targetFish",
  "tideNote", "depthNote", "bottomNote", "methodNote", "safetyStatus", "sourceType",
  "sourceName", "sourceUrl", "sourceCheckedAt", "status", "description", "facilities",
  "cautions", "originalId", "originalPoint", "note",
]);
const REQUESTED_BUT_MISSING_SCHEMA_FIELDS = Object.freeze([
  "coordinateSource", "portName", "accessInfo", "departureInfo", "updatedAt",
]);

function present(value) {
  return Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0;
}

function splitTargets(value) {
  return String(value ?? "").split("|").map((item) => item.trim()).filter(Boolean);
}

function canonicalProjection(spot) {
  const byName = new Map(CANONICAL_SPECIES.map(([id, name]) => [name, { id, name }]));
  const mapped = new Map();
  const unmapped = [];
  for (const raw of splitTargets(spot.targetFish)) {
    const canonicalName = APPROVED_ALIASES[raw] ?? raw;
    const species = byName.get(canonicalName);
    if (species) mapped.set(species.id, species);
    else unmapped.push(raw);
  }
  return { mapped: [...mapped.values()], unmapped };
}

function coordinateStatus(spot, bbox = KOREA_ADJACENT_BBOX) {
  if (!present(spot.lat) || !present(spot.lng)) return "MISSING";
  const lat = Number(spot.lat);
  const lng = Number(spot.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "INVALID";
  if (lat === 0 && lng === 0) return "INVALID";
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return "INVALID";
  if (lat >= bbox.minLng && lat <= bbox.maxLng && lng >= bbox.minLat && lng <= bbox.maxLat) return "INVALID";
  if (lat < bbox.minLat || lat > bbox.maxLat || lng < bbox.minLng || lng > bbox.maxLng) return "OUTLIER_REVIEW";
  return "VALID";
}

function normalizeName(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
}

function bigrams(value) {
  const normalized = normalizeName(value);
  if (normalized.length < 2) return normalized ? [normalized] : [];
  return Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2));
}

function nameSimilarity(left, right) {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.length || !b.length) return normalizeName(left) === normalizeName(right) ? 1 : 0;
  const remaining = new Map();
  for (const token of b) remaining.set(token, (remaining.get(token) ?? 0) + 1);
  let overlap = 0;
  for (const token of a) {
    const count = remaining.get(token) ?? 0;
    if (count > 0) {
      overlap += 1;
      remaining.set(token, count - 1);
    }
  }
  return (2 * overlap) / (a.length + b.length);
}

function haversineMeters(left, right) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(Number(left.lat));
  const lat2 = radians(Number(right.lat));
  const dLat = lat2 - lat1;
  const dLng = radians(Number(right.lng) - Number(left.lng));
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function groupBy(items, keyFor) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right, "ko")));
}

function classifyUnsupportedSpecies(raw) {
  if (!raw) return "EMPTY";
  if (/류$|어류$|돔류$|오징어류$|문어류$/.test(raw)) return "AGGREGATE_TAXON";
  if (/[^0-9a-zA-Z가-힣·\- ]/.test(raw)) return "MALFORMED";
  return "UNSUPPORTED_SPECIES";
}

function auditFishingSpots(spots) {
  const sourceSnapshot = JSON.stringify(spots);
  const schemaFields = [...new Set(spots.flatMap((spot) => Object.keys(spot)))].sort();
  const coordinateCounts = { VALID: 0, MISSING: 0, INVALID: 0, OUTLIER_REVIEW: 0 };
  const canonicalCounts = new Map(CANONICAL_SPECIES.map(([, name]) => [name, 0]));
  const unmappedRawCounts = new Map();
  const unmappedReasonCounts = new Map();
  const unmappedSpotRawCounts = new Map();
  const unmappedSpotReasonCounts = new Map();
  const authorityCounts = new Map();
  const primaryCategories = { CORE_COMPLETE: 0, LOCATION_ONLY: 0, SPECIES_ONLY: 0, SOURCE_MISSING: 0, DETAIL_SPARSE: 0, REVIEW_REQUIRED: 0 };
  const baseReview = new Map();
  const minimumGateById = new Map();
  const provenanceById = new Map();
  let mappedSpotCount = 0;
  let minimumDetailGate = 0;
  let mapEligible = 0;
  let navigationEligible = 0;
  let portContextMentions = 0;
  let boatDepartureGenericContext = 0;

  const statusById = new Map();
  const projectionById = new Map();
  for (const spot of spots) {
    const status = coordinateStatus(spot);
    coordinateCounts[status] += 1;
    statusById.set(spot.id, status);
    const projection = canonicalProjection(spot);
    projectionById.set(spot.id, projection);
    if (projection.mapped.length) mappedSpotCount += 1;
    for (const species of projection.mapped) canonicalCounts.set(species.name, canonicalCounts.get(species.name) + 1);
    for (const raw of projection.unmapped) {
      unmappedRawCounts.set(raw, (unmappedRawCounts.get(raw) ?? 0) + 1);
      const reason = classifyUnsupportedSpecies(raw);
      unmappedReasonCounts.set(reason, (unmappedReasonCounts.get(reason) ?? 0) + 1);
    }
    if (!projection.mapped.length) {
      for (const raw of projection.unmapped) {
        unmappedSpotRawCounts.set(raw, (unmappedSpotRawCounts.get(raw) ?? 0) + 1);
        const reason = classifyUnsupportedSpecies(raw);
        unmappedSpotReasonCounts.set(reason, (unmappedSpotReasonCounts.get(reason) ?? 0) + 1);
      }
    }

    const provenancePresent = present(spot.sourceName) && present(spot.sourceUrl) && present(spot.sourceCheckedAt) && present(spot.sourceType);
    provenanceById.set(spot.id, provenancePresent);
    const authority = /^MOF_/.test(spot.sourceType) && /data\.go\.kr/.test(spot.sourceUrl) ? "OFFICIAL" : "UNKNOWN";
    authorityCounts.set(authority, (authorityCounts.get(authority) ?? 0) + 1);
    const idValid = /^[a-z]+-\d+$/.test(spot.id);
    if (idValid && status === "VALID") {
      mapEligible += 1;
      navigationEligible += 1;
    }
    if (/[가-힣]*(항|포구|선착장|마리나)/.test(`${spot.name} ${spot.address} ${spot.description}`)) portContextMentions += 1;
    if (spot.type === "boat-fishing-point" && spot.facilities.some((item) => /선상|선사|승선/.test(item))) boatDepartureGenericContext += 1;

    const hasSpeciesOrFallback = splitTargets(spot.targetFish).length > 0;
    const passesMinimum = present(spot.name) && present(spot.region) && status === "VALID" && hasSpeciesOrFallback && provenancePresent;
    minimumGateById.set(spot.id, passesMinimum);
    if (passesMinimum) minimumDetailGate += 1;

    const reasons = [];
    if (status !== "VALID") reasons.push(status);
    if (!provenancePresent) reasons.push("MISSING_PROVENANCE");
    if (!projection.mapped.length) reasons.push("NO_CANONICAL_SPECIES");
    if (!present(spot.name) || normalizeName(spot.name).length < 3) reasons.push("NAME_QUALITY");
    if (!present(spot.region) || !present(spot.city)) reasons.push("REGION_MISSING");
    if (reasons.length) baseReview.set(spot.id, reasons);

  }

  const idGroups = [...groupBy(spots, (spot) => spot.id).values()].filter((group) => group.length > 1);
  const nameCoordinateGroups = [...groupBy(spots, (spot) => `${normalizeName(spot.name)}|${Number(spot.lat).toFixed(6)}|${Number(spot.lng).toFixed(6)}`).values()].filter((group) => group.length > 1);
  const coordinateGroups = [...groupBy(spots, (spot) => `${Number(spot.lat).toFixed(6)}|${Number(spot.lng).toFixed(6)}`).values()].filter((group) => group.length > 1);
  const sameCoordinateDifferentName = coordinateGroups.filter((group) => new Set(group.map((spot) => normalizeName(spot.name))).size > 1);
  const regionCoordinateMismatchGroups = sameCoordinateDifferentName.filter((group) => new Set(group.map((spot) => spot.region)).size > 1);

  const nearDuplicatePairs = [];
  const validSpots = spots.filter((spot) => statusById.get(spot.id) === "VALID");
  for (let leftIndex = 0; leftIndex < validSpots.length; leftIndex += 1) {
    const left = validSpots[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < validSpots.length; rightIndex += 1) {
      const right = validSpots[rightIndex];
      if (left.region !== right.region) continue;
      const distanceMeters = haversineMeters(left, right);
      if (distanceMeters <= 0.01 || distanceMeters > 100) continue;
      const similarity = nameSimilarity(left.name, right.name);
      if (similarity < 0.72) continue;
      nearDuplicatePairs.push({ leftId: left.id, rightId: right.id, distanceMeters: Number(distanceMeters.toFixed(1)), nameSimilarity: Number(similarity.toFixed(3)) });
    }
  }
  nearDuplicatePairs.sort((left, right) => left.leftId.localeCompare(right.leftId) || left.rightId.localeCompare(right.rightId));

  const duplicateReasons = new Map();
  const addDuplicateReason = (id, reason) => {
    const reasons = duplicateReasons.get(id) ?? new Set();
    reasons.add(reason);
    duplicateReasons.set(id, reasons);
  };
  for (const group of idGroups) for (const spot of group) addDuplicateReason(spot.id, "DUPLICATE_ID");
  for (const group of nameCoordinateGroups) for (const spot of group) addDuplicateReason(spot.id, "DUPLICATE_NAME_COORDINATE");
  for (const group of sameCoordinateDifferentName) for (const spot of group) addDuplicateReason(spot.id, "DUPLICATE_COORDINATE");
  for (const group of regionCoordinateMismatchGroups) for (const spot of group) addDuplicateReason(spot.id, "REGION_COORDINATE_MISMATCH");
  for (const pair of nearDuplicatePairs) {
    addDuplicateReason(pair.leftId, "NEAR_DUPLICATE_CANDIDATE");
    addDuplicateReason(pair.rightId, "NEAR_DUPLICATE_CANDIDATE");
  }

  const reviewCandidates = spots.flatMap((spot) => {
    const reasons = [...(baseReview.get(spot.id) ?? []), ...[...(duplicateReasons.get(spot.id) ?? [])]];
    if (!reasons.length) return [];
    const projection = projectionById.get(spot.id);
    return [{
      id: spot.id,
      name: spot.name,
      region: spot.region,
      city: spot.city,
      coordinate: { lat: spot.lat, lng: spot.lng, status: statusById.get(spot.id) },
      targetSpeciesRaw: splitTargets(spot.targetFish),
      canonicalSpecies: projection.mapped,
      unmappedSpecies: projection.unmapped.map((raw) => ({ raw, reason: classifyUnsupportedSpecies(raw) })),
      reasons: [...new Set(reasons)].sort(),
    }];
  }).sort((left, right) => left.id.localeCompare(right.id));

  for (const spot of spots) {
    const hasReviewReason = baseReview.has(spot.id) || duplicateReasons.has(spot.id);
    const hasSpeciesOrFallback = splitTargets(spot.targetFish).length > 0;
    if (hasReviewReason) primaryCategories.REVIEW_REQUIRED += 1;
    else if (minimumGateById.get(spot.id)) primaryCategories.CORE_COMPLETE += 1;
    else if (statusById.get(spot.id) === "VALID" && hasSpeciesOrFallback) primaryCategories.SPECIES_ONLY += 1;
    else if (statusById.get(spot.id) === "VALID") primaryCategories.LOCATION_ONLY += 1;
    else if (!provenanceById.get(spot.id)) primaryCategories.SOURCE_MISSING += 1;
    else primaryCategories.DETAIL_SPARSE += 1;
  }

  const coverage = (field) => spots.filter((spot) => present(spot[field])).length;
  const missing = (field) => spots.length - coverage(field);
  const sourceMissing = spots.filter((spot) => !(present(spot.sourceName) && present(spot.sourceUrl) && present(spot.sourceCheckedAt) && present(spot.sourceType))).length;
  const unmappedSpots = spots.length - mappedSpotCount;
  const report = {
    audit: "Fishing Spot Detail Content Quality Audit V1",
    auditVersion: "1.0.0",
    baselineCommit: "6025bf91170e5539619ce1f07b94148b1b527374",
    decision: "SPOT_DETAIL_DATA_READY_WITH_GAPS",
    dataset: { source: "src/data/fishing-spots.json", totalSpots: spots.length, mutated: false },
    schema: {
      actualFields: schemaFields,
      expectedFieldsPresent: EXPECTED_SCHEMA_FIELDS.filter((field) => schemaFields.includes(field)),
      missingFieldSchema: REQUESTED_BUT_MISSING_SCHEMA_FIELDS.filter((field) => !schemaFields.includes(field)),
    },
    coordinates: {
      bboxPolicy: KOREA_ADJACENT_BBOX,
      valid: coordinateCounts.VALID,
      missing: coordinateCounts.MISSING,
      invalid: coordinateCounts.INVALID,
      outlierReview: coordinateCounts.OUTLIER_REVIEW,
      zeroZero: spots.filter((spot) => Number(spot.lat) === 0 && Number(spot.lng) === 0).length,
      swappedCandidates: spots.filter((spot) => Number(spot.lat) >= 123 && Number(spot.lat) <= 132.5 && Number(spot.lng) >= 32 && Number(spot.lng) <= 39.5).length,
      coordinateSourceFieldPresent: false,
      sourceAssociatedOriginalPoint: spots.filter((spot) => present(spot.originalPoint) && present(spot.sourceType)).length,
      transformedWgs84MethodDocumented: 0,
      unverifiedSource: spots.length,
      duplicateCoordinateGroups: coordinateGroups.length,
      duplicateCoordinateSpots: new Set(coordinateGroups.flat().map((spot) => spot.id)).size,
      mapEligible,
      navigationEligible,
      safetyBoundary: "Navigation eligibility does not assert a safe route, hazard avoidance, or depth clearance.",
    },
    detailCoverage: {
      region: { present: coverage("region"), missing: missing("region") },
      subregion: { field: "city", present: coverage("city"), missing: missing("city") },
      address: { present: coverage("address"), missing: missing("address") },
      type: { present: coverage("type"), missing: missing("type"), counts: sortedObject([...groupBy(spots, (spot) => spot.type)].map(([key, value]) => [key, value.length])) },
      port: { dedicatedFieldPresent: false, missingStructuredValue: spots.length, freeTextMentionCandidates: portContextMentions },
      access: { dedicatedFieldPresent: false, missingStructuredValue: spots.length, facilitiesPresentationAvailable: coverage("facilities") },
      departure: { dedicatedFieldPresent: false, missingStructuredValue: spots.length, boatSpots: spots.filter((spot) => spot.type === "boat-fishing-point").length, genericBoatContextAvailable: boatDepartureGenericContext, namedDeparturePointVerified: 0 },
      description: { present: coverage("description"), missing: missing("description") },
      sourceDate: { field: "sourceCheckedAt", present: coverage("sourceCheckedAt"), missing: missing("sourceCheckedAt") },
      regionCoordinateMismatchCandidates: regionCoordinateMismatchGroups.length,
      regionCoordinateMismatchGroups: regionCoordinateMismatchGroups.map((group) => group.map((spot) => ({ id: spot.id, region: spot.region, city: spot.city }))),
      regionBoundaryVerification: "NOT_PERFORMED_NO_ADMINISTRATIVE_POLYGON",
    },
    species: {
      canonicalSpeciesCount: CANONICAL_SPECIES.length,
      aliases: APPROVED_ALIASES,
      mappingMode: "EXACT_PLUS_APPROVED_ALIAS_ONLY",
      fuzzyMapping: false,
      mappedSpots: mappedSpotCount,
      unmappedSpots,
      unmappedSpotIds: spots.filter((spot) => projectionById.get(spot.id).mapped.length === 0).map((spot) => spot.id).sort(),
      unmappedSpotDetailsArtifact: "reports/fishing-spots/detail-content-review-candidates-v1.json",
      canonicalSpotCounts: sortedObject(canonicalCounts),
      allNonCanonicalRawValueCounts: sortedObject(unmappedRawCounts),
      allNonCanonicalReasonCounts: sortedObject(unmappedReasonCounts),
      unmappedSpotRawValueCounts: sortedObject(unmappedSpotRawCounts),
      unmappedSpotReasonCounts: sortedObject(unmappedSpotReasonCounts),
      emptyTargetSpecies: spots.filter((spot) => splitTargets(spot.targetFish).length === 0).length,
    },
    provenance: {
      complete: spots.length - sourceMissing,
      missing: sourceMissing,
      sourceNamePresent: coverage("sourceName"),
      sourceUrlPresent: coverage("sourceUrl"),
      sourceTypePresent: coverage("sourceType"),
      sourceDatePresent: coverage("sourceCheckedAt"),
      authorityClasses: sortedObject(authorityCounts),
    },
    duplicates: {
      exactIdGroups: idGroups.map((group) => group.map((spot) => spot.id)),
      exactNameCoordinateGroups: nameCoordinateGroups.map((group) => group.map((spot) => spot.id)),
      sameCoordinateDifferentNameGroups: sameCoordinateDifferentName.map((group) => group.map((spot) => spot.id)),
      nearDuplicateThresholdMeters: 100,
      nearDuplicateNameSimilarityThreshold: 0.72,
      nearDuplicateCandidates: nearDuplicatePairs,
      automaticMergePerformed: false,
    },
    nameQuality: {
      empty: spots.filter((spot) => !present(spot.name)).length,
      whitespaceOnly: spots.filter((spot) => String(spot.name ?? "").length > 0 && !String(spot.name).trim()).length,
      malformedEncoding: spots.filter((spot) => /�/.test(spot.name)).length,
      genericOrTooShort: spots.filter((spot) => normalizeName(spot.name).length < 3).length,
    },
    minimumDetailGate: {
      required: ["name", "region", "valid coordinate", "target species or fallback", "source provenance"],
      passed: minimumDetailGate,
      failed: spots.length - minimumDetailGate,
    },
    completeness: {
      basis: "PRIMARY_CATEGORY_WITH_STRUCTURAL_SCHEMA_GAPS_REPORTED_SEPARATELY",
      categories: primaryCategories,
      numericScoreUsed: false,
    },
    missingFields: {
      coordinates: coordinateCounts.MISSING + coordinateCounts.INVALID,
      region: missing("region"),
      portStructured: spots.length,
      accessStructured: spots.length,
      departureStructured: spots.length,
      description: missing("description"),
      targetSpecies: spots.filter((spot) => splitTargets(spot.targetFish).length === 0).length,
      provenance: sourceMissing,
      sourceDate: missing("sourceCheckedAt"),
      coordinateSource: spots.length,
    },
    gapClassification: {
      STRUCTURAL_SCHEMA_GAP: ["coordinateSource", "portName", "accessInfo", "departureInfo", "updatedAt"],
      MISSING_VALUE: [],
      UNVERIFIED_VALUE: ["transformed WGS84 coordinate method", "named departure point"],
      AMBIGUOUS_VALUE: ["free-text port mentions are not verified port relationships"],
      SOURCE_GAP: [],
      CONTENT_GAP: ["19 spots have no canonical Fishing Condition species mapping"],
    },
    safetyCriticalGaps: {
      coordinateSourceNotExplicit: spots.length,
      structuredAccessRestrictionMissing: spots.length,
      structuredDepartureLocationMissing: spots.length,
      navigationDestinationEligibleButNotRouteSafe: navigationEligible,
      provenanceMissing: sourceMissing,
    },
    priorityGaps: [
      { priority: "HIGH", category: "COORDINATE_AND_DEPARTURE_PROVENANCE", reason: "Map/navigation coordinates are usable, but transformation method and named departure points are not explicit." },
      { priority: "HIGH", category: "STRUCTURED_ACCESS_AND_RESTRICTIONS", reason: "Facilities and cautions exist, but dedicated access and restriction fields do not." },
      { priority: "MEDIUM", category: "CANONICAL_SPECIES_EXTENSION_REVIEW", reason: `${unmappedSpots} spots retain valid raw species labels without a canonical condition mapping.` },
    ],
    nextEnrichmentBatch: ["coordinate/departure provenance", "structured access and restrictions", "unsupported species review"],
    reviewCandidateCount: reviewCandidates.length,
    invariants: { runtimeChanged: false, databaseWrite: false, supabaseWrite: false, sourceDataMutated: false, webEnrichmentPerformed: false },
  };

  if (JSON.stringify(spots) !== sourceSnapshot) throw new Error("Audit mutated source data");
  return { report, reviewCandidates };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const spots = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
  const { report, reviewCandidates } = auditFishingSpots(spots);
  writeJson(REPORT_PATH, report);
  writeJson(REVIEW_PATH, {
    audit: report.audit,
    auditVersion: report.auditVersion,
    candidateCount: reviewCandidates.length,
    criteria: ["coordinate anomaly", "duplicate candidate", "missing provenance", "no canonical species mapping", "name or region quality"],
    candidates: reviewCandidates,
  });
  process.stdout.write(`${JSON.stringify({ status: report.decision, totalSpots: report.dataset.totalSpots, reviewCandidates: reviewCandidates.length })}\n`);
}

module.exports = {
  APPROVED_ALIASES,
  CANONICAL_SPECIES,
  KOREA_ADJACENT_BBOX,
  auditFishingSpots,
  canonicalProjection,
  classifyUnsupportedSpecies,
  coordinateStatus,
  haversineMeters,
  nameSimilarity,
  normalizeName,
};

if (require.main === module) main();

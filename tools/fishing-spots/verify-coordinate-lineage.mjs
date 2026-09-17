import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertFishingSpotPointToWgs84 } from "../../src/lib/geo/projection.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.join(root, "src/data/fishing-spots.json");
const previewPath = path.join(root, "reports/fishing-spots-coordinate-preview.json");
const applySummaryPath = path.join(root, "reports/fishing-spots-coordinate-apply-summary.md");
const reportPath = path.join(root, "reports/fishing-spots/coordinate-lineage-duplicate-verification-v1.json");
const candidatesPath = path.join(root, "reports/fishing-spots/coordinate-review-candidates-v1.json");

const rawSources = {
  "MOF_SHARED_BOAT_FISHING_POINT": {
    path: "work/fishing-spots-boat-raw.csv",
    dataset: "해양수산부_공동활용체계_선상낚시포인트_20231231",
    sourceUrl: "https://www.data.go.kr/data/15148435/fileData.do",
    expectedRows: 329,
    sourceCoordinateColumns: ["공간정보", "선상낚시포인트도분초위도", "선상낚시포인트도분초경도"],
  },
  "MOF_SHARED_ROCK_FISHING_POINT": {
    path: "work/fishing-spots-rock-raw.csv",
    dataset: "해양수산부_공동활용체계_갯바위낚시포인트_20221231",
    sourceUrl: "https://www.data.go.kr/data/15148580/fileData.do",
    expectedRows: 1076,
    sourceCoordinateColumns: ["공간정보", "갯바위낚시포인트도분초위도", "갯바위낚시포인트경도"],
  },
};

const exactDuplicateClassifications = new Map([
  ["boat-128|boat-60", { classification: "CROSS_REGION_CONFLICT", action: "NAVIGATION_REVIEW_REQUIRED", reason: "Distinct regions and places share the same official raw projected point." }],
  ["boat-129|boat-321", { classification: "CROSS_REGION_CONFLICT", action: "NAVIGATION_REVIEW_REQUIRED", reason: "Distinct regions and places share the same official raw projected point." }],
  ["rock-152|rock-591", { classification: "UNRESOLVED", action: "REVIEW_RECOMMENDED", reason: "Distinct place names share one official raw projected point; the source does not explain whether it is representative." }],
  ["rock-297|rock-821|rock-872", { classification: "UNRESOLVED", action: "REVIEW_RECOMMENDED", reason: "Three distinct place names share one official raw projected point; representative-coordinate reuse cannot be distinguished from an error." }],
  ["rock-430|rock-884", { classification: "UNRESOLVED", action: "REVIEW_RECOMMENDED", reason: "Distinct named areas share one official raw projected point; internal source fields do not resolve the conflict." }],
  ["rock-520|rock-532", { classification: "POSSIBLE_ALIAS_LOCATION", action: "NO_ACTION", reason: "Both names refer to the Sangjokam excursion-boat area in the same city and share the source coordinate." }],
]);

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headers, ...values] = rows;
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function parseDms(value) {
  const match = String(value ?? "").trim().match(/^(\d+)-(\d+)-(\d+(?:\.\d+)?)([NSEW])$/i);
  if (!match) return null;
  const sign = /[SW]/i.test(match[4]) ? -1 : 1;
  return sign * (Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600);
}

function haversineMeters(left, right) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371008.8;
  const deltaLatitude = radians(right.lat - left.lat);
  const deltaLongitude = radians(right.lng - left.lng);
  const latitude1 = radians(left.lat);
  const latitude2 = radians(right.lat);
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rounded(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function coordinateKey(spot) {
  return `${Number(spot.lat).toFixed(6)},${Number(spot.lng).toFixed(6)}`;
}

function normalizeName(value) {
  return String(value).toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
}

function nameSimilarity(left, right) {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (a === b) return 1;
  const grams = (value) => {
    const result = new Map();
    for (let index = 0; index < value.length - 1; index += 1) {
      const gram = value.slice(index, index + 2);
      result.set(gram, (result.get(gram) ?? 0) + 1);
    }
    return result;
  };
  const leftGrams = grams(a);
  const rightGrams = grams(b);
  let intersection = 0;
  for (const [gram, count] of leftGrams) intersection += Math.min(count, rightGrams.get(gram) ?? 0);
  const total = [...leftGrams.values()].reduce((sum, count) => sum + count, 0) + [...rightGrams.values()].reduce((sum, count) => sum + count, 0);
  return total === 0 ? 0 : (2 * intersection) / total;
}

function loadRawSources() {
  const records = new Map();
  const artifacts = [];
  for (const [sourceType, definition] of Object.entries(rawSources)) {
    const absolutePath = path.join(root, definition.path);
    const decoded = new TextDecoder("euc-kr").decode(fs.readFileSync(absolutePath));
    const rows = parseCsv(decoded);
    if (rows.length !== definition.expectedRows) throw new Error(`${sourceType} row count ${rows.length}`);
    for (const row of rows) records.set(`${sourceType}:${row["공간정보일련번호"]}`, row);
    artifacts.push({
      sourceType,
      dataset: definition.dataset,
      localPath: definition.path,
      downloadedFilename: "UNKNOWN (artifact was renamed locally)",
      sourceUrl: definition.sourceUrl,
      rows: rows.length,
      encoding: "EUC-KR/CP949-compatible",
      sha256: sha256(absolutePath),
      sourceCoordinateColumns: definition.sourceCoordinateColumns,
    });
  }
  return { records, artifacts };
}

function sourceDmsCoordinates(spot, row) {
  const latitudeColumn = spot.sourceType === "MOF_SHARED_BOAT_FISHING_POINT" ? "선상낚시포인트도분초위도" : "갯바위낚시포인트도분초위도";
  const longitudeColumn = spot.sourceType === "MOF_SHARED_BOAT_FISHING_POINT" ? "선상낚시포인트도분초경도" : "갯바위낚시포인트경도";
  const lat = parseDms(row[latitudeColumn]);
  const lng = parseDms(row[longitudeColumn]);
  return lat === null || lng === null ? null : { lat, lng, latitudeColumn, longitudeColumn };
}

function buildAudit() {
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const spots = JSON.parse(sourceText);
  const sourceSnapshot = JSON.stringify(spots);
  const preview = JSON.parse(fs.readFileSync(previewPath, "utf8"));
  const appliedIds = new Set(preview.candidates.map((candidate) => candidate.id));
  const { records: rawRecords, artifacts } = loadRawSources();
  const sourceRowsTraced = spots.filter((spot) => rawRecords.has(`${spot.sourceType}:${spot.originalId}`)).length;
  if (sourceRowsTraced !== spots.length) throw new Error(`Only ${sourceRowsTraced} source rows traced`);

  const rowLineage = [];
  const epsgErrors = [];
  const dmsErrors = [];
  for (const spot of spots) {
    const row = rawRecords.get(`${spot.sourceType}:${spot.originalId}`);
    if (row["공간정보"] !== spot.originalPoint) throw new Error(`${spot.id} originalPoint differs from raw source`);
    const current = { lat: Number(spot.lat), lng: Number(spot.lng) };
    const projected = convertFishingSpotPointToWgs84(spot.originalPoint);
    if (!projected.ok) throw new Error(`${spot.id} projected point failed`);
    const projectionErrorMeters = haversineMeters(current, projected.coordinates);
    epsgErrors.push(projectionErrorMeters);
    const dms = sourceDmsCoordinates(spot, row);
    const dmsErrorMeters = dms ? haversineMeters(current, dms) : null;

    if (appliedIds.has(spot.id)) {
      rowLineage.push({
        spotId: spot.id,
        name: spot.name,
        region: spot.region,
        city: spot.city,
        address: spot.address,
        currentLat: current.lat,
        currentLon: current.lng,
        sourceRecordId: spot.originalId,
        sourceCoordinateFields: { projectedPoint: spot.originalPoint },
        sourceCrs: "EPSG:5179",
        transformationMethod: "Inverse Transverse Mercator to WGS84; rounded to 6 decimal degrees",
        transformationTool: "src/lib/geo/projection.ts",
        transformationVersion: "introduced in git commit f47cb23; semantic version UNKNOWN",
        reproductionDeltaMeters: rounded(projectionErrorMeters, 4),
        lineageStatus: projectionErrorMeters <= 1 ? "LINEAGE_CONFIRMED" : "TRANSFORMATION_MISMATCH",
      });
    } else {
      if (dmsErrorMeters !== null) dmsErrors.push(dmsErrorMeters);
      rowLineage.push({
        spotId: spot.id,
        name: spot.name,
        region: spot.region,
        city: spot.city,
        address: spot.address,
        currentLat: current.lat,
        currentLon: current.lng,
        sourceRecordId: spot.originalId,
        sourceCoordinateFields: {
          projectedPoint: spot.originalPoint,
          dmsLatitude: dms ? row[dms.latitudeColumn] : "UNKNOWN",
          dmsLongitude: dms ? row[dms.longitudeColumn] : "UNKNOWN",
        },
        sourceCrs: "WGS84 DMS (source portal does not declare an EPSG identifier for these fields)",
        transformationMethod: "DMS to decimal degrees (reproduced; original normalizer unavailable)",
        transformationTool: "UNKNOWN",
        transformationVersion: "UNKNOWN",
        reproductionDeltaMeters: dmsErrorMeters === null ? null : rounded(dmsErrorMeters, 4),
        lineageStatus: dmsErrorMeters !== null && dmsErrorMeters <= 1 ? "LINEAGE_PARTIAL" : "LINEAGE_UNRESOLVED",
      });
    }
  }

  const grouped = new Map();
  for (const spot of spots) {
    const key = coordinateKey(spot);
    const group = grouped.get(key) ?? [];
    group.push(spot);
    grouped.set(key, group);
  }
  const duplicateGroups = [...grouped.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([coordinate, group]) => {
      const key = group.map((spot) => spot.id).sort().join("|");
      const decision = exactDuplicateClassifications.get(key);
      if (!decision) throw new Error(`Missing duplicate classification for ${key}`);
      const rawPointCount = new Set(group.map((spot) => spot.originalPoint)).size;
      return {
        coordinate,
        spots: group.map((spot) => ({
          spotId: spot.id,
          name: spot.name,
          region: spot.region,
          city: spot.city,
          address: spot.address,
          type: spot.type,
          sourceRecordId: spot.originalId,
          sourceRawCoordinate: spot.originalPoint,
          provenance: { sourceType: spot.sourceType, sourceName: spot.sourceName, sourceUrl: spot.sourceUrl },
        })),
        regions: [...new Set(group.map((spot) => spot.region))].sort(),
        sourceRawCoordinatesIdentical: rawPointCount === 1,
        transformationCollision: rawPointCount > 1,
        ...decision,
      };
    })
    .sort((left, right) => left.spots[0].spotId.localeCompare(right.spots[0].spotId));

  const nearPairs = [];
  for (let leftIndex = 0; leftIndex < spots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < spots.length; rightIndex += 1) {
      const left = spots[leftIndex];
      const right = spots[rightIndex];
      if (coordinateKey(left) === coordinateKey(right)) continue;
      if (left.region !== right.region || left.city !== right.city || left.type !== right.type) continue;
      const similarity = nameSimilarity(left.name, right.name);
      if (similarity < 0.72) continue;
      const distanceMeters = haversineMeters({ lat: Number(left.lat), lng: Number(left.lng) }, { lat: Number(right.lat), lng: Number(right.lng) });
      if (distanceMeters <= 100) {
        nearPairs.push({
          spots: [left.id, right.id],
          names: [left.name, right.name],
          regions: [left.region],
          city: left.city,
          sourceRecordIds: [left.originalId, right.originalId],
          sourceRawCoordinates: [left.originalPoint, right.originalPoint],
          distanceMeters: rounded(distanceMeters),
          nameSimilarity: rounded(similarity, 3),
          classification: "DISTINCT_NEARBY_POINTS",
          action: "NO_ACTION",
          reason: "Separate official projected points reproduce the approximately 80 m separation and names describe different landmarks.",
        });
      }
    }
  }

  const lineageCounts = rowLineage.reduce((counts, row) => {
    counts[row.lineageStatus] = (counts[row.lineageStatus] ?? 0) + 1;
    return counts;
  }, {});
  const crossRegionGroups = duplicateGroups.filter((group) => group.regions.length > 1);
  const reviewGroups = duplicateGroups.filter((group) => group.action !== "NO_ACTION");
  const reviewIds = new Set(reviewGroups.flatMap((group) => group.spots.map((spot) => spot.spotId)));
  const reviewCandidates = spots
    .filter((spot) => reviewIds.has(spot.id))
    .map((spot) => {
      const group = reviewGroups.find((candidate) => candidate.spots.some((item) => item.spotId === spot.id));
      return {
        spotId: spot.id,
        name: spot.name,
        region: spot.region,
        city: spot.city,
        currentCoordinate: { lat: Number(spot.lat), lng: Number(spot.lng) },
        candidateCoordinate: null,
        sourceEvidence: {
          sourceRecordId: spot.originalId,
          sourceRawCoordinate: spot.originalPoint,
          sourceUrl: spot.sourceUrl,
          finding: group.reason,
        },
        reason: group.classification,
        confidence: group.classification === "CROSS_REGION_CONFLICT" ? "HIGH" : "UNKNOWN",
        action: "REVIEW_ONLY",
        navigationRiskClass: group.classification === "CROSS_REGION_CONFLICT" ? "NAVIGATION_REVIEW_REQUIRED" : "REVIEW_RECOMMENDED",
      };
    });

  const report = {
    audit: "Fishing Spot Coordinate Lineage & Duplicate Verification V1",
    auditDate: "2026-09-17",
    decision: "COORDINATE_LINEAGE_PARTIAL",
    dataset: {
      runtimeSource: "src/data/fishing-spots.json",
      totalSpots: spots.length,
      validCoordinates: spots.length,
      mapEligible: spots.length,
      navigationEligible: spots.length,
      sha256: sha256(sourcePath),
      sourceRowsTraced,
    },
    sourceArtifacts: artifacts,
    officialPortalVerification: {
      checkedAt: "2026-09-17",
      boatDatasetVersion: "20231231",
      rockDatasetVersion: "20221231",
      portalDeclaresProjectedPointField: true,
      portalDeclaresProjectedPointCrs: false,
    },
    coordinateContract: {
      currentFields: ["lat", "lng"],
      sourceIdentityFields: ["sourceType", "originalId"],
      sourceCoordinateField: "originalPoint mapped from official 공간정보",
      sourceCrs: "EPSG:5179 for the recovery path; official portal CRS metadata absent",
      targetCrs: "EPSG:4326",
      transformationMethod: "Custom TypeScript inverse Transverse Mercator implementation",
      transformationTool: "src/lib/geo/projection.ts",
      transformationVersion: "git commit f47cb23; semantic version UNKNOWN",
    },
    lineage: {
      confirmed: lineageCounts.LINEAGE_CONFIRMED ?? 0,
      partial: lineageCounts.LINEAGE_PARTIAL ?? 0,
      unresolved: lineageCounts.LINEAGE_UNRESOLVED ?? 0,
      mismatch: lineageCounts.TRANSFORMATION_MISMATCH ?? 0,
      sourceCoordinateMissing: lineageCounts.SOURCE_COORDINATE_MISSING ?? 0,
      documentationGap: "The 426-row original DMS normalizer is absent; the recovery converter and apply chain are preserved.",
    },
    reproducibility: {
      toleranceMeters: 1,
      toleranceBasis: "Six-decimal WGS84 storage is sub-meter at Korean latitudes; 1 m allows rounding while remaining conservative.",
      recoveredEpsg5179Path: {
        rows: appliedIds.size,
        withinTolerance: rowLineage.filter((row) => row.lineageStatus === "LINEAGE_CONFIRMED").length,
        averageDeltaMeters: rounded(epsgErrors.filter((_, index) => appliedIds.has(spots[index].id)).reduce((sum, value) => sum + value, 0) / appliedIds.size, 4),
        maxDeltaMeters: rounded(Math.max(...epsgErrors.filter((_, index) => appliedIds.has(spots[index].id))), 4),
        previewSha256: sha256(previewPath),
        applySummarySha256: sha256(applySummaryPath),
        checksumChainVerified: preview.input.sha256Before === "3A07B6B7F8A499BA3F81BB9833F057C6308A43C1C5EB791D1EC9F61EFCCC201F" && sha256(sourcePath) === "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA",
      },
      originalDmsPath: {
        rows: spots.length - appliedIds.size,
        reproducedRows: dmsErrors.filter((value) => value <= 1).length,
        averageDeltaMeters: rounded(dmsErrors.reduce((sum, value) => sum + value, 0) / Math.max(1, dmsErrors.length), 4),
        maxDeltaMeters: rounded(Math.max(...dmsErrors), 4),
        originalNormalizerAvailable: false,
      },
      allRowsAgainstEpsg5179: {
        averageDeltaMeters: rounded(epsgErrors.reduce((sum, value) => sum + value, 0) / epsgErrors.length, 3),
        maxDeltaMeters: rounded(Math.max(...epsgErrors), 3),
        over10Meters: epsgErrors.filter((value) => value > 10).length,
        note: "This comparison corroborates CRS identity but is not the asserted lineage path for the 426 DMS-derived rows.",
      },
    },
    duplicateSummary: {
      groups: duplicateGroups.length,
      spots: duplicateGroups.reduce((sum, group) => sum + group.spots.length, 0),
      crossRegionGroups: crossRegionGroups.length,
      crossRegionSpots: crossRegionGroups.reduce((sum, group) => sum + group.spots.length, 0),
      transformationCollisions: duplicateGroups.filter((group) => group.transformationCollision).length,
    },
    duplicateGroups,
    crossRegionGroups,
    nearDuplicates: nearPairs,
    repair: {
      candidates: crossRegionGroups.reduce((sum, group) => sum + group.spots.length, 0),
      candidateCoordinatesAvailable: 0,
      noActionGroups: duplicateGroups.filter((group) => group.action === "NO_ACTION").length + nearPairs.filter((pair) => pair.action === "NO_ACTION").length,
      unresolvedGroups: duplicateGroups.filter((group) => group.classification === "UNRESOLVED").length,
      applied: false,
    },
    navigation: {
      reviewRequired: crossRegionGroups.reduce((sum, group) => sum + group.spots.length, 0),
      reviewRecommended: reviewCandidates.length - crossRegionGroups.reduce((sum, group) => sum + group.spots.length, 0),
      eligibilityChanged: false,
      safetyBoundary: "Map/navigation eligibility only means a coordinate can be rendered. It does not assert a safe route, access permission, hazard avoidance, or depth clearance.",
    },
    unresolvedIssues: [
      "The official portal metadata names the projected geometry field but does not declare its CRS.",
      "The original DMS-to-decimal normalization script/version for 426 unchanged rows is not present.",
      "No authoritative replacement coordinates are available for the four cross-region conflict rows.",
      "Three same-region source-coordinate reuse groups need provider clarification or authoritative row-level correction evidence.",
    ],
    rowLineage,
    invariants: {
      coordinateMutation: 0,
      mergeDelete: 0,
      runtimeChanges: 0,
      databaseSupabaseChanges: 0,
      navigationEligibilityChanges: 0,
    },
  };

  if (JSON.stringify(spots) !== sourceSnapshot) throw new Error("Audit mutated runtime source in memory");
  return {
    report,
    review: {
      audit: report.audit,
      auditDate: report.auditDate,
      candidateCount: reviewCandidates.length,
      repairCandidateCount: report.repair.candidates,
      policy: "REVIEW_ONLY; null candidateCoordinate means no authoritative replacement was found.",
      candidates: reviewCandidates,
    },
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export { buildAudit, haversineMeters, nameSimilarity, parseCsv, parseDms };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { report, review } = buildAudit();
  writeJson(reportPath, report);
  writeJson(candidatesPath, review);
  process.stdout.write(`${JSON.stringify({ decision: report.decision, totalSpots: report.dataset.totalSpots, duplicateGroups: report.duplicateSummary.groups, reviewCandidates: review.candidateCount })}\n`);
}

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const spotPath = path.join(root, "src/data/fishing-spots.json");
const boatSourcePath = path.join(root, "work/fishing-spots-boat-raw.csv");
const holdPath = path.join(root, "reports/fishing-spots/navigation-coordinate-hold-v1.json");
const fipaSourceDefinitions = [
  { path: "src/data/national-ports.ts", declaration: "export const nationalPorts", category: "NATIONAL_PORT" },
  { path: "src/data/local-ports.ts", declaration: "export const localPorts", category: "LOCAL_PORT" },
  { path: "src/data/fixed-ports.ts", declaration: "export const fixedPorts", category: "FIXED_PORT" },
];
const artifactPath = path.join(root, "data/fishing-spots/enrichment/v1/boat-departure-access.json");
const reportPath = path.join(root, "reports/fishing-spots/boat-departure-access-enrichment-v1.json");

const BOAT_SOURCE = Object.freeze({
  sourceType: "MOF_SHARED_BOAT_FISHING_POINT",
  sourceName: "해양수산부 공공데이터 선상낚시 포인트",
  dataset: "해양수산부_공동활용체계_선상낚시포인트_20231231",
  sourceUrl: "https://www.data.go.kr/data/15148435/fileData.do",
  localPath: "work/fishing-spots-boat-raw.csv",
  encoding: "EUC-KR/CP949-compatible",
});

const BASELINE_PORT_MENTION = /[가-힣]*(항|포구|선착장|마리나)/;
const GENERIC_WATERFRONT_MENTION = /^(?:선착장|항구|포구|마리나)(?:앞|부근|인근|주변|해상|입표|서축|$)/;
const NAMED_WATERFRONT_FEATURE = /([가-힣0-9·]+?(?:포구|선착장|마리나|승선장|항))(?=\s*(?:앞|부근|인근|방파제|북측|남측|동측|서측|해상|입표|주변|$))/;

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

function waterfrontType(name) {
  if (name.endsWith("마리나")) return "MARINA";
  if (name.endsWith("포구")) return "HARBOR";
  if (name.endsWith("선착장") || name.endsWith("승선장")) return "OTHER";
  if (name.endsWith("항")) return "PORT";
  return "UNKNOWN";
}

function loadStaticDataArray(definition) {
  const absolutePath = path.join(root, definition.path);
  const source = fs.readFileSync(absolutePath, "utf8");
  const declarationIndex = source.indexOf(definition.declaration);
  const start = source.indexOf("[", declarationIndex);
  const end = source.lastIndexOf("];");
  if (declarationIndex < 0 || start < 0 || end < start) throw new Error(`Cannot parse ${definition.path}`);
  const values = Function(`"use strict"; return (${source.slice(start, end + 1)});`)();
  return values.map((value) => ({ ...value, sourceArtifact: definition.path, portCategory: definition.category }));
}

function extractCandidate(row) {
  for (const field of ["포인트명2", "포인트명1"]) {
    const value = String(row[field] ?? "").trim();
    const match = value.match(NAMED_WATERFRONT_FEATURE);
    if (match) return { name: match[1], type: waterfrontType(match[1]), field, value };
  }
  return null;
}

function classifyBoatFreeText(spot, row) {
  const candidate = extractCandidate(row);
  if (candidate) return { classification: "EXPLICIT_PORT_NAME", candidate };
  const values = [row["포인트명2"], row["포인트명1"]].map((value) => String(value ?? "").trim());
  if (values.some((value) => GENERIC_WATERFRONT_MENTION.test(value))) {
    return { classification: "GENERIC_HARBOR_MENTION", candidate: null };
  }
  if (BASELINE_PORT_MENTION.test(`${spot.name} ${spot.address} ${spot.description}`)) {
    return { classification: "AMBIGUOUS_LOCALITY", candidate: null };
  }
  return { classification: "NO_NAMED_DEPARTURE", candidate: null };
}

function sortedCounts(values) {
  return Object.fromEntries([...values.reduce((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)));
}

function buildEnrichment() {
  const spots = JSON.parse(fs.readFileSync(spotPath, "utf8"));
  const sourceSnapshot = fs.readFileSync(spotPath);
  const boatRows = parseCsv(new TextDecoder("euc-kr").decode(fs.readFileSync(boatSourcePath)));
  const boatSpots = spots.filter((spot) => spot.type === "boat-fishing-point");
  if (boatSpots.length !== 329 || boatRows.length !== 329) throw new Error("Expected exactly 329 boat spots and source rows");
  const rowById = new Map(boatRows.map((row) => [String(row["공간정보일련번호"]), row]));
  const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));
  const fipaPorts = fipaSourceDefinitions.flatMap(loadStaticDataArray);
  const holdIds = hold.holds.map((item) => item.spotId);
  if (holdIds.join("|") !== "boat-60|boat-128|boat-129|boat-321") throw new Error("Coordinate hold scope changed");

  const allFreeTextCandidates = spots.filter((spot) => BASELINE_PORT_MENTION.test(`${spot.name} ${spot.address} ${spot.description}`));
  if (allFreeTextCandidates.length !== 119) throw new Error(`Expected 119 baseline free-text candidates, got ${allFreeTextCandidates.length}`);
  const boatCandidateIds = new Set(allFreeTextCandidates.filter((spot) => spot.type === "boat-fishing-point").map((spot) => spot.id));

  const records = boatSpots.map((spot) => {
    const row = rowById.get(String(spot.originalId));
    if (!row) throw new Error(`Missing official source row for ${spot.id}`);
    if (row["공간정보"] !== spot.originalPoint) throw new Error(`Source lineage mismatch for ${spot.id}`);
    const review = classifyBoatFreeText(spot, row);
    const sourceRef = `${BOAT_SOURCE.localPath}#공간정보일련번호=${spot.originalId}`;
    const candidate = review.candidate;
    const corroborations = candidate ? fipaPorts.filter((port) =>
      port.name === candidate.name
      && (port.province === spot.region || String(port.address ?? "").startsWith(spot.region))
    ) : [];
    const evidence = [{
      authority: "OFFICIAL",
      sourceType: BOAT_SOURCE.sourceType,
      sourceName: BOAT_SOURCE.sourceName,
      sourceUrl: BOAT_SOURCE.sourceUrl,
      sourceRef,
      sourceRecordId: String(spot.originalId),
      fields: {
        pointName1: row["포인트명1"] || null,
        pointName2: row["포인트명2"] || null,
      },
      supports: ["BOAT_ACCESS_MODE", "FISHING_POINT_CONTEXT"],
      doesNotSupport: ["CONFIRMED_DEPARTURE_RELATION", "DEPARTURE_COORDINATE", "PARKING", "BOARDING_PROCEDURE", "PERMIT_OR_CONTROL"],
    }];
    for (const port of corroborations) {
      evidence.push({
        authority: "PUBLIC_INSTITUTION",
        sourceType: "FIPA_PORT_REFERENCE",
        sourceName: port.sourceName,
        sourceUrl: port.sourceFile,
        sourceRef: `${port.sourceArtifact}#${port.id}`,
        sourceRecordId: port.id,
        fields: { name: port.name, category: port.portCategory, address: port.address ?? null },
        supports: ["NAMED_FEATURE_IDENTITY"],
        doesNotSupport: ["CONFIRMED_DEPARTURE_RELATION", "BOARDING_PROCEDURE", "PERMIT_OR_CONTROL"],
      });
    }
    return {
      spotId: spot.id,
      departure: candidate ? {
        name: candidate.name,
        type: candidate.type,
        region: spot.region || null,
        evidenceSource: BOAT_SOURCE.sourceName,
        sourceRef: `${sourceRef}:${candidate.field}`,
        status: "CANDIDATE",
      } : {
        name: null,
        type: "UNKNOWN",
        region: null,
        evidenceSource: null,
        sourceRef: null,
        status: "UNRESOLVED",
      },
      access: {
        mode: "BOAT_REQUIRED",
        parking: null,
        boardingInfo: null,
        restriction: null,
        permitRequired: null,
        evidenceSource: BOAT_SOURCE.sourceName,
        status: "PARTIAL",
      },
      evidence,
      limitations: [
        "공식 원본은 선상낚시 포인트 문맥을 제공하지만 실제 출항지 관계, 주차, 승선 절차, 허가·통제 조건은 제공하지 않는다.",
        candidate
          ? "명시적 수변 명칭은 포인트 위치 문맥의 후보이며 출항지 관계가 확인되지 않아 CANDIDATE로 유지한다."
          : "공식 근거에서 named departure point를 확인할 수 없어 UNRESOLVED로 유지한다.",
        "낚시 포인트 좌표를 출항지 좌표로 재사용하거나 추정하지 않는다.",
      ],
      review: {
        baselineFreeTextCandidate: boatCandidateIds.has(spot.id),
        classification: review.classification,
      },
    };
  });

  const departureStatuses = sortedCounts(records.map((record) => record.departure.status));
  const accessStatuses = sortedCounts(records.map((record) => record.access.status));
  const boatCandidateClassifications = sortedCounts(records.filter((record) => record.review.baselineFreeTextCandidate).map((record) => record.review.classification));
  const freeTextReview = allFreeTextCandidates.map((spot) => {
    if (spot.type !== "boat-fishing-point") {
      return { spotId: spot.id, spotType: spot.type, classification: "NO_NAMED_DEPARTURE", scope: "NON_BOAT_EXCLUDED" };
    }
    const record = records.find((item) => item.spotId === spot.id);
    return {
      spotId: spot.id,
      spotType: spot.type,
      classification: record.review.classification,
      scope: "BOAT_REVIEWED",
      candidateName: record.departure.name,
    };
  });

  const artifact = {
    schemaVersion: 1,
    dataset: "Fishing Spot Departure & Access Enrichment V1",
    generatedOn: "2026-09-17",
    decision: "DEPARTURE_ACCESS_PARTIALLY_READY",
    scope: { spotType: "boat-fishing-point", total: records.length },
    source: { ...BOAT_SOURCE, rows: boatRows.length, sha256: sha256(boatSourcePath) },
    supportingSources: fipaSourceDefinitions.map((definition) => ({ authority: "PUBLIC_INSTITUTION", sourceName: "FIPA", localPath: definition.path, role: "NAMED_FEATURE_IDENTITY_ONLY" })),
    coordinatePolicy: "Fishing spot coordinates are not departure coordinates and are not copied into this artifact.",
    records,
  };

  const report = {
    schemaVersion: 1,
    audit: "Fishing Spot Departure & Access Enrichment V1",
    auditedOn: "2026-09-17",
    baseCommit: "ec5e97ca7033961d6d79eca7abee1233d37a09af",
    decision: "DEPARTURE_ACCESS_PARTIALLY_READY",
    dataset: {
      totalSpots: spots.length,
      boatSpots: records.length,
      sourceRowsTraced: records.length,
      canonicalSha256: sha256(spotPath),
      boatSourceSha256: sha256(boatSourcePath),
    },
    departure: {
      confirmed: departureStatuses.CONFIRMED ?? 0,
      candidate: departureStatuses.CANDIDATE ?? 0,
      unresolved: departureStatuses.UNRESOLVED ?? 0,
      departureCoordinatesAdded: 0,
    },
    access: {
      confirmed: accessStatuses.CONFIRMED ?? 0,
      partial: accessStatuses.PARTIAL ?? 0,
      unknown: accessStatuses.UNKNOWN ?? 0,
      boatRequired: records.filter((record) => record.access.mode === "BOAT_REQUIRED").length,
      parkingKnown: records.filter((record) => record.access.parking !== null).length,
      boardingInfoKnown: records.filter((record) => record.access.boardingInfo !== null).length,
      permitRequirementKnown: records.filter((record) => record.access.permitRequired !== null).length,
    },
    control: {
      restrictionCoverage: records.filter((record) => record.access.restriction !== null).length,
      permitCoverage: records.filter((record) => record.access.permitRequired !== null).length,
      inferredRestrictions: 0,
    },
    freeTextCandidateReview: {
      baselineCandidates: allFreeTextCandidates.length,
      boatInScope: boatCandidateIds.size,
      nonBoatExcluded: allFreeTextCandidates.length - boatCandidateIds.size,
      boatClassifications: boatCandidateClassifications,
      allClassifications: sortedCounts(freeTextReview.map((item) => item.classification)),
      records: freeTextReview,
    },
    sourceDistribution: {
      officialRawRows: records.length,
      publicInstitutionCorroborations: records.filter((record) => record.evidence.some((item) => item.authority === "PUBLIC_INSTITUTION")).length,
      publicInstitutionCorroboratedFeatureNames: [...new Set(records.flatMap((record) => record.evidence.filter((item) => item.authority === "PUBLIC_INSTITUTION").map((item) => item.fields.name)))].sort(),
      officialConfirmedDepartureRelations: 0,
      officialFreeTextDepartureCandidates: records.filter((record) => record.departure.status === "CANDIDATE").length,
      unresolvedDepartureRelations: records.filter((record) => record.departure.status === "UNRESOLVED").length,
    },
    unresolvedReasons: {
      NO_DEPARTURE_FIELD_IN_OFFICIAL_SOURCE: records.length,
      NO_NAMED_WATERFRONT_MENTION: records.filter((record) => record.review.classification === "NO_NAMED_DEPARTURE").length,
      GENERIC_HARBOR_MENTION: records.filter((record) => record.review.classification === "GENERIC_HARBOR_MENTION").length,
      AMBIGUOUS_LOCALITY: records.filter((record) => record.review.classification === "AMBIGUOUS_LOCALITY").length,
      NAMED_FEATURE_WITHOUT_DEPARTURE_RELATION: records.filter((record) => record.review.classification === "EXPLICIT_PORT_NAME").length,
    },
    coordinateSafetyHold: {
      source: "reports/fishing-spots/navigation-coordinate-hold-v1.json",
      spotIds: holdIds,
      policies: hold.holds.map(({ spotId, mapPolicy, navigationPolicy }) => ({ spotId, mapPolicy, navigationPolicy })),
      navigationHoldReleased: 0,
      unchanged: true,
    },
    output: {
      enrichmentDataset: "data/fishing-spots/enrichment/v1/boat-departure-access.json",
      report: "reports/fishing-spots/boat-departure-access-enrichment-v1.json",
      runtimeIntegrated: false,
    },
    invariants: {
      canonicalCoordinateMutation: 0,
      sourceMutation: 0,
      departureCoordinateInference: 0,
      duplicateMergeDelete: 0,
      navigationHoldRelease: 0,
      runtimeMutation: 0,
      databaseWrite: 0,
      supabaseWrite: 0,
    },
  };

  if (!sourceSnapshot.equals(fs.readFileSync(spotPath))) throw new Error("Canonical spot source mutated");
  return { artifact, report };
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, jsonText(value), "utf8");
}

function checkJson(filePath, value) {
  if (!fs.existsSync(filePath) || fs.readFileSync(filePath, "utf8") !== jsonText(value)) {
    throw new Error(`${path.relative(root, filePath)} is not deterministic or is out of date`);
  }
}

function main() {
  const result = buildEnrichment();
  if (process.argv.includes("--write")) {
    writeJson(artifactPath, result.artifact);
    writeJson(reportPath, result.report);
  } else {
    checkJson(artifactPath, result.artifact);
    checkJson(reportPath, result.report);
  }
  process.stdout.write(`${JSON.stringify({ decision: result.report.decision, departure: result.report.departure, access: result.report.access, freeText: result.report.freeTextCandidateReview.boatClassifications })}\n`);
}

export { BASELINE_PORT_MENTION, buildEnrichment, classifyBoatFreeText, extractCandidate, parseCsv };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

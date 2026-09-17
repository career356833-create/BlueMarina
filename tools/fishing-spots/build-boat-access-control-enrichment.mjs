import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./build-boat-departure-access-enrichment.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INPUT_PATH = "data/fishing-spots/enrichment/v1/boat-departure-access.json";
const SOURCE_PATH = "work/fishing-spots-boat-raw.csv";
const CANONICAL_PATH = "src/data/fishing-spots.json";
const HOLD_PATH = "reports/fishing-spots/navigation-coordinate-hold-v1.json";
const DEPARTURE_RESEARCH_PATH = "data/fishing-spots/enrichment/research/departure-point-batch1-v1.json";
const DATA_PATH = "data/fishing-spots/enrichment/research/boat-access-control-v1.json";
const REPORT_PATH = "reports/fishing-spots/boat-access-control-enrichment-v1.json";

const EXPECTED_HASHES = {
  input: "9E4BE97368A2EA45017D0A82DBCF7ED00173A0598ACCA3C3AA309CB7F0A4D951",
  source: "5AE7CFB4280214667583724B8C0531A7018B0ABDE47CB82C60F6C491B9DFA20D",
  canonical: "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA",
  hold: "057EEAF2DAEAD1806F0C33AA3F247DF12EB1D6B4FFF8533432467F4889BC9EC1",
  departureResearch: "2ABF0850914D7575E4B4591A007457CE643D9C2F504A22130D3B589D0944B729",
};
const EXPECTED_HOLD_IDS = ["boat-60", "boat-128", "boat-129", "boat-321"];
const OFFICIAL_SOURCE_URL = "https://www.data.go.kr/data/15148435/fileData.do";

function readBytes(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertHash(label, bytes, expected) {
  assert(sha256(bytes) === expected, `${label} hash changed`);
}

export function buildAccessControlEnrichment() {
  const inputBytes = readBytes(INPUT_PATH);
  const sourceBytes = readBytes(SOURCE_PATH);
  const canonicalBytes = readBytes(CANONICAL_PATH);
  const holdBytes = readBytes(HOLD_PATH);
  const departureResearchBytes = readBytes(DEPARTURE_RESEARCH_PATH);

  assertHash("Production enrichment", inputBytes, EXPECTED_HASHES.input);
  assertHash("Official boat source", sourceBytes, EXPECTED_HASHES.source);
  assertHash("Canonical fishing spots", canonicalBytes, EXPECTED_HASHES.canonical);
  assertHash("Coordinate safety hold", holdBytes, EXPECTED_HASHES.hold);
  assertHash("Departure verification research", departureResearchBytes, EXPECTED_HASHES.departureResearch);

  const input = JSON.parse(inputBytes.toString("utf8"));
  const canonical = JSON.parse(canonicalBytes.toString("utf8"));
  const hold = JSON.parse(holdBytes.toString("utf8"));
  const departureResearch = JSON.parse(departureResearchBytes.toString("utf8"));
  const sourceRows = parseCsv(new TextDecoder("euc-kr").decode(sourceBytes));
  const boatRecords = input.records.filter((record) => record.spotId.startsWith("boat-"));

  assert(boatRecords.length === 329, `Expected 329 boat records, received ${boatRecords.length}`);
  assert(sourceRows.length === 329, `Expected 329 official source rows, received ${sourceRows.length}`);
  assert(new Set(boatRecords.map((record) => record.spotId)).size === 329, "Boat spot IDs must be unique");
  assert(departureResearch.records.length === 20, "Departure research candidate set changed");
  assert(departureResearch.counts.confirmed === 0, "Named departure was promoted unexpectedly");
  assert(
    JSON.stringify(hold.holds.map((item) => item.spotId)) === JSON.stringify(EXPECTED_HOLD_IDS),
    "Coordinate safety hold set changed",
  );
  assert(hold.holds.every((item) => item.applied === false), "A coordinate safety hold was released");

  const sourceById = new Map(sourceRows.map((row) => [`boat-${row["공간정보일련번호"]}`, row]));
  const canonicalById = new Map(canonical.map((spot) => [spot.id, spot]));
  const records = boatRecords.map((record) => {
    const source = sourceById.get(record.spotId);
    const spot = canonicalById.get(record.spotId);
    assert(source, `Missing official source row for ${record.spotId}`);
    assert(spot, `Missing canonical spot ${record.spotId}`);
    assert(record.access.mode === "BOAT_REQUIRED", `Unexpected access mode for ${record.spotId}`);
    const sourceNotice = String(source["고시내용"] ?? "").trim() || null;

    return {
      spotId: record.spotId,
      spotName: spot.name,
      region: spot.region,
      access: {
        mode: "BOAT_REQUIRED",
        parking: null,
        boardingInfo: null,
        restriction: null,
        permitRequired: null,
        accessStatus: "PARTIAL",
        sourceRefs: [
          OFFICIAL_SOURCE_URL,
          `${SOURCE_PATH}#공간정보일련번호=${source["공간정보일련번호"]}`,
        ],
      },
      control: {
        closedArea: null,
        timeRestriction: null,
        permitType: null,
        authority: null,
        status: "UNKNOWN",
      },
      evidence: {
        authority: "OFFICIAL",
        sourceName: "해양수산부 공동활용체계 선상낚시포인트",
        sourceRecordId: source["공간정보일련번호"],
        sourceFields: {
          pointName1: source["포인트명1"],
          pointName2: source["포인트명2"],
          notice: sourceNotice,
        },
        supports: ["BOAT_REQUIRED", "SOURCE_ROW_TRACEABILITY"],
        dedicatedAccessControlFieldsPresent: false,
        noticeApplicableToExactSpot: false,
        noticeExclusionReason: sourceNotice
          ? "고시내용은 같은 권역의 별도 갯바위·방파제 접근 설명이며 현재 선상 fishing spot의 parking, boarding, restriction, permit 근거가 아니다."
          : null,
        doesNotSupport: [
          "PARKING",
          "BOARDING_PROCEDURE",
          "SPOT_SPECIFIC_RESTRICTION",
          "PERMIT_REQUIREMENT",
          "CLOSED_AREA_STATUS",
          "TIME_RESTRICTION",
        ],
      },
      limitations: [
        "BOAT_REQUIRED는 공식 데이터셋이 선상낚시 포인트를 수록한다는 범위 근거만 반영한다.",
        "항·포구 명칭 또는 일반 항만 규칙을 spot별 access/control 값으로 전환하지 않는다.",
        "확인되지 않은 parking, boarding, restriction, permit 값은 null로 유지한다.",
      ],
    };
  });

  const noticeRows = records.filter((record) => record.evidence.sourceFields.notice !== null).length;
  assert(noticeRows === 29, `Expected 29 source notice rows, received ${noticeRows}`);
  assert(records.every((record) => record.evidence.noticeApplicableToExactSpot === false), "Notice was misapplied");

  const counts = {
    total: records.length,
    access: { confirmed: 0, partial: 329, unknown: 0 },
    parking: { confirmed: 0, unknown: 329 },
    boarding: { confirmed: 0, partial: 0, unknown: 329 },
    control: { restrictionsConfirmed: 0, permitsConfirmed: 0, unknown: 329 },
  };

  const dataset = {
    schemaVersion: 1,
    research: "Fishing Spot Access & Control Enrichment V1",
    researchedOn: "2026-09-17",
    baseCommit: "83fcdb0e42c74c7c63f91d48f1b08c2576548a30",
    decision: "ACCESS_CONTROL_SOURCE_TOO_SPARSE",
    sourceCoverage: {
      officialSourceRowsTraced: 329,
      publicInstitutionGeographicEvidenceReviewed: 16,
      spotSpecificDetailedAccessSources: 0,
      unresolvedDetailedAccess: 329,
      sourceNoticeRows: noticeRows,
      sourceNoticesApplicableToExactBoatSpot: 0,
    },
    counts,
    records,
  };

  const report = {
    schemaVersion: 1,
    audit: "Fishing Spot Access & Control Enrichment V1",
    auditedOn: "2026-09-17",
    baseCommit: "83fcdb0e42c74c7c63f91d48f1b08c2576548a30",
    decision: dataset.decision,
    counts,
    sourceCoverage: dataset.sourceCoverage,
    fieldCoverage: {
      boatRequired: 329,
      parking: 0,
      boardingInfo: 0,
      restriction: 0,
      permitRequired: 0,
      closedArea: 0,
      timeRestriction: 0,
      permitType: 0,
      controlAuthority: 0,
    },
    exclusions: {
      generalPortRuleAppliedToSpot: 0,
      geographicIdentityAppliedAsAccess: 0,
      sourceNoticeMisappliedToBoatSpot: 0,
      noRestrictionInterpretedAsFreeAccess: 0,
    },
    coordinateSafetyHold: {
      source: HOLD_PATH,
      spotIds: EXPECTED_HOLD_IDS,
      count: 4,
      released: 0,
      unchanged: true,
    },
    hashes: {
      productionEnrichmentSha256: sha256(inputBytes),
      officialBoatSourceSha256: sha256(sourceBytes),
      canonicalFishingSpotsSha256: sha256(canonicalBytes),
      coordinateHoldSha256: sha256(holdBytes),
      departureResearchSha256: sha256(departureResearchBytes),
    },
    output: {
      dataset: DATA_PATH,
      report: REPORT_PATH,
      productionIntegrated: false,
    },
    invariants: {
      parkingInference: 0,
      boardingInference: 0,
      restrictionInference: 0,
      permitInference: 0,
      coordinateMutation: 0,
      productionEnrichmentMutation: 0,
      navigationHoldRelease: 0,
      runtimeMutation: 0,
      databaseWrite: 0,
      supabaseWrite: 0,
    },
  };

  return { dataset, report };
}

function writeOrCheck(relativePath, value, write) {
  const absolutePath = path.join(ROOT, relativePath);
  const serialized = stableJson(value);
  if (write) {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    return;
  }
  assert(fs.existsSync(absolutePath), `Missing generated artifact ${relativePath}`);
  assert(fs.readFileSync(absolutePath, "utf8") === serialized, `Generated artifact differs: ${relativePath}`);
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  const write = process.argv.includes("--write");
  const { dataset, report } = buildAccessControlEnrichment();
  writeOrCheck(DATA_PATH, dataset, write);
  writeOrCheck(REPORT_PATH, report, write);
  console.log(JSON.stringify({ decision: dataset.decision, ...dataset.counts }));
}

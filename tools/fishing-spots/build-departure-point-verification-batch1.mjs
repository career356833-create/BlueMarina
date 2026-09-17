import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INPUT_PATH = "data/fishing-spots/enrichment/v1/boat-departure-access.json";
const CANONICAL_PATH = "src/data/fishing-spots.json";
const HOLD_PATH = "reports/fishing-spots/navigation-coordinate-hold-v1.json";
const DATA_PATH = "data/fishing-spots/enrichment/research/departure-point-batch1-v1.json";
const REPORT_PATH = "reports/fishing-spots/departure-point-verification-batch1-v1.json";

const EXPECTED_INPUT_SHA256 = "9E4BE97368A2EA45017D0A82DBCF7ED00173A0598ACCA3C3AA309CB7F0A4D951";
const EXPECTED_CANONICAL_SHA256 = "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA";
const EXPECTED_HOLD_SHA256 = "057EEAF2DAEAD1806F0C33AA3F247DF12EB1D6B4FFF8533432467F4889BC9EC1";
const EXPECTED_HOLD_IDS = ["boat-60", "boat-128", "boat-129", "boat-321"];

const GENERAL_DEPARTURE_USE_ONLY = new Set(["boat-125", "boat-160", "boat-290"]);

const SUPPLEMENTAL_EVIDENCE = {
  "boat-29": [
    {
      authority: "LOCAL_GOVERNMENT",
      sourceType: "OFFICIAL_TRANSIT_REFERENCE",
      sourceName: "제주버스정보시스템 680번 노선",
      sourceUrl: "https://bus.jeju.go.kr/mobile/schedule/detailSchedule?scheduleId=2502",
      finding: "공식 노선 안내가 강정포구의 명칭과 서귀포 지역 위치를 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-63": [
    {
      authority: "LOCAL_GOVERNMENT",
      sourceType: "OFFICIAL_TRANSIT_REFERENCE",
      sourceName: "제주버스정보시스템 680번 노선",
      sourceUrl: "https://bus.jeju.go.kr/mobile/schedule/detailSchedule?scheduleId=2502",
      finding: "공식 노선 안내가 강정포구의 명칭과 서귀포 지역 위치를 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-100": [
    {
      authority: "CENTRAL_GOVERNMENT",
      sourceType: "LIGHTHOUSE_REFERENCE",
      sourceName: "인천지방해양수산청 무인등대 현황",
      sourceUrl: "https://incheon.mof.go.kr/ko/page.do?menuIdx=1919",
      finding: "선진포항 방사제·방파제 등대 기록이 항 명칭과 옹진 지역을 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-125": [
    {
      authority: "LOCAL_GOVERNMENT",
      sourceType: "FISHING_VESSEL_REGISTRY_VIEW",
      sourceName: "거제시 관광문화 낚시어선 목록",
      sourceUrl: "https://tour.geoje.go.kr/board/list.geoje?boardId=BBS_0000505&menuCd=DOM_000008502004005003&paging=ok&startPage=10",
      finding: "공식 낚시어선 목록이 지세포항을 낚시어선 출입항·계선 장소로 기록한다. 어느 어선이 boat-125 지점으로 운항하는지는 기록하지 않는다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH", "GENERAL_FISHING_VESSEL_DEPARTURE_USE"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-148": [
    {
      authority: "LOCAL_GOVERNMENT",
      sourceType: "OFFICIAL_EDUCATION_REFERENCE",
      sourceName: "제주특별자치도 제주어 교육 플랫폼",
      sourceUrl: "https://www.jeju.go.kr/jedu/data/data.htm?act=view&page=101&seq=1538302",
      finding: "공식 교육 자료가 비안포구 명칭을 제주 지역 지명으로 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-160": [
    {
      authority: "CENTRAL_GOVERNMENT",
      sourceType: "COAST_GUARD_PORT_PROFILE",
      sourceName: "태안해양경찰서 방포출장소 관할 안내",
      sourceUrl: "https://www.kcg.go.kr/taeancgs/cm/cntnts/cntntsView.do?cntntsId=532&mi=2513",
      finding: "방포항을 관할 주요 항포구로, 주요 선박을 낚시어선 57척으로 기록한다. boat-160 지점과 개별 출항 관계는 제시하지 않는다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH", "GENERAL_FISHING_VESSEL_DEPARTURE_USE"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-211": [
    {
      authority: "CENTRAL_GOVERNMENT",
      sourceType: "COAST_GUARD_INCIDENT_REFERENCE",
      sourceName: "서귀포해양경찰서 보도자료",
      sourceUrl: "https://www.kcg.go.kr/seoguipocgs/na/ntt/selectNttInfo.do?nttSn=42273",
      finding: "공식 보도자료가 태흥리포구와 그 남쪽 해상을 같은 지역 문맥에서 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-215": [
    {
      authority: "LOCAL_GOVERNMENT",
      sourceType: "OFFICIAL_TOURISM_REFERENCE",
      sourceName: "강화군 문화관광 여행 코스",
      sourceUrl: "https://www.ganghwa.go.kr/open_content/tour/trip/day2_1.jsp",
      finding: "공식 여행 안내가 외포리선착장의 명칭과 강화 지역 위치, 여객선 이용을 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "FISHING_VESSEL_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-224": [
    {
      authority: "CENTRAL_GOVERNMENT",
      sourceType: "OFFICIAL_PASSENGER_ROUTE_REFERENCE",
      sourceName: "부산지방해양수산청 추자도등대 찾아오시는 길",
      sourceUrl: "https://busan.mof.go.kr/ko/page.do?menuIdx=4626",
      finding: "공식 안내가 추자항 명칭과 여객선 기항 관계를 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "FISHING_VESSEL_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-290": [
    {
      authority: "PUBLIC_INSTITUTION",
      sourceType: "OFFICIAL_TOURISM_REFERENCE",
      sourceName: "한국관광공사 대한민국 구석구석",
      sourceUrl: "https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=d3babfcf-e148-4523-84cb-88fc21d86618",
      finding: "공공기관 안내가 압해도선착장을 선상낚시 출발지로 일반적으로 소개한다. boat-290 지점으로의 운항 관계는 특정하지 않는다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH", "GENERAL_FISHING_VESSEL_DEPARTURE_USE"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
  "boat-300": [
    {
      authority: "CENTRAL_GOVERNMENT",
      sourceType: "OFFICIAL_COAST_ROUTE_REFERENCE",
      sourceName: "해양수산부 연안포털 우도 해안도로",
      sourceUrl: "https://coast.mof.go.kr/coastScene/coastWayView.do?dt2=330&road_no=49",
      finding: "공식 연안 안내가 천진항 명칭과 우도 지역 위치, 여객 교통 관계를 확인한다.",
      supports: ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
      doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "FISHING_VESSEL_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
    },
  ],
};

function readBytes(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(readBytes(relativePath).toString("utf8"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function projectInputEvidence(candidate) {
  return candidate.evidence.map((item) => ({
    authority: item.authority,
    sourceType: item.sourceType,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    sourceRef: item.sourceRef,
    finding:
      item.sourceType === "MOF_SHARED_BOAT_FISHING_POINT"
        ? `공식 선상낚시 포인트 원본이 ${item.fields.pointName1} / ${item.fields.pointName2}라는 위치 문맥을 제공한다.`
        : `${item.fields.name}의 명칭, 유형, 주소가 후보 지역과 일치한다.`,
    supports:
      item.sourceType === "MOF_SHARED_BOAT_FISHING_POINT"
        ? ["SPOT_IDENTITY", "NAMED_FEATURE_IN_SPOT_CONTEXT", "REGION_MATCH"]
        : ["NAMED_FEATURE_IDENTITY", "REGION_MATCH"],
    doesNotSupport: ["EXACT_SPOT_DEPARTURE_RELATION", "DEPARTURE_COORDINATE"],
  }));
}

export function buildVerification() {
  const inputBytes = readBytes(INPUT_PATH);
  const canonicalBytes = readBytes(CANONICAL_PATH);
  const holdBytes = readBytes(HOLD_PATH);
  assert(sha256(inputBytes) === EXPECTED_INPUT_SHA256, "Original enrichment artifact hash changed");
  assert(sha256(canonicalBytes) === EXPECTED_CANONICAL_SHA256, "Canonical fishing spots hash changed");
  assert(sha256(holdBytes) === EXPECTED_HOLD_SHA256, "Coordinate hold artifact hash changed");

  const input = JSON.parse(inputBytes.toString("utf8"));
  const canonical = JSON.parse(canonicalBytes.toString("utf8"));
  const hold = JSON.parse(holdBytes.toString("utf8"));
  const candidates = input.records.filter((record) => record.departure.status === "CANDIDATE");
  assert(candidates.length === 20, `Expected exactly 20 candidates, received ${candidates.length}`);
  assert(new Set(candidates.map((record) => record.spotId)).size === 20, "Candidate spot IDs must be unique");
  assert(
    JSON.stringify(hold.holds.map((item) => item.spotId)) === JSON.stringify(EXPECTED_HOLD_IDS),
    "Coordinate safety hold set changed",
  );
  assert(hold.holds.every((item) => item.applied === false), "A coordinate safety hold was released");

  const canonicalById = new Map(canonical.map((spot) => [spot.id, spot]));
  const records = candidates.map((candidate) => {
    const spot = canonicalById.get(candidate.spotId);
    assert(spot, `Missing canonical spot ${candidate.spotId}`);
    assert(spot.region === candidate.departure.region, `Region mismatch for ${candidate.spotId}`);
    const departureRelationStatus = GENERAL_DEPARTURE_USE_ONLY.has(candidate.spotId)
      ? "DEPARTURE_RELATION_UNRESOLVED"
      : "GEOGRAPHIC_NAME_ONLY";
    return {
      spotId: candidate.spotId,
      spotName: spot.name,
      candidateDepartureName: candidate.departure.name,
      region: spot.region,
      evidence: [
        ...projectInputEvidence(candidate),
        ...(SUPPLEMENTAL_EVIDENCE[candidate.spotId] ?? []),
      ],
      departureRelationStatus,
      departureCoordinate: null,
      limitations: [
        "항·포구·선착장 명칭이 fishing spot의 위치 문맥에 등장한다는 사실은 실제 승선·출항 관계를 증명하지 않는다.",
        departureRelationStatus === "DEPARTURE_RELATION_UNRESOLVED"
          ? "공공 근거가 해당 항의 일반적인 낚시어선 이용을 확인하지만 이 fishing spot으로의 운항 관계는 특정하지 않는다."
          : "확인된 공공 근거는 지명과 지역만 뒷받침하며 이 fishing spot으로의 승선·출항 관계를 제시하지 않는다.",
        "명시적 공식 출항지 좌표가 없어 departureCoordinate를 null로 유지한다.",
      ],
    };
  });

  const counts = {
    total: records.length,
    confirmed: records.filter((item) => item.departureRelationStatus === "DEPARTURE_CONFIRMED").length,
    geographicNameOnly: records.filter((item) => item.departureRelationStatus === "GEOGRAPHIC_NAME_ONLY").length,
    unresolved: records.filter((item) => item.departureRelationStatus === "DEPARTURE_RELATION_UNRESOLVED").length,
    conflicts: records.filter((item) => item.departureRelationStatus === "CONFLICT_REVIEW_REQUIRED").length,
    departureCoordinatesAdded: records.filter((item) => item.departureCoordinate !== null).length,
  };
  assert(counts.total === 20, "Verification output must contain exactly 20 records");
  assert(counts.confirmed === 0, "No candidate meets the exact departure confirmation gate");
  assert(counts.departureCoordinatesAdded === 0, "Departure coordinate inference is forbidden");

  const data = {
    schemaVersion: 1,
    research: "Fishing Spot Departure Point Verification Batch 1",
    researchedOn: "2026-09-17",
    baseCommit: "d527236d2eedbf39029082405a324c7db8121479",
    input: INPUT_PATH,
    decision: "NO_AUTHORITATIVE_EXACT_DEPARTURE_RELATION_CONFIRMED",
    confirmationGate: [
      "spot identity match",
      "named departure point stated",
      "actual boarding or departure relation stated",
      "authoritative source",
      "source URL or reference",
      "region match",
    ],
    counts,
    records,
  };

  const report = {
    schemaVersion: 1,
    audit: "Fishing Spot Departure Point Verification Batch 1",
    auditedOn: "2026-09-17",
    baseCommit: "d527236d2eedbf39029082405a324c7db8121479",
    decision: data.decision,
    counts,
    evidenceSummary: {
      officialBoatSourceRecords: 20,
      recordsWithIndependentPublicIdentityEvidence: records.filter((item) => item.evidence.length > 1).length,
      recordsWithGeneralFishingDepartureUseOnly: GENERAL_DEPARTURE_USE_ONLY.size,
      recordsWithExactSpotDepartureRelation: 0,
    },
    coordinateSafetyHold: {
      source: HOLD_PATH,
      spotIds: EXPECTED_HOLD_IDS,
      count: 4,
      released: 0,
      unchanged: true,
    },
    artifacts: {
      researchData: DATA_PATH,
      report: REPORT_PATH,
      productionEnrichmentPromoted: false,
    },
    hashes: {
      originalEnrichmentSha256: sha256(inputBytes),
      canonicalFishingSpotsSha256: sha256(canonicalBytes),
      coordinateHoldSha256: sha256(holdBytes),
    },
    invariants: {
      coordinateInference: 0,
      originalEnrichmentMutation: 0,
      canonicalCoordinateMutation: 0,
      navigationHoldRelease: 0,
      runtimeMutation: 0,
      databaseWrite: 0,
      supabaseWrite: 0,
    },
  };

  return { data, report };
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
  const { data, report } = buildVerification();
  writeOrCheck(DATA_PATH, data, write);
  writeOrCheck(REPORT_PATH, report, write);
  console.log(JSON.stringify({ decision: data.decision, ...data.counts }));
}

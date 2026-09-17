import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, parseDms, haversineMeters } from "./verify-coordinate-lineage.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REVIEW_IDS = Object.freeze(["boat-60", "boat-128", "boat-129", "boat-321"]);
const BASE_COMMIT = "37919f17603b39cb345840dd2c6184c9c6c9ff23";
const REPORT_PATH = "reports/fishing-spots/coordinate-repair-review-v1.json";
const HOLD_PATH = "reports/fishing-spots/navigation-coordinate-hold-v1.json";
const CANONICAL_PATH = "src/data/fishing-spots.json";
const RAW_PATH = "work/fishing-spots-boat-raw.csv";
const CANONICAL_SHA = "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA";
const RAW_SHA = "5AE7CFB4280214667583724B8C0531A7018B0ABDE47CB82C60F6C491B9DFA20D";
const SOURCE_URL = "https://www.data.go.kr/data/15148435/fileData.do";
const DOWNLOAD_URL = "https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003243490&fileDetailSn=1&insertDataPrcus=N";
const expectedCoordinates = {
  "boat-60": { lat: 37.628583, lon: 125.680389 },
  "boat-128": { lat: 37.628583, lon: 125.680389 },
  "boat-129": { lat: 37.475917, lon: 126.354778 },
  "boat-321": { lat: 37.475917, lon: 126.354778 },
};
const expectedIdentity = {
  "boat-60": ["두미도", "청석골", "경상남도", "통영시"],
  "boat-128": ["연평도", "구지둔턱", "인천광역시", "옹진군"],
  "boat-129": ["영종도·용유도", "영종도북측수문북서측해상", "인천광역시", "중구"],
  "boat-321": ["돌산도", "백포간출여주변해상", "전라남도", "여수시"],
};
const contextEvidence = {
  "boat-60": {
    evidenceId: "AKS-DUMIDO", publisher: "한국학중앙연구원 한국민족문화대백과사전",
    authorityType: "PUBLIC_RESEARCH_INSTITUTION", independenceGroup: "AKS-ENCYCLOPEDIA",
    url: "https://encykorea.aks.ac.kr/Article/E0017002", sourceRecordIdentifier: "E0017002",
    title: "두미도", scope: "PARENT_ISLAND_ONLY", exactLocationMatch: false,
    finding: "두미도를 통영시 욕지면 두미리의 섬으로 설명한다. 청석골 낚시 지점의 위치를 특정하지 않는다.",
    coordinateReference: { latitudeText: "34°41′N", longitudeText: "128°13′E", unit: "degrees and minutes", crs: "UNDECLARED", use: "REJECTED_PARENT_ISLAND_REFERENCE_NOT_REPLACEMENT" },
    limitation: "학술 지명 설명이며 측량 성과나 청석골의 좌표 정정 고시가 아니다. 섬 대표 좌표를 낚시 지점으로 전용하지 않는다.",
  },
  "boat-128": {
    evidenceId: "INCHEON-YEONPYEONG", publisher: "인천광역시·인천관광공사 인천투어",
    authorityType: "PUBLIC_AUTHORITY", independenceGroup: "INCHEON-TOURISM",
    url: "https://itour.incheon.go.kr/ssst/ssst/detail.do?cotId=ITD21122410395910989", sourceRecordIdentifier: "ITD21122410395910989",
    title: "연평도(대·소연평도)", scope: "PARENT_ISLAND_ONLY", exactLocationMatch: false,
    finding: "연평면 옹진군의 대·소연평도를 설명한다. 구지둔턱의 명시 좌표를 제공하지 않는다.",
    coordinateReference: null,
    limitation: "연평도 관광지 주소나 구지도라는 유사 지명을 구지둔턱의 정확한 위치로 간주하지 않는다.",
  },
  "boat-129": {
    evidenceId: "INCHEON-YEONGJONG", publisher: "인천광역시·인천관광공사 인천투어",
    authorityType: "PUBLIC_AUTHORITY", independenceGroup: "INCHEON-TOURISM",
    url: "https://itour.incheon.go.kr/ssst/ssst/detail.do?cotId=ITD21122410481474663", sourceRecordIdentifier: "ITD21122410481474663",
    title: "영종도", scope: "PARENT_ISLAND_ONLY", exactLocationMatch: false,
    finding: "영종도와 용유도 일대를 설명한다. 북측수문의 북서측 해상 지점에 대한 명시 좌표는 없다.",
    coordinateReference: null,
    limitation: "현재 페이지 주소는 인천 영종구 운남동으로 표시된다. 원본의 2023년 중구 명칭과 시점을 구분하며 행정명 변경이나 좌표 정정을 수행하지 않는다. 수문 자체와 북서측 해상은 다른 대상이다.",
  },
  "boat-321": {
    evidenceId: "YEOSU-BAEKPO", publisher: "여수시 돌산읍",
    authorityType: "PUBLIC_AUTHORITY", independenceGroup: "YEOSU-LOCAL-GOVERNMENT",
    url: "https://www.yeosu.go.kr/dong/center/dolsan-eup/dolsan-eup_guide/baekpo", sourceRecordIdentifier: "dong/center/dolsan-eup/dolsan-eup_guide/baekpo",
    title: "백포 마을안내", scope: "PARENT_VILLAGE_ONLY", exactLocationMatch: false,
    finding: "백포를 돌산읍의 해안 마을로 설명하며 방죽포와 대율 사이에 있다고 한다. 간출여 주변해상의 좌표는 제공하지 않는다.",
    coordinateReference: null,
    limitation: "백포 마을·항구·해변의 위치와 간출여 주변해상은 동일 지점으로 증명되지 않았다. 검색 색인 본문을 확인했고 직접 페이지 열기는 실패했다.",
  },
};

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function validateCoordinate(coordinate) {
  assert(coordinate && Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lon), "explicit numeric coordinate required");
  assert(Math.abs(coordinate.lat) <= 90 && Math.abs(coordinate.lon) <= 180, "coordinate out of range");
}

// Evidence flags are review attestations, not automated geographic proof.
// V1 contains no accepted coordinate evidence; a future candidate must pass every gate.
function acceptedCandidateSources(record) {
  if (record.candidateCoordinate === null) return [];
  const candidate = record.candidateCoordinate;
  validateCoordinate(candidate);
  assert.equal(candidate.crs, "EPSG:4326", "candidate must have documented WGS84 normalization");
  assert.equal(candidate.unit, "decimal degrees");
  assert.equal(candidate.derivation, "EXPLICIT_AUTHORITY_COORDINATE", "arbitrary geocoding is forbidden");
  assert(Array.isArray(candidate.evidenceIds) && candidate.evidenceIds.length > 0, "candidate requires source");
  return candidate.evidenceIds.map((id) => {
    const evidence = record.officialEvidence.find((item) => item.evidenceId === id);
    assert(evidence, "candidate evidence reference missing");
    assert(["PUBLIC_AUTHORITY", "PUBLIC_RESEARCH_INSTITUTION"].includes(evidence.authorityType), "authority required");
    assert.equal(evidence.coordinateAuthorityEligible, true, "source is not coordinate authority for this record");
    assert.equal(evidence.exactLocationMatch, true, "exact location identity required");
    assert.equal(evidence.regionConsistent, true, "region consistency required");
    assert.equal(evidence.conflictResolved, true, "source conflict remains unresolved");
    assert.equal(evidence.sourceRecordIdentifier, candidate.sourceRecordIdentifiers[id], "source record mismatch");
    assert(evidence.url && new URL(evidence.url).protocol === "https:", "source URL required");
    assert(evidence.independenceGroup, "source lineage required");
    assert.deepEqual(evidence.explicitCoordinate, { lat: candidate.lat, lon: candidate.lon, crs: candidate.crs, unit: candidate.unit }, "explicit source coordinate and CRS must match");
    return evidence;
  });
}

function validateRecord(record) {
  assert(REVIEW_IDS.includes(record.spotId), "scope violation");
  assert.deepEqual(record.currentCoordinate, expectedCoordinates[record.spotId], "current coordinates must be preserved");
  assert(["MAP_DISPLAY_ALLOWED", "MAP_DISPLAY_WITH_WARNING", "MAP_DISPLAY_BLOCKED"].includes(record.mapPolicy), "map policy required");
  assert(["NAVIGATION_ALLOWED", "NAVIGATION_BLOCKED_PENDING_REVIEW"].includes(record.navigationPolicy), "navigation policy required");
  assert(["REPAIR_APPROVED", "REPAIR_CANDIDATE_NEEDS_SECOND_SOURCE", "NO_AUTHORITATIVE_REPLACEMENT", "CURRENT_COORDINATE_CONFIRMED", "LOCATION_IDENTITY_UNRESOLVED"].includes(record.repairStatus), "repair status required");
  const sources = acceptedCandidateSources(record);
  if (["REPAIR_APPROVED", "REPAIR_CANDIDATE_NEEDS_SECOND_SOURCE"].includes(record.repairStatus)) {
    assert(sources.length > 0, "repair candidate requires accepted evidence");
    if (record.repairStatus === "REPAIR_APPROVED") assert(new Set(sources.map(s => s.independenceGroup)).size >= 2, "two independent authoritative sources required");
  } else {
    assert.equal(record.candidateCoordinate, null, "non-candidate status cannot carry a proposed coordinate");
  }
  if (record.repairStatus === "CURRENT_COORDINATE_CONFIRMED") {
    assert.equal(record.currentCoordinateConfirmed, true);
    assert.equal(record.crossRegionConflictResolved, true);
    assert(record.officialEvidence.some(e => e.coordinateAuthorityEligible && e.exactLocationMatch && e.regionConsistent && e.conflictResolved && e.explicitCoordinate?.lat === record.currentCoordinate.lat && e.explicitCoordinate?.lon === record.currentCoordinate.lon), "current coordinate confirmation requires exact authoritative evidence");
  }
  if (record.navigationPolicy === "NAVIGATION_ALLOWED") {
    assert.equal(record.repairStatus, "CURRENT_COORDINATE_CONFIRMED", "an unapplied repair candidate cannot enable current navigation");
    assert.equal(record.currentCoordinateConfirmed, true, "unresolved coordinate cannot enable navigation");
    assert.equal(record.crossRegionConflictResolved, true, "cross-region conflict must be resolved");
  }
  if (record.candidateCoordinate === null) assert.equal(record.coordinateDeltaMeters, null);
  else {
    const meters = haversineMeters({lat: record.currentCoordinate.lat, lng: record.currentCoordinate.lon}, {lat: record.candidateCoordinate.lat, lng: record.candidateCoordinate.lon});
    assert.equal(record.coordinateDeltaMeters, Number(meters.toFixed(3)), "Haversine delta required");
  }
}

function summarize(records) {
  return {
    reviewed: records.length,
    repair: {
      approved: records.filter(r => r.repairStatus === "REPAIR_APPROVED").length,
      pendingSecondSource: records.filter(r => r.repairStatus === "REPAIR_CANDIDATE_NEEDS_SECOND_SOURCE").length,
      unresolved: records.filter(r => ["NO_AUTHORITATIVE_REPLACEMENT", "LOCATION_IDENTITY_UNRESOLVED"].includes(r.repairStatus)).length,
      currentCoordinateConfirmed: records.filter(r => r.repairStatus === "CURRENT_COORDINATE_CONFIRMED").length,
    },
    map: {
      allowed: records.filter(r => r.mapPolicy === "MAP_DISPLAY_ALLOWED").length,
      warning: records.filter(r => r.mapPolicy === "MAP_DISPLAY_WITH_WARNING").length,
      blocked: records.filter(r => r.mapPolicy === "MAP_DISPLAY_BLOCKED").length,
    },
    navigation: {
      allowed: records.filter(r => r.navigationPolicy === "NAVIGATION_ALLOWED").length,
      blockedPendingReview: records.filter(r => r.navigationPolicy === "NAVIGATION_BLOCKED_PENDING_REVIEW").length,
    },
  };
}

function validateReport(report) {
  assert.deepEqual(report.records.map(r => r.spotId), REVIEW_IDS, "exactly four ordered unique review records required");
  assert.equal(report.policyApplication, "RECOMMENDATION_ONLY_NOT_APPLIED");
  assert.equal(report.autoApply, false);
  report.records.forEach(validateRecord);
  assert.deepEqual(report.summary, summarize(report.records));
  assert(Object.values(report.invariants).every(value => value === 0), "mutation invariant violated");
  return true;
}

function buildReview() {
  const canonicalBytes = fs.readFileSync(path.join(root, CANONICAL_PATH));
  const rawBytes = fs.readFileSync(path.join(root, RAW_PATH));
  assert.equal(sha256(canonicalBytes), CANONICAL_SHA, "canonical snapshot drift: stop review");
  assert.equal(sha256(rawBytes), RAW_SHA, "official source snapshot drift: stop review");
  // Parsing/hashing the container is not a review of its other records.
  const selected = JSON.parse(canonicalBytes).filter(spot => REVIEW_IDS.includes(spot.id));
  assert.equal(selected.length, 4);
  const rawRows = parseCsv(new TextDecoder("euc-kr").decode(rawBytes)).filter(row => REVIEW_IDS.includes(`boat-${row["공간정보일련번호"]}`));
  assert.equal(rawRows.length, 4);
  const records = REVIEW_IDS.map(spotId => {
    const spot = selected.find(item => item.id === spotId);
    const row = rawRows.find(item => item["공간정보일련번호"] === spot.originalId);
    const [island, feature, region, city] = expectedIdentity[spotId];
    assert.deepEqual([row["포인트명1"], row["포인트명2"], spot.region, spot.city], [island, feature, region, city]);
    assert.equal(row["행정구역명"], `${region} ${city}`);
    assert.equal(spot.originalPoint, row["공간정보"]);
    const contradicted = ["boat-60", "boat-321"].includes(spotId);
    const currentCoordinate = { lat: Number(spot.lat), lon: Number(spot.lng) };
    const originalDms = { latitude: row["선상낚시포인트도분초위도"], longitude: row["선상낚시포인트도분초경도"] };
    const dmsDelta = haversineMeters({lat: currentCoordinate.lat, lng: currentCoordinate.lon}, {lat: parseDms(originalDms.latitude), lng: parseDms(originalDms.longitude)});
    return {
      spotId, currentCoordinate,
      currentRecord: {
        id: spot.id, name: spot.name, region: spot.region, city: spot.city, address: spot.address,
        latitude: spot.lat, longitude: spot.lng, sourceRowId: spot.originalId, originalSourceName: spot.sourceName,
        sourceDataset: "해양수산부_공동활용체계_선상낚시포인트_20231231", rawProjectedCoordinates: spot.originalPoint,
        officialProvenance: { sourceType: spot.sourceType, url: spot.sourceUrl, sourceCheckedAt: spot.sourceCheckedAt },
      },
      originalSourceRow: row,
      sourceCoordinateCheck: {
        originalDms, currentVsDmsDeltaMeters: Number(dmsDelta.toFixed(4)),
        recoveredProjectedCrs: "EPSG:5179", targetCrs: "EPSG:4326", transformer: "src/lib/geo/projection.ts",
        limitation: "CRS recovery and numeric reproduction do not prove the point belongs to the named location. Portal does not declare projected CRS.",
      },
      locationIdentity: {
        sourceRecordIdentity: "EXACT_NAME_REGION_AND_SOURCE_ROW_MATCH",
        parentPlaceName: island, namedFeature: feature, sourceRegion: region, sourceCity: city,
        exactPosition: "UNCONFIRMED", independentExactFeatureMatch: false,
        resolution: "원본의 장소명·지역·행 ID는 식별했다. 독립 권위 자료는 상위 섬/마을만 보강하며 정확한 해상 위치는 확정하지 못했다.",
        disambiguation: contextEvidence[spotId].limitation,
      },
      officialEvidence: [
        {
          evidenceId: `MOF-BOAT-${spot.originalId}`, publisher: "해양수산부 / 공공데이터포털", authorityType: "PUBLIC_AUTHORITY",
          independenceGroup: "MOF-SHARED-BOAT-20231231", url: SOURCE_URL, downloadUrl: DOWNLOAD_URL,
          sourceRecordIdentifier: spot.originalId, datasetVersion: "20231231", retrievedOn: "2026-09-17",
          localArtifact: RAW_PATH, sha256: RAW_SHA, freshDownloadByteIdentical: true,
          exactLocationMatch: false, nameRegionRowMatch: true,
          finding: "정확한 명칭·행정구역·행 ID를 확인했으나 다른 지역 행과 projected 및 DMS 좌표가 모두 동일하다. 이 원본만으로 정확한 장소-좌표 대응을 확정할 수 없다.",
          originalDms, rawProjectedCoordinates: spot.originalPoint,
          coordinateAuthorityEligible: false, conflictResolved: false,
          coordinateUse: "CONFLICT_EVIDENCE_ONLY_NOT_REPAIR_AUTHORITY",
        },
        { ...contextEvidence[spotId], checkedOn: "2026-09-17", coordinateAuthorityEligible: false, conflictResolved: false },
      ],
      regionConsistency: {
        result: contradicted ? "CONTRADICTED_AT_PARENT_REGION_SCALE" : "BROAD_REGION_PLAUSIBLE_EXACT_POSITION_UNCONFIRMED",
        basis: contradicted ? "원본의 남해 섬/마을 정체성과 인천권을 가리키는 현재 좌표의 큰 지역 불일치. 지명 근거에 따른 검토 판단이며 행정해역 경계 측량 판정은 아니다." : "현재 좌표는 인천권이라는 큰 지역 설명과 양립할 수 있지만, 이를 정확한 구지둔턱/수문 북서측 해상 위치의 확인으로 보지 않는다.",
        candidateRegionConsistency: "NOT_APPLICABLE_NO_CANDIDATE",
      },
      candidateCoordinate: null, coordinateDeltaMeters: null,
      coordinateDeltaReason: "No authoritative replacement coordinate; no proposed point or repair distance was invented.",
      repairStatus: "NO_AUTHORITATIVE_REPLACEMENT", currentCoordinateConfirmed: false, crossRegionConflictResolved: false,
      previousNavigationRisk: "NAVIGATION_REVIEW_REQUIRED",
      mapPolicy: contradicted ? "MAP_DISPLAY_BLOCKED" : "MAP_DISPLAY_WITH_WARNING",
      mapPolicyReason: contradicted ? "상위 장소의 지역과 크게 어긋나는 현재 핀은 지도에서 차단하도록 권고한다. 좌표 없는 장소 설명은 보존할 수 있다." : "장소 설명을 보존하되 좌표 검토 필요 경고를 상시 표시하고 확정 핀으로 표현하지 않도록 권고한다. 경고를 표시할 수 없는 화면에서는 핀을 차단한다.",
      navigationPolicy: "NAVIGATION_BLOCKED_PENDING_REVIEW",
      navigationPolicyReason: "정확한 장소-좌표 대응 및 cross-region 충돌이 미해결이므로 현재 좌표의 목적지 선택·경로 요청·외부 항법 전달을 보류하도록 권고한다.",
      policyApplied: false, userWording: "좌표 검토 필요 · 항법 목적지 사용 보류",
      limitations: [
        "공개 원본 재다운로드와 두 좌표 표현의 일치는 한 자료 계보의 재현이며 두 독립 source 확인이 아니다.",
        "상위 섬·마을·항구 대표점, 일반 geocoding, 블로그/카페, 원본 재게시 사이트는 repair 근거로 채택하지 않았다.",
        "공개 검색에서 미발견이라는 뜻이며 권위 있는 좌표가 세상에 존재하지 않는다는 단정이 아니다.",
        "정책은 review 권고이며 현재 앱의 지도 표시나 navigation eligibility에 적용되지 않았다.",
      ],
    };
  });
  const groups = [["A", "boat-60", "boat-128"], ["B", "boat-129", "boat-321"]].map(([groupId, ...spotIds]) => {
    const rows = spotIds.map(id => records.find(r => r.spotId === id));
    assert.equal(rows[0].currentRecord.rawProjectedCoordinates, rows[1].currentRecord.rawProjectedCoordinates);
    assert.deepEqual(rows[0].sourceCoordinateCheck.originalDms, rows[1].sourceCoordinateCheck.originalDms);
    return {
      groupId, spotIds,
      cause: "SOURCE_LEVEL_CROSS_REGION_COORDINATE_REUSE",
      causeDetail: "원본의 projected 좌표와 DMS 좌표가 모두 동일하다. 변환 충돌은 아니다. 복사 실수인지 다른 생산 단계 오류인지, 어느 행이 원 좌표 소유자인지는 확인되지 않았다.",
      identity: rows.map(r => ({spotId: r.spotId, name: r.currentRecord.name, region: r.currentRecord.region, city: r.currentRecord.city})),
      replacementEvidence: "NONE_ACCEPTED", repairStatus: "NO_AUTHORITATIVE_REPLACEMENT",
      navigationPolicy: "NAVIGATION_BLOCKED_PENDING_REVIEW",
      recommendedAction: "두 행의 좌표를 유지하고 자동 병합·교환·수정하지 않는다. 원 제공기관의 행별 정정 근거와 독립된 두 번째 정확한 위치 근거가 확보될 때 재심사한다.",
    };
  });
  const report = {
    schemaVersion: 1, review: "Fishing Spot Coordinate Repair Review V1", reviewedOn: "2026-09-17", baseCommit: BASE_COMMIT,
    decision: "NO_AUTHORITATIVE_REPAIR_AVAILABLE",
    decisionMeaning: "4개 원본 행의 명칭·지역 정체성은 식별했으나, 이번에 확인한 자료에서 승인 요건을 충족하는 대체 좌표나 독립된 현재 좌표 확인을 확보하지 못했다.",
    scope: { spotIds: REVIEW_IDS, reviewedCount: 4, otherSpotsReviewed: 0 },
    policyApplication: "RECOMMENDATION_ONLY_NOT_APPLIED", autoApply: false,
    inputs: { canonical: {path: CANONICAL_PATH, sha256: CANONICAL_SHA}, source: {path: RAW_PATH, sha256: RAW_SHA, freshDownloadUrl: DOWNLOAD_URL, downloadedFilename: "선상낚시포인트.csv", freshDownloadBytes: 98417, byteIdentical: true} },
    approvalCriteria: ["Public authority source", "Exact feature identity plus region/address/source row match", "Explicit coordinate with known CRS/unit", "Source URL and record reference", "Region consistency", "Two independent authoritative sources for REPAIR_APPROVED; one qualifying source remains REPAIR_CANDIDATE_NEEDS_SECOND_SOURCE", "No automatic application; unapplied candidate cannot enable current navigation"],
    researchLog: [
      {source: SOURCE_URL, outcome: "LIVE_PORTAL_AND_FRESH_CSV_VERIFIED", detail: "20231231 dataset; 329 rows in portal metadata; fresh download matches preserved SHA-256. Only IDs 60/128/129/321 reviewed."},
      {queries: ["청석골 site:go.kr", "구지둔턱 site:go.kr", "영종도북측수문 site:go.kr", "백포간출여 site:go.kr"], outcome: "NO_QUALIFYING_EXACT_COORDINATE_FOUND", detail: "이름·지역 결합 검색과 공공기관 한정 검색. 동명 지명 및 일반 재게시 자료는 제외."},
      {queries: ["두미도 청석골 국립해양조사원", "연평도 구지둔턱 국립해양조사원", "돌산도 백포 간출여 국립해양조사원", "영종도 북측수문 북서측 해상 국립해양조사원"], outcome: "NO_QUALIFYING_EXACT_COORDINATE_FOUND"},
      {source: "https://www.khoa.go.kr/oceanmap/main.do", request: {method: "POST", url: "https://www.khoa.go.kr/oceanmap/getMenuView.do", body: "mid=48"}, outcome: "BOAT_MENU_RETURNED_SERVICE_ERROR_HTML", detail: "메인 페이지와 공개 JS의 선상낚시 메뉴 경로를 확인했다. 상세 조회는 오류 본문을 반환했다. 이 서비스의 좌표 보유 여부는 확인하지 못했다."},
      {source: "https://www.codil.or.kr/filebank/original/RK/OTKCRK130224/OTKCRK130224.pdf", outcome: "NO_TARGET_COORDINATE_IN_EXTRACTED_TEXT", detail: "낚시정보도 제작 보고서 85페이지의 추출 텍스트에서 네 세부 지명 일치가 없었다. 연평도/돌산도는 계획 지역 목록에 등장한다. 도면의 이미지 전체를 판독한 결과가 아니므로 미보유 증거로 사용하지 않는다."},
      {source: "https://qca.purpleo.kr/article/128", outcome: "REJECTED_SAME_SOURCE_REPUBLICATION", detail: "같은 해수부 원본 행을 재게시하므로 독립 coordinate authority 아님."},
      {source: "https://www.ocean-fishing.com/fishing-spots/1455", outcome: "REJECTED_SAME_SOURCE_REPUBLICATION", detail: "해양수산부 2023-12-31 데이터를 출처로 명시한 재게시 정보. 독립 source 아님."},
    ],
    records, groups, summary: summarize(records),
    invariants: {coordinateMutation: 0, canonicalMutation: 0, sourceArtifactMutation: 0, mergeDelete: 0, runtimeMutation: 0, databaseSupabaseChanges: 0, navigationEligibilityMutation: 0},
  };
  validateReport(report);
  const hold = {
    schemaVersion: 1, review: report.review, reviewedOn: report.reviewedOn, baseCommit: BASE_COMMIT,
    policyApplication: report.policyApplication, runtimeEnforced: false,
    reportPath: REPORT_PATH, count: records.filter(r => r.navigationPolicy === "NAVIGATION_BLOCKED_PENDING_REVIEW").length,
    holds: records.filter(r => r.navigationPolicy === "NAVIGATION_BLOCKED_PENDING_REVIEW").map(r => ({spotId: r.spotId, currentCoordinate: r.currentCoordinate, repairStatus: r.repairStatus, navigationPolicy: r.navigationPolicy, mapPolicy: r.mapPolicy, reason: r.navigationPolicyReason, releaseCriteria: "Exact current coordinate confirmation resolving the conflict, or separately authorized application of a dual-source-approved replacement followed by coordinate revalidation. Coordinate confirmation alone is not route/access clearance.", applied: false})),
  };
  assert.equal(sha256(fs.readFileSync(path.join(root, CANONICAL_PATH))), CANONICAL_SHA);
  assert.equal(sha256(fs.readFileSync(path.join(root, RAW_PATH))), RAW_SHA);
  return { report, hold };
}

export { REVIEW_IDS, REPORT_PATH, HOLD_PATH, buildReview, validateRecord, validateReport };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "--check";
  assert(["--check", "--write"].includes(mode), "use --check or --write; no apply mode exists");
  const { report, hold } = buildReview();
  for (const [relative, value] of [[REPORT_PATH, report], [HOLD_PATH, hold]]) {
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    if (mode === "--write") fs.writeFileSync(path.join(root, relative), serialized, "utf8");
    else assert.equal(fs.readFileSync(path.join(root, relative), "utf8"), serialized, `artifact drift: ${relative}`);
  }
  console.log(JSON.stringify({ decision: report.decision, ...report.summary, mode }));
}

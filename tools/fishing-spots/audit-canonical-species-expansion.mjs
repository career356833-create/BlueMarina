import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_PATH = "src/data/fishing-spots.json";
const PRIOR_AUDIT_PATH = "data/mbris/mappings/fish-alias-review-batch3.json";
const REPORT_PATH = "reports/fishing-spots/canonical-species-expansion-audit-v1.json";
const CANDIDATE_PATH = "reports/fishing-spots/canonical-species-expansion-candidates-v1.json";

const BASE_COMMIT = "5ec1e1684822f8191f028f7e6a7ba5a975683add";
const AUDITED_ON = "2026-09-18";
const EXPECTED_HASHES = Object.freeze({
  fishingSpots: "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA",
  priorAliasReview: "F31B2F44FFAEC8D3F0F268B239C39CD49D51ED45675CD377A7BCD279BAFB3898",
});

export const CANONICAL_SPECIES = Object.freeze([
  "참돔", "감성돔", "농어", "조피볼락", "넙치", "갈치", "고등어", "방어", "주꾸미", "문어",
]);
export const APPROVED_ALIASES = Object.freeze({ 광어: "넙치", 우럭: "조피볼락" });
export const CLASSIFICATIONS = Object.freeze([
  "EXACT_SPECIES",
  "SAFE_ALIAS_TO_EXISTING_CANONICAL",
  "NEW_CANONICAL_SPECIES_CANDIDATE",
  "AGGREGATED_TAXON",
  "COMMERCIAL_CATEGORY",
  "AMBIGUOUS_NAME",
  "TYPO_OR_VARIANT",
  "NON_FISH_OR_OTHER",
  "UNRESOLVED",
]);
export const OUTCOMES = Object.freeze([
  "ADD_ALIAS_LIKELY",
  "ADD_CANONICAL_SPECIES_LIKELY",
  "KEEP_UNMAPPED",
  "RESEARCH_REQUIRED",
  "DO_NOT_MAP",
]);

const MBRIS_SEARCH_URL = "https://www.mbris.kr/pub/marine/tsearch/tsearch.do";
const MBRIS_DATA_URL = "https://www.data.go.kr/data/15071288/fileData.do";
const NIFS_PATTERNED_SQUID_URL = "https://www.nifs.go.kr/board/actionBoard0008View.do?BBS_CL_CD=B&BBS_ID=20250317204841171SMM&MENU_ID=M0000054";
const NIFS_HORSE_MACKEREL_URL = "https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId=fish_1576639605226";

function mbrisEvidence(internalId, sourceId, scientificName) {
  return [{
    organization: "국립해양생물자원관 MBRIS",
    authorityClass: "OFFICIAL_PUBLIC_INSTITUTION",
    url: `https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=${sourceId}`,
    reference: `${internalId} / SpcTxnId ${sourceId}`,
    supports: `정명과 학명 ${scientificName}`,
  }];
}

function workbookEvidence(internalId, sourceSheet, sourceRow, scientificName) {
  return [{
    organization: "국립해양생물자원관 MBRIS",
    authorityClass: "OFFICIAL_PUBLIC_INSTITUTION",
    url: MBRIS_DATA_URL,
    reference: `${internalId} / MBRIS ${sourceSheet} source row ${sourceRow}`,
    supports: `정명과 학명 ${scientificName}`,
  }];
}

const CATALOG = Object.freeze({
  갑오징어: {
    classification: "AGGREGATED_TAXON",
    identityKind: "AGGREGATE_NAME",
    canonicalName: null,
    scientificName: null,
    expansionValue: "LOW",
    expectedOutcome: "DO_NOT_MAP",
    evidence: [{
      organization: "국립해양생물자원관 MBRIS",
      authorityClass: "OFFICIAL_PUBLIC_INSTITUTION",
      url: "https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000016305",
      reference: "갑오징어목·갑오징어과 및 복수 종 검토; data/mbris/mappings/fish-alias-review-batch3.json#갑오징어",
      supports: "갑오징어는 단일 종 정명이 아니라 복수 갑오징어류를 포괄한다.",
    }],
    limitations: ["참갑오징어(Acanthosepion esculentum)를 포함한 복수 종 중 하나로 좁힐 spot별 근거가 없다."],
  },
  노래미: candidate("노래미", "Hexagrammos agrammus", "BM-SPECIES-001164", "270000008283", "MEDIUM"),
  도다리: candidate("도다리", "Pleuronichthys cornutus", "BM-SPECIES-000548", "270000013960", "MEDIUM"),
  망둑어: {
    classification: "AGGREGATED_TAXON",
    identityKind: "AGGREGATE_OR_NONSTANDARD_NAME",
    canonicalName: null,
    scientificName: null,
    expansionValue: "LOW",
    expectedOutcome: "DO_NOT_MAP",
    evidence: [{
      organization: "국립생물자원관·MBRIS 검토",
      authorityClass: "OFFICIAL_PUBLIC_INSTITUTION",
      url: MBRIS_SEARCH_URL,
      reference: "data/mbris/mappings/fish-alias-review-batch3.json#망둥어",
      supports: "망둥어는 망둑어과 여러 종 또는 문절망둑을 가리키는 비표준 통칭이다.",
    }],
    limitations: ["문절망둑, 말뚝망둥어 등 어느 단일 종인지 source row만으로 확정할 수 없다."],
  },
  망상어: candidate("망상어", "Ditrema temminckii", "BM-SPECIES-000223", "270000005635", "MEDIUM"),
  무늬오징어: {
    classification: "NEW_CANONICAL_SPECIES_CANDIDATE",
    identityKind: "SOURCE_BACKED_COMMON_NAME_FOR_EXACT_SPECIES",
    canonicalName: "흰꼴뚜기",
    scientificName: "Sepioteuthis lessoniana",
    proposedAliases: ["무늬오징어"],
    expansionValue: "MEDIUM",
    expectedOutcome: "ADD_CANONICAL_SPECIES_LIKELY",
    evidence: [
      {
        organization: "국립수산과학원",
        authorityClass: "OFFICIAL_PUBLIC_INSTITUTION",
        url: NIFS_PATTERNED_SQUID_URL,
        reference: "감성돔과 무늬오징어의 수온에 대한 답변",
        supports: "표준국명 흰꼴뚜기의 방언이 무늬오징어임을 명시한다.",
      },
      ...workbookEvidence("BM-SPECIES-003094", "무척추동물", 1542, "Sepioteuthis lessoniana"),
    ],
    limitations: ["이번 audit에서는 흰꼴뚜기 canonical 또는 무늬오징어 alias를 실제 추가하지 않는다."],
  },
  벵에돔: candidate("벵에돔", "Girella punctata", "BM-SPECIES-000279", "270000007132", "LOW"),
  보리멸: candidate("보리멸", "Sillago sihama", "BM-SPECIES-000818", "270000016512", "MEDIUM"),
  볼락: candidate("볼락", "Sebastes inermis", "BM-SPECIES-000002", "270000016243", "MEDIUM", ["조피볼락(Sebastes schlegelii)과 다른 종이므로 우럭 alias 규칙을 적용하지 않는다."]),
  부시리: candidate("부시리", "Seriola aureovittata", "BM-SPECIES-000500", "270000016341", "LOW"),
  붕장어: candidate("붕장어", "Conger myriaster", "BM-SPECIES-000908", "270000004416", "HIGH"),
  성대: candidate("성대", "Chelidonichthys spinosus", "BM-SPECIES-001135", "270000003607", "MEDIUM"),
  숭어: candidate("숭어", "Mugil cephalus", "BM-SPECIES-000097", "270000028620", "HIGH"),
  전갱이: {
    ...candidate("전갱이", "Trachurus japonicus", "BM-SPECIES-000488", "270000018166", "LOW"),
    evidence: [
      ...mbrisEvidence("BM-SPECIES-000488", "270000018166", "Trachurus japonicus"),
      {
        organization: "국립수산과학원",
        authorityClass: "OFFICIAL_PUBLIC_INSTITUTION",
        url: NIFS_HORSE_MACKEREL_URL,
        reference: "fish_1576639605226",
        supports: "전갱이와 학명 Trachurus japonicus를 직접 연결한다.",
      },
    ],
  },
  짱뚱어: {
    classification: "NEW_CANONICAL_SPECIES_CANDIDATE",
    identityKind: "EXACT_SPECIES",
    canonicalName: "짱뚱어",
    scientificName: "Boleophthalmus pectinirostris",
    proposedAliases: [],
    expansionValue: "HIGH",
    expectedOutcome: "ADD_CANONICAL_SPECIES_LIKELY",
    evidence: workbookEvidence("BM-SPECIES-000385", "척추동물", 387, "Boleophthalmus pectinirostris"),
    limitations: ["망둑어 집계명과 별개 종으로 유지해야 한다."],
  },
  학꽁치: {
    classification: "TYPO_OR_VARIANT",
    identityKind: "ORTHOGRAPHIC_VARIANT_OF_EXACT_SPECIES",
    canonicalName: "학공치",
    scientificName: "Hyporhamphus sajori",
    proposedAliases: ["학꽁치"],
    expansionValue: "MEDIUM",
    expectedOutcome: "ADD_CANONICAL_SPECIES_LIKELY",
    evidence: mbrisEvidence("BM-SPECIES-000884", "270000008600", "Hyporhamphus sajori"),
    limitations: ["표기 variant를 fuzzy matching으로 처리하지 않고 명시적 alias 후보로만 기록한다."],
  },
  황어: candidate("황어", "Pseudaspius hakonensis", "BM-SPECIES-000958", "270000018212", "LOW"),
});

function candidate(canonicalName, scientificName, internalId, sourceId, expansionValue, limitations = []) {
  return {
    classification: "NEW_CANONICAL_SPECIES_CANDIDATE",
    identityKind: "EXACT_SPECIES",
    canonicalName,
    scientificName,
    proposedAliases: [],
    expansionValue,
    expectedOutcome: "ADD_CANONICAL_SPECIES_LIKELY",
    evidence: mbrisEvidence(internalId, sourceId, scientificName),
    limitations,
  };
}

function readBytes(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}

function splitTargets(value) {
  return String(value ?? "").split("|").map((item) => item.trim()).filter(Boolean);
}

function mappedCanonicalNames(spot) {
  return splitTargets(spot.targetFish)
    .map((name) => APPROVED_ALIASES[name] ?? name)
    .filter((name) => CANONICAL_SPECIES.includes(name));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "ko"));
}

function countBy(items, keyFor) {
  const result = {};
  for (const item of items) {
    const key = keyFor(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function build() {
  const sourceBytes = readBytes(SOURCE_PATH);
  const priorAuditBytes = readBytes(PRIOR_AUDIT_PATH);
  assert.equal(sha256(sourceBytes), EXPECTED_HASHES.fishingSpots, "canonical fishing spot artifact changed");
  assert.equal(sha256(priorAuditBytes), EXPECTED_HASHES.priorAliasReview, "prior aggregate-name review changed");

  const spots = JSON.parse(sourceBytes.toString("utf8"));
  const priorAliasReview = JSON.parse(priorAuditBytes.toString("utf8"));
  const aggregateReviews = new Map(priorAliasReview.map((item) => [item.sourceName, item.decision]));
  assert.equal(aggregateReviews.get("갑오징어"), "aggregate_name");
  assert.equal(aggregateReviews.get("망둥어"), "aggregate_name");

  const unmappedSpots = spots.filter((spot) => mappedCanonicalNames(spot).length === 0);
  const occurrences = unmappedSpots.flatMap((spot) => splitTargets(spot.targetFish).map((rawSpeciesName, sourceSpeciesIndex) => ({
    occurrenceId: `${spot.id}:${sourceSpeciesIndex + 1}`,
    spotId: spot.id,
    spotName: spot.name,
    rawSpeciesName,
    sourceRow: {
      originalId: String(spot.originalId),
      sourceSpeciesIndex: sourceSpeciesIndex + 1,
    },
    region: spot.region,
    city: spot.city,
    spotType: spot.type,
    provenance: {
      sourceType: spot.sourceType,
      sourceName: spot.sourceName,
      sourceUrl: spot.sourceUrl,
      sourceCheckedAt: spot.sourceCheckedAt,
    },
  })));

  const rawNames = uniqueSorted(occurrences.map((item) => item.rawSpeciesName));
  assert.deepEqual(rawNames, uniqueSorted(Object.keys(CATALOG)), "classification catalog must exactly cover unique raw names");

  const uniqueRawNames = rawNames.map((rawName) => {
    const affected = occurrences.filter((item) => item.rawSpeciesName === rawName);
    const classification = CATALOG[rawName];
    return {
      rawName,
      occurrenceCount: affected.length,
      affectedSpotCount: new Set(affected.map((item) => item.spotId)).size,
      spotIds: uniqueSorted(affected.map((item) => item.spotId)),
      regions: uniqueSorted(affected.map((item) => item.region)),
      ...classification,
    };
  });

  for (const item of uniqueRawNames) {
    assert.ok(CLASSIFICATIONS.includes(item.classification), `invalid classification ${item.classification}`);
    assert.ok(OUTCOMES.includes(item.expectedOutcome), `invalid outcome ${item.expectedOutcome}`);
    assert.ok(["HIGH", "MEDIUM", "LOW"].includes(item.expansionValue), `invalid expansion value ${item.expansionValue}`);
  }

  const newCanonicalCandidates = uniqueRawNames
    .filter((item) => ["NEW_CANONICAL_SPECIES_CANDIDATE", "TYPO_OR_VARIANT"].includes(item.classification))
    .map((item) => ({
      canonicalName: item.canonicalName,
      scientificName: item.scientificName,
      rawNames: [item.rawName],
      proposedAliases: item.proposedAliases ?? [],
      occurrenceCount: item.occurrenceCount,
      affectedSpotCount: item.affectedSpotCount,
      spotIds: item.spotIds,
      regions: item.regions,
      identityKind: item.identityKind,
      expansionValue: item.expansionValue,
      expectedOutcome: item.expectedOutcome,
      evidence: item.evidence,
      limitations: item.limitations,
    }));
  const proposedSpeciesNames = new Set(newCanonicalCandidates.map((item) => item.canonicalName));
  assert.equal(proposedSpeciesNames.size, newCanonicalCandidates.length, "candidate canonical names must be unique");

  const candidateRawNames = new Set(newCanonicalCandidates.flatMap((item) => item.rawNames));
  const potentiallyResolvedSpotIds = uniqueSorted(unmappedSpots
    .filter((spot) => splitTargets(spot.targetFish).some((name) => candidateRawNames.has(name)))
    .map((spot) => spot.id));
  const existingAliasCandidates = uniqueRawNames.filter((item) => item.classification === "SAFE_ALIAS_TO_EXISTING_CANONICAL");
  const proposedCandidateAliases = newCanonicalCandidates.flatMap((item) => item.proposedAliases.map((alias) => ({
    alias,
    proposedCanonicalName: item.canonicalName,
    scientificName: item.scientificName,
    affectedSpotCount: item.affectedSpotCount,
    spotIds: item.spotIds,
    evidence: item.evidence,
  })));

  const report = {
    schemaVersion: 1,
    audit: "Fishing Spot Canonical Species Expansion Audit V1",
    auditedOn: AUDITED_ON,
    baseCommit: BASE_COMMIT,
    decision: "CANONICAL_EXPANSION_CANDIDATES_FOUND",
    inputs: {
      fishingSpots: { path: SOURCE_PATH, sha256: sha256(sourceBytes) },
      aggregateNameReview: { path: PRIOR_AUDIT_PATH, sha256: sha256(priorAuditBytes) },
    },
    currentCanonical: {
      speciesCount: CANONICAL_SPECIES.length,
      species: CANONICAL_SPECIES,
      approvedAliases: APPROVED_ALIASES,
      mappingMode: "EXACT_PLUS_APPROVED_ALIAS_ONLY",
      fuzzyMapping: false,
    },
    counts: {
      totalSpots: spots.length,
      mappedSpots: spots.length - unmappedSpots.length,
      unmappedSpots: unmappedSpots.length,
      rawOccurrences: occurrences.length,
      uniqueRawNames: uniqueRawNames.length,
      classifications: countBy(uniqueRawNames, (item) => item.classification),
      aliasCandidatesToExistingCanonical: existingAliasCandidates.length,
      newCanonicalCandidates: newCanonicalCandidates.length,
      aggregateNames: uniqueRawNames.filter((item) => item.classification === "AGGREGATED_TAXON").length,
      commercialCategories: uniqueRawNames.filter((item) => item.classification === "COMMERCIAL_CATEGORY").length,
      ambiguousNames: uniqueRawNames.filter((item) => item.classification === "AMBIGUOUS_NAME").length,
      unresolvedNames: uniqueRawNames.filter((item) => item.classification === "UNRESOLVED").length,
    },
    unmappedSpots: unmappedSpots.map((spot) => ({
      spotId: spot.id,
      spotName: spot.name,
      region: spot.region,
      city: spot.city,
      spotType: spot.type,
      rawSpeciesNames: splitTargets(spot.targetFish),
      sourceRow: String(spot.originalId),
      provenance: {
        sourceType: spot.sourceType,
        sourceName: spot.sourceName,
        sourceUrl: spot.sourceUrl,
        sourceCheckedAt: spot.sourceCheckedAt,
      },
    })),
    occurrences,
    uniqueRawNames,
    aliasCandidates: {
      toExistingCanonical: existingAliasCandidates,
      forProposedCanonicalSpecies: proposedCandidateAliases,
    },
    newCanonicalCandidates,
    aggregateCategories: uniqueRawNames.filter((item) => item.classification === "AGGREGATED_TAXON"),
    commercialCategories: uniqueRawNames.filter((item) => item.classification === "COMMERCIAL_CATEGORY"),
    ambiguousNames: uniqueRawNames.filter((item) => item.classification === "AMBIGUOUS_NAME"),
    unresolved: uniqueRawNames.filter((item) => item.classification === "UNRESOLVED"),
    coverageImpact: {
      currentMappedSpots: spots.length - unmappedSpots.length,
      currentUnmappedSpots: unmappedSpots.length,
      potentiallyResolvedSpots: potentiallyResolvedSpotIds.length,
      potentiallyResolvedSpotIds,
      potentialMappedSpots: spots.length - unmappedSpots.length + potentiallyResolvedSpotIds.length,
      potentialUnmappedSpots: unmappedSpots.length - potentiallyResolvedSpotIds.length,
      condition: "All listed candidates still require a separate canonical promotion and condition-profile review.",
      rankingUsed: false,
    },
    sourcePolicy: {
      officialIdentitySources: [MBRIS_SEARCH_URL, MBRIS_DATA_URL, NIFS_PATTERNED_SQUID_URL, NIFS_HORSE_MACKEREL_URL],
      sourceUrlsRecordedPerName: true,
      aggregateOrCommercialPromotionAllowed: false,
      sourceSpotProvenancePreserved: true,
    },
    invariants: {
      canonicalMutation: 0,
      runtimeMutation: 0,
      fuzzyMapping: 0,
      databaseWrite: 0,
      supabaseWrite: 0,
      productionPromotion: 0,
    },
  };

  const candidateReport = {
    schemaVersion: 1,
    audit: report.audit,
    auditedOn: AUDITED_ON,
    baseCommit: BASE_COMMIT,
    decision: report.decision,
    candidateCount: newCanonicalCandidates.length,
    affectedSpotCount: potentiallyResolvedSpotIds.length,
    aliasCandidatesToExistingCanonical: [],
    aliasesForProposedCanonicalSpecies: proposedCandidateAliases,
    candidates: newCanonicalCandidates,
    excluded: {
      aggregateNames: report.aggregateCategories.map((item) => item.rawName),
      commercialCategories: [],
      ambiguousNames: [],
      unresolvedNames: [],
    },
    invariants: report.invariants,
  };

  assert.equal(spots.length, 1405);
  assert.equal(unmappedSpots.length, 19);
  assert.equal(occurrences.length, 75);
  assert.equal(uniqueRawNames.length, 17);
  assert.equal(potentiallyResolvedSpotIds.length, 19);
  assert.equal(existingAliasCandidates.length, 0);
  assert.equal(newCanonicalCandidates.length, 15);
  assert.equal(report.aggregateCategories.length, 2);

  return { report, candidateReport };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function write(relativePath, value) {
  const absolutePath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, serialize(value), "utf8");
}

function check(relativePath, value) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), serialize(value), `${relativePath} is not deterministic`);
}

export function buildCanonicalSpeciesExpansionAudit() {
  return build();
}

function main() {
  const mode = process.argv[2] ?? "--check";
  const { report, candidateReport } = build();
  if (mode === "--write") {
    write(REPORT_PATH, report);
    write(CANDIDATE_PATH, candidateReport);
  } else if (mode === "--check") {
    check(REPORT_PATH, report);
    check(CANDIDATE_PATH, candidateReport);
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
  process.stdout.write(`${JSON.stringify({ decision: report.decision, counts: report.counts, coverageImpact: report.coverageImpact })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

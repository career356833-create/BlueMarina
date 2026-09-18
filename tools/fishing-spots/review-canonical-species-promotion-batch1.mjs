import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PATHS = Object.freeze({
  spots: "src/data/fishing-spots.json",
  audit: "reports/fishing-spots/canonical-species-expansion-audit-v1.json",
  candidates: "reports/fishing-spots/canonical-species-expansion-candidates-v1.json",
  baseline: "reports/mbris/fish-canonical-1258-baseline-v1.json",
  reviewManifest: "reports/mbris/mbris-review-ready-import-manifest-v1.json",
  stagingManifest: "reports/mbris/mbris-staging-import-manifest-v1.json",
  dataset: "data/fishing-spots/enrichment/research/canonical-species-promotion-batch1-v1.json",
  report: "reports/fishing-spots/canonical-species-promotion-review-batch1-v1.json",
});
const EXPECTED_HASHES = Object.freeze({
  spots: "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA",
  audit: "0B0949F2788D0E66D0CFEB907B76A06CF3CAF1A617AFA8BB31746A3AC5D26CBE",
  candidates: "D3B628EAEDCC2C2C9BC8AC0A12AD78313E66E722A5E3746FE187321A2DF1FFD2",
  baseline: "D1CEA9EFD858F6C04A162B55956558DF9530B9A321C5B1BCD91D8B081047D5DE",
  reviewManifest: "D64A90A380551BB7B5C81777199931550CED8976D4D9616A4ABF32587175B481",
  stagingManifest: "F0B3F234BBEC90E87A7EC34E051828B6C9315E784F4CCBA4F22932A83273F15A",
});
const BASE_COMMIT = "9110cd11d453e642e75291fd9d2871f9253c481a";
const REVIEWED_ON = "2026-09-18";
const TARGETS = Object.freeze(["붕장어", "숭어", "짱뚱어"]);

function readBytes(key) {
  return fs.readFileSync(path.join(ROOT, PATHS[key]));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function evidence(organization, url, reference, supports) {
  return { organization, authorityClass: "AUTHORITATIVE", url, reference, supports };
}

const REVIEWS = Object.freeze({
  붕장어: {
    scientificName: "Conger myriaster",
    acceptedTaxon: "Conger myriaster (Brevoort, 1856)",
    fishCanonical: { internalId: "BM-SPECIES-000908", slug: "conger-myriaster", manifest: "reviewManifest" },
    synonyms: ["Anguilla myriaster", "Astroconger myriaster"],
    excludedAliases: ["바다장어", "아나고"],
    commercialNameAmbiguity: "NONE_FOR_EXACT_RAW_NAME",
    aggregateRisk: "NONE",
    distinctFrom: ["검붕장어 (Conger japonicus)", "갯장어 (Muraenesox cinereus)", "뱀장어 (Anguilla japonica)"],
    conditionProfileReadiness: "MEDIUM",
    promotionStatus: "PROMOTION_READY",
    sources: [
      evidence("국립해양생물자원관 MBRIS", "https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000004416", "SpcTxnId 270000004416", "붕장어와 Conger myriaster를 직접 연결한다."),
      evidence("국립수산과학원 NIFS", "https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10072", "taxonId 10072", "공식 한국명과 학명을 교차 확인한다."),
      evidence("WoRMS", "https://www.marinespecies.org/aphia.php?id=271745&p=taxdetails", "AphiaID 271745", "Conger myriaster를 accepted species로 기록하고 이명을 제공한다."),
      evidence("FishBase", "https://fishbase.se/summary/302", "Species summary 302", "향후 habitat, depth, temperature profile 검토 근거를 제공한다."),
    ],
    rationale: "원본명은 공식 한국명과 정확히 일치하고 다른 장어류 또는 넓은 상용명으로 좁히는 과정이 필요 없다.",
  },
  숭어: {
    scientificName: "Mugil cephalus",
    acceptedTaxon: "Mugil cephalus Linnaeus, 1758",
    fishCanonical: { internalId: "BM-SPECIES-000097", slug: "mugil-cephalus", manifest: "reviewManifest" },
    synonyms: [],
    excludedAliases: ["가숭어", "참숭어", "밀치", "보리숭어"],
    commercialNameAmbiguity: "REVIEW_REQUIRED",
    aggregateRisk: "NONE",
    distinctFrom: ["가숭어 (Planiliza haematocheilus)", "등줄숭어"],
    conditionProfileReadiness: "HIGH",
    promotionStatus: "REVIEW_REQUIRED",
    sources: [
      evidence("국립해양생물자원관 MBRIS", "https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000028620", "SpcTxnId 270000028620", "표준명 숭어와 Mugil cephalus를 연결한다."),
      evidence("국립수산과학원 NIFS", "https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10968", "taxonId 10968", "Mugil cephalus(숭어)를 공식 종 정보로 제공한다."),
      evidence("WoRMS", "https://www.marinespecies.org/aphia.php?p=taxlist&tName=Mugil", "Mugil taxon list", "Mugil cephalus를 accepted name으로 확인한다."),
      evidence("국립수산과학원 NIFS", "https://www.nifs.go.kr/board/actionBoard0018PopupPrevew.do?BBS_ID=20211228034724026HGL", "숭어류 구분 자료", "숭어, 가숭어, 등줄숭어가 별도 종임을 보여준다."),
      evidence("국립수산과학원 NIFS", "https://nifs.go.kr/cmmn/file/climatechange_03.pdf", "공식 양식 자료", "일부 공식·산업 문맥에서 숭어 명칭이 Chelon haematocheilus에 사용되는 혼선을 보여준다."),
      evidence("FishBase", "https://www.fishbase.se/Summary/Mugil-cephalus", "Mugil cephalus species summary", "정체가 확정된 뒤 profile을 구성할 생태 자료가 풍부함을 보여준다."),
    ],
    rationale: "분류학적 정명 자체는 명확하지만 fishing-spot 원본은 한국명만 제공한다. 공식·산업 문맥의 숭어/가숭어 명칭 혼선 때문에 해당 12건을 Mugil cephalus로 단정할 source-level 근거가 더 필요하다.",
  },
  짱뚱어: {
    scientificName: "Boleophthalmus pectinirostris",
    acceptedTaxon: "Boleophthalmus pectinirostris (Linnaeus, 1758)",
    fishCanonical: { internalId: "BM-SPECIES-000385", slug: "boleophthalmus-pectinirostris", manifest: "stagingManifest" },
    synonyms: ["Apocryptes chinensis"],
    excludedAliases: ["망둑어"],
    commercialNameAmbiguity: "NONE_FOR_EXACT_RAW_NAME",
    aggregateRisk: "SEPARATED_FROM_AGGREGATE",
    distinctFrom: ["망둑어 (aggregate/nonstandard goby label)", "남방짱뚱어 (Scartelaos gigas)"],
    conditionProfileReadiness: "MEDIUM",
    promotionStatus: "PROMOTION_READY",
    sources: [
      evidence("국립해양생물자원관 MBRIS", "https://www.data.go.kr/data/15071288/fileData.do", "MBRIS 척추동물 source row 387", "짱뚱어와 Boleophthalmus pectinirostris를 연결한다."),
      evidence("국립수산과학원 NIFS", "https://www.nifs.go.kr/contents/actionContentsCons0088.do", "수산생물 종정보", "공식 한국명과 학명을 교차 확인한다."),
      evidence("WoRMS", "https://marinespecies.org/aphia.php?p=taxlist&pid=267096&rComp=%3E%3D&tRank=220", "Boleophthalmus taxon list", "Boleophthalmus pectinirostris를 accepted name으로 확인한다."),
      evidence("FishBase", "https://www.fishbase.se/summary/Boleophthalmus-pectinirostris", "Species summary", "향후 intertidal habitat와 temperature profile 검토 근거를 제공한다."),
    ],
    rationale: "원본명은 정확한 종명이며 여러 망둑어류를 포함하는 집계명 망둑어와 명시적으로 분리된다.",
  },
});

function locateManifestRow(manifest, review) {
  const rows = review.fishCanonical.manifest === "reviewManifest" ? manifest.rows : manifest.newSpecies;
  return rows.find((row) => row.internalId === review.fishCanonical.internalId || row.canonicalId === review.fishCanonical.internalId);
}

function build() {
  const bytes = Object.fromEntries(Object.keys(EXPECTED_HASHES).map((key) => [key, readBytes(key)]));
  for (const [key, expected] of Object.entries(EXPECTED_HASHES)) assert.equal(sha256(bytes[key]), expected, `${key} input changed`);
  const audit = JSON.parse(bytes.audit);
  const candidates = JSON.parse(bytes.candidates);
  const reviewManifest = JSON.parse(bytes.reviewManifest);
  const stagingManifest = JSON.parse(bytes.stagingManifest);
  const productionCanonicalNames = audit.currentCanonical.species;
  assert.equal(audit.counts.totalSpots, 1405);
  assert.equal(audit.counts.mappedSpots, 1386);
  assert.equal(audit.counts.unmappedSpots, 19);

  const species = TARGETS.map((name) => {
    const sourceCandidate = candidates.candidates.find((item) => item.canonicalName === name);
    const review = REVIEWS[name];
    assert.ok(sourceCandidate, `missing expansion candidate ${name}`);
    assert.equal(sourceCandidate.scientificName, review.scientificName);
    const manifest = review.fishCanonical.manifest === "reviewManifest" ? reviewManifest : stagingManifest;
    const row = locateManifestRow(manifest, review);
    assert.ok(row, `missing Fish canonical identity ${name}`);
    assert.equal(row.koreanName, name);
    assert.equal(row.scientificName ?? row.normalizedScientificName, review.scientificName);
    return {
      rawName: name,
      canonicalKoreanName: name,
      scientificName: review.scientificName,
      acceptedTaxon: { name: review.acceptedTaxon, status: "ACCEPTED", source: "WoRMS" },
      authoritativeSources: review.sources,
      synonyms: review.synonyms,
      aliasReview: { proposedAliases: [], excludedAliases: review.excludedAliases },
      existingCanonicalDuplicateCheck: {
        productionFishingSpotCanonical10: productionCanonicalNames.includes(name),
        fishCanonical1258Identity: true,
        action: "REUSE_EXISTING_INTERNAL_ID",
        internalId: review.fishCanonical.internalId,
        slug: review.fishCanonical.slug,
        evidenceManifest: PATHS[review.fishCanonical.manifest],
      },
      ambiguityReview: {
        rawNameRelation: "EXACT_OFFICIAL_KOREAN_NAME",
        commercialNameAmbiguity: review.commercialNameAmbiguity,
        aggregateRisk: review.aggregateRisk,
        distinctFrom: review.distinctFrom,
      },
      affectedSpots: { count: sourceCandidate.affectedSpotCount, spotIds: sourceCandidate.spotIds },
      conditionProfileReadiness: {
        level: review.conditionProfileReadiness,
        dimensionsForFutureReview: ["temperature", "depth", "salinity", "seasonality", "habitat"],
        profileCreated: false,
      },
      promotionStatus: review.promotionStatus,
      rationale: review.rationale,
    };
  });

  const readySpecies = species.filter((item) => item.promotionStatus.startsWith("PROMOTION_READY"));
  const readySpotIds = [...new Set(readySpecies.flatMap((item) => item.affectedSpots.spotIds))].sort();
  const allSpotIds = [...new Set(species.flatMap((item) => item.affectedSpots.spotIds))].sort();
  assert.equal(readySpotIds.length, 14);
  assert.equal(allSpotIds.length, 16);

  const inputs = Object.fromEntries(Object.keys(EXPECTED_HASHES).map((key) => [key, { path: PATHS[key], sha256: EXPECTED_HASHES[key] }]));
  const invariants = { canonicalMutation: 0, runtimeMutation: 0, conditionProfileCreation: 0, databaseWrite: 0, supabaseWrite: 0, productionAliasMutation: 0 };
  const dataset = {
    schemaVersion: 1,
    research: "Fishing Spot Canonical Species Promotion Review Batch 1",
    reviewedOn: REVIEWED_ON,
    baseCommit: BASE_COMMIT,
    decision: "PARTIAL_PROMOTION_CANDIDATES_CONFIRMED",
    inputs,
    targetSpecies: TARGETS,
    species,
    aliasCandidates: [],
    impact: {
      current: { mapped: 1386, total: 1405, unmapped: 19 },
      promotionReadyOnly: { newlyMapped: 14, mapped: 1400, total: 1405, unmapped: 5, spotIds: readySpotIds },
      allThreeConditional: { newlyMapped: 16, mapped: 1402, total: 1405, unmapped: 3, spotIds: allSpotIds, condition: "숭어 source-level identity ambiguity must be resolved first." },
    },
    invariants,
  };
  const report = {
    schemaVersion: 1,
    review: dataset.research,
    reviewedOn: REVIEWED_ON,
    baseCommit: BASE_COMMIT,
    decision: dataset.decision,
    counts: { reviewedSpecies: 3, promotionReady: 2, promotionReadyWithAlias: 0, reviewRequired: 1, rejected: 0 },
    species: species.map(({ authoritativeSources, ...item }) => ({ ...item, authoritativeSourceCount: authoritativeSources.length, authoritativeSources })),
    duplicateCheck: { productionFishingSpotCanonicalCount: 10, existingFishCanonicalIdentities: 3, newIdsCreated: 0 },
    aliasCandidates: [],
    impact: dataset.impact,
    invariants,
  };
  return { dataset, report };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function main() {
  const { dataset, report } = build();
  const outputs = [[PATHS.dataset, dataset], [PATHS.report, report]];
  if (process.argv.includes("--check")) {
    for (const [relativePath, value] of outputs) assert.equal(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), serialize(value), `${relativePath} is not deterministic`);
    console.log("canonical species promotion batch 1 artifacts are deterministic");
    return;
  }
  for (const [relativePath, value] of outputs) {
    const outputPath = path.join(ROOT, relativePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, serialize(value));
    console.log(`wrote ${relativePath}`);
  }
}

main();

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE_COMMIT = "a985bfa46aac1b99c988db5c314d6b1a3e87d297";
const GENERATED_ON = "2026-09-18";
const EXPANSION_INPUT = Object.freeze(["reports/fishing-spots/canonical-species-expansion-candidates-v1.json", "D3B628EAEDCC2C2C9BC8AC0A12AD78313E66E722A5E3746FE187321A2DF1FFD2"]);
// A later read-only Fishing Condition activation may extend this selector without
// changing the canonical normalization inputs or generated bulk artifacts.
const APPROVED_RUNTIME_MAPPING_HASHES = new Set([
  "3D09BE7E708BFBD7DA83E213238D662024F32B424F3DC839D5A78BE3D04DEB0E",
  "62F14976000BCC3EB5EE433DD9AA3363E65D0AFDA77D1AA69A077CDF931AF924",
  "474B0355E42579C281920B0E2DBCA906C2C16508EC54F254138DC42BD690D4E0",
]);
const INPUTS = Object.freeze({
  nifsImport: ["reports/nifs-staging-import-8-execution.json", "BDB3BE57D1991CFE20E2716D3172DB3030AC738E4827B964033FFF2DC6C103C0"],
  mbrisReady: ["reports/mbris/mbris-staging-import-manifest-v1.json", "F0B3F234BBEC90E87A7EC34E051828B6C9315E784F4CCBA4F22932A83273F15A"],
  mbrisReview: ["reports/mbris/mbris-review-ready-import-manifest-v1.json", "D64A90A380551BB7B5C81777199931550CED8976D4D9616A4ABF32587175B481"],
  baseline: ["reports/mbris/fish-canonical-1258-baseline-v1.json", "D1CEA9EFD858F6C04A162B55956558DF9530B9A321C5B1BCD91D8B081047D5DE"],
  aliases: ["data/mbris/mappings/fish-alias-registry.json", "BEFFCF01336B5674133C26B2F037624F63BAF8BBCEB77887D256C905004D6DC6"],
  approvedAliases: ["data/mbris/mappings/fish-data-approved-aliases.json", "A7A0F94ADB85226F94FF940F3AA6DB3B89BD3648627CDAF41C176CFE09E7C16A"],
  crosswalk: ["data/mbris/mappings/nifs-mbris-taxonomy-crosswalk.json", "F588CAEEFEEB0799DF76971082F5C466A7919CCCABEA0B152A6A596354C9F8AA"],
  mottledSkate: ["reports/mbris/mbris-mottled-skate-postcheck-v1.json", "8788678DD18F6A80AE271A1037405C23642869C5A8AE3794DD428A1535D2B555"],
  spots: ["src/data/fishing-spots.json", "5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA"],
  runtimeMapping: ["src/lib/fishing-condition/fishing-spot-integration.ts", "3D09BE7E708BFBD7DA83E213238D662024F32B424F3DC839D5A78BE3D04DEB0E"],
  conditionProfiles: ["data/fishing-condition/species-environment/v2/species-environment-profiles.json", "EB365314A15444D7407B7C88B3FD58D95004EAEAFE6723EFFF620B2C7F705F98"],
});
const OUTPUTS = Object.freeze({
  inventory: "data/fish-canonical/bulk/v1/canonical-inventory-v1.json",
  batch1: "data/fish-canonical/bulk/v1/batch-001.json",
  batch2: "data/fish-canonical/bulk/v1/batch-002.json",
  batch3: "data/fish-canonical/bulk/v1/batch-003.json",
  batch4: "data/fish-canonical/bulk/v1/batch-004.json",
  batch5: "data/fish-canonical/bulk/v1/batch-005.json",
  batch6: "data/fish-canonical/bulk/v1/batch-006.json",
  batch7: "data/fish-canonical/bulk/v1/batch-007.json",
  audit: "reports/fish-canonical/bulk-normalization-audit-v1.json",
  plan: "reports/fish-canonical/bulk-normalization-batch-plan-v1.json",
  exceptions: "reports/fish-canonical/bulk-normalization-exceptions-v1.json",
  conditionPool: "reports/fish-canonical/condition-profile-priority-pool-v1.json",
  completion: "reports/fish-canonical/bulk-normalization-completion-v1.json",
});

const CURRENT_CONDITION = Object.freeze([
  ["BM-SPECIES-000755", "참돔"], ["BM-SPECIES-000751", "감성돔"], ["BM-SPECIES-000188", "농어"],
  ["BM-SPECIES-000012", "조피볼락"], ["BM-SPECIES-000465", "넙치"], ["BM-SPECIES-000444", "갈치"],
  ["BM-SPECIES-000417", "고등어"], ["BM-SPECIES-000501", "방어"], ["BM-SPECIES-003107", "주꾸미"],
  ["BM-SPECIES-003111", "문어"],
]);
const RUNTIME_ALIASES = Object.freeze({ 광어: "넙치", 우럭: "조피볼락" });
const IDENTITY_STATUSES = Object.freeze(["VERIFIED", "PARTIAL", "AMBIGUOUS", "CONFLICT", "DUPLICATE_CANDIDATE", "UNRESOLVED"]);
const NAME_CLASSIFICATIONS = Object.freeze(["CANONICAL_NAME", "SAFE_ALIAS", "SCIENTIFIC_SYNONYM", "COMMERCIAL_NAME", "AGGREGATED_TAXON", "REGIONAL_NAME", "TYPO_VARIANT", "AMBIGUOUS", "UNRESOLVED"]);
const CHANGE_TYPES = Object.freeze(["NO_CHANGE", "NAME_NORMALIZED", "SCIENTIFIC_NAME_CONFIRMED", "ALIAS_ADDED_CANDIDATE", "SYNONYM_LINKED", "DUPLICATE_CANDIDATE", "CONFLICT_REVIEW_REQUIRED", "UNRESOLVED"]);
const SPECIAL_RAW_NAMES = Object.freeze({
  갑오징어: ["AGGREGATED_TAXON", null, "복수 갑오징어류를 포괄해 단일 종으로 연결하지 않는다."],
  망둑어: ["AGGREGATED_TAXON", null, "복수 망둑어류를 포괄해 단일 종으로 연결하지 않는다."],
  망둥어: ["AGGREGATED_TAXON", null, "비표준 집계명이며 단일 종으로 연결하지 않는다."],
  "농어/  삼치": ["AMBIGUOUS", null, "한 source field에 두 종이 결합되어 자동 분리하지 않는다."],
  무늬오징어: ["REGIONAL_NAME", "흰꼴뚜기", "공식 근거가 있는 지역명이나 대상 identity가 Fish 1,258 baseline 밖이다."],
  학꽁치: ["TYPO_VARIANT", "학공치", "명시적 표기 변형 후보이며 fuzzy matching은 사용하지 않는다."],
});

function bytes(relativePath) { return fs.readFileSync(path.join(ROOT, relativePath)); }
function json(relativePath) { return JSON.parse(bytes(relativePath).toString("utf8")); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex").toUpperCase(); }
function sortedUnique(values) { return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))].sort((a, b) => String(a).localeCompare(String(b), "ko")); }
function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) { const key = keyFor(value); counts[key] = (counts[key] ?? 0) + 1; }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
function completeCounts(keys, counts) { return Object.fromEntries(keys.map((key) => [key, counts[key] ?? 0])); }
function groupDuplicates(rows, keyFor) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()].filter(([, list]) => list.length > 1).map(([value, list]) => ({ value, speciesIds: list.map((row) => row.speciesId).sort() }));
}
function sourceInputMetadata() {
  return Object.fromEntries(Object.entries(INPUTS).map(([key, [inputPath, expected]]) => [key, { path: inputPath, sha256: expected }]));
}

function build() {
  const loaded = {};
  for (const [key, [inputPath, expected]] of Object.entries(INPUTS)) {
    const inputBytes = bytes(inputPath);
    const actual = sha256(inputBytes);
    if (key === "runtimeMapping") assert.ok(APPROVED_RUNTIME_MAPPING_HASHES.has(actual), `${inputPath} changed`);
    else assert.equal(actual, expected, `${inputPath} changed`);
    loaded[key] = key === "runtimeMapping" ? inputBytes.toString("utf8") : JSON.parse(inputBytes.toString("utf8"));
  }
  const expansionBytes = bytes(EXPANSION_INPUT[0]);
  assert.equal(sha256(expansionBytes), EXPANSION_INPUT[1], `${EXPANSION_INPUT[0]} changed`);
  const expansionInput = JSON.parse(expansionBytes.toString("utf8"));
  assert.equal(loaded.baseline.baseline.species, 1258);
  assert.deepEqual(loaded.baseline.baseline.sourceComposition, { NIFS: 8, MBRISCanonicalSpecies: 1250 });
  assert.equal(loaded.nifsImport.records.length, 8);
  assert.equal(loaded.mbrisReady.newSpecies.length, 1114);
  assert.equal(loaded.mbrisReview.rows.length, 136);

  const approvedAliasRows = loaded.aliases.filter((row) => row.status === "approved");
  const manualAliasRows = loaded.aliases.filter((row) => row.status === "manual_review");
  const aliasById = new Map();
  for (const row of approvedAliasRows) {
    const list = aliasById.get(row.internalId) ?? [];
    if (row.sourceName && row.sourceName !== row.canonicalName) list.push(row.sourceName);
    aliasById.set(row.internalId, list);
  }
  for (const row of loaded.approvedAliases.filter((item) => item.approvalStatus === "approved")) {
    const list = aliasById.get(row.internalId) ?? [];
    list.push(row.sourceName);
    aliasById.set(row.internalId, list);
  }
  const manualAliasesById = new Map();
  for (const row of manualAliasRows) {
    const list = manualAliasesById.get(row.internalId) ?? [];
    list.push({ name: row.sourceName, type: row.aliasType, confidence: row.confidence });
    manualAliasesById.set(row.internalId, list);
  }
  const conditionIds = new Set(CURRENT_CONDITION.map(([id]) => id));
  const conditionNames = new Set(CURRENT_CONDITION.map(([, name]) => name));

  const mbrisRows = [...loaded.mbrisReady.newSpecies, ...loaded.mbrisReview.rows].map((row) => {
    const scientificName = row.normalizedScientificName ?? row.scientificName;
    const taxonomy = row.taxonomy ?? {};
    const sourceId = row.mbrisSourceId ?? row.relationPlan?.mbrisSourceId ?? row.lineagePlan?.sourceId;
    const aliases = sortedUnique((aliasById.get(row.internalId) ?? []).filter((name) => name !== row.koreanName));
    return {
      speciesId: row.internalId,
      sourceSystem: "MBRIS",
      koreanName: row.koreanName,
      scientificName,
      acceptedScientificName: scientificName,
      rank: "SPECIES",
      family: taxonomy.family ?? null,
      genus: taxonomy.genus ?? scientificName?.split(/\s+/)[0] ?? null,
      aliases,
      synonyms: [],
      sourceRefs: [{ provider: "MBRIS", sourceId, artifact: row.legacyMappingRequired ? INPUTS.mbrisReview[0] : INPUTS.mbrisReady[0] }],
      taxonomyStatus: "SOURCE_CANONICAL",
      identityStatus: "VERIFIED",
      duplicateStatus: "UNIQUE",
      fishingSpotUsageCount: 0,
      conditionProfileStatus: conditionIds.has(row.internalId) ? "CURRENT_ENABLED" : "NOT_ENABLED",
      publishStatus: row.publishStatus ?? row.initialPublishStatus ?? "draft",
      reviewStatus: row.reviewStatus ?? row.initialReviewStatus ?? "pending",
      manualAliasReview: manualAliasesById.get(row.internalId) ?? [],
    };
  });

  const crosswalkBySource = new Map(loaded.crosswalk.map((row) => [row.nifsSourceId, row]));
  const nifsRows = loaded.nifsImport.records.map((row) => {
    const crosswalk = crosswalkBySource.get(row.sourceId);
    let scientificName = row.canonicalScientificName;
    if (row.sourceId === loaded.mottledSkate.target.source_id) scientificName = loaded.mottledSkate.target.scientific_name;
    const acceptedScientificName = crosswalk?.sameSpecies && crosswalk.reviewStatus === "approved"
      ? crosswalk.mbrisScientificNameCanonical
      : scientificName;
    let identityStatus = "VERIFIED";
    let taxonomyStatus = acceptedScientificName === scientificName ? "SOURCE_CANONICAL" : "ACCEPTED_NAME_UPDATE_AVAILABLE";
    if (crosswalk?.reviewStatus === "unresolved" || crosswalk?.sameSpecies === false) {
      identityStatus = "CONFLICT";
      taxonomyStatus = "TAXONOMY_CONFLICT";
    } else if (acceptedScientificName !== scientificName) identityStatus = "PARTIAL";
    const synonyms = sortedUnique([
      ...(row.scientificAliases ?? []),
      ...(acceptedScientificName !== scientificName ? [scientificName] : []),
    ]);
    const evidenceUrls = crosswalk?.evidence?.map((item) => item.url).filter(Boolean) ?? [];
    return {
      speciesId: row.speciesId,
      sourceSystem: "NIFS",
      koreanName: row.koreanName,
      scientificName,
      acceptedScientificName,
      rank: "SPECIES",
      family: null,
      genus: acceptedScientificName?.split(/\s+/)[0] ?? null,
      aliases: [],
      synonyms,
      sourceRefs: [
        { provider: "NIFS", sourceId: row.sourceId, artifact: INPUTS.nifsImport[0] },
        ...(crosswalk ? [{ provider: "CROSSWALK", sourceId: crosswalk.mbrisInternalId, artifact: INPUTS.crosswalk[0], urls: evidenceUrls }] : []),
      ],
      taxonomyStatus,
      identityStatus,
      duplicateStatus: "UNIQUE",
      fishingSpotUsageCount: 0,
      conditionProfileStatus: conditionNames.has(row.koreanName) ? "CURRENT_ENABLED_NAME_BOUNDARY" : "NOT_ENABLED",
      publishStatus: "draft",
      reviewStatus: "pending",
      manualAliasReview: [],
    };
  });

  const canonical = [...mbrisRows, ...nifsRows].sort((a, b) => a.speciesId.localeCompare(b.speciesId));
  assert.equal(canonical.length, 1258);
  assert.equal(new Set(canonical.map((row) => row.speciesId)).size, 1258);
  const scientificDuplicateGroups = groupDuplicates(canonical, (row) => row.acceptedScientificName?.trim().toLowerCase());
  const koreanDuplicateGroups = groupDuplicates(canonical, (row) => row.koreanName?.trim());
  const duplicateIds = new Set([...scientificDuplicateGroups, ...koreanDuplicateGroups].flatMap((group) => group.speciesIds));
  for (const row of canonical) {
    if (duplicateIds.has(row.speciesId)) {
      row.duplicateStatus = "DUPLICATE_CANDIDATE";
      if (row.identityStatus === "VERIFIED") row.identityStatus = "DUPLICATE_CANDIDATE";
    }
  }

  const byKorean = new Map();
  const byId = new Map(canonical.map((row) => [row.speciesId, row]));
  for (const row of canonical) {
    const list = byKorean.get(row.koreanName) ?? [];
    list.push(row);
    byKorean.set(row.koreanName, list);
  }
  const approvedAliasByName = new Map();
  for (const alias of approvedAliasRows) {
    if (!byId.has(alias.internalId)) continue;
    const list = approvedAliasByName.get(alias.sourceName) ?? [];
    list.push(alias.internalId);
    approvedAliasByName.set(alias.sourceName, list);
  }
  for (const alias of loaded.approvedAliases.filter((item) => item.approvalStatus === "approved" && byId.has(item.internalId))) {
    const list = approvedAliasByName.get(alias.sourceName) ?? [];
    list.push(alias.internalId);
    approvedAliasByName.set(alias.sourceName, list);
  }

  const spots = loaded.spots;
  assert.equal(spots.length, 1405);
  const rawMap = new Map();
  const currentCanonicalNames = new Set(CURRENT_CONDITION.map(([, name]) => name));
  const currentMappedSpotIds = new Set();
  const bulkMappedSpotIds = new Set();
  for (const spot of spots) {
    const targets = String(spot.targetFish ?? "").split("|").map((name) => name.trim()).filter(Boolean);
    let currentMapped = false;
    let bulkMapped = false;
    for (const rawName of targets) {
      const item = rawMap.get(rawName) ?? { rawName, occurrenceCount: 0, spotIds: new Set(), regions: new Set() };
      item.occurrenceCount += 1;
      item.spotIds.add(spot.id);
      item.regions.add(spot.region);
      rawMap.set(rawName, item);
      const runtimeName = RUNTIME_ALIASES[rawName] ?? rawName;
      if (currentCanonicalNames.has(runtimeName)) currentMapped = true;
      const exact = byKorean.get(rawName) ?? [];
      const safeAliasIds = sortedUnique(approvedAliasByName.get(rawName) ?? []);
      if (exact.length === 1 || safeAliasIds.length === 1 || (SPECIAL_RAW_NAMES[rawName]?.[0] === "TYPO_VARIANT" && (byKorean.get(SPECIAL_RAW_NAMES[rawName][1]) ?? []).length === 1)) bulkMapped = true;
    }
    if (currentMapped) currentMappedSpotIds.add(spot.id);
    if (bulkMapped) bulkMappedSpotIds.add(spot.id);
  }
  assert.equal(currentMappedSpotIds.size, 1386);

  const rawInventory = [...rawMap.values()].map((item) => {
    const rawName = item.rawName;
    const exact = byKorean.get(rawName) ?? [];
    const safeAliasIds = sortedUnique(approvedAliasByName.get(rawName) ?? []);
    let nameClassification = "UNRESOLVED";
    let canonicalSpeciesId = null;
    let canonicalName = null;
    let unresolvedReason = "NO_EXACT_OR_APPROVED_ALIAS_IN_FISH_1258_BASELINE";
    if (exact.length === 1) {
      nameClassification = "CANONICAL_NAME";
      canonicalSpeciesId = exact[0].speciesId;
      canonicalName = exact[0].koreanName;
      unresolvedReason = null;
    } else if (safeAliasIds.length === 1) {
      nameClassification = "SAFE_ALIAS";
      canonicalSpeciesId = safeAliasIds[0];
      canonicalName = byId.get(canonicalSpeciesId)?.koreanName ?? null;
      unresolvedReason = null;
    } else if (SPECIAL_RAW_NAMES[rawName]) {
      const [classification, target, reason] = SPECIAL_RAW_NAMES[rawName];
      nameClassification = classification;
      const targetRows = target ? byKorean.get(target) ?? [] : [];
      if (targetRows.length === 1 && classification === "TYPO_VARIANT") {
        canonicalSpeciesId = targetRows[0].speciesId;
        canonicalName = target;
        unresolvedReason = null;
      } else {
        canonicalName = target;
        unresolvedReason = reason;
      }
    }
    if (RUNTIME_ALIASES[rawName]) {
      const runtimeTarget = byKorean.get(RUNTIME_ALIASES[rawName]) ?? [];
      if (runtimeTarget.length === 1) {
        nameClassification = "SAFE_ALIAS";
        canonicalSpeciesId = runtimeTarget[0].speciesId;
        canonicalName = runtimeTarget[0].koreanName;
        unresolvedReason = null;
      }
    }
    if (canonicalSpeciesId && byId.has(canonicalSpeciesId)) byId.get(canonicalSpeciesId).fishingSpotUsageCount += item.spotIds.size;
    return {
      rawName,
      occurrenceCount: item.occurrenceCount,
      spotCount: item.spotIds.size,
      regions: sortedUnique([...item.regions]),
      nameClassification,
      canonicalSpeciesId,
      canonicalName,
      currentRuntimeMatch: currentCanonicalNames.has(RUNTIME_ALIASES[rawName] ?? rawName),
      unresolvedReason,
    };
  }).sort((a, b) => b.spotCount - a.spotCount || a.rawName.localeCompare(b.rawName, "ko"));
  assert.equal(rawInventory.length, 53);

  const issueMap = new Map();
  function addIssue(speciesId, category, detail, source = null) {
    const issue = issueMap.get(speciesId) ?? { speciesId, koreanName: byId.get(speciesId)?.koreanName ?? null, categories: [], details: [], sourceRefs: [] };
    issue.categories.push(category);
    issue.details.push(detail);
    if (source) issue.sourceRefs.push(source);
    issueMap.set(speciesId, issue);
  }
  for (const row of canonical) {
    if (row.identityStatus !== "VERIFIED") addIssue(row.speciesId, row.identityStatus, `${row.koreanName}: ${row.taxonomyStatus}`, row.sourceRefs[0]);
    for (const alias of row.manualAliasReview) addIssue(row.speciesId, alias.type === "aggregate_name" ? "AGGREGATED_TAXON" : alias.type === "market_name" ? "COMMERCIAL_NAME" : "ALIAS_REVIEW_REQUIRED", `${alias.name} (${alias.type}, ${alias.confidence})`, { artifact: INPUTS.aliases[0] });
  }
  addIssue("CROSS-SYSTEM:우럭", "CROSS_DOMAIN_HOMONYM", "Fishing Spot runtime 우럭→조피볼락 mapping must not resolve to MBRIS non-fish Mya arenaria.", { artifact: INPUTS.runtimeMapping[0] });
  for (const [id, name] of CURRENT_CONDITION) {
    if (!byId.has(id)) addIssue(`CONDITION:${id}`, "CONDITION_ID_OUTSIDE_BASELINE", `${name} condition identity is protected but its BM internal ID is outside the enumerated Fish 1,258 baseline.`, { artifact: INPUTS.conditionProfiles[0] });
  }
  const exceptions = [...issueMap.values()].map((item) => ({ ...item, categories: sortedUnique(item.categories), details: sortedUnique(item.details), sourceRefs: item.sourceRefs })).sort((a, b) => a.speciesId.localeCompare(b.speciesId));
  const canonicalExceptionIds = new Set(exceptions.filter((item) => byId.has(item.speciesId)).map((item) => item.speciesId));

  const priorityRows = [...canonical].sort((a, b) => {
    const aCondition = a.conditionProfileStatus.startsWith("CURRENT") ? 1 : 0;
    const bCondition = b.conditionProfileStatus.startsWith("CURRENT") ? 1 : 0;
    const aException = canonicalExceptionIds.has(a.speciesId) ? 1 : 0;
    const bException = canonicalExceptionIds.has(b.speciesId) ? 1 : 0;
    return bCondition - aCondition || b.fishingSpotUsageCount - a.fishingSpotUsageCount || b.aliases.length - a.aliases.length || aException - bException || a.speciesId.localeCompare(b.speciesId);
  });
  const batchSizes = [200, 200, 200, 200, 200, 200, 58];
  const batches = [];
  let offset = 0;
  for (let index = 0; index < batchSizes.length; index += 1) {
    const rows = priorityRows.slice(offset, offset + batchSizes[index]);
    offset += batchSizes[index];
    batches.push({
      batchId: `BATCH-${String(index + 1).padStart(3, "0")}`,
      size: rows.length,
      speciesIds: rows.map((row) => row.speciesId),
      rationale: index === 0 ? "Fishing Spot usage, protected condition identities, approved aliases, then clear source-backed identities." : index === batchSizes.length - 1 ? "Final deterministic remainder." : "Remaining source-backed identities in deterministic priority order.",
      expectedExceptionCount: rows.filter((row) => canonicalExceptionIds.has(row.speciesId)).length,
    });
  }
  assert.equal(offset, 1258);
  assert.equal(new Set(batches.flatMap((batch) => batch.speciesIds)).size, 1258);

  const exceptionById = new Map(exceptions.map((item) => [item.speciesId, item]));
  function normalizedBatchRow(row) {
    let changeType = "NO_CHANGE";
    if (row.identityStatus === "CONFLICT") changeType = "CONFLICT_REVIEW_REQUIRED";
    else if (row.duplicateStatus === "DUPLICATE_CANDIDATE") changeType = "DUPLICATE_CANDIDATE";
    else if (row.scientificName !== row.acceptedScientificName) changeType = "SCIENTIFIC_NAME_CONFIRMED";
    else if (row.synonyms.length > 0) changeType = "SYNONYM_LINKED";
    else if (row.aliases.length > 0) changeType = "ALIAS_ADDED_CANDIDATE";
    return {
      speciesId: row.speciesId,
      original: { koreanName: row.koreanName, scientificName: row.scientificName, aliases: [], synonyms: [] },
      normalized: { koreanName: row.koreanName, canonicalName: row.koreanName, scientificName: row.scientificName, acceptedScientificName: row.acceptedScientificName, aliases: row.aliases, synonyms: row.synonyms, rank: row.rank, family: row.family, genus: row.genus },
      taxonomyStatus: row.taxonomyStatus,
      identityStatus: row.identityStatus,
      sourceRefs: row.sourceRefs,
      fishingSpotUsageCount: row.fishingSpotUsageCount,
      changeType,
      exception: canonicalExceptionIds.has(row.speciesId),
      exceptionReasons: exceptionById.get(row.speciesId)?.details ?? [],
    };
  }
  const batchArtifacts = batches.map((batch) => {
    const rows = batch.speciesIds.map((speciesId) => normalizedBatchRow(byId.get(speciesId)));
    return {
      schemaVersion: 1,
      program: "Fish Canonical Bulk Normalization Program V1",
      batchId: batch.batchId,
      generatedOn: GENERATED_ON,
      selectionRationale: batch.rationale,
      processed: rows.length,
      counts: completeCounts(CHANGE_TYPES, countBy(rows, (row) => row.changeType)),
      exceptionCount: rows.filter((row) => row.exception).length,
      rows,
      invariants: null,
    };
  });

  const conditionCandidates = [];
  const seenConditionKeys = new Set();
  for (const raw of rawInventory) {
    if (!raw.canonicalSpeciesId || seenConditionKeys.has(raw.canonicalSpeciesId)) continue;
    const row = byId.get(raw.canonicalSpeciesId);
    conditionCandidates.push({ speciesId: row.speciesId, koreanName: row.koreanName, fishingSpotUsageCount: row.fishingSpotUsageCount, currentConditionEnabled: row.conditionProfileStatus.startsWith("CURRENT"), reasons: ["FISHING_SPOT_USAGE", ...(row.conditionProfileStatus.startsWith("CURRENT") ? ["CURRENT_CONDITION_IDENTITY_PROTECTED"] : ["HIGH_USE_CANONICAL_CANDIDATE"])] });
    seenConditionKeys.add(raw.canonicalSpeciesId);
  }
  for (const [id, name] of CURRENT_CONDITION) {
    if (seenConditionKeys.has(id) || byId.has(id)) continue;
    conditionCandidates.push({ speciesId: id, koreanName: name, fishingSpotUsageCount: rawInventory.find((row) => row.rawName === name)?.spotCount ?? 0, currentConditionEnabled: true, reasons: ["CURRENT_CONDITION_IDENTITY_PROTECTED", "CROSS_SYSTEM_IDENTITY_REVIEW_REQUIRED"] });
    seenConditionKeys.add(id);
  }
  conditionCandidates.sort((a, b) => Number(b.currentConditionEnabled) - Number(a.currentConditionEnabled) || b.fishingSpotUsageCount - a.fishingSpotUsageCount || a.speciesId.localeCompare(b.speciesId));
  const conditionPoolRows = conditionCandidates.slice(0, 40);
  assert.ok(conditionPoolRows.length >= 30 && conditionPoolRows.length <= 50);

  const invariants = { productionMutation: 0, runtimeMutation: 0, databaseWrite: 0, supabaseWrite: 0, automaticMergeOrDelete: 0, oneByOneWorkflow: 0, conditionProfileResearch: 0 };
  for (const batch of batchArtifacts) batch.invariants = invariants;
  const inputMetadata = sourceInputMetadata();
  const inventory = { schemaVersion: 1, program: "Fish Canonical Bulk Normalization Program V1", generatedOn: GENERATED_ON, baseCommit: BASE_COMMIT, total: canonical.length, inputs: inputMetadata, species: canonical.map(({ manualAliasReview, ...row }) => row), invariants };
  const exceptionCategoryCounts = countBy(exceptions.flatMap((item) => item.categories), (value) => value);
  function exceptionGroup(item) {
    if (item.categories.includes("CONFLICT")) return "TAXONOMY_CONFLICT";
    if (item.categories.includes("PARTIAL")) return "ACCEPTED_NAME_PARTIAL";
    if (item.categories.includes("AGGREGATED_TAXON")) return "AGGREGATE_ALIAS";
    if (item.categories.includes("ALIAS_REVIEW_REQUIRED") || item.categories.includes("COMMERCIAL_NAME")) return "ALIAS_AMBIGUITY";
    if (item.categories.includes("CROSS_DOMAIN_HOMONYM")) return "CROSS_DOMAIN_HOMONYM";
    if (item.categories.includes("CONDITION_ID_OUTSIDE_BASELINE")) return "CONDITION_ID_MISMATCH_OR_OUTSIDE_BASELINE";
    return "OTHER";
  }
  const exceptionGroupNames = ["TAXONOMY_CONFLICT", "ACCEPTED_NAME_PARTIAL", "ALIAS_AMBIGUITY", "AGGREGATE_ALIAS", "CROSS_DOMAIN_HOMONYM", "CONDITION_ID_MISMATCH_OR_OUTSIDE_BASELINE", "OTHER"];
  const categoryGroups = Object.fromEntries(exceptionGroupNames.map((group) => [group, exceptions.filter((item) => exceptionGroup(item) === group).map((item) => item.speciesId)]));
  const exceptionArtifact = { schemaVersion: 1, program: inventory.program, generatedOn: GENERATED_ON, exceptionCount: exceptions.length, canonicalSpeciesExceptionCount: canonicalExceptionIds.size, categoryCounts: exceptionCategoryCounts, categoryGroups, exceptions, policy: { automaticMerge: false, automaticDelete: false, manualReviewOnlyForExceptions: true, nextReviewMode: "CATEGORY_BATCH" }, invariants };
  const plan = { schemaVersion: 1, program: inventory.program, generatedOn: GENERATED_ON, totalSpecies: 1258, defaultBatchSize: 200, allowedBatchSize: { minimum: 150, maximum: 250, finalRemainderExempt: true }, batchCount: batches.length, batches, coverage: { assigned: batches.reduce((sum, batch) => sum + batch.size, 0), uniqueSpeciesIds: new Set(batches.flatMap((batch) => batch.speciesIds)).size, missing: 0, duplicates: 0 }, invariants };
  const conditionPool = { schemaVersion: 1, program: inventory.program, generatedOn: GENERATED_ON, candidateCount: conditionPoolRows.length, scope: "PRIORITY_ONLY_NO_PROFILE_RESEARCH", selection: "Current 10 protected first, then Fishing Spot usage frequency.", candidates: conditionPoolRows, invariants };
  const identityCounts = completeCounts(IDENTITY_STATUSES, countBy(canonical, (row) => row.identityStatus));
  const nameCounts = completeCounts(NAME_CLASSIFICATIONS, countBy(rawInventory, (row) => row.nameClassification));
  const audit = {
    schemaVersion: 1,
    program: inventory.program,
    generatedOn: GENERATED_ON,
    baseCommit: BASE_COMMIT,
    decision: "BULK_NORMALIZATION_READY_WITH_EXCEPTIONS",
    inputs: inputMetadata,
    canonical: {
      total: canonical.length,
      sourceComposition: countBy(canonical, (row) => row.sourceSystem),
      identityStatus: identityCounts,
      duplicateScientificNameGroups: scientificDuplicateGroups,
      duplicateKoreanNameGroups: koreanDuplicateGroups,
      missingScientificNames: canonical.filter((row) => !row.scientificName).map((row) => row.speciesId),
      sourceCoverage: { withAtLeastOneSource: canonical.filter((row) => row.sourceRefs.length > 0).length, sourceGap: canonical.filter((row) => row.sourceRefs.length === 0).length },
      approvedAliasCount: canonical.reduce((sum, row) => sum + row.aliases.length, 0),
      synonymCount: canonical.reduce((sum, row) => sum + row.synonyms.length, 0),
    },
    fishingSpots: {
      total: spots.length,
      rawUniqueNames: rawInventory.length,
      rawNameClassifications: nameCounts,
      rawInventory,
      currentMappedSpots: currentMappedSpotIds.size,
      currentUnmappedSpots: spots.length - currentMappedSpotIds.size,
      potentialMappedSpotsWithFishBaseline: bulkMappedSpotIds.size,
      potentialUnmappedSpotsWithFishBaseline: spots.length - bulkMappedSpotIds.size,
      potentialMappingGain: bulkMappedSpotIds.size - currentMappedSpotIds.size,
      note: "Potential mapping is identity/search coverage only; it does not enable condition profiles or mutate runtime mapping.",
    },
    batchPlan: { batchCount: batches.length, sizes: batches.map((batch) => batch.size), batch1Count: batchArtifacts[0].processed },
    exceptions: { total: exceptions.length, canonicalSpecies: canonicalExceptionIds.size, categoryCounts: exceptionCategoryCounts },
    conditionProfilePool: { candidateCount: conditionPoolRows.length, profileResearchPerformed: false },
    invariants,
  };
  const allBatchRows = batchArtifacts.flatMap((batch) => batch.rows);
  const allBatchIds = allBatchRows.map((row) => row.speciesId);
  assert.equal(allBatchRows.length, 1258);
  assert.equal(new Set(allBatchIds).size, 1258);
  assert.deepEqual(new Set(allBatchIds), new Set(canonical.map((row) => row.speciesId)));
  const synonymOwners = new Map();
  for (const row of canonical) for (const synonym of row.synonyms) {
    const key = synonym.trim().toLowerCase();
    const owners = synonymOwners.get(key) ?? new Set();
    owners.add(row.speciesId);
    synonymOwners.set(key, owners);
  }
  const acceptedOwners = new Map(canonical.map((row) => [row.acceptedScientificName?.trim().toLowerCase(), row.speciesId]));
  const synonymCollisionGroups = [...synonymOwners.entries()].filter(([name, owners]) => owners.size > 1 || (acceptedOwners.has(name) && !owners.has(acceptedOwners.get(name)))).map(([value, owners]) => ({ value, speciesIds: sortedUnique([...owners, ...(acceptedOwners.has(value) ? [acceptedOwners.get(value)] : [])]) }));
  const expansionReconciliation = expansionInput.candidates.map((candidate) => {
    const matches = byKorean.get(candidate.canonicalName) ?? [];
    return {
      canonicalName: candidate.canonicalName,
      scientificName: candidate.scientificName,
      affectedSpotCount: candidate.affectedSpotCount,
      fishCanonicalSpeciesId: matches.length === 1 ? matches[0].speciesId : null,
      status: matches.length === 1 ? "LINKED_FISH_CANONICAL" : "OUTSIDE_FISH_1258_BASELINE",
    };
  });
  assert.equal(expansionReconciliation.length, 15);
  const rawWithoutIdentity = rawInventory.filter((row) => !row.canonicalSpeciesId);
  const completion = {
    schemaVersion: 1,
    program: inventory.program,
    generatedOn: GENERATED_ON,
    phaseABaselineCommit: "3cd67f74745a8d49666f300013a58292a568766d",
    decision: "BULK_NORMALIZATION_COMPLETE_WITH_EXCEPTIONS",
    reconciliation: { totalCanonical: 1258, batchCount: 7, batchSizes: batchArtifacts.map((batch) => batch.processed), totalBatchRows: allBatchRows.length, uniqueBatchSpeciesIds: new Set(allBatchIds).size, missingIds: 0, extraIds: 0, duplicateIds: 0, inventoryIdSetMatch: true, planExactMatch: batchArtifacts.every((batch, index) => JSON.stringify(batch.rows.map((row) => row.speciesId)) === JSON.stringify(plan.batches[index].speciesIds)) },
    identityStatus: identityCounts,
    changeTypes: completeCounts(CHANGE_TYPES, countBy(allBatchRows, (row) => row.changeType)),
    names: { approvedAliasCandidates: canonical.reduce((sum, row) => sum + row.aliases.length, 0), synonyms: canonical.reduce((sum, row) => sum + row.synonyms.length, 0) },
    exceptions: { total: exceptions.length, canonicalSpecies: canonicalExceptionIds.size, categoryCounts: exceptionCategoryCounts, categoryGroupCounts: Object.fromEntries(Object.entries(categoryGroups).map(([key, value]) => [key, value.length])) },
    collisions: { acceptedScientificNameGroups: scientificDuplicateGroups, koreanNameGroups: koreanDuplicateGroups, synonymGroups: synonymCollisionGroups, taxonomyConflictSpeciesIds: canonical.filter((row) => row.identityStatus === "CONFLICT").map((row) => row.speciesId) },
    sourceCoverage: audit.canonical.sourceCoverage,
    fishingSpots: { currentProductionMapped: currentMappedSpotIds.size, currentProductionUnmapped: spots.length - currentMappedSpotIds.size, potentialIdentityMapped: bulkMappedSpotIds.size, potentialIdentityUnmapped: spots.length - bulkMappedSpotIds.size, potentialGain: bulkMappedSpotIds.size - currentMappedSpotIds.size, rawUniqueNames: rawInventory.length, unresolvedClassificationCount: rawInventory.filter((row) => row.nameClassification === "UNRESOLVED").length, rawNamesWithoutFishBaselineIdentity: rawWithoutIdentity.map((row) => row.rawName) },
    expansionCandidates: { total: expansionReconciliation.length, linkedFishCanonical: expansionReconciliation.filter((row) => row.fishCanonicalSpeciesId).length, outsideFishBaseline: expansionReconciliation.filter((row) => !row.fishCanonicalSpeciesId).length, rows: expansionReconciliation, source: { path: EXPANSION_INPUT[0], sha256: EXPANSION_INPUT[1] } },
    conditionProfilePool: { candidateCount: conditionPoolRows.length, profileResearchPerformed: false },
    invariants,
  };
  return { inventory, batch1: batchArtifacts[0], batch2: batchArtifacts[1], batch3: batchArtifacts[2], batch4: batchArtifacts[3], batch5: batchArtifacts[4], batch6: batchArtifacts[5], batch7: batchArtifacts[6], audit, plan, exceptions: exceptionArtifact, conditionPool, completion };
}

function serialize(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function main() {
  const result = build();
  const outputPairs = Object.entries(OUTPUTS).map(([key, outputPath]) => [outputPath, result[key]]);
  if (process.argv.includes("--check")) {
    for (const [outputPath, value] of outputPairs) assert.equal(fs.readFileSync(path.join(ROOT, outputPath), "utf8"), serialize(value), `${outputPath} is not deterministic`);
    console.log("fish canonical bulk normalization artifacts are deterministic");
    return;
  }
  for (const [outputPath, value] of outputPairs) {
    const absolutePath = path.join(ROOT, outputPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialize(value));
    console.log(`wrote ${outputPath}`);
  }
}

main();

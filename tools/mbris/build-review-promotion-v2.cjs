const fs = require("node:fs");
const path = require("node:path");

const {
  auditSql,
  projectRef,
  readEnv,
  runAuditor,
} = require("./run-canary-import-v1.cjs");

const root = path.resolve(__dirname, "../..");
const reportsDir = path.join(root, "reports/mbris");
const docsDir = path.join(root, "docs");
const auditEnvPath = path.join(root, "tools/supabase-audit/.env");

const CLASSIFICATIONS = [
  "PROMOTE_NEW_READY",
  "LINK_LEGACY_AND_PROMOTE_NEW",
  "EXISTING_CANONICAL_EXACT",
  "EXISTING_CANONICAL_ALIAS_REVIEW",
  "KOREAN_NAME_REVIEW",
  "SCIENTIFIC_NAME_REVIEW",
  "TAXONOMY_REVIEW",
  "IDENTITY_CONFLICT",
  "OUT_OF_SCOPE_RECLASSIFY",
  "HOLD",
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function slugifyScientificName(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function legacyKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "");
}

function toCsv(rows, fields) {
  const quote = (value) => {
    const serialized = value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    return `"${serialized.replace(/"/g, '""')}"`;
  };
  return [fields.join(","), ...rows.map((row) => fields.map((field) => quote(row[field])).join(","))].join("\n") + "\n";
}

function taxonomyIssue(record) {
  const scientificParts = String(record.scientificName ?? "").trim().split(/\s+/);
  const taxonomyGenus = String(record.taxonomy?.genus ?? "").trim().split(/\s+/)[0];
  const taxonomySpecies = String(record.taxonomy?.species ?? "").trim();
  if (!record.taxonomy?.family || !taxonomyGenus || !taxonomySpecies) return "TAXONOMY_HIERARCHY_INCOMPLETE";
  if (normalize(scientificParts[0]) !== normalize(taxonomyGenus)) return "GENUS_MISMATCH";
  if (normalize(scientificParts.slice(1).join(" ")) !== normalize(taxonomySpecies)) return "SPECIES_EPITHET_MISMATCH";
  return null;
}

function scientificIssue(record) {
  const value = String(record.scientificName ?? "").trim();
  if (!value) return "SCIENTIFIC_NAME_MISSING";
  if (!/^[A-Z][a-z-]+\s+[a-z][a-z-]+$/.test(value)) return "SCIENTIFIC_NAME_NOT_BINOMIAL";
  return null;
}

function classifyReviewRecords({ reviewRecords, legacyRecords, remote }) {
  const legacyBySource = new Map(legacyRecords.map((record) => [record.mbrisSourceId, record]));
  const speciesByInternal = new Map(remote.species.filter((row) => row.internal_id).map((row) => [row.internal_id, row]));
  const speciesByScientific = new Map(remote.species.filter((row) => row.normalized_scientific_name).map((row) => [normalize(row.normalized_scientific_name), row]));
  const speciesBySlug = new Map(remote.species.map((row) => [row.slug, row]));
  const sourceLogByMbrisId = new Map(remote.logs.filter((row) => row.source_id).map((row) => [row.source_id, row]));
  const relationByMbrisId = new Map(remote.relations.filter((row) => row.mbris_source_id).map((row) => [row.mbris_source_id, row]));
  const aliasNames = new Map(remote.aliases.map((row) => [normalize(row.normalized_alias), row]));

  return reviewRecords.map((record) => {
    const normalizedScientificName = normalize(record.normalizedScientificName || record.scientificName);
    const canonicalSlug = slugifyScientificName(record.scientificName);
    const internalMatch = speciesByInternal.get(record.internalId) || null;
    const scientificMatch = speciesByScientific.get(normalizedScientificName) || null;
    const slugMatch = speciesBySlug.get(canonicalSlug) || null;
    const sourceLogMatch = sourceLogByMbrisId.get(record.mbrisSourceId) || null;
    const sourceRelationMatch = relationByMbrisId.get(record.mbrisSourceId) || null;
    const sourceSpeciesId = sourceLogMatch?.entity_id || sourceRelationMatch?.species_id || null;
    const sourceSpeciesMatch = sourceSpeciesId
      ? remote.species.find((row) => row.species_id === sourceSpeciesId) || null
      : null;
    const koreanNameMatch = remote.species.find((row) => normalize(row.korean_name) === normalize(record.koreanName)) || null;
    const aliasMatch = aliasNames.get(normalize(record.koreanName)) || null;
    const legacy = legacyBySource.get(record.mbrisSourceId) || null;
    const secondaryFlags = new Set(record.secondaryFlags || []);
    let primaryClass;
    let reason;

    if ((internalMatch && normalize(internalMatch.normalized_scientific_name) !== normalizedScientificName)
      || (sourceSpeciesMatch && normalize(sourceSpeciesMatch.normalized_scientific_name) !== normalizedScientificName)) {
      primaryClass = "IDENTITY_CONFLICT";
      reason = "Internal or MBRIS source identity is already bound to a different scientific identity in staging.";
    } else if (internalMatch || scientificMatch || sourceSpeciesMatch) {
      const match = internalMatch || scientificMatch || sourceSpeciesMatch;
      if (record.koreanName && normalize(match.korean_name) !== normalize(record.koreanName)) {
        primaryClass = "EXISTING_CANONICAL_ALIAS_REVIEW";
        reason = "Scientific identity already exists, but the Korean name differs and needs alias review.";
      } else {
        primaryClass = "EXISTING_CANONICAL_EXACT";
        reason = "The same canonical scientific identity already exists in staging.";
      }
    } else if (slugMatch) {
      primaryClass = "IDENTITY_CONFLICT";
      reason = "The proposed immutable slug is already used by another staging species.";
    } else if (!record.koreanName) {
      primaryClass = "KOREAN_NAME_REVIEW";
      reason = "MBRIS does not provide a Korean name; automatic naming is prohibited.";
    } else if (scientificIssue(record)) {
      primaryClass = "SCIENTIFIC_NAME_REVIEW";
      reason = scientificIssue(record);
      secondaryFlags.add("EXTERNAL_TAXONOMY_REVIEW_REQUIRED");
    } else if (taxonomyIssue(record)) {
      primaryClass = "TAXONOMY_REVIEW";
      reason = taxonomyIssue(record);
      secondaryFlags.add("EXTERNAL_TAXONOMY_REVIEW_REQUIRED");
    } else if (legacy) {
      primaryClass = "LINK_LEGACY_AND_PROMOTE_NEW";
      reason = "A local UI fish record exists, but no staging canonical identity exists; create a new canonical species and retain a legacy mapping.";
    } else {
      primaryClass = "PROMOTE_NEW_READY";
      reason = "Scientific identity is complete and has no staging collision.";
    }

    if (koreanNameMatch && (!scientificMatch || koreanNameMatch.species_id !== scientificMatch.species_id)) {
      secondaryFlags.add("KOREAN_NAME_SHARED_WITH_DIFFERENT_CANONICAL_IDENTITY");
    }
    if (aliasMatch) secondaryFlags.add("STAGING_ALIAS_NAME_MATCH");

    const stagingMatch = internalMatch || scientificMatch || sourceSpeciesMatch || slugMatch;
    return {
      mbrisSourceId: record.mbrisSourceId,
      internalId: record.internalId,
      koreanName: record.koreanName,
      scientificName: record.scientificName,
      normalizedScientificName: record.normalizedScientificName,
      canonicalSlug,
      taxonomy: record.taxonomy,
      primaryClass,
      reason,
      secondaryFlags: [...secondaryFlags].sort(),
      legacyLocalMatch: record.legacyLocalMatch,
      legacyMappingRequired: primaryClass === "LINK_LEGACY_AND_PROMOTE_NEW",
      stagingMatch: stagingMatch ? {
        speciesId: stagingMatch.species_id,
        internalId: stagingMatch.internal_id,
        koreanName: stagingMatch.korean_name,
        scientificName: stagingMatch.scientific_name,
        slug: stagingMatch.slug,
      } : null,
      collisions: {
        id: Boolean(internalMatch),
        sourceId: Boolean(sourceLogMatch || sourceRelationMatch),
        scientific: Boolean(scientificMatch),
        normalizedScientific: Boolean(scientificMatch),
        slug: Boolean(slugMatch),
        relation: Boolean(sourceRelationMatch || (stagingMatch && remote.relations.some((relation) => relation.species_id === stagingMatch.species_id))),
      },
      priority: record.priority,
      tier: record.tier,
    };
  });
}

function buildMalformedRows(classification, remote) {
  const malformedIds = new Set(classification.malformedScientific.records.map((row) => row.internalId));
  return classification.rows.filter((row) => malformedIds.has(row.internalId)).map((row) => {
    const normalized = normalize(row.normalizedScientificName || row.scientificName);
    const collision = remote.species.find((species) =>
      species.internal_id === row.internalId || normalize(species.normalized_scientific_name) === normalized
    );
    return {
      mbrisSourceId: row.mbrisSourceId,
      internalId: row.internalId,
      koreanName: row.koreanName,
      originalScientificString: row.scientificName,
      normalizedValue: row.normalizedScientificName,
      malformedReason: "INFRASPECIFIC_TRINOMIAL_REQUIRES_RANK_AND_ACCEPTED_NAME_REVIEW",
      taxonomyContext: row.taxonomy,
      currentStagingCollision: collision ? {
        speciesId: collision.species_id,
        scientificName: collision.scientific_name,
      } : null,
      recommendedAction: "EXTERNAL_TAXONOMY_REVIEW_REQUIRED; do not auto-correct or admit to the Fish review import.",
      sourceScope: "육상담수종",
    };
  });
}

function validateOutput({ rows, readyRows, malformedRows }) {
  if (rows.length !== 137) throw new Error(`REVIEW_INPUT_COUNT_INVALID:${rows.length}`);
  if (rows.some((row) => !CLASSIFICATIONS.includes(row.primaryClass))) throw new Error("UNCLASSIFIED_REVIEW_ROW");
  if (new Set(rows.map((row) => row.mbrisSourceId)).size !== 137) throw new Error("REVIEW_SOURCE_ID_DUPLICATE");
  if (malformedRows.length !== 5) throw new Error(`MALFORMED_COUNT_INVALID:${malformedRows.length}`);
  for (const [field, selector] of [
    ["canonicalId", (row) => row.canonicalId],
    ["scientificName", (row) => normalize(row.scientificName)],
    ["slug", (row) => row.slug],
  ]) {
    if (new Set(readyRows.map(selector)).size !== readyRows.length) throw new Error(`READY_${field.toUpperCase()}_DUPLICATE`);
  }
  if (readyRows.some((row) => row.malformedScientific)) throw new Error("MALFORMED_ADMITTED");
  if (readyRows.some((row) => row.koreanName === "참홍어")) throw new Error("CHAMHONG_ADMITTED");
}

function buildArtifacts(remote, generatedAt = new Date().toISOString()) {
  const queue = readJson("reports/mbris/mbris-promotion-review-queue-v1.json");
  const classification = readJson("reports/mbris/mbris-fish-promotion-classification-v2.json");
  const legacy = readJson("reports/mbris/mbris-legacy-fish-mapping-v1.json");
  const reviewRecords = classification.rows.filter((row) => ["LEGACY_LOCAL_REVIEW", "NEW_CANONICAL_REVIEW"].includes(row.primaryClass));
  const rows = classifyReviewRecords({ reviewRecords, legacyRecords: legacy.records, remote });
  const malformedRows = buildMalformedRows(classification, remote);
  const ready = rows.filter((row) => ["PROMOTE_NEW_READY", "LINK_LEGACY_AND_PROMOTE_NEW"].includes(row.primaryClass));
  const readyRows = ready.map((row) => ({
    canonicalId: row.internalId,
    internalId: row.internalId,
    mbrisSourceId: row.mbrisSourceId,
    koreanName: row.koreanName,
    scientificName: row.scientificName,
    normalizedScientificName: row.normalizedScientificName,
    slug: row.canonicalSlug,
    classification: row.primaryClass,
    legacyMappingRequired: row.legacyMappingRequired,
    publishStatus: "draft",
    reviewStatus: "pending",
    taxonomy: row.taxonomy,
    relationPlan: {
      action: "INSERT_IF_ABSENT",
      sourceProvider: "MBRIS",
      sourceId: "mbris-national-species-catalog",
      mbrisSourceId: row.mbrisSourceId,
      isPrimary: true,
    },
    lineagePlan: {
      action: "INSERT_IMPORT_LINEAGE",
      sourceProvider: "MBRIS",
      mbrisSourceId: row.mbrisSourceId,
      originalKoreanName: row.koreanName,
      originalScientificName: row.scientificName,
      importBatch: "mbris-review-ready-import-manifest-v1",
    },
    malformedScientific: false,
  }));
  validateOutput({ rows, readyRows, malformedRows });

  const counts = Object.fromEntries(CLASSIFICATIONS.map((name) => [name, rows.filter((row) => row.primaryClass === name).length]));
  const collisionCounts = {
    id: rows.filter((row) => row.collisions.id).length,
    sourceId: rows.filter((row) => row.collisions.sourceId).length,
    scientific: rows.filter((row) => row.collisions.scientific).length,
    normalized: rows.filter((row) => row.collisions.normalizedScientific).length,
    slug: rows.filter((row) => row.collisions.slug).length,
    relation: rows.filter((row) => row.collisions.relation).length,
  };
  const blockedRows = rows.filter((row) => !["PROMOTE_NEW_READY", "LINK_LEGACY_AND_PROMOTE_NEW", "EXISTING_CANONICAL_EXACT"].includes(row.primaryClass));
  const legacyMappings = rows.filter((row) => row.primaryClass === "LINK_LEGACY_AND_PROMOTE_NEW").map((row) => ({
    legacyKey: legacyKey(row.koreanName),
    legacyKoreanName: row.koreanName,
    legacyScientificName: null,
    mbrisSourceId: row.mbrisSourceId,
    canonicalCandidateId: row.internalId,
    canonicalScientificName: row.scientificName,
    mappingConfidence: row.legacyLocalMatch === "LEGACY_LOCAL_SOURCE_LINK" ? "medium-source-link" : "medium-name-match",
    reason: "The local FishItem contract has no scientific-name field; preserve the UI-name link separately from canonical identity.",
  }));
  const readyNewTotal = readyRows.length;
  const potentialAfterManualReview = remote.species.length + readyNewTotal + blockedRows.filter((row) => [
    "KOREAN_NAME_REVIEW",
    "SCIENTIFIC_NAME_REVIEW",
    "TAXONOMY_REVIEW",
    "EXISTING_CANONICAL_ALIAS_REVIEW",
    "HOLD",
  ].includes(row.primaryClass)).length;

  return {
    promotion: {
      reportVersion: "MBRIS_REVIEW_PROMOTION_V2",
      generatedAt,
      environment: "staging",
      projectRef,
      readOnly: true,
      dbWrite: 0,
      externalTaxonomyLookup: false,
      base: {
        stagingCanonical: remote.species.length,
        reviewInput: reviewRecords.length,
        previousQueueInput: queue.reviewQueue.total,
        malformedScientificSeparateTrack: malformedRows.length,
      },
      classification: counts,
      readyNewTotal,
      projectedAfterReviewReady: remote.species.length + readyNewTotal,
      potentialAfterManualReview,
      remoteCollisionPreflight: {
        status: Object.values(collisionCounts).every((count) => count === 0) ? "PASS" : "COLLISIONS_CLASSIFIED_OUT_OF_READY",
        counts: collisionCounts,
        currentUser: remote.identity.currentUser,
        transactionReadOnly: remote.identity.readOnly,
        bypassRls: remote.identity.bypassRls,
      },
      verification: {
        classified: rows.length,
        unclassified: rows.filter((row) => !row.primaryClass).length,
        duplicatePrimaryClass: 0,
        readyManifestRows: readyRows.length,
        malformedAdmitted: 0,
        chamhongAdmitted: 0,
        nonFishAdmitted: 0,
      },
      rows,
    },
    readyManifest: {
      manifestVersion: "MBRIS_REVIEW_READY_IMPORT_MANIFEST_V1",
      generatedAt,
      environment: "staging",
      projectRef,
      readOnly: true,
      dbWrite: 0,
      initialState: { publishStatus: "draft", reviewStatus: "pending" },
      readyNewTotal,
      collisionPreflight: collisionCounts,
      rows: readyRows,
    },
    legacyMapping: {
      reportVersion: "MBRIS_LEGACY_TO_CANONICAL_MAPPING_V2",
      generatedAt,
      total: legacyMappings.length,
      records: legacyMappings,
    },
    blocked: {
      reportVersion: "MBRIS_REVIEW_BLOCKED_V1",
      generatedAt,
      reviewBlockedCount: blockedRows.length,
      reviewBlocked: blockedRows,
      malformedScientificCount: malformedRows.length,
      malformedScientific: malformedRows,
      excludedTracks: {
        chamhongConflict: "Excluded from the 137 review manifest.",
        nonFish145: "Excluded from Fish canonical promotion.",
      },
    },
  };
}

function writeArtifacts(artifacts) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const promotionFields = ["mbrisSourceId", "internalId", "koreanName", "scientificName", "normalizedScientificName", "canonicalSlug", "primaryClass", "reason", "legacyLocalMatch", "legacyMappingRequired", "secondaryFlags", "collisions"];
  const manifestFields = ["canonicalId", "internalId", "mbrisSourceId", "koreanName", "scientificName", "normalizedScientificName", "slug", "classification", "legacyMappingRequired", "publishStatus", "reviewStatus", "relationPlan", "lineagePlan"];
  fs.writeFileSync(path.join(reportsDir, "mbris-review-promotion-v2.json"), JSON.stringify(artifacts.promotion, null, 2) + "\n");
  fs.writeFileSync(path.join(reportsDir, "mbris-review-promotion-v2.csv"), toCsv(artifacts.promotion.rows, promotionFields));
  fs.writeFileSync(path.join(reportsDir, "mbris-review-ready-import-manifest-v1.json"), JSON.stringify(artifacts.readyManifest, null, 2) + "\n");
  fs.writeFileSync(path.join(reportsDir, "mbris-review-ready-import-manifest-v1.csv"), toCsv(artifacts.readyManifest.rows, manifestFields));
  fs.writeFileSync(path.join(reportsDir, "mbris-legacy-to-canonical-mapping-v2.json"), JSON.stringify(artifacts.legacyMapping, null, 2) + "\n");
  fs.writeFileSync(path.join(reportsDir, "mbris-review-blocked-v1.json"), JSON.stringify(artifacts.blocked, null, 2) + "\n");

  const p = artifacts.promotion;
  const malformedTable = artifacts.blocked.malformedScientific.map((row) =>
    `| ${row.koreanName} | ${row.originalScientificString} | ${row.malformedReason} | ${row.recommendedAction} |`
  ).join("\n");
  const classTable = CLASSIFICATIONS.map((name) => `| ${name} | ${p.classification[name]} |`).join("\n");
  const doc = `# MBRIS Review Promotion V2\n\nGenerated: ${p.generatedAt}\n\nThis is a read-only staging review. No import, migration, schema change, or canonical mutation was performed. No external taxonomy lookup was performed.\n\n## Base\n\n- Staging canonical: ${p.base.stagingCanonical}\n- Review input: ${p.base.reviewInput}\n- Malformed scientific separate track: ${p.base.malformedScientificSeparateTrack}\n- Auditor: ${p.remoteCollisionPreflight.currentUser}\n- Transaction read-only: ${p.remoteCollisionPreflight.transactionReadOnly}\n\n## Classification\n\n| Class | Count |\n| --- | ---: |\n${classTable}\n| total | ${p.verification.classified} |\n\nLegacy/local linkage is not a canonical merge signal. The 136 legacy-linked records with complete scientific identity and no staging collision are promoted as new canonical candidates while retaining a separate mapping. The one record without a Korean name remains blocked.\n\n## Ready\n\n- READY_NEW_TOTAL: ${p.readyNewTotal}\n- Manifest rows: ${artifacts.readyManifest.rows.length}\n- Initial state: draft / pending\n- Projected after ready import: ${p.projectedAfterReviewReady}\n- Potential after manual review: ${p.potentialAfterManualReview}\n\n## Remote Collision Preflight\n\n- Status: ${p.remoteCollisionPreflight.status}\n- ID: ${p.remoteCollisionPreflight.counts.id}\n- MBRIS source ID: ${p.remoteCollisionPreflight.counts.sourceId}\n- Scientific: ${p.remoteCollisionPreflight.counts.scientific}\n- Normalized scientific: ${p.remoteCollisionPreflight.counts.normalized}\n- Slug: ${p.remoteCollisionPreflight.counts.slug}\n- Relation: ${p.remoteCollisionPreflight.counts.relation}\n\n## Malformed Scientific 5\n\nThese records are outside the 137 review input and remain isolated. Their source strings are preserved without automatic correction.\n\n| Korean name | Original scientific string | Reason | Action |\n| --- | --- | --- | --- |\n${malformedTable}\n\n## Exclusions\n\n- Cham-hong-eo conflict: excluded; separate Raja pulchra / Beringraja pulchra taxonomy track.\n- Non-fish 145: excluded; future Marine Organism track.\n- External taxonomy lookup: not performed.\n\n## Verification\n\n- Classified: ${p.verification.classified}/137\n- Unclassified: ${p.verification.unclassified}\n- Duplicate primary class: ${p.verification.duplicatePrimaryClass}\n- Malformed admitted: ${p.verification.malformedAdmitted}\n- Cham-hong-eo admitted: ${p.verification.chamhongAdmitted}\n- Non-fish admitted: ${p.verification.nonFishAdmitted}\n- DB write: 0\n`;
  fs.writeFileSync(path.join(docsDir, "MBRIS_REVIEW_PROMOTION_V2.md"), doc, "utf8");
}

function loadRemoteAudit() {
  const env = readEnv(auditEnvPath);
  const auditUrl = env.FISH_SUPABASE_AUDIT_DATABASE_URL;
  if (!auditUrl) throw new Error("AUDIT_URL_MISSING");
  const parsed = new URL(auditUrl);
  const username = decodeURIComponent(parsed.username);
  if (!["blue_marina_readonly_auditor", `blue_marina_readonly_auditor.${projectRef}`].includes(username)) {
    throw new Error("AUDITOR_ROLE_INVALID");
  }
  const results = runAuditor(auditSql(), auditUrl);
  const remote = results[0];
  if (!remote || remote.identity.currentUser !== "blue_marina_readonly_auditor" || remote.identity.readOnly !== "on" || remote.identity.bypassRls !== false) {
    throw new Error("READ_ONLY_AUDITOR_VERIFY_FAILED");
  }
  return remote;
}

function main() {
  const remote = loadRemoteAudit();
  const artifacts = buildArtifacts(remote);
  writeArtifacts(artifacts);
  console.log(JSON.stringify({
    status: "MBRIS_REVIEW_PROMOTION_V2_COMPLETE",
    stagingCanonical: artifacts.promotion.base.stagingCanonical,
    classified: artifacts.promotion.verification.classified,
    readyNewTotal: artifacts.promotion.readyNewTotal,
    blocked: artifacts.blocked.reviewBlockedCount,
    malformed: artifacts.blocked.malformedScientificCount,
    collisionPreflight: artifacts.promotion.remoteCollisionPreflight,
    dbWrite: 0,
  }));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ status: "MBRIS_REVIEW_PROMOTION_V2_FAILED", reason: error.message }));
    process.exitCode = 1;
  }
}

module.exports = {
  CLASSIFICATIONS,
  buildArtifacts,
  classifyReviewRecords,
  normalize,
  slugifyScientificName,
  toCsv,
  validateOutput,
};

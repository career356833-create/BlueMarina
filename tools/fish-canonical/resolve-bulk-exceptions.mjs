import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GENERATED_ON = "2026-09-18";
const PROGRAM = "Fish Canonical Exception Resolution Program V1";

const INPUTS = {
  inventory: "data/fish-canonical/bulk/v1/canonical-inventory-v1.json",
  completion: "reports/fish-canonical/bulk-normalization-completion-v1.json",
  exceptions: "reports/fish-canonical/bulk-normalization-exceptions-v1.json",
  aliasRegistry: "data/mbris/mappings/fish-alias-registry.json",
  aliasReviewBatch2: "data/mbris/mappings/fish-data-alias-review-batch2.json",
  taxonomyCrosswalk: "data/mbris/mappings/nifs-mbris-taxonomy-crosswalk.json",
  conditionProfiles: "data/fishing-condition/species-environment/v2/species-environment-profiles.json",
};

const OUTPUTS = {
  aggregate: "reports/fish-canonical/exception-resolution-aggregate-alias-v1.json",
  ambiguity: "reports/fish-canonical/exception-resolution-alias-ambiguity-v1.json",
  structural: "reports/fish-canonical/exception-resolution-structural-v1.json",
  summary: "reports/fish-canonical/exception-resolution-summary-v1.json",
};

const INVARIANTS = {
  productionMutation: 0,
  runtimeMutation: 0,
  databaseWrite: 0,
  supabaseWrite: 0,
  automaticMergeOrDelete: 0,
  oneByOneWorkflow: 0,
  conditionProfileResearch: 0,
};

const AGGREGATED_TAXON_IDS = new Set([
  "BM-SPECIES-000042",
  "BM-SPECIES-000143",
  "BM-SPECIES-000163",
  "BM-SPECIES-000165",
  "BM-SPECIES-000278",
  "BM-SPECIES-000280",
  "BM-SPECIES-000369",
  "BM-SPECIES-000412",
  "BM-SPECIES-000421",
  "BM-SPECIES-000445",
  "BM-SPECIES-000451",
  "BM-SPECIES-000468",
  "BM-SPECIES-000473",
  "BM-SPECIES-000479",
  "BM-SPECIES-000643",
  "BM-SPECIES-000662",
  "BM-SPECIES-000684",
  "BM-SPECIES-000792",
  "BM-SPECIES-000833",
  "BM-SPECIES-000839",
  "BM-SPECIES-000842",
  "BM-SPECIES-000900",
  "BM-SPECIES-000958",
  "BM-SPECIES-001188",
]);

const DO_NOT_MAP_IDS = new Set([
  "BM-SPECIES-000090",
  "BM-SPECIES-000114",
  "BM-SPECIES-000150",
  "BM-SPECIES-000193",
  "BM-SPECIES-000317",
  "BM-SPECIES-000444",
  "BM-SPECIES-000470",
  "BM-SPECIES-000495",
  "BM-SPECIES-001056",
  "BM-SPECIES-001161",
]);

const ALIAS_AMBIGUITY_DECISIONS = {
  "BM-SPECIES-000019": "REJECT_ALIAS",
  "BM-SPECIES-000122": "REJECT_ALIAS",
  "BM-SPECIES-000279": "AMBIGUOUS_ALIAS",
  "BM-SPECIES-000408": "REJECT_ALIAS",
};

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const sha256 = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const countBy = (rows, key) => Object.fromEntries([...new Set(rows.map((row) => row[key]))].sort().map((value) => [value, rows.filter((row) => row[key] === value).length]));

function sourceMetadata() {
  return Object.fromEntries(Object.entries(INPUTS).map(([key, artifact]) => [key, { artifact, sha256: sha256(artifact) }]));
}

function aggregateRationale(decision) {
  if (decision === "AGGREGATED_TAXON") {
    return "The source name denotes a group or broader common-name bucket. It is retained as a non-species label and cannot be promoted to one canonical species.";
  }
  return "The source name does not establish a one-to-one identity with the queued canonical species. The candidate mapping is rejected without fuzzy remapping.";
}

function buildAggregateArtifact(exceptions, aliasRegistry, inventoryById, sources) {
  const ids = exceptions.categoryGroups.AGGREGATE_ALIAS;
  const rows = ids.map((speciesId) => {
    const queueEntry = exceptions.exceptions.find((entry) => entry.speciesId === speciesId);
    const candidates = aliasRegistry
      .filter((entry) => entry.internalId === speciesId && entry.aliasType === "aggregate_name" && entry.status === "manual_review")
      .map((entry) => ({
        sourceName: entry.sourceName,
        priorAliasType: entry.aliasType,
        priorConfidence: entry.confidence,
        candidateCanonicalName: entry.canonicalName,
        candidateScientificName: entry.scientificName,
      }));
    const decision = AGGREGATED_TAXON_IDS.has(speciesId) ? "AGGREGATED_TAXON" : "DO_NOT_MAP";
    if (!AGGREGATED_TAXON_IDS.has(speciesId) && !DO_NOT_MAP_IDS.has(speciesId)) throw new Error(`Unclassified aggregate exception: ${speciesId}`);
    return {
      speciesId,
      canonicalKoreanName: inventoryById.get(speciesId)?.koreanName ?? queueEntry.koreanName,
      candidates,
      decision,
      resolutionStatus: "RESOLVED",
      rationale: aggregateRationale(decision),
      evidence: [
        { artifact: INPUTS.aliasRegistry, role: "PRESERVED_SOURCE_CANDIDATE_AND_PRIOR_REVIEW" },
        { artifact: INPUTS.inventory, role: "FROZEN_CANONICAL_IDENTITY" },
      ],
      limitations: ["No candidate is added as a production alias.", "No canonical ID, name, or scientific identity is changed."],
    };
  });
  return {
    schemaVersion: 1,
    program: PROGRAM,
    batchId: "BATCH_A_AGGREGATE_ALIAS",
    generatedOn: GENERATED_ON,
    sourceQueue: sources.exceptions,
    total: rows.length,
    allowedDecisions: ["AGGREGATED_TAXON", "SAFE_ALIAS", "DO_NOT_MAP", "RESEARCH_REQUIRED"],
    counts: {
      AGGREGATED_TAXON: rows.filter((row) => row.decision === "AGGREGATED_TAXON").length,
      SAFE_ALIAS: 0,
      DO_NOT_MAP: rows.filter((row) => row.decision === "DO_NOT_MAP").length,
      RESEARCH_REQUIRED: 0,
    },
    rows,
    policy: {
      aggregateToSingleSpeciesPromotion: false,
      fuzzyMapping: false,
      existingCanonicalIdMutation: false,
      terminalDecisions: ["AGGREGATED_TAXON", "DO_NOT_MAP"],
    },
    invariants: INVARIANTS,
  };
}

function evidenceForAlias(speciesId, aliasRegistry, reviewBatch2) {
  const namesById = {
    "BM-SPECIES-000019": ["쏨뱅이 독가시"],
    "BM-SPECIES-000122": ["쥐치포용 쥐치"],
    "BM-SPECIES-000279": ["점벵에돔", "흑벵에돔"],
    "BM-SPECIES-000408": ["대삼치"],
  };
  const names = namesById[speciesId];
  const registryEvidence = aliasRegistry
    .filter((entry) => entry.internalId === speciesId && names.includes(entry.sourceName))
    .map((entry) => ({
      sourceName: entry.sourceName,
      authority: "MBRIS_SOURCE_REVIEW",
      artifact: INPUTS.aliasRegistry,
      evidence: entry.evidence,
    }));
  const publicEvidence = reviewBatch2
    .filter((entry) => names.includes(entry.sourceName))
    .flatMap((entry) => entry.officialEvidence.map((evidence) => ({ sourceName: entry.sourceName, ...evidence })));
  return { names, registryEvidence, publicEvidence };
}

function buildAmbiguityArtifact(exceptions, aliasRegistry, reviewBatch2, inventoryById, sources) {
  const ids = exceptions.categoryGroups.ALIAS_AMBIGUITY;
  const rows = ids.map((speciesId) => {
    const decision = ALIAS_AMBIGUITY_DECISIONS[speciesId];
    const evidence = evidenceForAlias(speciesId, aliasRegistry, reviewBatch2);
    const isAmbiguous = decision === "AMBIGUOUS_ALIAS";
    return {
      speciesId,
      canonicalKoreanName: inventoryById.get(speciesId)?.koreanName ?? null,
      aliasCandidates: evidence.names,
      decision,
      resolutionStatus: isAmbiguous ? "REMAINS_OPEN" : "RESOLVED",
      evidence: [...evidence.registryEvidence, ...evidence.publicEvidence],
      rationale: isAmbiguous
        ? "Public and institutional checks do not establish a one-to-one identity with Girella punctata; the two colloquial labels remain ambiguous."
        : "The source label contains descriptive or warning text and is not an authoritative one-to-one species alias.",
      limitations: isAmbiguous
        ? ["Absence from checked sources is not proof of synonymy or rejection.", "Manual authoritative nomenclature evidence is still required."]
        : ["The rejected source label is preserved for audit history.", "The label is not shortened or rewritten into a production alias."],
    };
  });
  return {
    schemaVersion: 1,
    program: PROGRAM,
    batchId: "BATCH_B_ALIAS_AMBIGUITY",
    generatedOn: GENERATED_ON,
    sourceQueue: sources.exceptions,
    total: rows.length,
    allowedDecisions: ["SAFE_ALIAS", "AMBIGUOUS_ALIAS", "REJECT_ALIAS"],
    counts: {
      SAFE_ALIAS: 0,
      AMBIGUOUS_ALIAS: rows.filter((row) => row.decision === "AMBIGUOUS_ALIAS").length,
      REJECT_ALIAS: rows.filter((row) => row.decision === "REJECT_ALIAS").length,
    },
    rows,
    policy: { officialOrPublicEvidenceRequired: true, oneToOneIdentityRequiredForSafeAlias: true, fuzzyMapping: false },
    invariants: INVARIANTS,
  };
}

function buildStructuralArtifact(exceptions, crosswalk, conditionProfiles, sources) {
  const profileById = new Map(conditionProfiles.profiles.map((profile) => [profile.speciesId, profile]));
  const nifsCrosswalk = new Map(crosswalk.map((entry) => [entry.nifsSourceId, entry]));
  const rows = [
    {
      exceptionId: "07e1852e-0675-4090-8675-cd216fb90ba9",
      type: "TAXONOMY_CONFLICT",
      decision: "KEEP_EXCEPTION",
      resolutionStatus: "REMAINS_OPEN",
      evidence: nifsCrosswalk.get("fish_1575873437839").evidence,
      rationale: "Authoritative sources distinguish Haliotis diversicolor and Haliotis supertexta. The NIFS Korean/scientific identity conflict cannot be repaired without a corrected authoritative source identity.",
      limitation: "NIFS and MBRIS records remain unjoined; no canonical ID or accepted name is changed.",
    },
    {
      exceptionId: "70cb8d81-26a1-4d8b-b000-2b2f2676c345",
      type: "ACCEPTED_NAME_PARTIAL",
      decision: "RESOLVED_WITH_LIMITATION",
      resolutionStatus: "RESOLVED",
      evidence: nifsCrosswalk.get("fish_1575880014320").evidence,
      rationale: "The preserved high-confidence crosswalk establishes that the Korean/Japanese population formerly misapplied as Turbo cornutus is accepted as Turbo sazae.",
      limitation: "Research resolution does not rewrite the frozen canonical row; production promotion requires a separate apply review.",
    },
    {
      exceptionId: "CROSS-SYSTEM:우럭",
      type: "CROSS_DOMAIN_HOMONYM",
      decision: "RESOLVED_WITH_LIMITATION",
      resolutionStatus: "RESOLVED",
      evidence: [{ artifact: "src/lib/fishing-condition/fishing-spot-integration.ts", role: "EXISTING_DOMAIN_SCOPED_RUNTIME_MAPPING" }],
      rationale: "The Fishing Spot label remains scoped to 조피볼락 and must not merge with the non-fish MBRIS homonym Mya arenaria.",
      limitation: "The homonym guard remains permanent and no cross-domain merge is allowed.",
    },
    ...["BM-SPECIES-003107", "BM-SPECIES-003111"].map((speciesId) => {
      const profile = profileById.get(speciesId);
      return {
        exceptionId: `CONDITION:${speciesId}`,
        type: "CONDITION_ID_MISMATCH_OR_OUTSIDE_BASELINE",
        decision: "RESOLVED_WITH_LIMITATION",
        resolutionStatus: "RESOLVED",
        evidence: [{ artifact: INPUTS.conditionProfiles, speciesId, koreanName: profile.koreanName, scientificName: profile.scientificName }],
        rationale: "The condition-enabled MBRIS internal ID is a protected domain identifier outside the enumerated Fish 1,258 baseline, not a missing member of that inventory.",
        limitation: "The condition ID remains unchanged and is not merged into or renumbered against the Fish baseline.",
      };
    }),
  ];
  const expected = new Set([
    ...exceptions.categoryGroups.TAXONOMY_CONFLICT,
    ...exceptions.categoryGroups.ACCEPTED_NAME_PARTIAL,
    ...exceptions.categoryGroups.CROSS_DOMAIN_HOMONYM,
    ...exceptions.categoryGroups.CONDITION_ID_MISMATCH_OR_OUTSIDE_BASELINE,
  ]);
  if (rows.length !== expected.size || rows.some((row) => !expected.has(row.exceptionId))) throw new Error("Structural exception set mismatch");
  return {
    schemaVersion: 1,
    program: PROGRAM,
    batchId: "BATCH_C_STRUCTURAL_EXCEPTIONS",
    generatedOn: GENERATED_ON,
    sourceQueue: sources.exceptions,
    total: rows.length,
    allowedDecisions: ["RESOLVED", "RESOLVED_WITH_LIMITATION", "KEEP_EXCEPTION"],
    counts: {
      RESOLVED: rows.filter((row) => row.decision === "RESOLVED").length,
      RESOLVED_WITH_LIMITATION: rows.filter((row) => row.decision === "RESOLVED_WITH_LIMITATION").length,
      KEEP_EXCEPTION: rows.filter((row) => row.decision === "KEEP_EXCEPTION").length,
    },
    rows,
    policy: { canonicalIdMutation: false, conditionIdProtection: true, crossDomainMerge: false, authoritativeTaxonomyOnly: true },
    invariants: INVARIANTS,
  };
}

function collisionGroups(rows, selector) {
  const groups = new Map();
  for (const row of rows) {
    for (const value of selector(row)) {
      if (!value) continue;
      const normalized = value.trim().toLocaleLowerCase("en-US");
      if (!groups.has(normalized)) groups.set(normalized, []);
      groups.get(normalized).push(row.speciesId);
    }
  }
  return [...groups.entries()].filter(([, ids]) => new Set(ids).size > 1).map(([value, ids]) => ({ value, speciesIds: [...new Set(ids)].sort() })).sort((a, b) => a.value.localeCompare(b.value));
}

function buildSummary(inventory, completion, exceptions, aggregate, ambiguity, structural, sources) {
  const remaining = [
    ...ambiguity.rows.filter((row) => row.resolutionStatus === "REMAINS_OPEN").map((row) => row.speciesId),
    ...structural.rows.filter((row) => row.resolutionStatus === "REMAINS_OPEN").map((row) => row.exceptionId),
  ].sort();
  const resolved = exceptions.exceptionCount - remaining.length;
  const identityCounts = countBy(inventory.species, "identityStatus");
  return {
    schemaVersion: 1,
    program: PROGRAM,
    generatedOn: GENERATED_ON,
    decision: remaining.length === 0 ? "EXCEPTION_RESOLUTION_COMPLETE" : "EXCEPTION_RESOLUTION_COMPLETE_WITH_REMAINDERS",
    batches: {
      aggregateAlias: { total: aggregate.total, counts: aggregate.counts },
      aliasAmbiguity: { total: ambiguity.total, counts: ambiguity.counts },
      structural: { total: structural.total, counts: structural.counts },
    },
    exceptions: {
      before: exceptions.exceptionCount,
      resolved,
      remaining: remaining.length,
      remainingIds: remaining,
      historyPreserved: true,
      sourceQueueMutated: false,
    },
    canonical: {
      total: inventory.total,
      uniqueIds: new Set(inventory.species.map((row) => row.speciesId)).size,
      verified: identityCounts.VERIFIED ?? 0,
      partial: identityCounts.PARTIAL ?? 0,
      conflict: identityCounts.CONFLICT ?? 0,
      unresolved: identityCounts.UNRESOLVED ?? 0,
      sourceCoverage: inventory.species.filter((row) => row.sourceRefs.length > 0).length,
      identityStatusMutated: false,
    },
    collisions: {
      scientificName: collisionGroups(inventory.species, (row) => [row.acceptedScientificName]),
      koreanName: collisionGroups(inventory.species, (row) => [row.koreanName]),
      synonym: collisionGroups(inventory.species, (row) => row.synonyms ?? []),
    },
    priorCompletionDecision: completion.decision,
    sources,
    invariants: INVARIANTS,
  };
}

export function buildArtifacts() {
  const inventory = readJson(INPUTS.inventory);
  const completion = readJson(INPUTS.completion);
  const exceptions = readJson(INPUTS.exceptions);
  const aliasRegistry = readJson(INPUTS.aliasRegistry);
  const aliasReviewBatch2 = readJson(INPUTS.aliasReviewBatch2);
  const crosswalk = readJson(INPUTS.taxonomyCrosswalk);
  const conditionProfiles = readJson(INPUTS.conditionProfiles);
  const inventoryById = new Map(inventory.species.map((row) => [row.speciesId, row]));
  const sources = sourceMetadata();
  const aggregate = buildAggregateArtifact(exceptions, aliasRegistry, inventoryById, sources);
  const ambiguity = buildAmbiguityArtifact(exceptions, aliasRegistry, aliasReviewBatch2, inventoryById, sources);
  const structural = buildStructuralArtifact(exceptions, crosswalk, conditionProfiles, sources);
  const summary = buildSummary(inventory, completion, exceptions, aggregate, ambiguity, structural, sources);
  return { aggregate, ambiguity, structural, summary };
}

function main() {
  const artifacts = buildArtifacts();
  const pairs = [
    [OUTPUTS.aggregate, artifacts.aggregate],
    [OUTPUTS.ambiguity, artifacts.ambiguity],
    [OUTPUTS.structural, artifacts.structural],
    [OUTPUTS.summary, artifacts.summary],
  ];
  if (process.argv.includes("--check")) {
    for (const [relativePath, value] of pairs) {
      if (!fs.existsSync(path.join(root, relativePath)) || fs.readFileSync(path.join(root, relativePath), "utf8") !== serialize(value)) {
        throw new Error(`Artifact is not deterministic: ${relativePath}`);
      }
    }
    console.log("fish canonical exception resolution artifacts are deterministic");
    return;
  }
  for (const [relativePath, value] of pairs) fs.writeFileSync(path.join(root, relativePath), serialize(value));
  console.log(`wrote ${pairs.length} exception resolution artifacts`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

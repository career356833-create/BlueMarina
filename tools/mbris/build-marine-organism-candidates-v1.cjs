const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const normalizedPath = path.join(root, "data", "mbris", "normalized", "blue-marina-nonfish-candidates.json");
const legacySubsetJsonPath = path.join(root, "data", "mbris", "normalized", "nonfish-marine-candidates.json");
const legacySubsetCsvPath = path.join(root, "data", "mbris", "normalized", "nonfish-marine-candidates.csv");
const stale145Path = path.join(root, "reports", "mbris", "mbris-nonfish-marine-organisms-v1.json");
const outputDir = path.join(root, "reports", "mbris");

const generatedAt = new Date().toISOString();
const sourceRows = JSON.parse(fs.readFileSync(normalizedPath, "utf8"));
const legacySubset = JSON.parse(fs.readFileSync(legacySubsetJsonPath, "utf8"));
const stale145 = JSON.parse(fs.readFileSync(stale145Path, "utf8"));

if (!Array.isArray(sourceRows) || sourceRows.length !== 3167) throw new Error("MARINE_SOURCE_COUNT_INVALID");
if (!Array.isArray(legacySubset) || legacySubset.length !== 2933) throw new Error("LEGACY_SUBSET_COUNT_INVALID");
if (!Array.isArray(stale145.records) || stale145.records.length !== 145) throw new Error("SCOPE_145_COUNT_INVALID");

const duplicateCountMap = new Map();
for (const row of sourceRows) {
  duplicateCountMap.set(row.scientificNameCanonical, (duplicateCountMap.get(row.scientificNameCanonical) || 0) + 1);
}

function proposedMarineClass(row) {
  const phylum = String(row.taxonomy?.phylum || "").toLowerCase();
  const taxonomyClass = String(row.taxonomy?.class || "").toLowerCase();
  if (taxonomyClass.includes("teleost") || taxonomyClass.includes("petromyz")) return "FISH_WRONG_SCOPE";
  if (phylum.includes("arthropoda") && taxonomyClass.includes("malacostraca")) return "CRUSTACEAN";
  if (taxonomyClass.includes("cephalopoda")) return "CEPHALOPOD";
  if (taxonomyClass.includes("gastropoda")) return "GASTROPOD";
  if (taxonomyClass.includes("bivalvia")) return "BIVALVE";
  if (phylum.includes("mollusca")) return "OTHER_MOLLUSK";
  if (phylum.includes("echinodermata")) return "ECHINODERM";
  if (phylum.includes("cnidaria")) return "CNIDARIAN";
  if (row.taxonomy?.kingdom === "무척추동물") return "OTHER_MARINE_INVERTEBRATE";
  if (row.taxonomy?.kingdom === "척추동물") return "OTHER_MARINE_ANIMAL";
  return "TAXONOMY_REVIEW_REQUIRED";
}

function taxonomyReviewReasons(row) {
  const reasons = [];
  if (row.scientificNameParsing?.isUncertain) reasons.push(row.scientificNameParsing.uncertaintyType || "SCIENTIFIC_NAME_UNCERTAIN");
  if (row.scientificNameParsing?.isSpeciesComplex) reasons.push("SPECIES_COMPLEX");
  if (!row.taxonomy?.genus) reasons.push("TAXONOMY_GENUS_MISSING");
  if ((duplicateCountMap.get(row.scientificNameCanonical) || 0) > 1) reasons.push("SCIENTIFIC_IDENTITY_DUPLICATE");
  return [...new Set(reasons)];
}

function reviewReasons(row) {
  return [...new Set([
    ...(!row.koreanName ? ["KOREAN_NAME_MISSING"] : []),
    ...taxonomyReviewReasons(row),
  ])];
}

function classification(row) {
  if (row.sourceSheet === "육상담수종") return "FRESHWATER_OR_TERRESTRIAL";
  const proposed = proposedMarineClass(row);
  if (proposed === "FISH_WRONG_SCOPE") return proposed;
  if (proposed === "TAXONOMY_REVIEW_REQUIRED" || taxonomyReviewReasons(row).length > 0) return "TAXONOMY_REVIEW_REQUIRED";
  return proposed;
}

function readiness(finalClass, row) {
  if (finalClass === "FRESHWATER_OR_TERRESTRIAL" || finalClass === "FISH_WRONG_SCOPE") return "OUT_OF_SCOPE";
  if (finalClass === "TAXONOMY_REVIEW_REQUIRED" || !row.koreanName) return "MARINE_ORGANISM_REVIEW";
  return "MARINE_ORGANISM_READY";
}

function identityConfidence(row, finalReadiness) {
  let score = 1;
  if (!row.koreanName) score -= 0.05;
  if (row.scientificNameParsing?.isUncertain) score -= 0.2;
  if (row.scientificNameParsing?.isSpeciesComplex) score -= 0.2;
  if (!row.taxonomy?.genus) score -= 0.15;
  if ((duplicateCountMap.get(row.scientificNameCanonical) || 0) > 1) score -= 0.1;
  if (finalReadiness === "OUT_OF_SCOPE") score = Math.min(score, 0.9);
  return Number(Math.max(0, score).toFixed(2));
}

function productRelevance(proposed, finalReadiness) {
  const inMarineTrack = finalReadiness !== "OUT_OF_SCOPE";
  return {
    seafoodEncyclopedia: inMarineTrack ? "REVIEW_REQUIRED" : "NO",
    fishingTarget: inMarineTrack ? "REVIEW_REQUIRED" : "NO",
    baitSpecies: inMarineTrack ? "REVIEW_REQUIRED" : "NO",
    shellfish: ["GASTROPOD", "BIVALVE", "OTHER_MOLLUSK"].includes(proposed) ? "CATEGORY_CANDIDATE" : "NO",
    crustacean: proposed === "CRUSTACEAN" ? "CATEGORY_CANDIDATE" : "NO",
    cephalopod: proposed === "CEPHALOPOD" ? "CATEGORY_CANDIDATE" : "NO",
    marineBiodiversityReference: inMarineTrack,
  };
}

const records = sourceRows.map((row) => {
  const proposed = proposedMarineClass(row);
  const finalClass = classification(row);
  const finalReadiness = readiness(finalClass, row);
  return {
    sourceId: `${row.sourceProvider}:${row.sourceSheet}:${row.sourceRow}`,
    internalId: row.internalId,
    koreanName: row.koreanName,
    scientificName: row.scientificNameCanonical,
    scientificNameRaw: row.scientificNameRaw,
    taxonomy: row.taxonomy,
    marineClass: finalClass,
    proposedMarineClass: proposed,
    sourceProvenance: {
      sourceProvider: row.sourceProvider,
      sourceSheet: row.sourceSheet,
      sourceRow: row.sourceRow,
      sourceHash: row.sourceHash,
      holdingInstitutions: row.holdingInstitutions,
    },
    productRelevance: productRelevance(proposed, finalReadiness),
    identityConfidence: identityConfidence(row, finalReadiness),
    readiness: finalReadiness,
    reviewReasons: finalClass === "FRESHWATER_OR_TERRESTRIAL" ? ["NON_MARINE_SOURCE_SCOPE"] : reviewReasons(row),
  };
});

const classes = [
  "CRUSTACEAN", "CEPHALOPOD", "GASTROPOD", "BIVALVE", "OTHER_MOLLUSK", "ECHINODERM",
  "CNIDARIAN", "OTHER_MARINE_INVERTEBRATE", "OTHER_MARINE_ANIMAL", "FISH_WRONG_SCOPE",
  "FRESHWATER_OR_TERRESTRIAL", "TAXONOMY_REVIEW_REQUIRED",
];
const classificationCounts = Object.fromEntries(classes.map((name) => [name, records.filter((row) => row.marineClass === name).length]));
const readinessCounts = Object.fromEntries(
  ["MARINE_ORGANISM_READY", "MARINE_ORGANISM_REVIEW", "OUT_OF_SCOPE"].map((name) => [name, records.filter((row) => row.readiness === name).length]),
);

const sourceKey = (row) => `${row.sourceSheet}:${row.sourceRow}`;
const fullSourceKeys = new Set(sourceRows.map(sourceKey));
const legacySourceKeys = new Set(legacySubset.map(sourceKey));
if (legacySourceKeys.size !== legacySubset.length || !legacySubset.every((row) => fullSourceKeys.has(sourceKey(row)))) {
  throw new Error("LEGACY_SUBSET_IDENTITY_MISMATCH");
}
const extensionRows = sourceRows.filter((row) => !legacySourceKeys.has(sourceKey(row)));

const coverage = {
  sourceIdentity: records.filter((row) => row.sourceId && row.internalId).length,
  scientificName: records.filter((row) => row.scientificName).length,
  koreanName: records.filter((row) => row.koreanName).length,
  taxonomyObject: records.filter((row) => row.taxonomy?.phylum && row.taxonomy?.class).length,
  completeTaxonomyHierarchy: records.filter((row) => row.taxonomy?.phylum && row.taxonomy?.class && row.taxonomy?.order && row.taxonomy?.family && row.taxonomy?.genus).length,
};

const candidateReport = {
  reportVersion: "v1",
  generatedAt,
  status: "MARINE_ORGANISM_CANDIDATE_EXTRACTION_COMPLETE",
  sourceFiles: [
    {path: "data/mbris/normalized/blue-marina-nonfish-candidates.json", role: "PRIMARY", records: sourceRows.length, bytes: fs.statSync(normalizedPath).size},
    {path: "data/mbris/normalized/nonfish-marine-candidates.json", role: "LEGACY_SUBSET", records: legacySubset.length, bytes: fs.statSync(legacySubsetJsonPath).size},
    {path: "data/mbris/normalized/nonfish-marine-candidates.csv", role: "LEGACY_SUBSET_CSV", records: legacySubset.length, bytes: fs.statSync(legacySubsetCsvPath).size},
  ],
  sourceComparison: {
    primaryRecords: sourceRows.length,
    legacySubsetRecords: legacySubset.length,
    extensionRecords: extensionRows.length,
    extensionTaxonomy: {ECHINODERM: extensionRows.filter((row) => row.organismGroup === "echinoderm").length},
    legacySubsetFullyContained: true,
  },
  coverage,
  classificationCounts,
  readinessCounts,
  records,
  databaseWrites: 0,
};

const reviewReport = {
  reportVersion: "v1",
  generatedAt,
  status: "MARINE_ORGANISM_REVIEW_QUEUE_READY",
  reviewCount: readinessCounts.MARINE_ORGANISM_REVIEW,
  outOfScopeCount: readinessCounts.OUT_OF_SCOPE,
  records: records.filter((row) => row.readiness !== "MARINE_ORGANISM_READY"),
  databaseWrites: 0,
};

const corrected145Records = stale145.records.map((row) => ({
  sourceId: row.mbrisSourceId,
  internalId: row.internalId,
  koreanName: row.koreanName,
  scientificName: row.scientificName,
  taxonomyClass: row.taxonomy?.class || null,
  sourceScope: String(row.mbrisSourceId || "").split(":")[1] || null,
  previousClassification: row.primaryClass,
  correctedClassification: "FRESHWATER_OR_NON_MARINE_FISH_SCOPE",
}));
const correctionReport = {
  reportVersion: "v1",
  generatedAt,
  sourceArtifact: "reports/mbris/mbris-nonfish-marine-organisms-v1.json",
  sourceArtifactOverwritten: false,
  status: "SCOPE_CLASSIFICATION_CORRECTED",
  recordCount: corrected145Records.length,
  taxonomyClassCounts: {
    Teleostei: corrected145Records.filter((row) => row.taxonomyClass === "Teleostei").length,
    Petromyzonti: corrected145Records.filter((row) => row.taxonomyClass === "Petromyzonti").length,
  },
  correctedScope: "FRESHWATER_OR_NON_MARINE_FISH_SCOPE",
  marineOrganismInputAllowed: false,
  records: corrected145Records,
  databaseWrites: 0,
};

function csvCell(value) {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}
const csvColumns = [
  "sourceId", "internalId", "koreanName", "scientificName", "marineClass", "proposedMarineClass",
  "readiness", "identityConfidence", "sourceProvider", "sourceSheet", "sourceRow", "phylum", "class",
  "order", "family", "genus", "reviewReasons", "productRelevance",
];
const csv = [csvColumns.map(csvCell).join(","), ...records.map((row) => csvColumns.map((column) => {
  if (column in row) return csvCell(row[column]);
  if (["sourceProvider", "sourceSheet", "sourceRow"].includes(column)) return csvCell(row.sourceProvenance[column]);
  if (["phylum", "class", "order", "family", "genus"].includes(column)) return csvCell(row.taxonomy[column]);
  return csvCell(null);
}).join(","))].join("\n") + "\n";

fs.writeFileSync(path.join(outputDir, "mbris-marine-organism-candidates-v1.json"), `${JSON.stringify(candidateReport, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "mbris-marine-organism-candidates-v1.csv"), csv);
fs.writeFileSync(path.join(outputDir, "mbris-marine-organism-review-v1.json"), `${JSON.stringify(reviewReport, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "mbris-scope-review-145-correction-v1.json"), `${JSON.stringify(correctionReport, null, 2)}\n`);

console.log(JSON.stringify({
  sourceRecords: sourceRows.length,
  coverage,
  classificationCounts,
  readinessCounts,
  correction145: correctionReport.taxonomyClassCounts,
  databaseWrites: 0,
}, null, 2));

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generatedOn = "2026-09-19";
const outputPath = "reports/fish-canonical/final-exception-closure-v1.json";

const inputs = {
  inventory: "data/fish-canonical/bulk/v1/canonical-inventory-v1.json",
  priorResolution: "reports/fish-canonical/exception-resolution-summary-v1.json",
  nifsObunjagi: "data/nifs/normalized/fish/fish_1575873437839.json",
  mbrisObunjagi: "data/mbris/normalized/detail/BM-SPECIES-002418.json",
  mbrisGirellaPunctata: "data/mbris/normalized/detail/BM-SPECIES-000279.json",
  taxonomyCrosswalk: "data/mbris/mappings/nifs-mbris-taxonomy-crosswalk.json",
  aliasReview: "data/mbris/mappings/fish-data-alias-review-batch2.json",
};

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const hash = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex").toUpperCase();
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

const inventory = readJson(inputs.inventory);
const priorResolution = readJson(inputs.priorResolution);
const nifsObunjagi = readJson(inputs.nifsObunjagi);
const mbrisObunjagi = readJson(inputs.mbrisObunjagi);
const mbrisGirellaPunctata = readJson(inputs.mbrisGirellaPunctata);
const taxonomyCrosswalk = readJson(inputs.taxonomyCrosswalk);
const aliasReview = readJson(inputs.aliasReview);

const obunjagiId = "07e1852e-0675-4090-8675-cd216fb90ba9";
const girellaId = "BM-SPECIES-000279";
const inventoryById = new Map(inventory.species.map((row) => [row.speciesId, row]));
const obunjagi = inventoryById.get(obunjagiId);
const girella = inventoryById.get(girellaId);
const crosswalk = taxonomyCrosswalk.find((row) => row.nifsSourceId === nifsObunjagi.sourceId);
const aliasCandidates = aliasReview.filter((row) => ["점벵에돔", "흑벵에돔"].includes(row.sourceName));

if (priorResolution.exceptions.remaining !== 2 || JSON.stringify(priorResolution.exceptions.remainingIds) !== JSON.stringify([obunjagiId, girellaId])) {
  throw new Error("The prior exception remainder is not the expected two-entry queue.");
}
if (!obunjagi || !girella || !crosswalk || aliasCandidates.length !== 2) throw new Error("Required final-closure inputs are incomplete.");
if (nifsObunjagi.koreanName !== "오분자기" || mbrisObunjagi.basic.koreanName !== "오분자기") throw new Error("Unexpected 오분자기 source identity.");
if (mbrisGirellaPunctata.basic.scientificNameShort !== "Girella punctata") throw new Error("Unexpected BM-SPECIES-000279 identity.");

const sourceMetadata = Object.fromEntries(Object.entries(inputs).map(([key, artifact]) => [key, { artifact, sha256: hash(artifact) }]));

const report = {
  schemaVersion: 1,
  program: "Fish Canonical Final Exception Closure V1",
  generatedOn,
  decision: "EXCEPTION_CLOSURE_COMPLETE_WITH_REMAINDERS",
  scope: {
    before: 2,
    resolved: 1,
    remaining: 1,
    remainingIds: [girellaId],
    exactExceptionIds: [obunjagiId, girellaId],
    priorHistoryPreserved: true,
  },
  cases: [
    {
      exceptionId: obunjagiId,
      koreanName: "오분자기",
      exceptionType: "TAXONOMY_CONFLICT",
      currentIdentity: {
        scientificName: obunjagi.scientificName,
        acceptedScientificName: obunjagi.acceptedScientificName,
        taxonomyStatus: obunjagi.taxonomyStatus,
        identityStatus: obunjagi.identityStatus,
        sourceSystem: obunjagi.sourceSystem,
      },
      competingAcceptedNames: [
        { scientificName: "Haliotis diversicolor", status: "ACCEPTED", associatedKoreanName: "마대오분자기" },
        { scientificName: "Haliotis supertexta", status: "ACCEPTED", associatedKoreanName: "오분자기" },
      ],
      authoritativeEvidence: [
        {
          authority: "NIFS",
          artifact: inputs.nifsObunjagi,
          sourceId: nifsObunjagi.sourceId,
          observedIdentity: { koreanName: nifsObunjagi.koreanName, scientificName: nifsObunjagi.scientificName },
          sourceDate: "2024 source history; normalized 2026-07-30",
          assessment: "The row preserves the conflicting Korean/scientific-name pair that opened this exception.",
        },
        {
          authority: "MBRIS",
          artifact: inputs.mbrisObunjagi,
          sourceId: mbrisObunjagi.sourceId,
          observedIdentity: { koreanName: mbrisObunjagi.basic.koreanName, scientificName: mbrisObunjagi.basic.scientificName },
          acceptedStatus: mbrisObunjagi.taxonomicStatus.nameType,
          sourceDate: mbrisObunjagi.source.collectedAt,
          assessment: "The current public-institution record treats Haliotis supertexta as the accepted identity for 오분자기.",
        },
        {
          authority: "WoRMS/MolluscaBase",
          title: "Haliotis diversicolor (AphiaID 445319)",
          url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=445319",
          accessedOn: generatedOn,
          taxonomyDate: "record modified 2012-03-03; API checked 2026-09-19",
          acceptedStatus: "ACCEPTED",
          assessment: "Sulculus diversicolor is a superseded combination of Haliotis diversicolor, not a synonym of Haliotis supertexta.",
        },
        {
          authority: "WoRMS/MolluscaBase",
          title: "Haliotis supertexta (AphiaID 445364)",
          url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=445364",
          accessedOn: generatedOn,
          taxonomyDate: "record modified 2022-01-27; API checked 2026-09-19",
          acceptedStatus: "ACCEPTED",
          assessment: "Haliotis supertexta is a separate accepted species.",
        },
        {
          authority: "NIBR",
          title: "K-BON 생물종 안내서 — 오분자기",
          url: "https://species.nibr.go.kr/nibr/assets/K-BON_GUIDE.pdf",
          accessedOn: generatedOn,
          taxonomyDate: "current guide checked 2026-09-19",
          acceptedStatus: "OFFICIAL KOREAN SPECIES GUIDE",
          assessment: "The guide identifies 오분자기 as Haliotis supertexta and distinguishes 마대오분자기.",
        },
        {
          authority: "GBIF Backbone Taxonomy",
          title: "Species matches for Haliotis diversicolor and Haliotis supertexta",
          url: "https://api.gbif.org/v1/species/match?name=Haliotis%20supertexta",
          accessedOn: generatedOn,
          taxonomyDate: "API checked 2026-09-19",
          acceptedStatus: "BOTH ACCEPTED AS DISTINCT SPECIES",
          assessment: "The backbone returns separate accepted species matches, consistent with WoRMS.",
        },
      ],
      synonymAssessment: {
        inputName: "Sulculus diversicolor",
        acceptedName: "Haliotis diversicolor",
        relationship: "SUPERSEDED_COMBINATION",
        synonymOfHaliotisSupertexta: false,
      },
      conflictOrigin: "The NIFS row pairs the Korean name 오분자기 with Sulculus diversicolor. Current MBRIS/NIBR Korean identity evidence assigns 오분자기 to Haliotis supertexta, while current WoRMS accepts Haliotis diversicolor as a separate species.",
      resolution: "RESOLVED_WITH_LIMITATION",
      resolutionMetadata: {
        researchAcceptedScientificName: "Haliotis supertexta",
        researchAcceptedKoreanName: "오분자기",
        displacedScientificIdentity: "Haliotis diversicolor",
        displacedIdentityKoreanName: "마대오분자기",
        canonicalApplyStatus: "NOT_APPLIED",
      },
      limitation: "The evidence resolves the research classification, but the frozen canonical row remains unchanged and therefore retains TAXONOMY_CONFLICT/CONFLICT until a separately authorized production apply review.",
    },
    {
      exceptionId: girellaId,
      koreanName: girella.koreanName,
      exceptionType: "ALIAS_AMBIGUITY",
      currentIdentity: {
        scientificName: girella.scientificName,
        acceptedScientificName: girella.acceptedScientificName,
        taxonomyStatus: girella.taxonomyStatus,
        identityStatus: girella.identityStatus,
        sourceSystem: girella.sourceSystem,
      },
      aliasCandidates: aliasCandidates.map((row) => ({
        alias: row.sourceName,
        priorNameType: row.nameType,
        priorConfidence: row.confidence,
        exactAuthoritativeSupportForGirellaPunctata: false,
        decision: "NOT_APPROVED",
        evidence: row.officialEvidence,
      })),
      authoritativeEvidence: [
        {
          authority: "MBRIS",
          artifact: inputs.mbrisGirellaPunctata,
          sourceId: mbrisGirellaPunctata.sourceId,
          observedIdentity: { koreanName: "벵에돔", scientificName: mbrisGirellaPunctata.basic.scientificName },
          acceptedStatus: mbrisGirellaPunctata.taxonomicStatus.nameType,
          sourceDate: mbrisGirellaPunctata.source.collectedAt,
        },
        {
          authority: "FishBase",
          title: "Common names of Girella punctata",
          url: "https://www.fishbase.se/ComNames/CommonNamesList.php?GenusName=Girella&ID=6537&SpeciesName=punctata&StockCode=6858",
          accessedOn: generatedOn,
          assessment: "The checked Korean-name list does not establish 점벵에돔 or 흑벵에돔 as a name of Girella punctata.",
        },
        {
          authority: "NIFS",
          title: "긴꼬리벵에돔 species record",
          url: "https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10405",
          accessedOn: generatedOn,
          observedIdentity: { koreanName: "긴꼬리벵에돔", scientificName: "Girella leonina" },
          assessment: "An authoritative source distinguishes another Korean 벵에돔 name as a separate species, increasing the risk of accepting an unsupported colloquial alias.",
        },
        {
          authority: "MBRIS",
          title: "긴꼬리벵에돔 species record",
          url: "https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000007130",
          accessedOn: generatedOn,
          observedIdentity: { koreanName: "긴꼬리벵에돔", scientificName: "Girella leonina" },
          assessment: "The separate public-institution identity confirms that 벵에돔-family common names cannot be collapsed without exact one-to-one evidence.",
        },
      ],
      relationship: {
        betweenCandidateAliases: "UNESTABLISHED",
        toGirellaPunctata: "UNESTABLISHED",
        regionalNameStatus: "UNPROVEN",
        commercialCommonNameStatus: "POSSIBLE_BUT_UNPROVEN",
        separateSpeciesRisk: true,
      },
      aliasSafety: "NOT_SAFE",
      safeAliasGate: {
        oneToOneSpeciesIdentity: false,
        authoritativeSynonymOrCommonNameSupport: false,
        noOtherSpeciesConflict: false,
        passed: false,
      },
      resolution: "KEEP_EXCEPTION",
      limitation: "Authoritative records support 벵에돔 = Girella punctata and separately 긴꼬리벵에돔 = Girella leonina, but do not establish either candidate alias as a unique name for Girella punctata. Absence from the checked sources does not prove a final alternative identity.",
    },
  ],
  canonical: {
    total: inventory.total,
    uniqueIds: new Set(inventory.species.map((row) => row.speciesId)).size,
    verified: inventory.species.filter((row) => row.identityStatus === "VERIFIED").length,
    partial: inventory.species.filter((row) => row.identityStatus === "PARTIAL").length,
    conflict: inventory.species.filter((row) => row.identityStatus === "CONFLICT").length,
    unresolved: inventory.species.filter((row) => row.identityStatus === "UNRESOLVED").length,
    sourceCoverage: inventory.species.filter((row) => row.sourceRefs.length > 0).length,
    collisions: priorResolution.collisions,
    identityStatusMutated: false,
  },
  sources: sourceMetadata,
  invariants: {
    idMutation: 0,
    newId: 0,
    idMerge: 0,
    idDelete: 0,
    productionMutation: 0,
    runtimeMutation: 0,
    databaseWrite: 0,
    supabaseWrite: 0,
  },
};

const output = serialize(report);
const absoluteOutput = path.join(root, outputPath);
if (process.argv.includes("--check")) {
  if (!fs.existsSync(absoluteOutput) || fs.readFileSync(absoluteOutput, "utf8") !== output) {
    console.error(`${outputPath} is not deterministic or is out of date.`);
    process.exit(1);
  }
  console.log(`${outputPath} is deterministic and current.`);
} else {
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, output);
  console.log(`Wrote ${outputPath}`);
}

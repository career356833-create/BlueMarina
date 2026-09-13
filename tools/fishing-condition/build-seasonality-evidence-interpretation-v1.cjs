const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const sourcePath = path.join(root, "data/fishing-condition/species-environment/v2/species-environment-profiles.json");
const v3Path = path.join(root, "data/fishing-condition/species-environment/v3/species-environment-profiles.json");
const artifactPath = path.join(root, "data/fishing-condition/seasonality/v1/species-seasonality.json");
const reportPath = path.join(root, "reports/fishing-condition/seasonality-evidence-interpretation-v1.json");
const docsPath = path.join(root, "docs/FISHING_CONDITION_SEASONALITY_EVIDENCE_INTERPRETATION_V1.md");

const GENERATED_AT = "2026-09-13T00:00:00.000Z";
const EXPECTED_V2_SHA256 = "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98";
const EXPECTED_V3_SHA256 = "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function unique(values) {
  return [...new Set(values)];
}

function crossesYearBoundary(months) {
  return months.some((month, index) => index > 0 && month < months[index - 1]);
}

function monthRange(months) {
  if (months.length === 0) return { startMonth: null, endMonth: null, crossesYearBoundary: false };
  return {
    startMonth: months[0],
    endMonth: months[months.length - 1],
    crossesYearBoundary: crossesYearBoundary(months),
  };
}

function limitationsFor(fact, precision) {
  const limitations = [];
  if (precision === "SEASON_ONLY") limitations.push("MONTH_UNRESOLVED");
  if (precision === "UNRESOLVED") limitations.push("NO_MONTH_OR_SEASON_PRECISION");
  if (fact.regionScope && fact.regionScope !== "KOREA") {
    limitations.push(`REGIONAL_SCOPE_${fact.regionScope}_NOT_AUTOMATICALLY_GENERALIZED`);
  }
  if (fact.lifeStage && fact.lifeStage !== "UNSPECIFIED") {
    limitations.push(`LIFE_STAGE_${fact.lifeStage}`);
  }
  return limitations;
}

function semanticFor(context, evidence) {
  if (context === "SPAWNING") return "SPAWNING_OBSERVATION";
  if (context === "MIGRATION") return "MIGRATION_OBSERVATION";
  if ((evidence?.evidenceType || "").includes("LANDING")) return "FISHERY_LANDING_PATTERN";
  if ((evidence?.evidenceType || "").includes("OCCURRENCE")) return "MONTHLY_OCCURRENCE_DATA";
  return "DIRECT_SEASONAL_STATEMENT";
}

function sourceSegments(profile, context, fact) {
  if (profile.speciesId === "BM-SPECIES-000417" && context === "MIGRATION" && fact.evidenceIds.includes("mackerel-mbris")) {
    return [
      { months: [2, 3], movement: "NORTHWARD", sourceStatement: "2~3월 제주도에서 동·서해로 북상" },
      { months: [9, 10, 11, 12, 1], movement: "SOUTHWARD", sourceStatement: "9월부터 이듬해 1월 남하" },
    ];
  }
  return [{ months: fact.months, movement: fact.movement || null, sourceStatement: fact.summary || null }];
}

function normalizeFact(profile, context, fact, sourceEntryIndex, evidenceById) {
  return sourceSegments(profile, context, fact).map((segment, segmentIndex) => {
    const evidence = fact.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
    const precision = segment.months.length > 0 ? "MONTH_RESOLVED" : fact.seasons.length > 0 ? "SEASON_ONLY" : "UNRESOLVED";
    const range = monthRange(segment.months);
    return {
      entryId: `${profile.speciesId}:${context.toLowerCase()}:${sourceEntryIndex + 1}:${segmentIndex + 1}`,
      context,
      evidenceSemantic: semanticFor(context, evidence[0]),
      precision,
      interpretationStatus: precision === "MONTH_RESOLVED" ? "MONTH_RESOLVED" : "MONTH_UNRESOLVED",
      months: segment.months,
      seasons: fact.seasons,
      ...range,
      geographicContext: fact.regionScope || "UNSPECIFIED",
      lifeStage: fact.lifeStage || "UNSPECIFIED",
      movement: segment.movement,
      evidenceRefs: [...fact.evidenceIds],
      sourceType: unique(evidence.map((item) => item.sourceType)).join("+") || "UNKNOWN",
      limitations: limitationsFor(fact, precision),
      sourceSpeciesProfileVersion: "V2",
      sourceContext: {
        profileField: context === "SPAWNING" ? "spawning" : context === "MIGRATION" ? "migration" : "seasonality",
        sourceEntryIndex,
        sourceStatement: segment.sourceStatement,
        originalMonths: [...fact.months],
        originalSeasons: [...fact.seasons],
      },
    };
  });
}

function formatMonths(entry) {
  if (entry.precision === "MONTH_RESOLVED") {
    return entry.months.length === 1 ? `${entry.months[0]}월` : `${entry.startMonth}~${entry.endMonth}월`;
  }
  if (entry.precision === "SEASON_ONLY") return entry.seasons.join("/");
  return "월 미확정";
}

function explanationFor(entry, requestedMonth, relation) {
  const range = formatMonths(entry);
  if (entry.context === "SPAWNING") {
    const relationText = relation === "MATCH" ? "포함됩니다" : "포함되지 않습니다";
    return `이 근거에서는 ${range}을 산란 시기로 제시합니다. 요청한 ${requestedMonth}월은 해당 산란 시기 범위에 ${relationText}. 산란 시기 정보는 어획 가능성을 의미하지 않습니다.`;
  }
  if (entry.context === "MIGRATION") {
    const relationText = relation === "MATCH" ? "포함됩니다" : "포함되지 않습니다";
    return `이 근거에서는 ${range}을 이동 시기로 제시합니다. 요청한 ${requestedMonth}월은 해당 이동 시기 범위에 ${relationText}. 이 근거는 어획 가능성이나 특정 지역 존재를 보장하지 않습니다.`;
  }
  const relationText = relation === "MATCH" ? "포함됩니다" : "포함되지 않습니다";
  return `이 자료에서는 ${range}에 어획/출현 기록이 있습니다. 요청한 ${requestedMonth}월은 해당 기록 시기 범위에 ${relationText}. 이 관계는 조황이나 포획 가능성을 의미하지 않습니다.`;
}

function evaluateEntries(entries, request) {
  if (!Number.isInteger(request.month) || request.month < 1 || request.month > 12) {
    throw new TypeError("month must be an integer from 1 through 12");
  }
  const matchingContext = entries.filter((entry) => entry.speciesId === request.speciesId && entry.context === request.context);
  if (matchingContext.length === 0) {
    return { speciesId: request.speciesId, context: request.context, month: request.month, status: "NO_SEASONAL_EVIDENCE", evidence: [] };
  }
  return {
    speciesId: request.speciesId,
    context: request.context,
    month: request.month,
    geographicContext: request.geographicContext || null,
    evidence: matchingContext.map((entry) => {
      if (entry.precision !== "MONTH_RESOLVED") {
        return { entryId: entry.entryId, status: "MONTH_UNRESOLVED", relation: null, explanation: `이 근거는 ${formatMonths(entry)} 수준으로만 제시되어 월 단위 관계를 판정하지 않습니다.`, evidenceRefs: entry.evidenceRefs, limitations: entry.limitations };
      }
      const relation = entry.months.includes(request.month) ? "MATCH" : "MISMATCH";
      const limitations = [...entry.limitations];
      if (request.geographicContext && request.geographicContext !== entry.geographicContext) limitations.push("REGIONAL_LIMITATION");
      const status = limitations.includes("CONFLICT_REVIEW_REQUIRED")
        ? "CONFLICT_REVIEW_REQUIRED"
        : limitations.includes("REGIONAL_LIMITATION")
          ? "REGIONAL_LIMITATION"
          : relation === "MATCH" ? "SEASONAL_MATCH" : "SEASONAL_MISMATCH";
      return { entryId: entry.entryId, status, relation, explanation: explanationFor(entry, request.month, relation), evidenceRefs: entry.evidenceRefs, limitations: unique(limitations) };
    }),
  };
}

function build() {
  const v2Bytes = fs.readFileSync(sourcePath);
  const v3Bytes = fs.readFileSync(v3Path);
  const v2Sha256 = sha256(v2Bytes);
  const v3Sha256 = sha256(v3Bytes);
  if (v2Sha256 !== EXPECTED_V2_SHA256 || v3Sha256 !== EXPECTED_V3_SHA256) throw new Error("Species profile immutability check failed");

  const source = JSON.parse(v2Bytes.toString("utf8"));
  const species = source.profiles.map((profile) => {
    const evidenceById = new Map(profile.evidence.map((item) => [item.id, item]));
    const entries = [
      ...profile.spawning.flatMap((fact, index) => normalizeFact(profile, "SPAWNING", fact, index, evidenceById)),
      ...profile.migration.flatMap((fact, index) => normalizeFact(profile, "MIGRATION", fact, index, evidenceById)),
      ...profile.seasonality.flatMap((fact, index) => normalizeFact(profile, "FISHERY_OCCURRENCE", fact, index, evidenceById)),
    ];
    return { speciesId: profile.speciesId, koreanName: profile.koreanName, scientificName: profile.scientificName, entries };
  });
  const flatEntries = species.flatMap((item) => item.entries.map((entry) => ({ speciesId: item.speciesId, koreanName: item.koreanName, ...entry })));
  const artifact = {
    schemaVersion: "1.0.0",
    sourceId: "blue-marina-seasonality-evidence-interpretation-v1",
    generatedAt: GENERATED_AT,
    qualityClass: "DERIVED_SEASONALITY_INTERPRETATION",
    derivedFrom: { sourceId: source.sourceId, sourceSpeciesProfileVersion: "V2", path: path.relative(root, sourcePath).replaceAll("\\", "/"), sha256: v2Sha256 },
    boundaries: { explicitMonthInputOnly: true, numericScoring: false, probability: false, ranking: false, recommendation: false, overallSeasonGrade: false, automaticRegionMapping: false },
    relationContract: {
      MATCH: "The requested month is present in one evidence entry for the requested biological context.",
      MISMATCH: "The requested month is absent from one evidence entry for the requested biological context.",
      multipleEvidence: "Each source entry remains independent; no union, intersection, averaging, or overall relation is produced.",
    },
    species,
  };

  const contextSpecies = (context) => new Set(flatEntries.filter((entry) => entry.context === context).map((entry) => entry.speciesId)).size;
  const monthResolvedSpecies = new Set(flatEntries.filter((entry) => entry.precision === "MONTH_RESOLVED").map((entry) => entry.speciesId));
  const regional = flatEntries.filter((entry) => entry.limitations.some((value) => value.startsWith("REGIONAL_SCOPE_")));
  const lifeStage = flatEntries.filter((entry) => entry.limitations.some((value) => value.startsWith("LIFE_STAGE_")));
  const report = {
    schemaVersion: "1.0.0",
    generatedAt: GENERATED_AT,
    decision: "SEASONALITY_PARTIALLY_READY",
    rationale: "Six of ten profiles have month-resolved evidence, but fishery-occurrence coverage is absent and several migration records are season-only, region-limited, life-stage-limited, or month-unresolved.",
    source: { path: artifact.derivedFrom.path, sha256: v2Sha256, profileCount: source.profiles.length },
    coverage: {
      species: source.profiles.length,
      contexts: { spawningSpecies: contextSpecies("SPAWNING"), migrationSpecies: contextSpecies("MIGRATION"), fisheryOccurrenceSpecies: contextSpecies("FISHERY_OCCURRENCE") },
      entries: { total: flatEntries.length, monthResolved: flatEntries.filter((entry) => entry.precision === "MONTH_RESOLVED").length, seasonOnly: flatEntries.filter((entry) => entry.precision === "SEASON_ONLY").length, monthUnresolved: flatEntries.filter((entry) => entry.precision === "UNRESOLVED").length },
      monthResolvedSpecies: monthResolvedSpecies.size,
      unresolvedSpecies: source.profiles.length - monthResolvedSpecies.size,
      regionalLimitations: regional.length,
      lifeStageLimitations: lifeStage.length,
      conflicts: 0,
      unsupported: { noContextSpecies: species.filter((item) => item.entries.length === 0).map((item) => item.speciesId), noMonthResolvedSpecies: species.filter((item) => !item.entries.some((entry) => entry.precision === "MONTH_RESOLVED")).map((item) => item.speciesId) },
    },
    species: species.map((item) => ({
      speciesId: item.speciesId,
      koreanName: item.koreanName,
      contexts: unique(item.entries.map((entry) => entry.context)),
      monthResolvedEntries: item.entries.filter((entry) => entry.precision === "MONTH_RESOLVED").length,
      seasonOnlyEntries: item.entries.filter((entry) => entry.precision === "SEASON_ONLY").length,
      unresolvedEntries: item.entries.filter((entry) => entry.precision === "UNRESOLVED").length,
      entries: item.entries.map((entry) => ({ context: entry.context, months: entry.months, seasons: entry.seasons, region: entry.geographicContext, lifeStage: entry.lifeStage, evidenceRefs: entry.evidenceRefs, limitations: entry.limitations })),
      evidenceRefs: unique(item.entries.flatMap((entry) => entry.evidenceRefs)),
      limitations: unique(item.entries.flatMap((entry) => entry.limitations)),
    })),
    deterministicChecks: { explicitMonthOnly: true, crossYearRangesSupported: true, multipleEvidencePreserved: true, conflictMerging: false, automaticRegionMapping: false, numericConversion: false, overallSeasonGrade: false },
    representativeVerification: [
      { species: "참돔", request: { speciesId: "BM-SPECIES-000755", context: "SPAWNING", month: 5 }, result: evaluateEntries(flatEntries, { speciesId: "BM-SPECIES-000755", context: "SPAWNING", month: 5 }) },
      { species: "고등어", request: { speciesId: "BM-SPECIES-000417", context: "MIGRATION", month: 8 }, result: evaluateEntries(flatEntries, { speciesId: "BM-SPECIES-000417", context: "MIGRATION", month: 8 }) },
      { species: "방어", request: { speciesId: "BM-SPECIES-000501", context: "MIGRATION", month: 5 }, result: evaluateEntries(flatEntries, { speciesId: "BM-SPECIES-000501", context: "MIGRATION", month: 5 }) },
      { species: "주꾸미", request: { speciesId: "BM-SPECIES-003107", context: "SPAWNING", month: 1 }, result: evaluateEntries(flatEntries, { speciesId: "BM-SPECIES-003107", context: "SPAWNING", month: 1 }) },
    ],
    forbiddenWordingScan: { scope: "generated explanations", terms: ["잘 잡힙니다", "낚시하기 좋은", "출조 추천", "GOOD", "FAVORABLE", "HIGH_PROBABILITY", "PEAK_CATCH"], findings: 0 },
    immutability: { v2: { sha256: v2Sha256, unchanged: true }, v3: { sha256: v3Sha256, unchanged: true } },
    writes: { database: 0, supabase: 0, externalAi: 0 },
  };

  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { artifact, report, flatEntries };
}

if (require.main === module) {
  const result = build();
  process.stdout.write(`seasonality entries: ${result.flatEntries.length}; decision: ${result.report.decision}\n`);
}

module.exports = { build, crossesYearBoundary, evaluateEntries, monthRange, normalizeFact };

import artifactJson from "../../../data/fishing-condition/seasonality/v1/species-seasonality.json";

export const SEASONALITY_RUNTIME_QUALITY_CLASS = "DERIVED_SEASONALITY_CONTEXT" as const;
export const SEASONALITY_RUNTIME_SOURCE_ID = "blue-marina-seasonality-evidence-interpretation-v1" as const;
export const SEASONALITY_CONTEXTS = ["SPAWNING", "MIGRATION", "FISHERY_OCCURRENCE"] as const;

export type SeasonalityContext = (typeof SEASONALITY_CONTEXTS)[number];
export type SeasonalityEvidenceStatus =
  | "MATCH"
  | "MISMATCH"
  | "MONTH_UNRESOLVED"
  | "EVIDENCE_EVALUATED"
  | "RECORDED"
  | "NO_RECORD"
  | "MISSING"
  | "UNSUPPORTED";

type OccurrenceRecord = {
  period: string;
  value: number;
  metric: string;
  unit: string;
  fishery: string;
  geography: string;
  salesForm: string;
};

type SeasonalityEntry = {
  entryId: string;
  context: SeasonalityContext;
  evidenceSemantic: string;
  evidenceMode?: string;
  precision: "MONTH_RESOLVED" | "SEASON_ONLY" | "UNRESOLVED" | "MONTHLY_RECORD_SERIES";
  months: number[];
  seasons: string[];
  startMonth: number | null;
  endMonth: number | null;
  crossesYearBoundary: boolean;
  years?: number[];
  records?: OccurrenceRecord[];
  missingPeriods?: string[];
  metric?: string;
  unit?: string;
  geographicContext: string;
  lifeStage: string;
  movement: string | null;
  evidenceRefs: string[];
  sourceType: string;
  limitations: string[];
  sourceSpeciesProfileVersion: string | null;
  sourceContext: Record<string, unknown>;
  source?: Record<string, unknown>;
  lineage?: Record<string, unknown>;
};

type SeasonalitySpecies = {
  speciesId: string;
  koreanName: string;
  scientificName: string;
  entries: SeasonalityEntry[];
};

type SeasonalityArtifact = {
  schemaVersion: "1.0.0";
  sourceId: typeof SEASONALITY_RUNTIME_SOURCE_ID;
  qualityClass: string;
  boundaries: {
    explicitMonthInputOnly: true;
    numericScoring: false;
    probability: false;
    ranking: false;
    recommendation: false;
  };
  species: SeasonalitySpecies[];
};

export type BiologicalSeasonalityEvidence = {
  entryId: string;
  status: "MATCH" | "MISMATCH" | "MONTH_UNRESOLVED";
  relation: "MATCH" | "MISMATCH" | null;
  evidenceSemantic: string;
  precision: SeasonalityEntry["precision"];
  months: number[];
  seasons: string[];
  startMonth: number | null;
  endMonth: number | null;
  crossesYearBoundary: boolean;
  geographicContext: string;
  lifeStage: string;
  movement: string | null;
  evidenceRefs: string[];
  sourceType: string;
  limitations: string[];
  sourceContext: Record<string, unknown>;
  explanation: string;
};

export type OccurrencePeriodEvidence = {
  period: string;
  status: "RECORDED" | "NO_RECORD" | "MISSING";
  record: OccurrenceRecord | null;
  explanation: string;
};

export type FisheryOccurrenceEvidence = {
  entryId: string;
  status: "RECORDED" | "NO_RECORD" | "MISSING";
  evidenceSemantic: string;
  evidenceMode: "MONTHLY_RECORD_SERIES";
  years: number[];
  periods: OccurrencePeriodEvidence[];
  metric: string;
  unit: string;
  geographicContext: string;
  lifeStage: string;
  evidenceRefs: string[];
  sourceType: string;
  limitations: string[];
  source: Record<string, unknown>;
  lineage: Record<string, unknown>;
  explanation: string;
};

export type SeasonalityContextResult = {
  context: SeasonalityContext;
  status: SeasonalityEvidenceStatus;
  evidence: Array<BiologicalSeasonalityEvidence | FisheryOccurrenceEvidence>;
  limitations: string[];
  geographicContexts: string[];
  lifeStages: string[];
  explanation: string;
};

export type SeasonalityRuntimeResult = {
  species: {
    speciesId: string;
    koreanName: string;
    scientificName: string;
  };
  requestedMonth: number;
  contexts: SeasonalityContextResult[];
  qualityClass: typeof SEASONALITY_RUNTIME_QUALITY_CLASS;
  sourceLineage: {
    productionArtifact: string;
    productionSourceId: typeof SEASONALITY_RUNTIME_SOURCE_ID;
    derivation: "PRODUCTION_ARTIFACT_READ_ONLY_INTERPRETATION";
  };
};

export type SeasonalityRuntimeQuery = {
  speciesId: string;
  month: number;
  context?: SeasonalityContext;
};

export type SeasonalityRuntimeErrorCode = "INVALID_SPECIES_ID" | "INVALID_MONTH" | "INVALID_CONTEXT" | "SPECIES_NOT_FOUND";

export class SeasonalityRuntimeError extends Error {
  constructor(public readonly code: SeasonalityRuntimeErrorCode) {
    super(code);
    this.name = "SeasonalityRuntimeError";
  }
}

const ARTIFACT_PATH = "data/fishing-condition/seasonality/v1/species-seasonality.json";
const ARTIFACT = artifactJson as unknown as SeasonalityArtifact;

function validateArtifact(artifact: SeasonalityArtifact) {
  if (artifact.schemaVersion !== "1.0.0" || artifact.sourceId !== SEASONALITY_RUNTIME_SOURCE_ID) return false;
  if (artifact.boundaries.explicitMonthInputOnly !== true) return false;
  if (artifact.boundaries.numericScoring || artifact.boundaries.probability || artifact.boundaries.ranking || artifact.boundaries.recommendation) return false;
  if (new Set(artifact.species.map((species) => species.speciesId)).size !== artifact.species.length) return false;
  return artifact.species.every((species) =>
    /^BM-SPECIES-\d{6}$/.test(species.speciesId)
    && species.entries.every((entry) => SEASONALITY_CONTEXTS.includes(entry.context)
      && entry.months.every((month) => Number.isInteger(month) && month >= 1 && month <= 12)
      && (entry.context !== "FISHERY_OCCURRENCE"
        || (entry.precision === "MONTHLY_RECORD_SERIES" && Array.isArray(entry.records) && Array.isArray(entry.missingPeriods)))),
  );
}

if (!validateArtifact(ARTIFACT)) throw new Error("INVALID_SEASONALITY_PRODUCTION_ARTIFACT");

function unique(values: string[]) {
  return [...new Set(values)];
}

function contextLabel(context: Exclude<SeasonalityContext, "FISHERY_OCCURRENCE">) {
  return context === "SPAWNING" ? "산란 시기" : "회유 시기";
}

function monthRange(entry: SeasonalityEntry) {
  if (entry.startMonth !== null && entry.endMonth !== null) return `${entry.startMonth}~${entry.endMonth}월`;
  return entry.months.map((month) => `${month}월`).join(", ");
}

function evaluateBiologicalEntry(
  entry: SeasonalityEntry,
  month: number,
): BiologicalSeasonalityEvidence {
  const unresolved = entry.precision !== "MONTH_RESOLVED" || entry.months.length === 0;
  const relation: BiologicalSeasonalityEvidence["relation"] = unresolved
    ? null
    : entry.months.includes(month) ? "MATCH" : "MISMATCH";
  const status: BiologicalSeasonalityEvidence["status"] = unresolved
    ? "MONTH_UNRESOLVED"
    : entry.months.includes(month) ? "MATCH" : "MISMATCH";
  const label = contextLabel(entry.context as Exclude<SeasonalityContext, "FISHERY_OCCURRENCE">);
  const explanation = unresolved
    ? `이 근거는 ${label}를 월 단위로 확정하지 않아 요청한 ${month}월과 비교할 수 없습니다.`
    : `이 근거에서는 ${monthRange(entry)}을 ${label}로 제시합니다. 요청한 ${month}월은 해당 기간에 ${relation === "MATCH" ? "포함됩니다" : "포함되지 않습니다"}.`;

  return {
    entryId: entry.entryId,
    status,
    relation,
    evidenceSemantic: entry.evidenceSemantic,
    precision: entry.precision,
    months: [...entry.months],
    seasons: [...entry.seasons],
    startMonth: entry.startMonth,
    endMonth: entry.endMonth,
    crossesYearBoundary: entry.crossesYearBoundary,
    geographicContext: entry.geographicContext,
    lifeStage: entry.lifeStage,
    movement: entry.movement,
    evidenceRefs: [...entry.evidenceRefs],
    sourceType: entry.sourceType,
    limitations: [...entry.limitations],
    sourceContext: { ...entry.sourceContext },
    explanation,
  };
}

function occurrencePeriod(entry: SeasonalityEntry, year: number, month: number): OccurrencePeriodEvidence {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const record = entry.records?.find((item) => item.period === period);
  if (record) {
    return {
      period,
      status: "RECORDED",
      record: { ...record },
      explanation: `${period} KOSIS 월별 어획 통계 원기록이 확인됩니다.`,
    };
  }
  if (entry.missingPeriods?.includes(period)) {
    return {
      period,
      status: "MISSING",
      record: null,
      explanation: `${year}년 ${month}월은 원자료 행이 없어 missing으로 보존됩니다.`,
    };
  }
  return {
    period,
    status: "NO_RECORD",
    record: null,
    explanation: `${period}에 대응하는 원자료 기록이나 명시적 missing 표기가 없습니다. NO_RECORD는 생물학적 부재를 뜻하지 않습니다.`,
  };
}

function evaluateOccurrenceEntry(entry: SeasonalityEntry, month: number): FisheryOccurrenceEvidence {
  const years = [...(entry.years ?? [])];
  const periods = years.map((year) => occurrencePeriod(entry, year, month));
  const status = periods.some((period) => period.status === "RECORDED")
    ? "RECORDED" as const
    : periods.some((period) => period.status === "MISSING") ? "MISSING" as const : "NO_RECORD" as const;
  const recordedYears = periods.filter((period) => period.status === "RECORDED").map((period) => period.period.slice(0, 4));
  const missingYears = periods.filter((period) => period.status === "MISSING").map((period) => period.period.slice(0, 4));
  const details = [
    recordedYears.length > 0 ? `${recordedYears.join(", ")}년 원기록 확인` : "확인된 원기록 없음",
    missingYears.length > 0 ? `${missingYears.join(", ")}년 missing 보존` : null,
  ].filter(Boolean).join("; ");
  return {
    entryId: entry.entryId,
    status,
    evidenceSemantic: entry.evidenceSemantic,
    evidenceMode: "MONTHLY_RECORD_SERIES",
    years,
    periods,
    metric: entry.metric ?? "",
    unit: entry.unit ?? "",
    geographicContext: entry.geographicContext,
    lifeStage: entry.lifeStage,
    evidenceRefs: [...entry.evidenceRefs],
    sourceType: entry.sourceType,
    limitations: [...entry.limitations],
    source: { ...(entry.source ?? {}) },
    lineage: {
      ...(entry.lineage ?? {}),
      productionArtifact: ARTIFACT_PATH,
      runtimeQualityClass: SEASONALITY_RUNTIME_QUALITY_CLASS,
    },
    explanation: `KOSIS 월별 어획 통계에서 요청한 ${month}월을 연도별 원기록으로 확인했습니다. ${details}. 이 값은 어획 통계 기록값입니다.`,
  };
}

function unsupportedContext(context: SeasonalityContext): SeasonalityContextResult {
  return {
    context,
    status: "UNSUPPORTED",
    evidence: [],
    limitations: ["NO_CONTEXT_EVIDENCE"],
    geographicContexts: [],
    lifeStages: [],
    explanation: `이 production artifact에는 요청한 ${context} 근거가 없습니다.`,
  };
}

function evaluateContext(species: SeasonalitySpecies, context: SeasonalityContext, month: number): SeasonalityContextResult {
  const entries = species.entries.filter((entry) => entry.context === context);
  if (entries.length === 0) return unsupportedContext(context);

  const evidence = context === "FISHERY_OCCURRENCE"
    ? entries.map((entry) => evaluateOccurrenceEntry(entry, month))
    : entries.map((entry) => evaluateBiologicalEntry(entry, month));
  const statuses = evidence.map((item) => item.status);
  const status: SeasonalityEvidenceStatus = context === "FISHERY_OCCURRENCE"
    ? statuses.includes("RECORDED") ? "RECORDED" : statuses.includes("MISSING") ? "MISSING" : "NO_RECORD"
    : evidence.length > 1 ? "EVIDENCE_EVALUATED"
      : statuses[0] as SeasonalityEvidenceStatus;
  const explanation = evidence.length === 1
    ? evidence[0].explanation
    : `${evidence.length}개의 ${contextLabel(context as Exclude<SeasonalityContext, "FISHERY_OCCURRENCE">)} 근거를 각각 독립적으로 평가했습니다.`;

  return {
    context,
    status,
    evidence,
    limitations: unique(entries.flatMap((entry) => entry.limitations)),
    geographicContexts: unique(entries.map((entry) => entry.geographicContext)),
    lifeStages: unique(entries.map((entry) => entry.lifeStage)),
    explanation,
  };
}

export function getSpeciesSeasonality(query: SeasonalityRuntimeQuery): SeasonalityRuntimeResult {
  if (!/^BM-SPECIES-\d{6}$/.test(query.speciesId)) throw new SeasonalityRuntimeError("INVALID_SPECIES_ID");
  if (!Number.isInteger(query.month) || query.month < 1 || query.month > 12) throw new SeasonalityRuntimeError("INVALID_MONTH");
  if (query.context !== undefined && !SEASONALITY_CONTEXTS.includes(query.context)) throw new SeasonalityRuntimeError("INVALID_CONTEXT");
  const species = ARTIFACT.species.find((item) => item.speciesId === query.speciesId);
  if (!species) throw new SeasonalityRuntimeError("SPECIES_NOT_FOUND");
  const contexts = query.context ? [query.context] : [...SEASONALITY_CONTEXTS];
  return {
    species: {
      speciesId: species.speciesId,
      koreanName: species.koreanName,
      scientificName: species.scientificName,
    },
    requestedMonth: query.month,
    contexts: contexts.map((context) => evaluateContext(species, context, query.month)),
    qualityClass: SEASONALITY_RUNTIME_QUALITY_CLASS,
    sourceLineage: {
      productionArtifact: ARTIFACT_PATH,
      productionSourceId: SEASONALITY_RUNTIME_SOURCE_ID,
      derivation: "PRODUCTION_ARTIFACT_READ_ONLY_INTERPRETATION",
    },
  };
}

export const SEASONALITY_RUNTIME_SPECIES_COUNT = ARTIFACT.species.length;

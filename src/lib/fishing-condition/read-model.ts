import type { ConditionEvidenceItem } from "./evidence-bundle";
import type {
  BiologicalSeasonalityEvidence,
  FisheryOccurrenceEvidence,
  SeasonalityContextResult,
  SeasonalityRuntimeResult,
} from "./seasonality-runtime";

export const FISHING_CONDITION_READ_MODEL_QUALITY_CLASS = "DERIVED_FISHING_CONDITION_READ_MODEL" as const;

type EvidenceBundleInput = {
  species: {
    speciesId: string;
    koreanName: string;
    scientificName: string;
  };
  environmentContext: {
    sourceId: string;
    stationOrSiteId: string;
    observedAt: string | null;
    freshness: string;
    depthContext: string;
  };
  requestedContexts: {
    month: number | null;
    timeOfDay: string | null;
  };
  evidence: {
    temperature: ConditionEvidenceItem;
    salinity: ConditionEvidenceItem;
    dissolvedOxygen: ConditionEvidenceItem;
    activity: ConditionEvidenceItem;
    habitat: ConditionEvidenceItem;
  };
  environmentEvidence?: {
    temperature: ConditionEvidenceItem;
    salinity: ConditionEvidenceItem;
    dissolvedOxygen: ConditionEvidenceItem;
    activity: ConditionEvidenceItem;
    habitat: ConditionEvidenceItem;
  };
  seasonalityEvidence?: SeasonalityRuntimeResult;
  qualityClass: string;
};

const ENVIRONMENT_FIELDS = ["temperature", "salinity", "dissolvedOxygen", "activity", "habitat"] as const;

const FIELD_LABELS: Record<(typeof ENVIRONMENT_FIELDS)[number], string> = {
  temperature: "수온",
  salinity: "염분",
  dissolvedOxygen: "용존산소",
  activity: "활동 시간대",
  habitat: "서식 환경",
};

const RELATION_LABELS: Record<string, string> = {
  WITHIN_RANGE: "기준 범위 안",
  BELOW_RANGE: "기준 범위보다 낮음",
  ABOVE_RANGE: "기준 범위보다 높음",
  MATCH: "제시된 시기와 일치",
  MISMATCH: "제시된 시기와 불일치",
};

const STATUS_LIMITATIONS: Partial<Record<ConditionEvidenceItem["status"], string>> = {
  UNIT_UNVERIFIED: "단위 미확인",
  UNIT_MISMATCH: "비교 단위 불일치",
  CONFLICT_REVIEW_REQUIRED: "근거 충돌 검토 필요",
  UNSUPPORTED_PROFILE: "어종 기준 자료 없음",
  UNSUPPORTED_ENVIRONMENT: "환경 비교 자료 없음",
  MISSING_ENVIRONMENT: "관측 자료 없음",
  MISSING_ENVIRONMENT_CONTEXT: "비교 조건 미지정",
  LIMITED: "제한된 근거",
  UNKNOWN: "상태 확인 불가",
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function displayUnit(field: (typeof ENVIRONMENT_FIELDS)[number], item: ConditionEvidenceItem) {
  if (item.status === "UNIT_UNVERIFIED" || item.status === "UNIT_MISMATCH") return null;
  if (field === "temperature") return "°C";
  if (field === "dissolvedOxygen") return "mg/L";
  return item.profileReference?.unit ?? null;
}

function displayValue(field: (typeof ENVIRONMENT_FIELDS)[number], item: ConditionEvidenceItem) {
  if (item.environmentValue === null) return null;
  const unit = displayUnit(field, item);
  return unit ? `${item.environmentValue} ${unit}` : String(item.environmentValue);
}

function environmentLimitations(item: ConditionEvidenceItem) {
  const values: string[] = [];
  const statusLimitation = STATUS_LIMITATIONS[item.status];
  if (statusLimitation) values.push(statusLimitation);
  if (item.freshness === "stale") values.push("오래된 관측");
  if (item.freshness === "unavailable") values.push("관측 이용 불가");
  return unique(values);
}

function environmentCard(
  field: (typeof ENVIRONMENT_FIELDS)[number],
  item: ConditionEvidenceItem,
  sourceId: string,
) {
  return {
    key: field,
    label: FIELD_LABELS[field],
    status: item.status,
    rawValue: item.environmentValue,
    displayValue: displayValue(field, item),
    relation: item.relation,
    displayStatus: item.relation ? RELATION_LABELS[item.relation] ?? null : null,
    explanation: item.explanation,
    profileReference: item.profileReference,
    evidenceRefs: [...item.evidenceRefs],
    source: {
      sourceId,
      lineage: [...item.sourceLineage],
    },
    freshness: item.freshness,
    limitations: environmentLimitations(item),
  };
}

function isOccurrenceEvidence(
  evidence: BiologicalSeasonalityEvidence | FisheryOccurrenceEvidence,
): evidence is FisheryOccurrenceEvidence {
  return "evidenceMode" in evidence && evidence.evidenceMode === "MONTHLY_RECORD_SERIES";
}

function biologicalCard(
  context: "SPAWNING" | "MIGRATION",
  evidence: BiologicalSeasonalityEvidence,
) {
  return {
    entryId: evidence.entryId,
    context,
    title: context === "SPAWNING"
      ? "산란 시기 근거"
      : evidence.movement === "NORTHWARD"
        ? "북상 이동"
        : evidence.movement === "SOUTHWARD"
          ? "남하 이동"
          : "회유 시기 근거",
    status: evidence.status,
    relation: evidence.relation,
    description: evidence.explanation,
    months: [...evidence.months],
    seasons: [...evidence.seasons],
    startMonth: evidence.startMonth,
    endMonth: evidence.endMonth,
    crossesYearBoundary: evidence.crossesYearBoundary,
    region: evidence.geographicContext,
    lifeStage: evidence.lifeStage,
    movement: evidence.movement,
    evidenceRefs: [...evidence.evidenceRefs],
    sourceType: evidence.sourceType,
    sourceContext: evidence.sourceContext,
    limitations: [...evidence.limitations],
  };
}

function occurrenceCard(evidence: FisheryOccurrenceEvidence, requestedMonth: number) {
  return {
    entryId: evidence.entryId,
    context: "FISHERY_OCCURRENCE" as const,
    title: "월별 어획 원기록",
    status: evidence.status,
    representation: evidence.evidenceMode,
    requestedMonth,
    yearlyRecords: evidence.periods.map((period) => ({
      year: Number(period.period.slice(0, 4)),
      period: period.period,
      status: period.status,
      displayStatus: period.status === "MISSING" ? "원자료 행 없음" : period.status === "NO_RECORD" ? "자료 없음" : "기록 있음",
      value: period.record?.value ?? null,
      displayValue: period.record === null ? null : `${period.record.value} ${period.record.unit}`,
      metric: period.record?.metric ?? evidence.metric,
      unit: period.record?.unit ?? evidence.unit,
      fishery: period.record?.fishery ?? null,
      geography: period.record?.geography ?? null,
      salesForm: period.record?.salesForm ?? null,
    })),
    metric: evidence.metric,
    unit: evidence.unit,
    region: evidence.geographicContext,
    lifeStage: evidence.lifeStage,
    evidenceRefs: [...evidence.evidenceRefs],
    sourceType: evidence.sourceType,
    source: evidence.source,
    lineage: evidence.lineage,
    description: evidence.explanation,
    limitations: [...evidence.limitations],
  };
}

function contextResult(
  seasonality: SeasonalityRuntimeResult | undefined,
  context: "SPAWNING" | "MIGRATION" | "FISHERY_OCCURRENCE",
) {
  return seasonality?.contexts.find((item) => item.context === context);
}

function biologicalSection(
  result: SeasonalityContextResult | undefined,
  context: "SPAWNING" | "MIGRATION",
) {
  return {
    status: result?.status ?? "NOT_REQUESTED",
    description: result?.explanation ?? null,
    cards: result?.evidence
      .filter((item): item is BiologicalSeasonalityEvidence => !isOccurrenceEvidence(item))
      .map((item) => biologicalCard(context, item)) ?? [],
  };
}

function occurrenceSection(
  result: SeasonalityContextResult | undefined,
  requestedMonth: number | null,
) {
  return {
    status: result?.status ?? "NOT_REQUESTED",
    description: result?.explanation ?? null,
    cards: requestedMonth === null
      ? []
      : result?.evidence.filter(isOccurrenceEvidence).map((item) => occurrenceCard(item, requestedMonth)) ?? [],
  };
}

function stringField(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key]) return value[key] as string;
  }
  return null;
}

function buildSources(bundle: EvidenceBundleInput) {
  const sources: Array<{
    domain: "environment" | "seasonality";
    provider: string | null;
    sourceType: string | null;
    sourceName: string | null;
    sourceId: string;
    qualityClass: string;
    observedAt: string | null;
    urlOrReference: string | null;
    lineage: string[] | Record<string, unknown>;
  }> = [{
    domain: "environment",
    provider: null,
    sourceType: null,
    sourceName: bundle.environmentContext.sourceId,
    sourceId: bundle.environmentContext.sourceId,
    qualityClass: bundle.qualityClass,
    observedAt: bundle.environmentContext.observedAt,
    urlOrReference: null,
    lineage: [...bundle.evidence.temperature.sourceLineage],
  }];

  for (const context of bundle.seasonalityEvidence?.contexts ?? []) {
    for (const evidence of context.evidence) {
      const source = isOccurrenceEvidence(evidence) ? evidence.source : {};
      const sourceId = stringField(source, ["sourceId", "id"]) ?? evidence.evidenceRefs[0] ?? evidence.entryId;
      if (sources.some((item) => item.domain === "seasonality" && item.sourceId === sourceId)) continue;
      sources.push({
        domain: "seasonality",
        provider: stringField(source, ["provider"]),
        sourceType: evidence.sourceType,
        sourceName: stringField(source, ["sourceName", "tableId"]) ?? evidence.sourceType,
        sourceId,
        qualityClass: bundle.seasonalityEvidence?.qualityClass ?? "DERIVED_SEASONALITY_CONTEXT",
        observedAt: stringField(source, ["retrievedAt", "observedAt"]),
        urlOrReference: stringField(source, ["url", "reference"]),
        lineage: isOccurrenceEvidence(evidence) ? evidence.lineage : [evidence.sourceType, ...evidence.evidenceRefs],
      });
    }
  }
  return sources;
}

function buildLimitations(
  environment: ReturnType<typeof environmentCard>[],
  seasonality: SeasonalityRuntimeResult | undefined,
) {
  return unique([
    ...environment.flatMap((item) => item.limitations),
    ...(seasonality?.contexts.flatMap((context) => [
      ...context.limitations,
      ...context.evidence.flatMap((evidence) => evidence.limitations),
    ]) ?? []),
  ]);
}

function freshnessLabel(value: string) {
  if (value === "fresh") return "최신";
  if (value === "stale") return "오래된 관측";
  return "이용 불가";
}

export function buildFishingConditionReadModel(bundle: EvidenceBundleInput) {
  const evidence = bundle.environmentEvidence ?? bundle.evidence;
  const environment = ENVIRONMENT_FIELDS.map((field) =>
    environmentCard(field, evidence[field], bundle.environmentContext.sourceId));
  const seasonality = bundle.seasonalityEvidence;
  const spawning = contextResult(seasonality, "SPAWNING");
  const migration = contextResult(seasonality, "MIGRATION");
  const occurrence = contextResult(seasonality, "FISHERY_OCCURRENCE");

  return {
    qualityClass: FISHING_CONDITION_READ_MODEL_QUALITY_CLASS,
    species: {
      speciesId: bundle.species.speciesId,
      koreanName: bundle.species.koreanName,
      scientificName: bundle.species.scientificName,
    },
    requestContext: {
      month: bundle.requestedContexts.month,
      environmentSource: bundle.environmentContext.sourceId,
      stationOrSiteId: bundle.environmentContext.stationOrSiteId,
      depthContext: bundle.environmentContext.depthContext,
      timeOfDay: bundle.requestedContexts.timeOfDay,
    },
    environment: Object.fromEntries(environment.map((item) => [item.key, item])) as Record<(typeof ENVIRONMENT_FIELDS)[number], ReturnType<typeof environmentCard>>,
    seasonality: {
      requestedMonth: bundle.requestedContexts.month,
      spawning: biologicalSection(spawning, "SPAWNING"),
      migration: biologicalSection(migration, "MIGRATION"),
      fisheryOccurrence: occurrenceSection(occurrence, bundle.requestedContexts.month),
    },
    sources: buildSources(bundle),
    limitations: buildLimitations(environment, seasonality),
    freshness: {
      status: bundle.environmentContext.freshness,
      label: freshnessLabel(bundle.environmentContext.freshness),
      observedAt: bundle.environmentContext.observedAt,
    },
    quality: {
      evidenceBundleClass: bundle.qualityClass,
      seasonalityClass: seasonality?.qualityClass ?? null,
    },
  };
}

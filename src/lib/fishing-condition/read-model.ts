import type { ConditionEvidenceItem } from "./evidence-bundle";
import type { ComparatorEnvironment } from "./comparator";
import type { FishingConditionProfile } from "./profile-registry";
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

function profileSources(profile: FishingConditionProfile) {
  return profile.evidenceRefs.map((reference) => ({
    domain: "profile",
    provider: null,
    sourceType: reference.sourceType,
    sourceName: reference.title,
    sourceId: reference.id,
    qualityClass: reference.evidenceClass,
    observedAt: null,
    urlOrReference: reference.url ?? null,
    lineage: ["Fishing Condition Profile Expansion V1", reference.id],
  }));
}

export function profileContext(profile: FishingConditionProfile) {
  return {
    readiness: profile.profileReadiness,
    availableDomains: Object.fromEntries([
      ["temperature", profile.temperature.status],
      ["depth", profile.depth.status],
      ["salinity", profile.salinity.status],
      ["dissolvedOxygen", profile.dissolvedOxygen.status],
      ["spawning", profile.spawning.status],
      ["migration", profile.migration.status],
      ["habitat", profile.habitat.status],
    ]),
    temperature: profile.temperature,
    depth: profile.depth,
    salinity: profile.salinity,
    dissolvedOxygen: profile.dissolvedOxygen,
    spawning: profile.spawning,
    migration: profile.migration,
    habitat: profile.habitat,
    evidenceRefs: profile.evidenceRefs.map((reference) => ({ ...reference })),
    limitations: [...profile.limitations],
  };
}

export function buildFishingConditionReadModel(bundle: EvidenceBundleInput, profile?: FishingConditionProfile | null) {
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
    profileContext: profile ? profileContext(profile) : null,
    sources: [...buildSources(bundle), ...(profile ? profileSources(profile) : [])],
    limitations: unique([...buildLimitations(environment, seasonality), ...(profile?.limitations ?? [])]),
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

function observedItem(
  key: "temperature" | "salinity" | "dissolvedOxygen",
  label: string,
  value: { value: number | null; unit: string | null },
  environment: ComparatorEnvironment,
) {
  const displayValue = value.value === null ? null : `${value.value}${value.unit ? ` ${value.unit === "degC" ? "°C" : value.unit}` : ""}`;
  return {
    key,
    label,
    status: "OBSERVED_ONLY",
    rawValue: value.value,
    displayValue,
    relation: null,
    displayStatus: null,
    explanation: "현재 관측값입니다. 이 화면에서는 어종 profile과 자동 비교하거나 적합도를 판단하지 않습니다.",
    profileReference: null,
    evidenceRefs: [],
    source: { sourceId: environment.sourceId, lineage: [environment.sourceId, environment.qualityClass] },
    freshness: environment.freshness,
    limitations: value.value === null ? ["MISSING_ENVIRONMENT"] : [],
  };
}

export function buildProfileOnlyFishingConditionReadModel(
  profile: FishingConditionProfile,
  environment: ComparatorEnvironment,
  requestedContexts: { month: number | null; timeOfDay: string | null },
) {
  const profileDetails = profileContext(profile);
  const environmentCards = {
    temperature: observedItem("temperature", "수온", environment.temperature, environment),
    salinity: observedItem("salinity", "염분", environment.salinity, environment),
    dissolvedOxygen: observedItem("dissolvedOxygen", "용존산소", environment.dissolvedOxygen, environment),
    activity: { key: "activity", label: "활동 시간대", status: "OBSERVED_ONLY", rawValue: requestedContexts.timeOfDay, displayValue: requestedContexts.timeOfDay, relation: null, displayStatus: null, explanation: null, profileReference: null, evidenceRefs: [], source: { sourceId: environment.sourceId, lineage: [environment.sourceId] }, freshness: environment.freshness, limitations: ["MISSING_ENVIRONMENT_CONTEXT"] },
    habitat: { key: "habitat", label: "서식 환경", status: "OBSERVED_ONLY", rawValue: null, displayValue: null, relation: null, displayStatus: null, explanation: "서식 환경 근거는 아래 어종별 참고 정보에서 확인합니다.", profileReference: null, evidenceRefs: [], source: { sourceId: environment.sourceId, lineage: [environment.sourceId] }, freshness: environment.freshness, limitations: [] },
  };
  return {
    qualityClass: FISHING_CONDITION_READ_MODEL_QUALITY_CLASS,
    species: { speciesId: profile.speciesId, koreanName: profile.koreanName, scientificName: profile.scientificName },
    requestContext: { month: requestedContexts.month, environmentSource: environment.sourceId, stationOrSiteId: environment.stationOrSiteId, depthContext: environment.depthContext, timeOfDay: requestedContexts.timeOfDay },
    environment: environmentCards,
    seasonality: {
      requestedMonth: requestedContexts.month,
      spawning: { status: "PROFILE_CONTEXT", description: "산란 근거는 아래 어종별 참고 정보에서 확인합니다.", cards: [] },
      migration: { status: "PROFILE_CONTEXT", description: "회유 근거는 아래 어종별 참고 정보에서 확인합니다.", cards: [] },
      fisheryOccurrence: { status: "NOT_REQUESTED", description: "이 어종에는 월별 어획 원기록 runtime을 연결하지 않았습니다.", cards: [] },
    },
    profileContext: profileDetails,
    sources: [{ domain: "environment", provider: environment.provider, sourceType: "OBSERVED_ENVIRONMENT", sourceName: environment.sourceId, sourceId: environment.sourceId, qualityClass: environment.qualityClass, observedAt: environment.observedAt, urlOrReference: null, lineage: [environment.sourceId, environment.qualityClass] }, ...profileSources(profile)],
    limitations: unique([...profile.limitations, "PROFILE_REFERENCE_ONLY_NO_AUTOMATIC_SUITABILITY_VERDICT"]),
    freshness: { status: environment.freshness, label: freshnessLabel(environment.freshness), observedAt: environment.observedAt },
    quality: { evidenceBundleClass: "PROFILE_CONTEXT_WITH_OBSERVED_ENVIRONMENT", seasonalityClass: null },
  };
}

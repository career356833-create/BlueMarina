import type { ComparisonRelation, compareFishingCondition } from "./comparator";

export const FISHING_CONDITION_EXPLANATION_QUALITY_CLASS = "DERIVED_EXPLANATION" as const;
export const FISHING_CONDITION_EXPLANATION_LOCALE = "ko-KR" as const;

type FishingConditionComparison = ReturnType<typeof compareFishingCondition>;
type NumericComparison = FishingConditionComparison["comparisons"]["temperature"];

export type FishingConditionExplanation = {
  field: string;
  relation: ComparisonRelation;
  title: string;
  summary: string;
  details: string[];
  evidenceRefs: string[];
  freshnessNote: string | null;
  limitationNote: string | null;
  qualityClass: typeof FISHING_CONDITION_EXPLANATION_QUALITY_CLASS;
};

const FIELD_LABELS = {
  temperature: "수온",
  depth: "수심",
  salinity: "염분",
  dissolvedOxygen: "용존산소",
} as const;

function formatNumber(value: number) {
  return String(Number(value.toFixed(1)));
}

function formatValue(value: number, unit: string | null) {
  const normalizedUnit = unit === "degC" ? "°C" : unit ?? "";
  return `${formatNumber(value)}${normalizedUnit}`;
}

function freshnessNote(comparison: FishingConditionComparison) {
  if (comparison.environment.freshness === "fresh") return "최근 관측값을 사용했습니다.";
  if (comparison.environment.freshness === "stale") return "이 비교에 사용된 환경값은 최신 관측으로 분류되지 않아 제한적으로 해석해야 합니다.";
  return null;
}

function limitationForRelation(relation: ComparisonRelation) {
  if (relation === "UNSUPPORTED_PROFILE") return "지원되지 않는 값은 임의로 보완하지 않았습니다.";
  if (relation === "MISSING_ENVIRONMENT") return "누락된 환경값을 0으로 대체하지 않았습니다.";
  if (relation === "UNIT_UNVERIFIED" || relation === "UNIT_MISMATCH") return "단위 확인 전에는 수치 관계를 만들지 않습니다.";
  if (relation === "CONFLICT_REVIEW_REQUIRED") return "충돌하는 출처 값을 병합하거나 평균하지 않았습니다.";
  if (relation === "DEPTH_CONTEXT_UNRESOLVED") return "범주형 수심을 임의의 수치 수심으로 변환하지 않았습니다.";
  return null;
}

function unavailableSummary(field: keyof typeof FIELD_LABELS, relation: ComparisonRelation, speciesName: string) {
  const label = FIELD_LABELS[field];
  if (relation === "UNSUPPORTED_PROFILE") return `현재 V1 ${speciesName} 프로파일에는 비교 가능한 ${label} 범위 근거가 없습니다.`;
  if (relation === "MISSING_ENVIRONMENT") return `현재 선택한 관측소 또는 조사 지점에서 비교에 필요한 ${label} 값을 사용할 수 없습니다.`;
  if (relation === "UNIT_UNVERIFIED") return `환경 ${label} 값과 어종 프로파일의 단위 호환성을 공식적으로 확인할 수 없어 비교하지 않았습니다.`;
  if (relation === "UNIT_MISMATCH") return `환경 ${label} 값과 어종 프로파일의 단위가 서로 달라 비교하지 않았습니다.`;
  if (relation === "CONFLICT_REVIEW_REQUIRED") return `이 ${label} 항목은 출처 간 범위가 서로 달라 하나의 기준값으로 확정하지 않았습니다.`;
  if (relation === "DEPTH_CONTEXT_UNRESOLVED") return "선택한 수심 구분에 대응하는 정확한 수심값이 없어 수치 범위와 비교하지 않았습니다.";
  return `${label} 관계를 현재 자료만으로 설명할 수 없습니다.`;
}

function numericSummary(field: keyof typeof FIELD_LABELS, comparison: NumericComparison, speciesName: string) {
  const label = FIELD_LABELS[field];
  if (comparison.currentValue === null || comparison.min === null) return unavailableSummary(field, comparison.relation, speciesName);
  const current = formatValue(comparison.currentValue, comparison.unit);
  const min = formatValue(comparison.min, comparison.unit);
  const max = comparison.max === null ? null : formatValue(comparison.max, comparison.unit);
  const rangeLabel = comparison.rangeType === "PREFERRED" ? "문헌상 선호" : comparison.rangeType === "OBSERVED" ? "문헌상 관찰" : "문헌상";
  const prefix = comparison.rangeType === "OBSERVED" ? "선호 수온 범위 자료가 없어 문헌에서 확인된 관찰 수온 범위와 비교했습니다. " : "";
  if (comparison.relation === "BELOW_RANGE") return `${prefix}현재 ${label} ${current}는 ${speciesName}의 ${rangeLabel} ${label} 범위 하한 ${min}보다 낮습니다.`;
  if (comparison.relation === "ABOVE_RANGE" && max !== null) return `${prefix}현재 ${label} ${current}는 ${speciesName}의 ${rangeLabel} ${label} 범위 상한 ${max}보다 높습니다.`;
  if (comparison.relation === "WITHIN_RANGE" && max !== null) return `${prefix}현재 ${label} ${current}는 ${speciesName}의 ${rangeLabel} ${label} 범위 ${min}~${max} 안에 있습니다.`;
  if (comparison.relation === "WITHIN_RANGE" && max === null) return `현재 ${label} ${current}는 ${speciesName}의 문헌상 하한 ${min} 이상입니다.`;
  return unavailableSummary(field, comparison.relation, speciesName);
}

function numericExplanation(
  field: keyof typeof FIELD_LABELS,
  value: NumericComparison,
  comparison: FishingConditionComparison,
): FishingConditionExplanation {
  const details = [
    value.rangeType ? `비교 범위 유형: ${value.rangeType}` : null,
    value.rangeContext ? `근거 맥락: ${value.rangeContext}` : null,
    value.lifeStage ? `생애 단계: ${value.lifeStage}` : null,
    value.regionScope ? `지역 범위: ${value.regionScope}` : null,
  ].filter((item): item is string => item !== null);
  return {
    field,
    relation: value.relation,
    title: `${FIELD_LABELS[field]} 비교`,
    summary: numericSummary(field, value, comparison.species.koreanName),
    details,
    evidenceRefs: value.evidenceIds,
    freshnessNote: freshnessNote(comparison),
    limitationNote: limitationForRelation(value.relation),
    qualityClass: FISHING_CONDITION_EXPLANATION_QUALITY_CLASS,
  };
}

function seasonContextLabel(context: "SPAWNING" | "MIGRATION" | "FISHERY_OCCURRENCE") {
  if (context === "SPAWNING") return "산란 시기";
  if (context === "MIGRATION") return "이동 시기";
  return "출현 시기";
}

function seasonalityExplanations(comparison: FishingConditionComparison): FishingConditionExplanation[] {
  const seasonality = comparison.comparisons.seasonality;
  if (seasonality.contexts.length === 0) {
    return [{
      field: "seasonality",
      relation: seasonality.relation,
      title: "시기 비교",
      summary: seasonality.relation === "MISSING_ENVIRONMENT"
        ? "관측 시점을 확인할 수 없어 문헌상 시기와 비교하지 않았습니다."
        : `현재 V1 ${comparison.species.koreanName} 프로파일에는 월 단위로 비교 가능한 시기 근거가 없습니다.`,
      details: [],
      evidenceRefs: [],
      freshnessNote: freshnessNote(comparison),
      limitationNote: limitationForRelation(seasonality.relation),
      qualityClass: FISHING_CONDITION_EXPLANATION_QUALITY_CLASS,
    }];
  }
  return seasonality.contexts.map((context) => {
    const label = seasonContextLabel(context.context);
    return {
      field: `seasonality.${context.context.toLowerCase()}`,
      relation: context.relation,
      title: label,
      summary: context.relation === "MATCH"
        ? `현재 월은 문헌에서 확인된 이 어종의 ${label} 범위에 포함됩니다.`
        : `현재 월은 문헌에서 확인된 이 어종의 ${label} 범위에 포함되지 않습니다.`,
      details: [`관측 월: ${seasonality.observedMonth}월`, `근거 월: ${context.months.join(", ")}월`],
      evidenceRefs: context.evidenceIds,
      freshnessNote: freshnessNote(comparison),
      limitationNote: null,
      qualityClass: FISHING_CONDITION_EXPLANATION_QUALITY_CLASS,
    };
  });
}

function categoricalExplanation(
  field: "activity" | "habitat",
  relation: ComparisonRelation,
  comparison: FishingConditionComparison,
): FishingConditionExplanation {
  const activity = field === "activity";
  const summary = activity
    ? "현재 환경 자료에는 문헌상 활동 시간대와 직접 비교할 수 있는 시간대 분류가 없어 비교하지 않았습니다."
    : "현재 선택한 환경 데이터에는 서식지 유형 정보가 없어 비교하지 않았습니다.";
  return {
    field,
    relation,
    title: activity ? "활동 시간대 비교" : "서식지 비교",
    summary,
    details: activity ? [`프로파일 활동 시간대: ${comparison.comparisons.activity.profileActivityPeriod}`] : [],
    evidenceRefs: [],
    freshnessNote: freshnessNote(comparison),
    limitationNote: "환경 자료에 없는 분류를 임의로 생성하지 않았습니다.",
    qualityClass: FISHING_CONDITION_EXPLANATION_QUALITY_CLASS,
  };
}

export function explainFishingCondition(comparison: FishingConditionComparison) {
  const explanations: FishingConditionExplanation[] = [
    numericExplanation("temperature", comparison.comparisons.temperature, comparison),
    numericExplanation("depth", comparison.comparisons.depth, comparison),
    ...seasonalityExplanations(comparison),
    numericExplanation("salinity", comparison.comparisons.salinity, comparison),
    numericExplanation("dissolvedOxygen", comparison.comparisons.dissolvedOxygen, comparison),
    categoricalExplanation("activity", comparison.comparisons.activity.relation, comparison),
    categoricalExplanation("habitat", comparison.comparisons.habitat.relation, comparison),
  ];
  return {
    locale: FISHING_CONDITION_EXPLANATION_LOCALE,
    comparison,
    explanations,
    explanationLineage: {
      environment: comparison.sourceLineage.environmentSource,
      speciesProfile: comparison.sourceLineage.speciesProfileSource,
      comparison: comparison.qualityClass,
      explanation: FISHING_CONDITION_EXPLANATION_QUALITY_CLASS,
    },
    qualityClass: FISHING_CONDITION_EXPLANATION_QUALITY_CLASS,
  };
}

export const FISHING_CONDITION_EXPLANATION_TEMPLATE_RELATIONS = [
  "WITHIN_RANGE",
  "BELOW_RANGE",
  "ABOVE_RANGE",
  "MATCH",
  "MISMATCH",
  "UNSUPPORTED_PROFILE",
  "UNSUPPORTED_ENVIRONMENT",
  "MISSING_ENVIRONMENT",
  "UNIT_MISMATCH",
  "UNIT_UNVERIFIED",
  "DEPTH_CONTEXT_UNRESOLVED",
  "CONFLICT_REVIEW_REQUIRED",
  "UNKNOWN",
] as const;

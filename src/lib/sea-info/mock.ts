import type { DataFreshness, SeaSummary, SeaSummaryStatus, SourceOrganization } from "@/lib/sea-info/types";

export const homeSeaSummaryMock: SeaSummary = {
  status: "partial",
  locationName: "부산 앞바다",
  tide: {
    nextHighTideAt: "15:40",
    nextLowTideAt: "21:55",
    tidePhase: "rising"
  },
  weather: {
    windSpeedMps: 5.8,
    windDirection: "SW",
    significantWaveHeightM: 0.7,
    waterTemperatureC: null
  },
  warning: {
    hasMarineWarning: false,
    warningType: null
  },
  metadata: {
    sourceOrganizations: ["BLUE_MARINA_MOCK"],
    observedAt: "2026-07-26T06:30:00+09:00",
    issuedAt: "2026-07-26T06:00:00+09:00",
    updatedAt: "2026-07-26T06:32:00+09:00",
    freshness: "stale",
    isMock: true
  },
  partialReasons: ["WEATHER_MISSING"]
};

export function getSeaSummaryStatusLabel(status: SeaSummaryStatus) {
  switch (status) {
    case "loading":
      return "불러오는 중";
    case "ready":
      return "정상";
    case "partial":
      return "일부 수신";
    case "unavailable":
      return "연결 대기";
    case "stale":
      return "지연";
    default:
      return "확인 중";
  }
}

export function getFreshnessLabel(freshness: DataFreshness) {
  switch (freshness) {
    case "fresh":
      return "최신";
    case "recent":
      return "최근";
    case "stale":
      return "지연";
    case "unknown":
    default:
      return "미확인";
  }
}

export function getSourceOrganizationsLabel(sourceOrganizations: SourceOrganization[]) {
  if (sourceOrganizations.length === 0) {
    return "출처 미지정";
  }

  return sourceOrganizations.join(" · ");
}

export function formatSeaValue(value: number | string | null | undefined, unit = "") {
  if (value === null || value === undefined || value === "") {
    return "데이터 없음";
  }

  return `${value}${unit}`;
}

export function getSeaSummaryMetaLine(summary: SeaSummary) {
  const sourceLabel = getSourceOrganizationsLabel(summary.metadata.sourceOrganizations);
  const updatedAt = summary.metadata.updatedAt ? summary.metadata.updatedAt.slice(11, 16) : "시각 미정";
  return `${sourceLabel} · ${updatedAt} 갱신`;
}

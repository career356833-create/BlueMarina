export const SOURCE_ALIGNMENT_QUALITY_CLASS = "DERIVED_SOURCE_ALIGNMENT" as const;

export const SOURCE_ALIGNMENT_SOURCE_IDS = [
  "nifs-risa",
  "nifs-femo-sea",
  "kma-marine-weather-observations",
  "kma-marine-weather-forecast",
  "khoa-ocean-current-model",
] as const;

export type AlignmentSourceId = typeof SOURCE_ALIGNMENT_SOURCE_IDS[number];
export type AlignmentDepthTarget = "SURFACE" | "MIDDLE" | "BOTTOM" | { exactDepthM: number } | null;
export type DepthMatchStatus = "EXACT" | "CATEGORY_MATCH" | "UNRESOLVED" | "NOT_APPLICABLE";
export type AlignmentStatus = "ALIGNED" | "PARTIAL" | "UNAVAILABLE" | "SPATIAL_MISMATCH" | "TEMPORAL_MISMATCH" | "DEPTH_MISMATCH" | "UNIT_UNVERIFIED";
export type SourceQualityClass = "OBSERVED" | "OBSERVED_PERIODIC_ENVIRONMENT" | "MODEL" | "FORECAST" | "HISTORICAL" | "DERIVED";
export type TimeSemantic = "OBSERVED_AT" | "FORECAST_AT" | "MODEL_VALID_AT" | "SAMPLED_AT" | "UNKNOWN";
export type UnitStatus = "CONFIRMED" | "UNVERIFIED";

export type AlignmentValue = { value: string | number | boolean | null; unit: string | null; unitStatus: UnitStatus };
export type SourceLocation = { latitude: number | null; longitude: number | null };

export type AlignedSourceResult = {
  sourceId: AlignmentSourceId;
  provider: string;
  qualityClass: SourceQualityClass;
  status: AlignmentStatus;
  sourceBindingId: string;
  sourceLocation: SourceLocation;
  distanceMeters: number | null;
  observedOrValidAt: string | null;
  timeSemantic: TimeSemantic;
  sourceTimezone: string;
  timeOffsetMinutes: number | null;
  absoluteTimeOffsetMinutes: number | null;
  freshness: string | null;
  depthContext: string | null;
  depthMatchStatus: DepthMatchStatus;
  values: Record<string, AlignmentValue>;
  limitations: string[];
};

export type FishingConditionAlignmentContext = {
  target: { latitude: number; longitude: number; requestedAt: string; depthContext: AlignmentDepthTarget };
  sources: AlignedSourceResult[];
  summary: { requestedSources: number; alignedSources: number; unavailableSources: number; partialSources: number };
  qualityClass: typeof SOURCE_ALIGNMENT_QUALITY_CLASS;
};

export function haversineDistanceMeters(a: { latitude: number; longitude: number }, b: SourceLocation) {
  if (b.latitude === null || b.longitude === null) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusM = 6_371_008.8;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadiusM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

export function timeOffsets(sourceTime: string | null, requestedAt: string, timezone: string) {
  if (!sourceTime || /UNSPECIFIED|UNKNOWN/.test(timezone)) return { timeOffsetMinutes: null, absoluteTimeOffsetMinutes: null };
  const sourceMs = Date.parse(sourceTime);
  const requestedMs = Date.parse(requestedAt);
  if (!Number.isFinite(sourceMs) || !Number.isFinite(requestedMs)) return { timeOffsetMinutes: null, absoluteTimeOffsetMinutes: null };
  const signed = Math.round((sourceMs - requestedMs) / 60_000);
  return { timeOffsetMinutes: signed, absoluteTimeOffsetMinutes: Math.abs(signed) };
}

export function depthMatch(target: AlignmentDepthTarget, sourceCategory: string | null, sourceExactDepthM: number | null = null): DepthMatchStatus {
  if (sourceCategory === null) return "NOT_APPLICABLE";
  if (target === null) return "UNRESOLVED";
  if (typeof target === "string") return target === sourceCategory ? "CATEGORY_MATCH" : "UNRESOLVED";
  if (sourceExactDepthM === null) return "UNRESOLVED";
  return target.exactDepthM === sourceExactDepthM ? "EXACT" : "UNRESOLVED";
}

export function value(value: AlignmentValue["value"], unit: string | null, unitStatus: UnitStatus = "CONFIRMED"): AlignmentValue {
  return { value, unit, unitStatus };
}

export function buildAlignmentContext(target: FishingConditionAlignmentContext["target"], sources: AlignedSourceResult[]): FishingConditionAlignmentContext {
  return {
    target,
    sources,
    summary: {
      requestedSources: sources.length,
      alignedSources: sources.filter((source) => source.status === "ALIGNED").length,
      unavailableSources: sources.filter((source) => source.status === "UNAVAILABLE").length,
      partialSources: sources.filter((source) => source.status !== "ALIGNED" && source.status !== "UNAVAILABLE").length,
    },
    qualityClass: SOURCE_ALIGNMENT_QUALITY_CLASS,
  };
}

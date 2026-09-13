import { SOURCE_ALIGNMENT_SOURCE_IDS, type AlignmentDepthTarget, type AlignmentSourceId } from "./source-alignment";

type RisaBinding = { stationId: string };
type FemoBinding = { siteId: string };
type KmaObservationBinding = { stationId: string };
type KmaForecastBinding = { zoneId: string; issueAt: string; validAt: string };
type RomsBinding = { latitude: number; longitude: number; validAt: string };

export type SourceAlignmentRequest = {
  target: { latitude: number; longitude: number; requestedAt: string; depthContext: AlignmentDepthTarget };
  bindings: {
    "nifs-risa"?: RisaBinding;
    "nifs-femo-sea"?: FemoBinding;
    "kma-marine-weather-observations"?: KmaObservationBinding;
    "kma-marine-weather-forecast"?: KmaForecastBinding;
    "khoa-ocean-current-model"?: RomsBinding;
  };
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finite(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function nonempty(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function depth(value: unknown): AlignmentDepthTarget | undefined {
  if (value === null) return null;
  if (value === "SURFACE" || value === "MIDDLE" || value === "BOTTOM") return value;
  const item = record(value);
  const exactDepthM = item ? finite(item.exactDepthM, 0, 12_000) : null;
  return exactDepthM === null ? undefined : { exactDepthM };
}

export function parseSourceAlignmentRequest(input: unknown): SourceAlignmentRequest | null {
  const root = record(input);
  const target = record(root?.target);
  const bindings = record(root?.bindings);
  if (!target || !bindings || Object.keys(bindings).length === 0) return null;
  const latitude = finite(target.latitude, -90, 90);
  const longitude = finite(target.longitude, -180, 180);
  const requestedAt = nonempty(target.requestedAt);
  const depthContext = depth(target.depthContext);
  if (latitude === null || longitude === null || !requestedAt || !Number.isFinite(Date.parse(requestedAt)) || depthContext === undefined) return null;
  const supported = new Set<string>(SOURCE_ALIGNMENT_SOURCE_IDS);
  if (Object.keys(bindings).some((key) => !supported.has(key))) return null;

  const parsed: SourceAlignmentRequest["bindings"] = {};
  for (const sourceId of Object.keys(bindings) as AlignmentSourceId[]) {
    const binding = record(bindings[sourceId]);
    if (!binding) return null;
    if (sourceId === "nifs-risa" || sourceId === "kma-marine-weather-observations") {
      const stationId = nonempty(binding.stationId); if (!stationId || Object.keys(binding).length !== 1) return null;
      parsed[sourceId] = { stationId };
    } else if (sourceId === "nifs-femo-sea") {
      const siteId = nonempty(binding.siteId); if (!siteId || Object.keys(binding).length !== 1) return null;
      parsed[sourceId] = { siteId };
    } else if (sourceId === "kma-marine-weather-forecast") {
      const zoneId = nonempty(binding.zoneId); const issueAt = nonempty(binding.issueAt); const validAt = nonempty(binding.validAt);
      if (!zoneId || !/^\d+:\d+$/.test(zoneId) || !issueAt || !/^\d{10}$/.test(issueAt) || !validAt || !/^\d{10}$/.test(validAt)) return null;
      parsed[sourceId] = { zoneId, issueAt, validAt };
    } else {
      const pointLatitude = finite(binding.latitude, -90, 90); const pointLongitude = finite(binding.longitude, -180, 180); const validAt = nonempty(binding.validAt);
      if (pointLatitude === null || pointLongitude === null || !validAt || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(validAt)) return null;
      parsed[sourceId] = { latitude: pointLatitude, longitude: pointLongitude, validAt };
    }
  }
  return { target: { latitude, longitude, requestedAt, depthContext }, bindings: parsed };
}

export const NIFS_RISA_PROVIDER = "NIFS" as const;
export const NIFS_RISA_SOURCE_ID = "nifs-risa" as const;
export const NIFS_RISA_QUALITY_CLASS = "OBSERVED" as const;
export const NIFS_RISA_SOURCE_TIMEZONE = "UNSPECIFIED_BY_NIFS" as const;
export const NIFS_RISA_UNIT = "degC" as const;
export const NIFS_RISA_FRESH_MS = 45 * 60 * 1_000;
export const NIFS_RISA_STALE_MS = 2 * 60 * 60 * 1_000;

export const FISHING_CONDITION_REALTIME_INPUT_REGISTRY = [
  { field: "waterTemperature.surfaceC", provider: NIFS_RISA_PROVIDER, sourceId: NIFS_RISA_SOURCE_ID, qualityClass: NIFS_RISA_QUALITY_CLASS, depthContext: "SURFACE", unit: NIFS_RISA_UNIT },
  { field: "waterTemperature.middleC", provider: NIFS_RISA_PROVIDER, sourceId: NIFS_RISA_SOURCE_ID, qualityClass: NIFS_RISA_QUALITY_CLASS, depthContext: "MIDDLE", unit: NIFS_RISA_UNIT },
  { field: "waterTemperature.bottomC", provider: NIFS_RISA_PROVIDER, sourceId: NIFS_RISA_SOURCE_ID, qualityClass: NIFS_RISA_QUALITY_CLASS, depthContext: "BOTTOM", unit: NIFS_RISA_UNIT },
] as const;

// The inspected live response contained no numeric sentinel. Do not invent one.
export const NIFS_RISA_OBSERVED_TEMPERATURE_SENTINELS = new Set<string>();

export type NifsRealtimeFreshness = "fresh" | "stale" | "unavailable";
export type NifsDepthContext = "SURFACE" | "MIDDLE" | "BOTTOM" | "UNKNOWN";

export type NifsRealtimeFishingStation = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  depthMeters: {
    surface: number | null;
    middle: number | null;
    bottom: number | null;
  };
  source: typeof NIFS_RISA_PROVIDER;
};

export type NifsRealtimeWaterTemperature = {
  stationId: string;
  observedAt: string;
  rawObservedAt: string;
  depthContext: NifsDepthContext;
  waterTemperatureC: number | null;
  repairStatus: "NORMAL" | "MAINTENANCE" | "UNKNOWN";
  repairRequested: boolean | null;
};

export type FishingConditionRealtimeEnvironment = {
  stationId: string;
  stationName: string;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  observedAt: string;
  rawObservedAt: string;
  sourceTimezone: typeof NIFS_RISA_SOURCE_TIMEZONE;
  waterTemperature: {
    surfaceC: number | null;
    middleC: number | null;
    bottomC: number | null;
    unknownDepthC: number[];
    unit: typeof NIFS_RISA_UNIT;
  };
  depthMeters: {
    surface: number | null;
    middle: number | null;
    bottom: number | null;
  };
  repairStatus: "NORMAL" | "MAINTENANCE" | "UNKNOWN";
  repairRequested: boolean | null;
  freshness: NifsRealtimeFreshness;
  qualityClass: typeof NIFS_RISA_QUALITY_CLASS;
  provider: typeof NIFS_RISA_PROVIDER;
  sourceId: typeof NIFS_RISA_SOURCE_ID;
  fetchedAt: string;
};

export type NifsRealtimeQuality = {
  stationRows: number;
  activeStations: number;
  observationRows: number;
  observationStations: number;
  groupedStationTimestamps: number;
  returnedStations: number;
  coordinateRows: number;
  exactStationJoins: number;
  observationsWithoutMetadata: string[];
  surfaceRows: number;
  middleRows: number;
  bottomRows: number;
  unknownDepthRows: number;
  temperaturePresent: number;
  temperatureMissing: number;
  normalRows: number;
  maintenanceRows: number;
  unknownRepairRows: number;
  repairRequestedRows: number;
  duplicateStationTimestampLayers: number;
  stationNameMismatches: number;
  invalidTimestamps: number;
  observedTemperatureSentinels: Record<string, number>;
  newestObservedAt: string | null;
  oldestObservedAt: string | null;
  medianAgeMinutes: number | null;
  freshnessDistribution: Record<NifsRealtimeFreshness, number>;
};

type RawStation = Record<string, unknown>;
type RawObservation = Record<string, unknown>;

function asText(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

export function normalizeNifsRisaNumber(value: unknown) {
  const normalized = asText(value);
  if (normalized === null || NIFS_RISA_OBSERVED_TEMPERATURE_SENTINELS.has(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function validCoordinate(latitude: number, longitude: number) {
  return latitude >= 30 && latitude <= 40 && longitude >= 120 && longitude <= 135;
}

export function parseNifsRisaStations(rows: RawStation[]): NifsRealtimeFishingStation[] {
  const byId = new Map<string, NifsRealtimeFishingStation>();
  for (const row of rows) {
    const id = asText(row.sta_cde);
    const name = asText(row.sta_nam_kor);
    if (!id || !name || byId.has(id)) continue;
    const latitudeValue = normalizeNifsRisaNumber(row.lat);
    const longitudeValue = normalizeNifsRisaNumber(row.lon);
    const coordinatesValid = latitudeValue !== null && longitudeValue !== null && validCoordinate(latitudeValue, longitudeValue);
    byId.set(id, {
      id,
      name,
      latitude: coordinatesValid ? latitudeValue : null,
      longitude: coordinatesValid ? longitudeValue : null,
      region: asText(row.gru_nam),
      depthMeters: {
        surface: normalizeNifsRisaNumber(row.sur_dep),
        middle: normalizeNifsRisaNumber(row.mid_dep),
        bottom: normalizeNifsRisaNumber(row.bot_dep),
      },
      source: NIFS_RISA_PROVIDER,
    });
  }
  return [...byId.values()];
}

export function parseNifsRisaTimestamp(dateValue: unknown, timeValue: unknown) {
  const date = asText(dateValue);
  const time = asText(timeValue);
  if (!date || !time) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})\|(\d{2}):(\d{2}):(\d{2})$/.exec(date + "|" + time);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const parts = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const probe = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  if (probe.getUTCFullYear() !== parts[0] || probe.getUTCMonth() !== parts[1] - 1 || probe.getUTCDate() !== parts[2] || probe.getUTCHours() !== parts[3] || probe.getUTCMinutes() !== parts[4] || probe.getUTCSeconds() !== parts[5]) return null;
  return date + "T" + time;
}

export function parseNifsRisaDepth(value: unknown): NifsDepthContext {
  const layer = asText(value);
  if (layer === "1") return "SURFACE";
  if (layer === "2") return "MIDDLE";
  if (layer === "3") return "BOTTOM";
  return "UNKNOWN";
}

function parseRepairStatus(value: unknown): NifsRealtimeWaterTemperature["repairStatus"] {
  const status = asText(value);
  if (status === "1") return "NORMAL";
  if (status === "2") return "MAINTENANCE";
  return "UNKNOWN";
}

function parseBooleanFlag(value: unknown) {
  const flag = asText(value)?.toUpperCase();
  if (flag === "Y") return true;
  if (flag === "N") return false;
  return null;
}

export function parseNifsRisaObservations(rows: RawObservation[]) {
  return rows.map((row) => {
    const stationId = asText(row.sta_cde);
    const observedAt = parseNifsRisaTimestamp(row.obs_dat, row.obs_tim);
    if (!stationId || !observedAt) return null;
    return {
      stationId,
      stationName: asText(row.sta_nam_kor),
      observedAt,
      rawObservedAt: asText(row.obs_dat) + " " + asText(row.obs_tim),
      depthContext: parseNifsRisaDepth(row.obs_lay),
      waterTemperatureC: normalizeNifsRisaNumber(row.wtr_tmp),
      repairStatus: parseRepairStatus(row.repair_gbn ?? row.repaire_gbn),
      repairRequested: parseBooleanFlag(row.rpr_yn),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);
}

export function formatAsiaSeoulWallClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day + "T" + values.hour + ":" + values.minute + ":" + values.second;
}

function wallClockMs(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
}

export function nifsRisaAgeMs(observedAt: string, currentSourceLocalAt: string) {
  const observed = wallClockMs(observedAt);
  const current = wallClockMs(currentSourceLocalAt);
  if (observed === null || current === null) return null;
  return Math.max(0, current - observed);
}

export function deriveNifsRisaFreshness(observedAt: string | null | undefined, currentSourceLocalAt: string): NifsRealtimeFreshness {
  if (!observedAt) return "unavailable";
  const age = nifsRisaAgeMs(observedAt, currentSourceLocalAt);
  if (age === null) return "unavailable";
  if (age <= NIFS_RISA_FRESH_MS) return "fresh";
  if (age <= NIFS_RISA_STALE_MS) return "stale";
  return "unavailable";
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildNifsRisaEnvironment(stationRows: RawStation[], observationRows: RawObservation[], fetchedAt = new Date().toISOString(), currentSourceLocalAt = formatAsiaSeoulWallClock()) {
  const stations = parseNifsRisaStations(stationRows);
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const observations = parseNifsRisaObservations(observationRows);
  const grouped = new Map<string, typeof observations>();
  for (const observation of observations) {
    const key = observation.stationId + "|" + observation.observedAt;
    const group = grouped.get(key) ?? [];
    group.push(observation);
    grouped.set(key, group);
  }

  const duplicateStationTimestampLayers = [...grouped.values()].reduce((count, group) => count + (group.length - new Set(group.map((row) => row.depthContext)).size), 0);
  const latestByStation = new Map<string, typeof observations>();
  for (const group of grouped.values()) {
    const stationId = group[0].stationId;
    const previous = latestByStation.get(stationId);
    if (!previous || group[0].observedAt > previous[0].observedAt) latestByStation.set(stationId, group);
  }

  let stationNameMismatches = 0;
  const environments: FishingConditionRealtimeEnvironment[] = [];
  for (const group of latestByStation.values()) {
    const first = group[0];
    const station = stationById.get(first.stationId);
    if (station && first.stationName && station.name !== first.stationName) stationNameMismatches += 1;
    const temperature = { surfaceC: null as number | null, middleC: null as number | null, bottomC: null as number | null, unknownDepthC: [] as number[], unit: NIFS_RISA_UNIT };
    for (const row of group) {
      if (row.depthContext === "SURFACE" && temperature.surfaceC === null) temperature.surfaceC = row.waterTemperatureC;
      else if (row.depthContext === "MIDDLE" && temperature.middleC === null) temperature.middleC = row.waterTemperatureC;
      else if (row.depthContext === "BOTTOM" && temperature.bottomC === null) temperature.bottomC = row.waterTemperatureC;
      else if (row.depthContext === "UNKNOWN" && row.waterTemperatureC !== null) temperature.unknownDepthC.push(row.waterTemperatureC);
    }
    const repairStatus = group.some((row) => row.repairStatus === "MAINTENANCE") ? "MAINTENANCE" : group.every((row) => row.repairStatus === "NORMAL") ? "NORMAL" : "UNKNOWN";
    const repairRequested = group.some((row) => row.repairRequested === true) ? true : group.every((row) => row.repairRequested === false) ? false : null;
    environments.push({
      stationId: first.stationId, stationName: station?.name ?? first.stationName ?? first.stationId,
      latitude: station?.latitude ?? null, longitude: station?.longitude ?? null, region: station?.region ?? null,
      observedAt: first.observedAt, rawObservedAt: first.rawObservedAt, sourceTimezone: NIFS_RISA_SOURCE_TIMEZONE,
      waterTemperature: temperature, depthMeters: station?.depthMeters ?? { surface: null, middle: null, bottom: null },
      repairStatus, repairRequested, freshness: deriveNifsRisaFreshness(first.observedAt, currentSourceLocalAt),
      qualityClass: NIFS_RISA_QUALITY_CLASS, provider: NIFS_RISA_PROVIDER, sourceId: NIFS_RISA_SOURCE_ID, fetchedAt,
    });
  }
  environments.sort((a, b) => a.stationId.localeCompare(b.stationId));

  const observedAges = observations.map((row) => nifsRisaAgeMs(row.observedAt, currentSourceLocalAt)).filter((value): value is number => value !== null);
  const freshnessDistribution: Record<NifsRealtimeFreshness, number> = { fresh: 0, stale: 0, unavailable: 0 };
  for (const environment of environments) freshnessDistribution[environment.freshness] += 1;
  const stationIds = new Set(stations.map((station) => station.id));
  const observationIds = new Set(observations.map((row) => row.stationId));
  const timestamps = observations.map((row) => row.observedAt).sort();
  const activeStationRows = stationRows.filter((row) => !asText(row.end_dat));
  const quality: NifsRealtimeQuality = {
    stationRows: stationRows.length, activeStations: new Set(activeStationRows.map((row) => asText(row.sta_cde)).filter(Boolean)).size,
    observationRows: observationRows.length, observationStations: observationIds.size, groupedStationTimestamps: grouped.size, returnedStations: environments.length,
    coordinateRows: stations.filter((station) => station.latitude !== null && station.longitude !== null).length, exactStationJoins: [...observationIds].filter((id) => stationIds.has(id)).length,
    observationsWithoutMetadata: [...observationIds].filter((id) => !stationIds.has(id)).sort(),
    surfaceRows: observations.filter((row) => row.depthContext === "SURFACE").length, middleRows: observations.filter((row) => row.depthContext === "MIDDLE").length,
    bottomRows: observations.filter((row) => row.depthContext === "BOTTOM").length, unknownDepthRows: observations.filter((row) => row.depthContext === "UNKNOWN").length,
    temperaturePresent: observations.filter((row) => row.waterTemperatureC !== null).length, temperatureMissing: observations.filter((row) => row.waterTemperatureC === null).length,
    normalRows: observations.filter((row) => row.repairStatus === "NORMAL").length,
    maintenanceRows: observations.filter((row) => row.repairStatus === "MAINTENANCE").length,
    unknownRepairRows: observations.filter((row) => row.repairStatus === "UNKNOWN").length,
    repairRequestedRows: observations.filter((row) => row.repairRequested === true).length,
    duplicateStationTimestampLayers, stationNameMismatches, invalidTimestamps: observationRows.length - observations.length, observedTemperatureSentinels: {},
    newestObservedAt: timestamps.at(-1) ?? null, oldestObservedAt: timestamps[0] ?? null,
    medianAgeMinutes: median(observedAges) === null ? null : Math.round((median(observedAges) as number) / 60_000), freshnessDistribution,
  };
  return { stations: environments, quality };
}

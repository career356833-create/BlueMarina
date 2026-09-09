export const NIFS_FEMO_PROVIDER = "NIFS" as const;
export const NIFS_FEMO_SOURCE_ID = "nifs-femo-sea" as const;
export const NIFS_FEMO_QUALITY_CLASS = "OBSERVED_PERIODIC_ENVIRONMENT" as const;
export const NIFS_FEMO_SOURCE_TIMEZONE = "UNSPECIFIED_BY_NIFS" as const;
export const NIFS_FEMO_FRESH_MS = 120 * 24 * 60 * 60 * 1_000;
export const NIFS_FEMO_STALE_MS = 365 * 24 * 60 * 60 * 1_000;

export type NifsFemoUnit = "degC" | "mg/L" | "ug/L" | "pH" | "m" | "UNIT_NOT_DOCUMENTED";
export type NifsFemoFreshness = "fresh" | "stale" | "unavailable";
export type NifsFemoDepthContext = {
  kind: "SURFACE_BOTTOM_PAIR";
  waterDepthM: number | null;
};

type FeatureDefinition = {
  field: string;
  sourceFields: readonly [string, string];
  unit: NifsFemoUnit;
};

export const NIFS_FEMO_FEATURES = {
  waterTemperature: { field: "waterTemperature", sourceFields: ["TEMP_S", "TEMP_B"], unit: "degC" },
  salinity: { field: "salinity", sourceFields: ["SAL_S", "SAL_B"], unit: "UNIT_NOT_DOCUMENTED" },
  ph: { field: "ph", sourceFields: ["PH_S", "PH_B"], unit: "pH" },
  dissolvedOxygen: { field: "dissolvedOxygen", sourceFields: ["DO_S", "DO_B"], unit: "mg/L" },
  chemicalOxygenDemand: { field: "chemicalOxygenDemand", sourceFields: ["COD_S", "COD_B"], unit: "mg/L" },
  ammoniaNitrogen: { field: "ammoniaNitrogen", sourceFields: ["NH4_N_S", "NH4_N_B"], unit: "mg/L" },
  nitrateNitrogen: { field: "nitrateNitrogen", sourceFields: ["NO3_N_S", "NO3_N_B"], unit: "mg/L" },
  nitriteNitrogen: { field: "nitriteNitrogen", sourceFields: ["NO2_N_S", "NO2_N_B"], unit: "mg/L" },
  dissolvedInorganicNitrogen: { field: "dissolvedInorganicNitrogen", sourceFields: ["DIN_S", "DIN_B"], unit: "mg/L" },
  totalNitrogen: { field: "totalNitrogen", sourceFields: ["TN_S", "TN_B"], unit: "mg/L" },
  dissolvedInorganicPhosphorus: { field: "dissolvedInorganicPhosphorus", sourceFields: ["DIP_S", "DIP_B"], unit: "mg/L" },
  totalPhosphorus: { field: "totalPhosphorus", sourceFields: ["TP_S", "TP_B"], unit: "mg/L" },
  silicateSilicon: { field: "silicateSilicon", sourceFields: ["SIL_S", "SIL_B"], unit: "mg/L" },
  chlorophyllA: { field: "chlorophyllA", sourceFields: ["CHL_S", "CHL_B"], unit: "ug/L" },
  suspendedSolids: { field: "suspendedSolids", sourceFields: ["SS_S", "SS_B"], unit: "mg/L" },
} as const satisfies Record<string, FeatureDefinition>;

export const FISHING_CONDITION_FISHERY_INPUT_REGISTRY = Object.values(NIFS_FEMO_FEATURES).map((feature) => ({
  field: feature.field,
  provider: NIFS_FEMO_PROVIDER,
  sourceId: NIFS_FEMO_SOURCE_ID,
  qualityClass: NIFS_FEMO_QUALITY_CLASS,
  sampledAt: "sampledAt",
  depthContext: "SURFACE_BOTTOM_PAIR" as const,
  unit: feature.unit,
}));

// No numeric sentinel appeared in the bounded live response. Only blank/null are missing.
export const NIFS_FEMO_OBSERVED_SENTINELS = new Set<string>();

export type NifsFemoMeasurement = {
  surface: number | null;
  bottom: number | null;
  unit: NifsFemoUnit;
};

export type NifsFisheryEnvironmentSample = {
  sourceRecordId: string;
  siteId: string;
  fisheryName: string;
  stationName: string;
  fisheryKind: string | null;
  sampledAt: string;
  rawSampledAt: string;
  sourceTimezone: typeof NIFS_FEMO_SOURCE_TIMEZONE;
  latitude: number | null;
  longitude: number | null;
  depthContext: NifsFemoDepthContext;
  weather: string | null;
  measurements: Record<keyof typeof NIFS_FEMO_FEATURES, NifsFemoMeasurement>;
  transparency: { value: number | null; unit: "UNIT_NOT_DOCUMENTED" };
  freshness: NifsFemoFreshness;
  provider: typeof NIFS_FEMO_PROVIDER;
  sourceId: typeof NIFS_FEMO_SOURCE_ID;
  qualityClass: typeof NIFS_FEMO_QUALITY_CLASS;
  fetchedAt: string;
};

export type NifsFemoQuality = {
  rawRows: number;
  returnedSamples: number;
  uniqueSites: number;
  uniqueFisheries: number;
  coordinateRows: number;
  invalidCoordinates: number;
  invalidTimestamps: number;
  exactDuplicateRows: number;
  conflictingDuplicateRows: number;
  depthRows: number;
  depthMinM: number | null;
  depthMaxM: number | null;
  earliestSampledAt: string | null;
  latestSampledAt: string | null;
  featureCoverage: Record<string, { surface: number; bottom: number; total: number }>;
  observedSentinels: Record<string, number>;
  zeroValues: Record<string, number>;
  freshnessDistribution: Record<NifsFemoFreshness, number>;
};

type RawRow = Record<string, unknown>;

function asText(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

export function normalizeNifsFemoNumber(value: unknown) {
  const normalized = asText(value);
  if (normalized === null || NIFS_FEMO_OBSERVED_SENTINELS.has(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNifsFemoCoordinate(value: unknown, axis: "latitude" | "longitude") {
  const text = asText(value);
  if (!text) return null;
  const decimal = Number(text);
  if (Number.isFinite(decimal)) return validCoordinate(decimal, axis) ? decimal : null;
  const parts = text.match(/^(\d{1,3})[^\d]+(\d{1,2})[^\d]+(\d{1,2}(?:\.\d+)?)\D*$/);
  if (!parts) return null;
  const parsed = Number(parts[1]) + Number(parts[2]) / 60 + Number(parts[3]) / 3600;
  return validCoordinate(parsed, axis) ? parsed : null;
}

function validCoordinate(value: number, axis: "latitude" | "longitude") {
  return axis === "latitude" ? value >= 30 && value <= 40 : value >= 120 && value <= 135;
}

export function parseNifsFemoTimestamp(row: RawRow) {
  const values = [row.DATE_Y, row.DATE_M, row.DATE_D, row.TIME_H, row.TIME_I].map(asText);
  if (values.some((value) => value === null)) return null;
  const parts = values.map(Number);
  if (parts.some((value) => !Number.isInteger(value))) return null;
  const probe = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], 0));
  if (probe.getUTCFullYear() !== parts[0] || probe.getUTCMonth() !== parts[1] - 1 || probe.getUTCDate() !== parts[2] || probe.getUTCHours() !== parts[3] || probe.getUTCMinutes() !== parts[4]) return null;
  return [String(parts[0]).padStart(4, "0"), String(parts[1]).padStart(2, "0"), String(parts[2]).padStart(2, "0")].join("-") + "T" + [String(parts[3]).padStart(2, "0"), String(parts[4]).padStart(2, "0"), "00"].join(":");
}

function sourceIdentityPart(value: string) {
  return encodeURIComponent(value.normalize("NFC"));
}

function wallClockMs(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
}

export function deriveNifsFemoFreshness(sampledAt: string | null | undefined, currentSourceLocalAt: string): NifsFemoFreshness {
  if (!sampledAt) return "unavailable";
  const sampled = wallClockMs(sampledAt);
  const current = wallClockMs(currentSourceLocalAt);
  if (sampled === null || current === null) return "unavailable";
  const age = Math.max(0, current - sampled);
  if (age <= NIFS_FEMO_FRESH_MS) return "fresh";
  if (age <= NIFS_FEMO_STALE_MS) return "stale";
  return "unavailable";
}

function measurement(row: RawRow, feature: FeatureDefinition): NifsFemoMeasurement {
  return {
    surface: normalizeNifsFemoNumber(row[feature.sourceFields[0]]),
    bottom: normalizeNifsFemoNumber(row[feature.sourceFields[1]]),
    unit: feature.unit,
  };
}

function stableRowValue(row: RawRow) {
  return JSON.stringify(Object.keys(row).sort().map((key) => [key, row[key]]));
}

export function buildNifsFemoEnvironment(rows: RawRow[], fetchedAt = new Date().toISOString(), currentSourceLocalAt: string) {
  const byRecordId = new Map<string, { raw: RawRow; sample: NifsFisheryEnvironmentSample }>();
  let invalidCoordinates = 0;
  let invalidTimestamps = 0;
  let exactDuplicateRows = 0;
  let conflictingDuplicateRows = 0;

  for (const row of rows) {
    const fisheryName = asText(row.FISHERY);
    const stationName = asText(row.LOCATION_POINT);
    const sampledAt = parseNifsFemoTimestamp(row);
    if (!fisheryName || !stationName || !sampledAt) {
      if (!sampledAt) invalidTimestamps += 1;
      continue;
    }
    const latitude = parseNifsFemoCoordinate(row.LATITUDE, "latitude");
    const longitude = parseNifsFemoCoordinate(row.LONGITUDE, "longitude");
    if (latitude === null || longitude === null) invalidCoordinates += 1;
    const siteId = `${NIFS_FEMO_SOURCE_ID}:${sourceIdentityPart(fisheryName)}:${sourceIdentityPart(stationName)}`;
    const sourceRecordId = `${siteId}:${sampledAt}`;
    const existing = byRecordId.get(sourceRecordId);
    if (existing) {
      if (stableRowValue(existing.raw) === stableRowValue(row)) exactDuplicateRows += 1;
      else conflictingDuplicateRows += 1;
      continue;
    }
    const measurements = Object.fromEntries(Object.entries(NIFS_FEMO_FEATURES).map(([key, feature]) => [key, measurement(row, feature)])) as NifsFisheryEnvironmentSample["measurements"];
    byRecordId.set(sourceRecordId, {
      raw: row,
      sample: {
        sourceRecordId,
        siteId,
        fisheryName,
        stationName,
        fisheryKind: asText(row.KIND),
        sampledAt,
        rawSampledAt: `${asText(row.DATE_Y)}-${asText(row.DATE_M)}-${asText(row.DATE_D)} ${asText(row.TIME_H)}:${asText(row.TIME_I)}`,
        sourceTimezone: NIFS_FEMO_SOURCE_TIMEZONE,
        latitude,
        longitude,
        depthContext: { kind: "SURFACE_BOTTOM_PAIR", waterDepthM: normalizeNifsFemoNumber(row.DEPTH) },
        weather: asText(row.WEATHER),
        measurements,
        transparency: { value: normalizeNifsFemoNumber(row.M), unit: "UNIT_NOT_DOCUMENTED" },
        freshness: deriveNifsFemoFreshness(sampledAt, currentSourceLocalAt),
        provider: NIFS_FEMO_PROVIDER,
        sourceId: NIFS_FEMO_SOURCE_ID,
        qualityClass: NIFS_FEMO_QUALITY_CLASS,
        fetchedAt,
      },
    });
  }

  const samples = [...byRecordId.values()].map(({ sample }) => sample).sort((a, b) => a.sourceRecordId.localeCompare(b.sourceRecordId));
  const depthValues = samples.map((sample) => sample.depthContext.waterDepthM).filter((value): value is number => value !== null);
  const featureCoverage: NifsFemoQuality["featureCoverage"] = {};
  const zeroValues: Record<string, number> = {};
  for (const feature of Object.keys(NIFS_FEMO_FEATURES) as Array<keyof typeof NIFS_FEMO_FEATURES>) {
    const surface = samples.filter((sample) => sample.measurements[feature].surface !== null).length;
    const bottom = samples.filter((sample) => sample.measurements[feature].bottom !== null).length;
    featureCoverage[feature] = { surface, bottom, total: surface + bottom };
    zeroValues[feature] = samples.reduce((count, sample) => count + Number(sample.measurements[feature].surface === 0) + Number(sample.measurements[feature].bottom === 0), 0);
  }
  const timestamps = samples.map((sample) => sample.sampledAt).sort();
  const freshnessDistribution: Record<NifsFemoFreshness, number> = { fresh: 0, stale: 0, unavailable: 0 };
  for (const sample of samples) freshnessDistribution[sample.freshness] += 1;
  const quality: NifsFemoQuality = {
    rawRows: rows.length,
    returnedSamples: samples.length,
    uniqueSites: new Set(samples.map((sample) => sample.siteId)).size,
    uniqueFisheries: new Set(samples.map((sample) => sample.fisheryName)).size,
    coordinateRows: samples.filter((sample) => sample.latitude !== null && sample.longitude !== null).length,
    invalidCoordinates,
    invalidTimestamps,
    exactDuplicateRows,
    conflictingDuplicateRows,
    depthRows: depthValues.length,
    depthMinM: depthValues.length ? Math.min(...depthValues) : null,
    depthMaxM: depthValues.length ? Math.max(...depthValues) : null,
    earliestSampledAt: timestamps[0] ?? null,
    latestSampledAt: timestamps.at(-1) ?? null,
    featureCoverage,
    observedSentinels: {},
    zeroValues,
    freshnessDistribution,
  };
  return { samples, quality };
}

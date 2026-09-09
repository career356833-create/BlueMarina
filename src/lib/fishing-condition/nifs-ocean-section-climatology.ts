import {
  NIFS_OCEAN_SECTION_PROVIDER,
  NIFS_OCEAN_SECTION_SOURCE_ID,
  NIFS_OCEAN_SECTION_UNIT,
  type NifsOceanSectionProfile,
} from "./nifs-ocean-section";

export const NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID = "nifs-soo-climatology" as const;
export const NIFS_OCEAN_SECTION_CLIMATOLOGY_QUALITY_CLASS = "DERIVED_HISTORICAL_BASELINE" as const;
export const NIFS_OCEAN_SECTION_CLIMATOLOGY_MIN_SAMPLES = 3;
export const NIFS_TEMPERATURE_ANOMALY_QUALITY_CLASS = "DERIVED_ENVIRONMENT_FEATURE" as const;

export type OceanSectionTemperatureClimatology = {
  cellId: string;
  stationId: string;
  regionCode: string;
  regionName: string;
  lineCode: string;
  stationCode: string;
  latitude: number | null;
  longitude: number | null;
  coordinateVariantCount: number;
  month: number;
  depthValue: number;
  depthUnit: typeof NIFS_OCEAN_SECTION_UNIT;
  variable: "waterTemperature";
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  sampleCount: number;
  yearCount: number;
  historyStartYear: number;
  historyEndYear: number;
  qcRawDistribution: Record<string, number>;
  unit: typeof NIFS_OCEAN_SECTION_UNIT;
  provider: typeof NIFS_OCEAN_SECTION_PROVIDER;
  sourceId: typeof NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID;
  qualityClass: typeof NIFS_OCEAN_SECTION_CLIMATOLOGY_QUALITY_CLASS;
  derivedFrom: typeof NIFS_OCEAN_SECTION_SOURCE_ID;
};

export type OceanSectionClimatologyQuality = {
  inputProfiles: number;
  inputDepthSamples: number;
  temperaturePresent: number;
  temperatureMissing: number;
  candidateCells: number;
  emittedCells: number;
  excludedLowSampleCells: number;
  stations: number;
  months: number[];
  depthValues: number[];
  exactDuplicateSamples: number;
  conflictingDuplicateSamples: number;
  standardDeviationCells: number;
  sampleCountDistribution: Record<string, number>;
  yearCountDistribution: Record<string, number>;
  inputQcRawDistribution: Record<string, number>;
  qcRawDistribution: Record<string, number>;
};

type Accumulator = {
  identity: Omit<OceanSectionTemperatureClimatology, "cellId" | "mean" | "median" | "min" | "max" | "standardDeviation" | "sampleCount" | "yearCount" | "historyStartYear" | "historyEndYear" | "qcRawDistribution">;
  samples: Map<string, { value: number; qcRaw: string | null }>;
  years: Set<number>;
  coordinates: Set<string>;
  qcRawDistribution: Record<string, number>;
};

function round(value: number) {
  return Number(value.toFixed(6));
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function sampleStandardDeviation(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function increment(distribution: Record<string, number>, key: string) {
  distribution[key] = (distribution[key] ?? 0) + 1;
}

export function buildOceanSectionTemperatureClimatology(
  profiles: NifsOceanSectionProfile[],
  minSamples = NIFS_OCEAN_SECTION_CLIMATOLOGY_MIN_SAMPLES,
) {
  if (!Number.isInteger(minSamples) || minSamples < 2) throw new Error("INVALID_MIN_SAMPLES");
  const cells = new Map<string, Accumulator>();
  let inputDepthSamples = 0;
  let temperaturePresent = 0;
  let temperatureMissing = 0;
  let exactDuplicateSamples = 0;
  let conflictingDuplicateSamples = 0;
  const inputQcRawDistribution: Record<string, number> = {};

  for (const profile of profiles) {
    const year = Number(profile.observedAt.slice(0, 4));
    const month = Number(profile.observedAt.slice(5, 7));
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) continue;
    for (const sample of profile.samples) {
      inputDepthSamples += 1;
      const value = sample.waterTemperature.value;
      if (value === null) {
        temperatureMissing += 1;
        continue;
      }
      temperaturePresent += 1;
      const depthValue = sample.depth.value;
      const key = `${profile.stationId}|${month}|${depthValue}`;
      let cell = cells.get(key);
      if (!cell) {
        cell = {
          identity: {
            stationId: profile.stationId,
            regionCode: profile.regionCode,
            regionName: profile.regionName,
            lineCode: profile.lineCode,
            stationCode: profile.stationCode,
            latitude: profile.latitude,
            longitude: profile.longitude,
            coordinateVariantCount: 0,
            month,
            depthValue,
            depthUnit: NIFS_OCEAN_SECTION_UNIT,
            variable: "waterTemperature",
            unit: NIFS_OCEAN_SECTION_UNIT,
            provider: NIFS_OCEAN_SECTION_PROVIDER,
            sourceId: NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID,
            qualityClass: NIFS_OCEAN_SECTION_CLIMATOLOGY_QUALITY_CLASS,
            derivedFrom: NIFS_OCEAN_SECTION_SOURCE_ID,
          },
          samples: new Map(),
          years: new Set(),
          coordinates: new Set(),
          qcRawDistribution: {},
        };
        cells.set(key, cell);
      }
      const sampleId = `${profile.stationId}|${profile.observedAt}|${depthValue}`;
      const qcRaw = sample.waterTemperature.qcRaw ?? null;
      const existing = cell.samples.get(sampleId);
      if (existing) {
        if (existing.value === value && existing.qcRaw === qcRaw) exactDuplicateSamples += 1;
        else conflictingDuplicateSamples += 1;
        continue;
      }
      cell.samples.set(sampleId, { value, qcRaw });
      increment(inputQcRawDistribution, qcRaw ?? "MISSING");
      cell.years.add(year);
      if (profile.latitude !== null && profile.longitude !== null) cell.coordinates.add(`${profile.latitude},${profile.longitude}`);
      increment(cell.qcRawDistribution, qcRaw ?? "MISSING");
    }
  }

  const output: OceanSectionTemperatureClimatology[] = [];
  let excludedLowSampleCells = 0;
  for (const [key, cell] of cells) {
    const values = [...cell.samples.values()].map((sample) => sample.value);
    if (values.length < minSamples) {
      excludedLowSampleCells += 1;
      continue;
    }
    const years = [...cell.years].sort((a, b) => a - b);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const middle = median(values);
    const deviation = sampleStandardDeviation(values);
    if (middle === null || deviation === null) throw new Error("CLIMATOLOGY_METRIC_UNAVAILABLE");
    output.push({
      cellId: `${NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID}:${key}`,
      ...cell.identity,
      coordinateVariantCount: cell.coordinates.size,
      mean: round(average),
      median: round(middle),
      min: Math.min(...values),
      max: Math.max(...values),
      standardDeviation: round(deviation),
      sampleCount: values.length,
      yearCount: years.length,
      historyStartYear: years[0],
      historyEndYear: years.at(-1) as number,
      qcRawDistribution: cell.qcRawDistribution,
    });
  }
  output.sort((a, b) => a.month - b.month || a.stationId.localeCompare(b.stationId) || a.depthValue - b.depthValue);

  const sampleCountDistribution: Record<string, number> = {};
  const yearCountDistribution: Record<string, number> = {};
  const qcRawDistribution: Record<string, number> = {};
  for (const cell of output) {
    increment(sampleCountDistribution, String(cell.sampleCount));
    increment(yearCountDistribution, String(cell.yearCount));
    for (const [code, count] of Object.entries(cell.qcRawDistribution)) qcRawDistribution[code] = (qcRawDistribution[code] ?? 0) + count;
  }
  const quality: OceanSectionClimatologyQuality = {
    inputProfiles: profiles.length,
    inputDepthSamples,
    temperaturePresent,
    temperatureMissing,
    candidateCells: cells.size,
    emittedCells: output.length,
    excludedLowSampleCells,
    stations: new Set(output.map((cell) => cell.stationId)).size,
    months: [...new Set(output.map((cell) => cell.month))].sort((a, b) => a - b),
    depthValues: [...new Set(output.map((cell) => cell.depthValue))].sort((a, b) => a - b),
    exactDuplicateSamples,
    conflictingDuplicateSamples,
    standardDeviationCells: output.length,
    sampleCountDistribution,
    yearCountDistribution,
    inputQcRawDistribution,
    qcRawDistribution,
  };
  return { cells: output, quality };
}

export type TemperatureAnomalyGate = {
  stationMapping: "VERIFIED_OFFICIAL" | "ANOMALY_MAPPING_BLOCKED";
  depthMapping: "VERIFIED_EXACT" | "DEPTH_MAPPING_BLOCKED";
  unitCompatibility: "VERIFIED_SAME_UNIT" | "UNIT_COMPATIBILITY_BLOCKED";
};

export function calculateTemperatureAnomaly(input: {
  currentValue: number;
  baseline: OceanSectionTemperatureClimatology;
  currentSourceId: string;
  gate: TemperatureAnomalyGate;
}) {
  if (input.gate.stationMapping !== "VERIFIED_OFFICIAL" || input.gate.depthMapping !== "VERIFIED_EXACT" || input.gate.unitCompatibility !== "VERIFIED_SAME_UNIT") {
    throw new Error("ANOMALY_MAPPING_BLOCKED");
  }
  return {
    currentValue: input.currentValue,
    baselineMean: input.baseline.mean,
    anomaly: round(input.currentValue - input.baseline.mean),
    month: input.baseline.month,
    depthValue: input.baseline.depthValue,
    currentSourceId: input.currentSourceId,
    baselineSourceId: NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID,
    baselineSampleCount: input.baseline.sampleCount,
    baselineYearCount: input.baseline.yearCount,
    qualityClass: NIFS_TEMPERATURE_ANOMALY_QUALITY_CLASS,
  };
}

export const FISHING_CONDITION_CLIMATOLOGY_FEATURE_REGISTRY = [
  {
    feature: "historicalBaseline.waterTemperature",
    sourceId: NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID,
    qualityClass: NIFS_OCEAN_SECTION_CLIMATOLOGY_QUALITY_CLASS,
    status: "CONNECTED" as const,
  },
  {
    feature: "temperatureAnomaly",
    sourceId: NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID,
    qualityClass: NIFS_TEMPERATURE_ANOMALY_QUALITY_CLASS,
    status: "ANOMALY_MAPPING_BLOCKED" as const,
  },
];

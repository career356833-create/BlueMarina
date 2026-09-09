export const NIFS_OCEAN_SECTION_PROVIDER = "NIFS" as const;
export const NIFS_OCEAN_SECTION_SOURCE_ID = "nifs-soo" as const;
export const NIFS_OCEAN_SECTION_QUALITY_CLASS = "HISTORICAL_OCEANOGRAPHIC_PROFILE" as const;
export const NIFS_OCEAN_SECTION_TIMEZONE = "UNSPECIFIED_BY_NIFS" as const;
export const NIFS_OCEAN_SECTION_UNIT = "UNIT_NOT_DOCUMENTED" as const;

export const NIFS_OCEAN_SECTION_REGIONS = ["E", "W", "S", "EC"] as const;
export type NifsOceanSectionRegion = (typeof NIFS_OCEAN_SECTION_REGIONS)[number];

type RawRow = Record<string, unknown>;
type UnitStatus = typeof NIFS_OCEAN_SECTION_UNIT;

export type NifsOceanSectionStation = {
  stationId: string;
  regionCode: NifsOceanSectionRegion;
  regionName: string;
  lineCode: string;
  stationCode: string;
  latitude: number | null;
  longitude: number | null;
  startedOn: string | null;
  endedOn: string | null;
  lifecycle: "END_DATE_UNSET" | "ENDED";
  zooplanktonDepth: { value: number | null; unit: UnitStatus };
  bottomDepth: { value: number | null; unit: UnitStatus };
};

export type NifsOceanSectionMeasurement = {
  value: number | null;
  unit: UnitStatus;
  qcRaw?: string | null;
};

export type NifsOceanSectionDepthSample = {
  depth: { value: number; unit: UnitStatus };
  waterTemperature: NifsOceanSectionMeasurement;
  salinity: NifsOceanSectionMeasurement;
  dissolvedOxygen: NifsOceanSectionMeasurement;
  phosphateP: NifsOceanSectionMeasurement;
  nitriteN: NifsOceanSectionMeasurement;
  nitrateN: NifsOceanSectionMeasurement;
  silicateSi: NifsOceanSectionMeasurement;
  ph: NifsOceanSectionMeasurement;
  transparency: NifsOceanSectionMeasurement;
  pressure: NifsOceanSectionMeasurement;
};

export type NifsOceanSectionProfile = {
  profileId: string;
  stationId: string;
  regionCode: NifsOceanSectionRegion;
  regionName: string;
  lineCode: string;
  stationCode: string;
  observedAt: string;
  rawObservedAt: string;
  sourceTimezone: typeof NIFS_OCEAN_SECTION_TIMEZONE;
  latitude: number | null;
  longitude: number | null;
  metadataLatitude: number | null;
  metadataLongitude: number | null;
  coordinateStatus: "MATCH" | "DRIFT" | "METADATA_MISSING" | "PROFILE_MISSING";
  vesselName: string | null;
  samples: NifsOceanSectionDepthSample[];
  provider: typeof NIFS_OCEAN_SECTION_PROVIDER;
  sourceId: typeof NIFS_OCEAN_SECTION_SOURCE_ID;
  qualityClass: typeof NIFS_OCEAN_SECTION_QUALITY_CLASS;
};

export type NifsOceanSectionQuality = {
  metadataRows: number;
  stations: number;
  duplicateStationRows: number;
  invalidStationCoordinates: number;
  regionCounts: Record<NifsOceanSectionRegion, number>;
  endDateUnset: number;
  ended: number;
  earliestStationStart: string | null;
  latestStationEnd: string | null;
  profileRows: number;
  profiles: number;
  depthSamples: number;
  uniqueDepths: number;
  depthMin: number | null;
  depthMax: number | null;
  depthZeroRows: number;
  invalidProfileRows: number;
  exactDuplicateRows: number;
  conflictingDuplicateRows: number;
  coordinateStatus: Record<NifsOceanSectionProfile["coordinateStatus"], number>;
  coverage: Record<string, { present: number; missing: number }>;
  qcCoverage: Record<"waterTemperature" | "salinity" | "dissolvedOxygen", { present: number; missing: number; distribution: Record<string, number> }>;
  earliestSampledAt: string | null;
  latestSampledAt: string | null;
};

const REGION_NAMES: Record<NifsOceanSectionRegion, string> = {
  E: "East Sea",
  W: "West Sea",
  S: "South Sea",
  EC: "East China Sea",
};

const SOURCE_REGION_CODES: Record<string, NifsOceanSectionRegion> = {
  E: "E",
  W: "W",
  S: "S",
  EC: "EC",
  "동해": "E",
  "서해": "W",
  "남해": "S",
  "동중국해": "EC",
};

const MEASUREMENT_FIELDS = {
  waterTemperature: "wtr_tmp",
  salinity: "sal",
  dissolvedOxygen: "dox",
  phosphateP: "nut_po4_p",
  nitriteN: "nut_no2_n",
  nitrateN: "nut_no3_n",
  silicateSi: "nut_sio2_si",
  ph: "nut_ph",
  transparency: "wtr_trn",
  pressure: "atm",
} as const;

export const FISHING_CONDITION_OCEAN_SECTION_INPUT_REGISTRY = [
  "historical.waterTemperatureByDepth",
  "historical.salinityByDepth",
  "historical.dissolvedOxygenByDepth",
  "historical.phosphate",
  "historical.nitrite",
  "historical.nitrate",
  "historical.silicate",
].map((feature) => ({
  feature,
  provider: NIFS_OCEAN_SECTION_PROVIDER,
  sourceId: NIFS_OCEAN_SECTION_SOURCE_ID,
  qualityClass: NIFS_OCEAN_SECTION_QUALITY_CLASS,
  unit: NIFS_OCEAN_SECTION_UNIT,
  engineUse: "NOT_ENABLED" as const,
}));

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

export function normalizeNifsOceanSectionNumber(value: unknown) {
  const normalized = text(value);
  if (normalized === null) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isNifsOceanSectionRegion(value: string): value is NifsOceanSectionRegion {
  return NIFS_OCEAN_SECTION_REGIONS.includes(value as NifsOceanSectionRegion);
}

export function nifsOceanSectionStationId(lineCode: string, stationCode: string) {
  return `${lineCode}-${stationCode}`;
}

function coordinate(value: unknown, axis: "latitude" | "longitude") {
  const parsed = normalizeNifsOceanSectionNumber(value);
  if (parsed === null) return null;
  const valid = axis === "latitude" ? parsed >= 30 && parsed <= 40 : parsed >= 120 && parsed <= 135;
  return valid ? parsed : null;
}

function sourceRegion(value: unknown) {
  const normalized = text(value);
  return normalized ? SOURCE_REGION_CODES[normalized] ?? null : null;
}

function sourceDate(value: unknown) {
  const normalized = text(value);
  if (normalized === null) return null;
  const digits = normalized.replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseNifsOceanSectionTimestamp(value: unknown) {
  const normalized = text(value);
  if (normalized === null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00"] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const probe = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  if (probe.getUTCFullYear() !== parts[0] || probe.getUTCMonth() !== parts[1] - 1 || probe.getUTCDate() !== parts[2] || probe.getUTCHours() !== parts[3] || probe.getUTCMinutes() !== parts[4] || probe.getUTCSeconds() !== parts[5]) return null;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export function buildNifsOceanSectionStations(rowsByRegion: Partial<Record<NifsOceanSectionRegion, RawRow[]>>) {
  const stations = new Map<string, NifsOceanSectionStation>();
  let duplicateStationRows = 0;
  let invalidStationCoordinates = 0;
  const regionCounts: Record<NifsOceanSectionRegion, number> = { E: 0, W: 0, S: 0, EC: 0 };

  for (const regionCode of NIFS_OCEAN_SECTION_REGIONS) {
    for (const row of rowsByRegion[regionCode] ?? []) {
      const lineCode = text(row.sln_cde);
      const stationCode = text(row.sta_cde);
      if (!lineCode || !stationCode) continue;
      const stationId = nifsOceanSectionStationId(lineCode, stationCode);
      if (stations.has(stationId)) {
        duplicateStationRows += 1;
        continue;
      }
      const latitude = coordinate(row.lat, "latitude");
      const longitude = coordinate(row.lon, "longitude");
      if (latitude === null || longitude === null) invalidStationCoordinates += 1;
      const endedOn = sourceDate(row.end_dat);
      stations.set(stationId, {
        stationId,
        regionCode,
        regionName: text(row.gru_nam) ?? REGION_NAMES[regionCode],
        lineCode,
        stationCode,
        latitude,
        longitude,
        startedOn: sourceDate(row.bld_dat),
        endedOn,
        lifecycle: endedOn === null ? "END_DATE_UNSET" : "ENDED",
        zooplanktonDepth: { value: normalizeNifsOceanSectionNumber(row.zoo_dep), unit: NIFS_OCEAN_SECTION_UNIT },
        bottomDepth: { value: normalizeNifsOceanSectionNumber(row.bot_dep), unit: NIFS_OCEAN_SECTION_UNIT },
      });
      regionCounts[regionCode] += 1;
    }
  }
  return { stations: [...stations.values()].sort((a, b) => a.stationId.localeCompare(b.stationId)), duplicateStationRows, invalidStationCoordinates, regionCounts };
}

function measurement(row: RawRow, field: string, qcField?: string): NifsOceanSectionMeasurement {
  return {
    value: normalizeNifsOceanSectionNumber(row[field]),
    unit: NIFS_OCEAN_SECTION_UNIT,
    ...(qcField ? { qcRaw: text(row[qcField]) } : {}),
  };
}

function stableRow(row: RawRow) {
  return JSON.stringify(Object.keys(row).sort().map((key) => [key, row[key]]));
}

function compareCoordinates(profileLatitude: number | null, profileLongitude: number | null, station?: NifsOceanSectionStation): NifsOceanSectionProfile["coordinateStatus"] {
  if (profileLatitude === null || profileLongitude === null) return "PROFILE_MISSING";
  if (!station || station.latitude === null || station.longitude === null) return "METADATA_MISSING";
  return Math.abs(profileLatitude - station.latitude) <= 0.000001 && Math.abs(profileLongitude - station.longitude) <= 0.000001 ? "MATCH" : "DRIFT";
}

export function buildNifsOceanSectionProfiles(rows: RawRow[], stations: NifsOceanSectionStation[]) {
  const stationMap = new Map(stations.map((station) => [station.stationId, station]));
  const groups = new Map<string, { profile: Omit<NifsOceanSectionProfile, "samples">; samples: Map<number, { raw: RawRow; sample: NifsOceanSectionDepthSample }> }>();
  let invalidProfileRows = 0;
  let exactDuplicateRows = 0;
  let conflictingDuplicateRows = 0;

  for (const row of rows) {
    const regionCode = sourceRegion(row.gru_nam);
    const lineCode = text(row.sln_cde);
    const stationCode = text(row.sta_cde);
    const rawObservedAt = text(row.obs_dtm);
    const observedAt = parseNifsOceanSectionTimestamp(row.obs_dtm);
    const depth = normalizeNifsOceanSectionNumber(row.wtr_dep);
    if (!regionCode || !lineCode || !stationCode || !rawObservedAt || !observedAt || depth === null) {
      invalidProfileRows += 1;
      continue;
    }
    const stationId = nifsOceanSectionStationId(lineCode, stationCode);
    const profileId = `${NIFS_OCEAN_SECTION_SOURCE_ID}:${regionCode}:${stationId}:${observedAt}`;
    const latitude = coordinate(row.lat, "latitude");
    const longitude = coordinate(row.lon, "longitude");
    const station = stationMap.get(stationId);
    let group = groups.get(profileId);
    if (!group) {
      group = {
        profile: {
          profileId,
          stationId,
          regionCode,
          regionName: text(row.region_name) ?? station?.regionName ?? REGION_NAMES[regionCode],
          lineCode,
          stationCode,
          observedAt,
          rawObservedAt,
          sourceTimezone: NIFS_OCEAN_SECTION_TIMEZONE,
          latitude,
          longitude,
          metadataLatitude: station?.latitude ?? null,
          metadataLongitude: station?.longitude ?? null,
          coordinateStatus: compareCoordinates(latitude, longitude, station),
          vesselName: text(row.res_vsl_nm),
          provider: NIFS_OCEAN_SECTION_PROVIDER,
          sourceId: NIFS_OCEAN_SECTION_SOURCE_ID,
          qualityClass: NIFS_OCEAN_SECTION_QUALITY_CLASS,
        },
        samples: new Map(),
      };
      groups.set(profileId, group);
    }
    const existing = group.samples.get(depth);
    if (existing) {
      if (stableRow(existing.raw) === stableRow(row)) exactDuplicateRows += 1;
      else conflictingDuplicateRows += 1;
      continue;
    }
    group.samples.set(depth, {
      raw: row,
      sample: {
        depth: { value: depth, unit: NIFS_OCEAN_SECTION_UNIT },
        waterTemperature: measurement(row, "wtr_tmp", "qc_wtr"),
        salinity: measurement(row, "sal", "qc_sal"),
        dissolvedOxygen: measurement(row, "dox", "qc_dox"),
        phosphateP: measurement(row, "nut_po4_p"),
        nitriteN: measurement(row, "nut_no2_n"),
        nitrateN: measurement(row, "nut_no3_n"),
        silicateSi: measurement(row, "nut_sio2_si"),
        ph: measurement(row, "nut_ph"),
        transparency: measurement(row, "wtr_trn"),
        pressure: measurement(row, "atm"),
      },
    });
  }

  const profiles = [...groups.values()].map(({ profile, samples }) => ({
    ...profile,
    samples: [...samples.values()].map(({ sample }) => sample).sort((a, b) => a.depth.value - b.depth.value),
  })).sort((a, b) => a.profileId.localeCompare(b.profileId));
  return { profiles, invalidProfileRows, exactDuplicateRows, conflictingDuplicateRows };
}

export function buildNifsOceanSectionDataset(rowsByRegion: Partial<Record<NifsOceanSectionRegion, RawRow[]>>, profileRows: RawRow[]) {
  const stationResult = buildNifsOceanSectionStations(rowsByRegion);
  const profileResult = buildNifsOceanSectionProfiles(profileRows, stationResult.stations);
  const samples = profileResult.profiles.flatMap((profile) => profile.samples);
  const coverage: NifsOceanSectionQuality["coverage"] = {};
  for (const field of Object.keys(MEASUREMENT_FIELDS) as Array<keyof typeof MEASUREMENT_FIELDS>) {
    const present = samples.filter((sample) => sample[field].value !== null).length;
    coverage[field] = { present, missing: samples.length - present };
  }
  const qcCoverage = Object.fromEntries((["waterTemperature", "salinity", "dissolvedOxygen"] as const).map((field) => {
    const values = samples.map((sample) => sample[field].qcRaw).filter((value): value is string => value !== null && value !== undefined);
    const distribution: Record<string, number> = {};
    for (const value of values) distribution[value] = (distribution[value] ?? 0) + 1;
    return [field, { present: values.length, missing: samples.length - values.length, distribution }];
  })) as NifsOceanSectionQuality["qcCoverage"];
  const coordinateStatus: NifsOceanSectionQuality["coordinateStatus"] = { MATCH: 0, DRIFT: 0, METADATA_MISSING: 0, PROFILE_MISSING: 0 };
  for (const profile of profileResult.profiles) coordinateStatus[profile.coordinateStatus] += 1;
  const depths = samples.map((sample) => sample.depth.value);
  const stationStarts = stationResult.stations.map((station) => station.startedOn).filter((value): value is string => value !== null).sort();
  const stationEnds = stationResult.stations.map((station) => station.endedOn).filter((value): value is string => value !== null).sort();
  const sampledTimes = profileResult.profiles.map((profile) => profile.observedAt).sort();
  const quality: NifsOceanSectionQuality = {
    metadataRows: Object.values(rowsByRegion).reduce((count, rows) => count + (rows?.length ?? 0), 0),
    stations: stationResult.stations.length,
    duplicateStationRows: stationResult.duplicateStationRows,
    invalidStationCoordinates: stationResult.invalidStationCoordinates,
    regionCounts: stationResult.regionCounts,
    endDateUnset: stationResult.stations.filter((station) => station.lifecycle === "END_DATE_UNSET").length,
    ended: stationResult.stations.filter((station) => station.lifecycle === "ENDED").length,
    earliestStationStart: stationStarts[0] ?? null,
    latestStationEnd: stationEnds.at(-1) ?? null,
    profileRows: profileRows.length,
    profiles: profileResult.profiles.length,
    depthSamples: samples.length,
    uniqueDepths: new Set(depths).size,
    depthMin: depths.length ? Math.min(...depths) : null,
    depthMax: depths.length ? Math.max(...depths) : null,
    depthZeroRows: depths.filter((value) => value === 0).length,
    invalidProfileRows: profileResult.invalidProfileRows,
    exactDuplicateRows: profileResult.exactDuplicateRows,
    conflictingDuplicateRows: profileResult.conflictingDuplicateRows,
    coordinateStatus,
    coverage,
    qcCoverage,
    earliestSampledAt: sampledTimes[0] ?? null,
    latestSampledAt: sampledTimes.at(-1) ?? null,
  };
  return { stations: stationResult.stations, profiles: profileResult.profiles, quality };
}

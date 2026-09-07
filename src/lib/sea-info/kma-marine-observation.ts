export const KMA_OBSERVATION_FRESH_MS = 20 * 60 * 1_000;
export const KMA_OBSERVATION_STALE_MS = 90 * 60 * 1_000;
export const KMA_OBSERVED_SENTINELS = new Set(["-99", "-99.0"]);

export type KmaObservationFreshness = "fresh" | "stale" | "unavailable";

export type KmaMarineStation = {
  id: string;
  koreanName: string;
  englishName: string | null;
  latitude: number;
  longitude: number;
  stationTypeCode: string | null;
  elevationM: number | null;
  adminCode: string | null;
  forecastZoneCode: string | null;
  source: "KMA";
};

export type KmaMarineObservation = {
  stationId: string;
  stationName: string | null;
  observationType: string | null;
  observedAt: string;
  rawObservedAt: string;
  significantWaveHeightM: number | null;
  windDirectionDeg: number | null;
  windSpeedMs: number | null;
  gustSpeedMs: number | null;
  seaTemperatureC: number | null;
  airTemperatureC: number | null;
  seaLevelPressureHpa: number | null;
  humidityPct: number | null;
  fetchedAt: string;
  source: "KMA";
};

export type KmaBuoyDetailObservation = {
  stationId: string;
  observedAt: string;
  rawObservedAt: string;
  windDirectionSensor1Deg: number | null;
  windSpeedSensor1Ms: number | null;
  gustSensor1Ms: number | null;
  windDirectionSensor2Deg: number | null;
  windSpeedSensor2Ms: number | null;
  gustSensor2Ms: number | null;
  maximumWaveHeightM: number | null;
  significantWaveHeightM: number | null;
  averageWaveHeightM: number | null;
  wavePeriodSec: number | null;
  waveDirectionDeg: number | null;
  seaTemperatureC: number | null;
  airTemperatureC: number | null;
  seaLevelPressureHpa: number | null;
  humidityPct: number | null;
  fetchedAt: string;
  source: "KMA";
};

export type KmaStationQuality = {
  total: number;
  validCoordinates: number;
  invalidCoordinates: number;
  duplicateIds: number;
  sameIdDifferentCoordinates: number;
  missingNames: number;
  missingCoordinates: number;
  forecastZoneCodeCoverage: number;
  stationTypeDistribution: Record<string, number>;
};

export type KmaStationParseResult = {
  stations: KmaMarineStation[];
  quality: KmaStationQuality;
};

export type KmaObservationJoinQuality = {
  metadataToSeaObservation: number;
  metadataToBuoyDetail: number;
  seaObservationWithoutMetadata: string[];
  buoyDetailWithoutMetadata: string[];
};

function dataLines(input: string) {
  return input.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function text(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeKmaObservedNumber(value: string | undefined) {
  const normalized = text(value);
  if (normalized === null || KMA_OBSERVED_SENTINELS.has(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseKmaKstTimestamp(value: string) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day || probe.getUTCHours() !== hour || probe.getUTCMinutes() !== minute) return null;
  return `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:00+09:00`;
}

export function isValidKmaMarineStationCoordinate(latitude: number, longitude: number) {
  return latitude >= 30 && latitude <= 40 && longitude >= 120 && longitude <= 135 && !(latitude === 0 && longitude === 0);
}

export function parseKmaMarineStations(input: string): KmaStationParseResult {
  const parsedRows = dataLines(input).map((line) => {
    const match = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+?)\s+(\S+)$/.exec(line);
    if (!match) return null;
    const [, id, longitudeText, latitudeText, stationTypeCode, elevationText, adminCode, koreanName, englishName, forecastZoneCode] = match;
    const latitude = normalizeKmaObservedNumber(latitudeText);
    const longitude = normalizeKmaObservedNumber(longitudeText);
    return {
      id,
      koreanName: koreanName.trim(),
      englishName: text(englishName),
      latitude,
      longitude,
      stationTypeCode: text(stationTypeCode),
      elevationM: normalizeKmaObservedNumber(elevationText),
      adminCode: text(adminCode),
      forecastZoneCode: text(forecastZoneCode),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  const coordinateById = new Map<string, string>();
  const seen = new Set<string>();
  const stations: KmaMarineStation[] = [];
  let sameIdDifferentCoordinates = 0;
  for (const row of parsedRows) {
    const coordinate = `${row.latitude}:${row.longitude}`;
    const previous = coordinateById.get(row.id);
    if (previous && previous !== coordinate) sameIdDifferentCoordinates += 1;
    coordinateById.set(row.id, coordinate);
    if (seen.has(row.id) || row.latitude === null || row.longitude === null || !row.koreanName || !isValidKmaMarineStationCoordinate(row.latitude, row.longitude)) continue;
    seen.add(row.id);
    stations.push({ ...row, latitude: row.latitude, longitude: row.longitude, source: "KMA" });
  }

  const stationTypeDistribution: Record<string, number> = {};
  for (const row of parsedRows) {
    const key = row.stationTypeCode ?? "MISSING";
    stationTypeDistribution[key] = (stationTypeDistribution[key] ?? 0) + 1;
  }
  const validCoordinates = parsedRows.filter((row) => row.latitude !== null && row.longitude !== null && isValidKmaMarineStationCoordinate(row.latitude, row.longitude)).length;
  return {
    stations,
    quality: {
      total: parsedRows.length,
      validCoordinates,
      invalidCoordinates: parsedRows.length - validCoordinates,
      duplicateIds: parsedRows.length - new Set(parsedRows.map((row) => row.id)).size,
      sameIdDifferentCoordinates,
      missingNames: parsedRows.filter((row) => !row.koreanName).length,
      missingCoordinates: parsedRows.filter((row) => row.latitude === null || row.longitude === null).length,
      forecastZoneCodeCoverage: parsedRows.filter((row) => row.forecastZoneCode !== null).length,
      stationTypeDistribution,
    },
  };
}

export function parseKmaMarineObservations(input: string, fetchedAt = new Date().toISOString()) {
  return dataLines(input).map((line): KmaMarineObservation | null => {
    const fields = line.split(",").map((field) => field.trim());
    if (fields.length < 14) return null;
    const [observationType, rawObservedAt, stationId, stationName, , , wave, windDirection, windSpeed, gust, seaTemperature, airTemperature, pressure, humidity] = fields;
    const observedAt = parseKmaKstTimestamp(rawObservedAt);
    if (!stationId || !observedAt) return null;
    return {
      stationId,
      stationName: text(stationName),
      observationType: text(observationType),
      observedAt,
      rawObservedAt,
      significantWaveHeightM: normalizeKmaObservedNumber(wave),
      windDirectionDeg: normalizeKmaObservedNumber(windDirection),
      windSpeedMs: normalizeKmaObservedNumber(windSpeed),
      gustSpeedMs: normalizeKmaObservedNumber(gust),
      seaTemperatureC: normalizeKmaObservedNumber(seaTemperature),
      airTemperatureC: normalizeKmaObservedNumber(airTemperature),
      seaLevelPressureHpa: normalizeKmaObservedNumber(pressure),
      humidityPct: normalizeKmaObservedNumber(humidity),
      fetchedAt,
      source: "KMA",
    };
  }).filter((row): row is KmaMarineObservation => row !== null);
}

export function parseKmaBuoyDetailObservations(input: string, fetchedAt = new Date().toISOString()) {
  return dataLines(input).map((line): KmaBuoyDetailObservation | null => {
    const fields = line.split(/\s+/);
    if (fields.length < 17) return null;
    const [rawObservedAt, stationId, wd1, ws1, gust1, wd2, ws2, gust2, pressure, humidity, airTemperature, seaTemperature, waveMax, waveSignificant, waveAverage, wavePeriod, waveDirection] = fields;
    const observedAt = parseKmaKstTimestamp(rawObservedAt);
    if (!stationId || !observedAt) return null;
    return {
      stationId,
      observedAt,
      rawObservedAt,
      windDirectionSensor1Deg: normalizeKmaObservedNumber(wd1),
      windSpeedSensor1Ms: normalizeKmaObservedNumber(ws1),
      gustSensor1Ms: normalizeKmaObservedNumber(gust1),
      windDirectionSensor2Deg: normalizeKmaObservedNumber(wd2),
      windSpeedSensor2Ms: normalizeKmaObservedNumber(ws2),
      gustSensor2Ms: normalizeKmaObservedNumber(gust2),
      seaLevelPressureHpa: normalizeKmaObservedNumber(pressure),
      humidityPct: normalizeKmaObservedNumber(humidity),
      airTemperatureC: normalizeKmaObservedNumber(airTemperature),
      seaTemperatureC: normalizeKmaObservedNumber(seaTemperature),
      maximumWaveHeightM: normalizeKmaObservedNumber(waveMax),
      significantWaveHeightM: normalizeKmaObservedNumber(waveSignificant),
      averageWaveHeightM: normalizeKmaObservedNumber(waveAverage),
      wavePeriodSec: normalizeKmaObservedNumber(wavePeriod),
      waveDirectionDeg: normalizeKmaObservedNumber(waveDirection),
      fetchedAt,
      source: "KMA",
    };
  }).filter((row): row is KmaBuoyDetailObservation => row !== null);
}

export function latestKmaObservationByStation<T extends { stationId: string; observedAt: string }>(rows: T[]) {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const previous = latest.get(row.stationId);
    if (!previous || Date.parse(row.observedAt) > Date.parse(previous.observedAt)) latest.set(row.stationId, row);
  }
  return latest;
}

export function summarizeKmaObservationJoin(stations: KmaMarineStation[], observations: KmaMarineObservation[], buoyDetails: KmaBuoyDetailObservation[]): KmaObservationJoinQuality {
  const stationIds = new Set(stations.map((station) => station.id));
  const observationIds = new Set(observations.map((row) => row.stationId));
  const buoyIds = new Set(buoyDetails.map((row) => row.stationId));
  return {
    metadataToSeaObservation: stations.filter((station) => observationIds.has(station.id)).length,
    metadataToBuoyDetail: stations.filter((station) => buoyIds.has(station.id)).length,
    seaObservationWithoutMetadata: [...observationIds].filter((id) => !stationIds.has(id)).sort(),
    buoyDetailWithoutMetadata: [...buoyIds].filter((id) => !stationIds.has(id)).sort(),
  };
}

export function deriveKmaObservationFreshness(observedAt: string | null | undefined, now = Date.now()): KmaObservationFreshness {
  if (!observedAt) return "unavailable";
  const timestamp = Date.parse(observedAt);
  if (!Number.isFinite(timestamp)) return "unavailable";
  const age = Math.max(0, now - timestamp);
  if (age <= KMA_OBSERVATION_FRESH_MS) return "fresh";
  if (age <= KMA_OBSERVATION_STALE_MS) return "stale";
  return "unavailable";
}

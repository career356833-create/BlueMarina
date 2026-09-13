import "server-only";

import { getNifsRealtimeFishingEnvironment } from "./nifs-realtime-fishing-server";
import { getNifsFisheryEnvironment } from "./nifs-fishery-environment-server";
import { getKmaBuoyDetailSnapshot, getKmaMarineObservationSnapshot, getKmaMarineStations } from "../sea-info/kma-marine-observation-server";
import { latestKmaObservationByStation } from "../sea-info/kma-marine-observation";
import { parseKmaMarineForecastCsv, type KmaMarineForecast } from "../sea-info/kma-marine-forecast";
import { buildViewportSampleBbox, extractKhoaRomsEnvelope, KHOA_ROMS_MAX_PAGES, KHOA_ROMS_PAGE_SIZE, normalizeKhoaRomsRows, type KhoaRomsPoint } from "../sea-info/khoa-roms";
import { buildAlignmentContext, depthMatch, haversineDistanceMeters, timeOffsets, value, type AlignedSourceResult, type AlignmentSourceId, type FishingConditionAlignmentContext } from "./source-alignment";
import type { SourceAlignmentRequest } from "./source-alignment-request";

type Adapter = (request: SourceAlignmentRequest) => Promise<AlignedSourceResult>;
export type SourceAlignmentAdapters = Record<AlignmentSourceId, Adapter>;

function limitationsFor(timezone: string, freshness: string | null, depthStatus: AlignedSourceResult["depthMatchStatus"]) {
  const result: string[] = [];
  if (/UNSPECIFIED|UNKNOWN/.test(timezone)) result.push("TIMEZONE_UNSPECIFIED");
  if (freshness === "stale" || freshness === "unavailable") result.push("STALE_SOURCE");
  if (depthStatus === "UNRESOLVED") result.push("DEPTH_CONTEXT_UNRESOLVED");
  return result;
}

function statusFor(limitations: string[], depthStatus: AlignedSourceResult["depthMatchStatus"], hasUnverifiedUnit = false): AlignedSourceResult["status"] {
  if (hasUnverifiedUnit) return "UNIT_UNVERIFIED";
  if (depthStatus === "UNRESOLVED") return "DEPTH_MISMATCH";
  return limitations.length ? "PARTIAL" : "ALIGNED";
}

function unavailable(sourceId: AlignmentSourceId, provider: string, qualityClass: AlignedSourceResult["qualityClass"], bindingId: string, reason: string): AlignedSourceResult {
  return {
    sourceId, provider, qualityClass, status: "UNAVAILABLE", sourceBindingId: bindingId,
    sourceLocation: { latitude: null, longitude: null }, distanceMeters: null,
    observedOrValidAt: null, timeSemantic: "UNKNOWN", sourceTimezone: "UNKNOWN",
    timeOffsetMinutes: null, absoluteTimeOffsetMinutes: null, freshness: "unavailable",
    depthContext: null, depthMatchStatus: "NOT_APPLICABLE", values: {}, limitations: [reason],
  };
}

export function alignRisa(request: SourceAlignmentRequest, station: Awaited<ReturnType<typeof getNifsRealtimeFishingEnvironment>>["stations"][number]): AlignedSourceResult {
  const targetDepth = request.target.depthContext;
  const category = typeof targetDepth === "string" ? targetDepth : null;
  const depthStatus = depthMatch(targetDepth, category ?? "SURFACE|MIDDLE|BOTTOM", null);
  const timezone = station.sourceTimezone;
  const limitations = limitationsFor(timezone, station.freshness, depthStatus);
  const values: AlignedSourceResult["values"] = {};
  const add = (name: string, amount: number | null) => { values[`nifs-risa.waterTemperature.${name.toLowerCase()}`] = value(amount, station.waterTemperature.unit); };
  if (category === "SURFACE") add("SURFACE", station.waterTemperature.surfaceC);
  else if (category === "MIDDLE") add("MIDDLE", station.waterTemperature.middleC);
  else if (category === "BOTTOM") add("BOTTOM", station.waterTemperature.bottomC);
  else { add("SURFACE", station.waterTemperature.surfaceC); add("MIDDLE", station.waterTemperature.middleC); add("BOTTOM", station.waterTemperature.bottomC); }
  return {
    sourceId: "nifs-risa", provider: station.provider, qualityClass: station.qualityClass, status: statusFor(limitations, depthStatus), sourceBindingId: station.stationId,
    sourceLocation: { latitude: station.latitude, longitude: station.longitude }, distanceMeters: haversineDistanceMeters(request.target, { latitude: station.latitude, longitude: station.longitude }),
    observedOrValidAt: station.observedAt, timeSemantic: "OBSERVED_AT", sourceTimezone: timezone, ...timeOffsets(station.observedAt, request.target.requestedAt, timezone),
    freshness: station.freshness, depthContext: category ?? "SURFACE|MIDDLE|BOTTOM", depthMatchStatus: depthStatus, values, limitations,
  };
}

export function alignFemo(request: SourceAlignmentRequest, sample: Awaited<ReturnType<typeof getNifsFisheryEnvironment>>["samples"][number]): AlignedSourceResult {
  const targetDepth = request.target.depthContext;
  const category = typeof targetDepth === "string" && targetDepth !== "MIDDLE" ? targetDepth : null;
  const depthStatus = depthMatch(targetDepth, category ?? "SURFACE_BOTTOM_PAIR", null);
  const timezone = sample.sourceTimezone;
  const values: AlignedSourceResult["values"] = {};
  let hasUnverified = false;
  for (const [name, measurement] of Object.entries(sample.measurements)) {
    const unitStatus = measurement.unit === "UNIT_NOT_DOCUMENTED" ? "UNVERIFIED" : "CONFIRMED";
    hasUnverified ||= unitStatus === "UNVERIFIED";
    if (category === "SURFACE") values[`nifs-femo-sea.${name}.surface`] = value(measurement.surface, measurement.unit, unitStatus);
    else if (category === "BOTTOM") values[`nifs-femo-sea.${name}.bottom`] = value(measurement.bottom, measurement.unit, unitStatus);
    else {
      values[`nifs-femo-sea.${name}.surface`] = value(measurement.surface, measurement.unit, unitStatus);
      values[`nifs-femo-sea.${name}.bottom`] = value(measurement.bottom, measurement.unit, unitStatus);
    }
  }
  const limitations = limitationsFor(timezone, sample.freshness, depthStatus);
  if (hasUnverified) limitations.push("UNIT_UNVERIFIED");
  limitations.push("LATEST_SAMPLE_FOR_EXPLICIT_SITE");
  return {
    sourceId: "nifs-femo-sea", provider: sample.provider, qualityClass: sample.qualityClass, status: statusFor(limitations, depthStatus, hasUnverified), sourceBindingId: sample.siteId,
    sourceLocation: { latitude: sample.latitude, longitude: sample.longitude }, distanceMeters: haversineDistanceMeters(request.target, { latitude: sample.latitude, longitude: sample.longitude }),
    observedOrValidAt: sample.sampledAt, timeSemantic: "SAMPLED_AT", sourceTimezone: timezone, ...timeOffsets(sample.sampledAt, request.target.requestedAt, timezone),
    freshness: sample.freshness, depthContext: category ?? "SURFACE_BOTTOM_PAIR", depthMatchStatus: depthStatus, values, limitations,
  };
}

async function risaAdapter(request: SourceAlignmentRequest) {
  const binding = request.bindings["nifs-risa"]!;
  try {
    const response = await getNifsRealtimeFishingEnvironment();
    const station = response.stations.find((item) => item.stationId === binding.stationId);
    return station ? alignRisa(request, station) : unavailable("nifs-risa", "NIFS", "OBSERVED", binding.stationId, "EXPLICIT_BINDING_NOT_FOUND");
  } catch (error) { return unavailable("nifs-risa", "NIFS", "OBSERVED", binding.stationId, error instanceof Error ? error.message : "SOURCE_ERROR"); }
}

async function femoAdapter(request: SourceAlignmentRequest) {
  const binding = request.bindings["nifs-femo-sea"]!;
  try {
    const response = await getNifsFisheryEnvironment();
    const samples = response.samples.filter((item) => item.siteId === binding.siteId).sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
    return samples[0] ? alignFemo(request, samples[0]) : unavailable("nifs-femo-sea", "NIFS", "OBSERVED_PERIODIC_ENVIRONMENT", binding.siteId, "EXPLICIT_BINDING_NOT_FOUND");
  } catch (error) { return unavailable("nifs-femo-sea", "NIFS", "OBSERVED_PERIODIC_ENVIRONMENT", binding.siteId, error instanceof Error ? error.message : "SOURCE_ERROR"); }
}

async function kmaObservationAdapter(request: SourceAlignmentRequest): Promise<AlignedSourceResult> {
  const binding = request.bindings["kma-marine-weather-observations"]!;
  try {
    const [stations, observations, details] = await Promise.all([getKmaMarineStations(), getKmaMarineObservationSnapshot(), getKmaBuoyDetailSnapshot()]);
    const station = stations.data.stations.find((item) => item.id === binding.stationId);
    const observation = latestKmaObservationByStation(observations.data).get(binding.stationId);
    const detail = latestKmaObservationByStation(details.data).get(binding.stationId);
    if (!station || (!observation && !detail)) return unavailable("kma-marine-weather-observations", "KMA", "OBSERVED", binding.stationId, "EXPLICIT_BINDING_NOT_FOUND");
    const row = observation ?? detail!;
    const freshness = observations.freshness === "stale" || details.freshness === "stale" ? "stale" : "fresh";
    const depthStatus = depthMatch(request.target.depthContext, null);
    const limitations = limitationsFor("Asia/Seoul", freshness, depthStatus);
    const values: AlignedSourceResult["values"] = {};
    const put = (name: string, amount: number | null | undefined, unit: string) => { values[`kma-marine-weather-observations.${name}`] = value(amount ?? null, unit); };
    put("seaTemperature", row.seaTemperatureC, "degC"); put("airTemperature", row.airTemperatureC, "degC"); put("seaLevelPressure", row.seaLevelPressureHpa, "hPa"); put("humidity", row.humidityPct, "%");
    if (observation) { put("significantWaveHeight", observation.significantWaveHeightM, "m"); put("windDirection", observation.windDirectionDeg, "degree"); put("windSpeed", observation.windSpeedMs, "m/s"); put("gustSpeed", observation.gustSpeedMs, "m/s"); }
    if (detail) { put("maximumWaveHeight", detail.maximumWaveHeightM, "m"); put("wavePeriod", detail.wavePeriodSec, "s"); put("waveDirection", detail.waveDirectionDeg, "degree"); }
    return {
      sourceId: "kma-marine-weather-observations", provider: "KMA", qualityClass: "OBSERVED", status: statusFor(limitations, depthStatus), sourceBindingId: binding.stationId,
      sourceLocation: { latitude: station.latitude, longitude: station.longitude }, distanceMeters: haversineDistanceMeters(request.target, station), observedOrValidAt: row.observedAt,
      timeSemantic: "OBSERVED_AT", sourceTimezone: "Asia/Seoul", ...timeOffsets(row.observedAt, request.target.requestedAt, "Asia/Seoul"), freshness,
      depthContext: null, depthMatchStatus: depthStatus, values, limitations,
    };
  } catch (error) { return unavailable("kma-marine-weather-observations", "KMA", "OBSERVED", binding.stationId, error instanceof Error ? error.message : "SOURCE_ERROR"); }
}

async function fetchKmaForecast(lzone: number, szone: number, issueAt: string, validAt: string): Promise<{ data: KmaMarineForecast; freshness: string }> {
  const key = process.env.KMA_APIHUB_KEY;
  if (!key) throw new Error("API_KEY_MISSING");
  const tma_fc = issueAt;
  const tma_ef = validAt;
  const url = new URL("https://apihub.kma.go.kr/api/typ06/url/marine_small_zone.php");
  Object.entries({ tma_fc, tma_ef, Lzone: String(lzone), Szone: String(szone), disp: "0", help: "0", authKey: key }).forEach(([name, item]) => url.searchParams.set(name, item));
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error("UPSTREAM_ERROR");
  const parsed = parseKmaMarineForecastCsv(await response.text(), lzone, szone);
  if (!parsed.ok || parsed.data.status !== "ready") throw new Error(parsed.ok ? "EMPTY_RESPONSE" : parsed.code);
  return { data: parsed.data, freshness: "fresh" };
}

async function kmaForecastAdapter(request: SourceAlignmentRequest): Promise<AlignedSourceResult> {
  const binding = request.bindings["kma-marine-weather-forecast"]!;
  const [lzone, szone] = binding.zoneId.split(":").map(Number);
  try {
    const response = await fetchKmaForecast(lzone, szone, binding.issueAt, binding.validAt);
    const forecast = response.data.forecast!;
    const values: AlignedSourceResult["values"] = {};
    const put = (name: string, amount: number | string | null, unit: string | null) => { values[`kma-marine-weather-forecast.${name}`] = value(amount, unit); };
    put("significantWaveHeight", forecast.significantWaveHeightM, "m"); put("maxWavePeriod", forecast.maxWavePeriodSec, "s"); put("waveDirection", forecast.waveDirectionDeg, "degree"); put("windSpeed", forecast.windSpeedMps, "m/s"); put("windDirection", forecast.windDirectionDeg, "degree"); put("visibility", forecast.visibilityM, "m"); put("precipitation", forecast.precipitationMm, "mm"); put("waterTemperature", forecast.waterTemperatureC, "degC");
    return {
      sourceId: "kma-marine-weather-forecast", provider: "KMA", qualityClass: "FORECAST", status: "PARTIAL", sourceBindingId: binding.zoneId,
      sourceLocation: { latitude: null, longitude: null }, distanceMeters: null, observedOrValidAt: forecast.validAt, timeSemantic: "FORECAST_AT", sourceTimezone: "UTC", ...timeOffsets(forecast.validAt, request.target.requestedAt, "UTC"),
      freshness: response.freshness, depthContext: null, depthMatchStatus: "NOT_APPLICABLE", values, limitations: ["ZONE_HAS_NO_POINT_COORDINATE"],
    };
  } catch (error) { return unavailable("kma-marine-weather-forecast", "KMA", "FORECAST", binding.zoneId, error instanceof Error ? error.message : "SOURCE_ERROR"); }
}

function normalizeServiceKey(value: string) { try { return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value; } catch { return value; } }
async function fetchRomsPoint(latitude: number, longitude: number, validAt?: string): Promise<KhoaRomsPoint> {
  if (process.env.KHOA_ROMS_ENABLED !== "true") throw new Error("SOURCE_DISABLED");
  const key = process.env.KHOA_ROMS_API_KEY; if (!key) throw new Error("API_KEY_MISSING");
  const bbox = buildViewportSampleBbox(longitude, latitude); const rows: unknown[] = [];
  for (let pageNo = 1; pageNo <= KHOA_ROMS_MAX_PAGES; pageNo += 1) {
    const url = new URL("https://apis.data.go.kr/1192136/roms/GetRomsApiService");
    Object.entries({ serviceKey: normalizeServiceKey(key), type: "json", numOfRows: String(KHOA_ROMS_PAGE_SIZE), pageNo: String(pageNo), ymin: String(bbox.ymin), ymax: String(bbox.ymax), xmin: String(bbox.xmin), xmax: String(bbox.xmax) }).forEach(([name, item]) => url.searchParams.set(name, item));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) }); if (!response.ok) throw new Error("UPSTREAM_ERROR");
    const envelope = extractKhoaRomsEnvelope(await response.json()); if (envelope.resultCode !== "00") throw new Error("UPSTREAM_CONTRACT_ERROR"); rows.push(...envelope.items); if (rows.length >= envelope.totalCount) break;
  }
  const normalized = normalizeKhoaRomsRows(rows, new Date().toISOString(), validAt);
  const point = normalized.points.find((item) => Math.abs(item.latitude - latitude) < 0.000001 && Math.abs(item.longitude - longitude) < 0.000001);
  if (!point) throw new Error("EXPLICIT_POINT_NOT_FOUND");
  return point;
}

async function romsAdapter(request: SourceAlignmentRequest): Promise<AlignedSourceResult> {
  const binding = request.bindings["khoa-ocean-current-model"]!;
  const bindingId = `${binding.latitude}:${binding.longitude}:${binding.validAt}`;
  try {
    const point = await fetchRomsPoint(binding.latitude, binding.longitude, binding.validAt);
    const timezone = "UNSPECIFIED"; const limitations = ["TIME_SEMANTIC_UNKNOWN", "TIMEZONE_UNSPECIFIED", "CURRENT_DIRECTION_CONVENTION_UNKNOWN"];
    return {
      sourceId: "khoa-ocean-current-model", provider: "KHOA", qualityClass: "MODEL", status: "PARTIAL", sourceBindingId: bindingId,
      sourceLocation: { latitude: point.latitude, longitude: point.longitude }, distanceMeters: haversineDistanceMeters(request.target, point), observedOrValidAt: point.validAtRaw,
      timeSemantic: "UNKNOWN", sourceTimezone: timezone, ...timeOffsets(point.validAtRaw, request.target.requestedAt, timezone), freshness: "fresh", depthContext: null, depthMatchStatus: "NOT_APPLICABLE",
      values: {
        "khoa-ocean-current-model.currentSpeed": value(point.currentSpeedMps, "m/s"),
        "khoa-ocean-current-model.currentDirectionRaw": value(point.currentDirectionDegreesRaw, "degree"),
        "khoa-ocean-current-model.waterTemperature": value(point.modelWaterTemperatureCelsius, "degC"),
      }, limitations,
    };
  } catch (error) { return unavailable("khoa-ocean-current-model", "KHOA", "MODEL", bindingId, error instanceof Error ? error.message : "SOURCE_ERROR"); }
}

export const defaultSourceAlignmentAdapters: SourceAlignmentAdapters = {
  "nifs-risa": risaAdapter,
  "nifs-femo-sea": femoAdapter,
  "kma-marine-weather-observations": kmaObservationAdapter,
  "kma-marine-weather-forecast": kmaForecastAdapter,
  "khoa-ocean-current-model": romsAdapter,
};

export async function runSourceAlignment(request: SourceAlignmentRequest, adapters: SourceAlignmentAdapters = defaultSourceAlignmentAdapters): Promise<FishingConditionAlignmentContext> {
  const sourceIds = Object.keys(request.bindings) as AlignmentSourceId[];
  const sources = await Promise.all(sourceIds.map((sourceId) => adapters[sourceId](request).catch((error) => unavailable(sourceId, "UNKNOWN", "DERIVED", sourceId, error instanceof Error ? error.message : "SOURCE_ERROR"))));
  return buildAlignmentContext(request.target, sources);
}

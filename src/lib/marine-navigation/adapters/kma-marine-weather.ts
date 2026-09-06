import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import { ambiguousKmaMarineLzones, getLargeZoneBounds, kmaMarineLargeZones } from "@/lib/sea-info/kma-marine-zone";
import type { NavigationMarineLayerConfig } from "./navigation-map-adapter";

export const KMA_MARINE_WEATHER_LAYER_ID = "kma-marine-weather-forecast-zones";
export const KMA_MARINE_WEATHER_FORECAST_URL = "/api/sea-info/marine-forecast";
export const KMA_MARINE_WEATHER_SAFETY_NOTICE = "해양기상 정보는 공식 관측·예측 자료의 참고 표시이며 실제 출항·운항 가능 여부 또는 공식 항법·기상정보를 대체하지 않습니다.";
export const KMA_MARINE_WEATHER_FRESH_MS = 18 * 60 * 60 * 1_000;
export const KMA_MARINE_WEATHER_STALE_MS = 36 * 60 * 60 * 1_000;

export type KmaMarineWeatherFreshness = "fresh" | "stale" | "unavailable";

export type KmaMarineWeatherForecastZone = {
  zoneId: string;
  lzone: number;
  szone: 5;
  latitude: number;
  longitude: number;
  source: "KMA";
  dataKind: "FORECAST_MODEL";
};

export type KmaMarineWeatherGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: KmaMarineWeatherForecastZone;
  }>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidKmaMarineWeatherCoordinate(latitude: number, longitude: number) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 && !(latitude === 0 && longitude === 0);
}

export function buildKmaMarineWeatherForecastZones(): KmaMarineWeatherForecastZone[] {
  const ambiguous = new Set(ambiguousKmaMarineLzones);
  const seen = new Set<number>();
  const zones: KmaMarineWeatherForecastZone[] = [];

  for (const zone of kmaMarineLargeZones) {
    if (seen.has(zone.lzone) || ambiguous.has(zone.lzone)) continue;
    seen.add(zone.lzone);
    const bounds = getLargeZoneBounds(zone);
    const latitude = Number(((bounds.minLat + bounds.maxLat) / 2).toFixed(6));
    const longitude = Number(((bounds.minLng + bounds.maxLng) / 2).toFixed(6));
    if (!isValidKmaMarineWeatherCoordinate(latitude, longitude)) continue;
    zones.push({
      zoneId: `KMA-L${zone.lzone}-S5`,
      lzone: zone.lzone,
      szone: 5,
      latitude,
      longitude,
      source: "KMA",
      dataKind: "FORECAST_MODEL",
    });
  }

  return zones;
}

export function summarizeKmaMarineWeatherZoneQuality() {
  const zones = buildKmaMarineWeatherForecastZones();
  return {
    sourceRows: kmaMarineLargeZones.length,
    uniqueLargeZones: new Set(kmaMarineLargeZones.map((zone) => zone.lzone)).size,
    representativeZones: zones.length,
    validCoordinates: zones.filter((zone) => isValidKmaMarineWeatherCoordinate(zone.latitude, zone.longitude)).length,
    invalidCoordinates: zones.filter((zone) => !isValidKmaMarineWeatherCoordinate(zone.latitude, zone.longitude)).length,
    duplicateZoneIds: zones.length - new Set(zones.map((zone) => zone.zoneId)).size,
    excludedAmbiguousLargeZones: ambiguousKmaMarineLzones.length,
  };
}

export function toKmaMarineWeatherGeoJson(zones = buildKmaMarineWeatherForecastZones()): KmaMarineWeatherGeoJson {
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => ({
      type: "Feature",
      id: zone.zoneId,
      geometry: { type: "Point", coordinates: [zone.longitude, zone.latitude] },
      properties: zone,
    })),
  };
}

export function parseKmaMarineWeatherFeatureProperties(value: unknown): KmaMarineWeatherForecastZone | null {
  const item = record(value);
  const zoneId = typeof item?.zoneId === "string" ? item.zoneId : null;
  const lzone = finiteNumber(item?.lzone);
  const szone = finiteNumber(item?.szone);
  const latitude = finiteNumber(item?.latitude);
  const longitude = finiteNumber(item?.longitude);
  if (!zoneId || !Number.isInteger(lzone) || szone !== 5 || latitude === null || longitude === null || item?.source !== "KMA" || item?.dataKind !== "FORECAST_MODEL" || !isValidKmaMarineWeatherCoordinate(latitude, longitude)) return null;
  return { zoneId, lzone: lzone as number, szone: 5, latitude, longitude, source: "KMA", dataKind: "FORECAST_MODEL" };
}

export function deriveKmaMarineWeatherFreshness(issuedAt: string | null | undefined, now = Date.now()): KmaMarineWeatherFreshness {
  if (!issuedAt) return "unavailable";
  const issued = Date.parse(issuedAt);
  if (!Number.isFinite(issued)) return "unavailable";
  const age = Math.max(0, now - issued);
  if (age <= KMA_MARINE_WEATHER_FRESH_MS) return "fresh";
  if (age <= KMA_MARINE_WEATHER_STALE_MS) return "stale";
  return "unavailable";
}

export function windDirectionToCompass16(degrees: number | null | undefined) {
  if (degrees == null || !Number.isFinite(degrees)) return null;
  const labels = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;
  return labels[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

export function createKmaMarineWeatherLayerConfig(geoJson = toKmaMarineWeatherGeoJson(), visible = false): NavigationMarineLayerConfig<SourceSpecification, LayerSpecification> {
  return {
    id: KMA_MARINE_WEATHER_LAYER_ID,
    order: 60,
    visible,
    source: { type: "geojson", data: geoJson },
    layers: [{
      id: "forecast-zone-centers",
      type: "circle",
      source: "",
      minzoom: 4,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2.5, 8, 4.5, 12, 7],
        "circle-color": "#789ba0",
        "circle-stroke-color": "#e2d7bd",
        "circle-stroke-width": 1,
        "circle-opacity": 0.72,
      },
    }],
  };
}

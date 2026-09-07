import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import type { KmaBuoyDetailObservation, KmaMarineObservation, KmaMarineStation, KmaObservationFreshness, KmaStationQuality } from "@/lib/sea-info/kma-marine-observation";
import type { NavigationMarineLayerConfig } from "./navigation-map-adapter";

export const KMA_MARINE_OBSERVATIONS_LAYER_ID = "kma-marine-weather-observations";
export const KMA_MARINE_OBSERVATIONS_STATIONS_URL = "/api/sea-info/marine-observations/stations";
export const KMA_MARINE_OBSERVATIONS_DETAIL_URL = "/api/sea-info/marine-observations";
export const KMA_MARINE_OBSERVATION_SAFETY_NOTICE = "해양기상 관측정보는 최근 공식 관측자료의 참고 표시이며 실제 출항·운항 가능 여부 또는 공식 항법·기상정보를 대체하지 않습니다.";

export type KmaMarineStationGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: KmaMarineStation;
  }>;
};

export type KmaMarineStationsResponse = {
  ok: true;
  stations: KmaMarineStation[];
  geoJson: KmaMarineStationGeoJson;
  quality: KmaStationQuality;
  freshness: "fresh" | "stale";
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
};

export type KmaMarineObservationDetailResponse = {
  ok: true;
  stationId: string;
  observation: KmaMarineObservation | null;
  buoyDetail: KmaBuoyDetailObservation | null;
  observationSourceState: "ready" | "unavailable";
  buoySourceState: "ready" | "unavailable";
  freshness: KmaObservationFreshness;
  fetchedAt: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidKmaObservationCoordinate(latitude: number, longitude: number) {
  return latitude >= 30 && latitude <= 40 && longitude >= 120 && longitude <= 135 && !(latitude === 0 && longitude === 0);
}

export function toKmaMarineStationGeoJson(stations: KmaMarineStation[]): KmaMarineStationGeoJson {
  return {
    type: "FeatureCollection",
    features: stations.map((station) => ({
      type: "Feature",
      id: station.id,
      geometry: { type: "Point", coordinates: [station.longitude, station.latitude] },
      properties: station,
    })),
  };
}

export function parseKmaMarineStationFeatureProperties(value: unknown): KmaMarineStation | null {
  const item = record(value);
  const id = text(item?.id);
  const koreanName = text(item?.koreanName);
  const latitude = number(item?.latitude);
  const longitude = number(item?.longitude);
  if (!item || !id || !koreanName || latitude === null || longitude === null || item.source !== "KMA" || !isValidKmaObservationCoordinate(latitude, longitude)) return null;
  return {
    id,
    koreanName,
    englishName: text(item.englishName),
    latitude,
    longitude,
    stationTypeCode: text(item.stationTypeCode),
    elevationM: number(item.elevationM),
    adminCode: text(item.adminCode),
    forecastZoneCode: text(item.forecastZoneCode),
    source: "KMA",
  };
}

export function parseKmaMarineStationsResponse(value: unknown): KmaMarineStationsResponse {
  const item = record(value);
  if (!item || item.ok !== true || !Array.isArray(item.stations) || !record(item.geoJson) || !record(item.quality)) throw new Error("Invalid KMA marine station response");
  return value as KmaMarineStationsResponse;
}

export function createKmaMarineObservationsLayerConfig(geoJson: KmaMarineStationGeoJson, visible = false): NavigationMarineLayerConfig<SourceSpecification, LayerSpecification> {
  return {
    id: KMA_MARINE_OBSERVATIONS_LAYER_ID,
    order: 70,
    visible,
    source: { type: "geojson", data: geoJson },
    layers: [{
      id: "stations",
      type: "circle",
      source: "",
      minzoom: 4,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3.5, 9, 6, 13, 8],
        "circle-color": "#173f46",
        "circle-stroke-color": "#d4b575",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.9,
      },
    }],
  };
}

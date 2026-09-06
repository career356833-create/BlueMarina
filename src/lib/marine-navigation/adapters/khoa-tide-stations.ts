import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import { khoaTideStationSnapshots, type KhoaTideStationSnapshot } from "@/data/khoa-tide-stations";
import type { NavigationMarineLayerConfig } from "./navigation-map-adapter";

export const KHOA_TIDE_STATIONS_DATA_URL = "/api/sea-info/tide/stations";
export const KHOA_TIDE_STATIONS_LAYER_ID = "khoa-tide-stations";
export const KHOA_TIDE_STATION_SAFETY_NOTICE = "조위 예측 정보는 참고용이며 실제 항해 수심, 통항 가능 여부 또는 공식 항법장비를 대체하지 않습니다.";
export const KHOA_TIDE_STATION_DATUM_STATUS = "DATUM_NOT_DOCUMENTED" as const;

export type KhoaTideStation = KhoaTideStationSnapshot & {
  source: "KHOA";
  datumStatus: typeof KHOA_TIDE_STATION_DATUM_STATUS;
};

export type KhoaTideStationGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: KhoaTideStation;
  }>;
};

export type KhoaTideStationsResponse = {
  ok: true;
  stations: KhoaTideStation[];
  geoJson: KhoaTideStationGeoJson;
  generatedAt: string;
  freshness: "snapshot";
  source: "국립해양조사원(KHOA)";
  quality: ReturnType<typeof summarizeKhoaTideStationQuality>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidTideStationCoordinate(latitude: number, longitude: number) {
  return latitude >= 30 && latitude <= 40 && longitude >= 120 && longitude <= 135 && !(latitude === 0 && longitude === 0);
}

export function normalizeKhoaTideStations(input: KhoaTideStationSnapshot[] = khoaTideStationSnapshots) {
  const seen = new Set<string>();
  const stations: KhoaTideStation[] = [];
  for (const station of input) {
    if (seen.has(station.stationId) || !station.name.trim() || !isValidTideStationCoordinate(station.latitude, station.longitude)) continue;
    seen.add(station.stationId);
    stations.push({ ...station, source: "KHOA", datumStatus: KHOA_TIDE_STATION_DATUM_STATUS });
  }
  return stations;
}

export function summarizeKhoaTideStationQuality(input: KhoaTideStationSnapshot[] = khoaTideStationSnapshots) {
  const ids = input.map((station) => station.stationId);
  return {
    stationTotal: input.length,
    validCoordinates: input.filter((station) => isValidTideStationCoordinate(station.latitude, station.longitude)).length,
    invalidCoordinates: input.filter((station) => !isValidTideStationCoordinate(station.latitude, station.longitude)).length,
    duplicateStationIds: ids.length - new Set(ids).size,
    missingStationNames: input.filter((station) => !station.name.trim()).length,
    datumStatus: KHOA_TIDE_STATION_DATUM_STATUS,
  };
}

export function toKhoaTideStationsGeoJson(stations: KhoaTideStation[]): KhoaTideStationGeoJson {
  return {
    type: "FeatureCollection",
    features: stations.map((station) => ({
      type: "Feature",
      id: station.stationId,
      geometry: { type: "Point", coordinates: [station.longitude, station.latitude] },
      properties: station,
    })),
  };
}

export function parseKhoaTideStationFeatureProperties(value: unknown): KhoaTideStation | null {
  const item = record(value);
  const stationId = text(item?.stationId);
  const name = text(item?.name);
  const region = text(item?.region);
  const latitude = number(item?.latitude);
  const longitude = number(item?.longitude);
  if (!item || !stationId || !name || !region || latitude === null || longitude === null || item.source !== "KHOA" || !isValidTideStationCoordinate(latitude, longitude)) return null;
  return { stationId, name, region, latitude, longitude, source: "KHOA", datumStatus: KHOA_TIDE_STATION_DATUM_STATUS };
}

export function parseKhoaTideStationsResponse(value: unknown): KhoaTideStationsResponse {
  const input = record(value);
  if (!input || input.ok !== true || !Array.isArray(input.stations) || !record(input.geoJson)) throw new Error("Invalid KHOA tide-station response");
  return value as KhoaTideStationsResponse;
}

export function createKhoaTideStationsLayerConfig(geoJson: KhoaTideStationGeoJson, visible = false): NavigationMarineLayerConfig<SourceSpecification, LayerSpecification> {
  return {
    id: KHOA_TIDE_STATIONS_LAYER_ID,
    order: 50,
    visible,
    source: { type: "geojson", data: geoJson },
    layers: [{
      id: "stations",
      type: "circle",
      source: "",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 6, 14, 8],
        "circle-color": "#4f8d91",
        "circle-stroke-color": "#d6e6df",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.9,
      },
    }],
  };
}

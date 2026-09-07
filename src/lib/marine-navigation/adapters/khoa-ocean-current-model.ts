import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import type { KhoaRomsPoint } from "@/lib/sea-info/khoa-roms";
import type { NavigationMarineLayerConfig } from "./navigation-map-adapter";

export const KHOA_OCEAN_CURRENT_MODEL_LAYER_ID = "khoa-ocean-current-model";
export const KHOA_OCEAN_CURRENT_MODEL_MIN_ZOOM = 8;
export const KHOA_OCEAN_CURRENT_MODEL_SAFETY_NOTICE = "해류·유향·유속 정보는 KHOA 수치모델 기반 참고자료이며 실제 현장 관측값 또는 공식 항법장비를 대체하지 않습니다.";

export type KhoaRomsGeoJson = {
  type: "FeatureCollection";
  features: Array<{ type: "Feature"; id: string; geometry: { type: "Point"; coordinates: [number, number] }; properties: KhoaRomsPoint }>;
};

export type KhoaRomsApiResponse = {
  ok: true;
  data: KhoaRomsGeoJson;
  validTimes: string[];
  selectedValidAt: string;
  freshness: "fresh" | "stale";
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parseKhoaRomsFeatureProperties(value: unknown): KhoaRomsPoint | null {
  const item = record(value);
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);
  const currentSpeedMps = Number(item?.currentSpeedMps);
  const currentDirectionDegreesRaw = Number(item?.currentDirectionDegreesRaw);
  const modelWaterTemperatureCelsius = Number(item?.modelWaterTemperatureCelsius);
  if (typeof item?.id !== "string" || typeof item?.validAtRaw !== "string" || typeof item?.fetchedAt !== "string") return null;
  if (![latitude, longitude, currentSpeedMps, currentDirectionDegreesRaw, modelWaterTemperatureCelsius].every(Number.isFinite)) return null;
  if (item?.source !== "KHOA" || item?.dataKind !== "ROMS_MODEL_FORECAST" || item?.directionConvention !== "UNKNOWN") return null;
  return { id: item.id, latitude, longitude, validAtRaw: item.validAtRaw, currentSpeedMps, currentDirectionDegreesRaw, modelWaterTemperatureCelsius, source: "KHOA", dataKind: "ROMS_MODEL_FORECAST", directionConvention: "UNKNOWN", fetchedAt: item.fetchedAt };
}

export function parseKhoaRomsApiResponse(value: unknown): KhoaRomsApiResponse {
  const root = record(value);
  const data = record(root?.data);
  if (root?.ok !== true || data?.type !== "FeatureCollection" || !Array.isArray(data.features) || !Array.isArray(root.validTimes) || typeof root.selectedValidAt !== "string" || (root.freshness !== "fresh" && root.freshness !== "stale") || typeof root.fetchedAt !== "string" || typeof root.lastSuccessfulFetchAt !== "string") throw new Error("INVALID_KHOA_ROMS_RESPONSE");
  return value as KhoaRomsApiResponse;
}

export function createKhoaRomsLayerConfig(geoJson: KhoaRomsGeoJson = { type: "FeatureCollection", features: [] }, visible = false): NavigationMarineLayerConfig<SourceSpecification, LayerSpecification> {
  return {
    id: KHOA_OCEAN_CURRENT_MODEL_LAYER_ID,
    order: 65,
    visible,
    source: { type: "geojson", data: geoJson },
    layers: [{
      id: "model-points",
      type: "circle",
      source: "",
      minzoom: KHOA_OCEAN_CURRENT_MODEL_MIN_ZOOM,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 12, 7],
        "circle-color": "#6faaa9",
        "circle-stroke-color": "#e5dcc7",
        "circle-stroke-width": 1,
        "circle-opacity": 0.82,
      },
    }],
  };
}

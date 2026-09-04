import { KHOA_ATTRIBUTION } from "./khoa-deep-water-route";

export const KHOA_TRAINING_FIRING_ZONE_LAYER_ID = "khoa-maritime-training-firing-zone";
export const KHOA_TRAINING_FIRING_ZONE_DATA_URL = "/data/khoa/navigation/khoa-maritime-training-firing-zone.geojson";
export const KHOA_TRAINING_FIRING_ZONE_WARNING = "공식 공개 구역 경계 참고자료이며 현재 훈련·사격 실시 여부 또는 통항 가능 여부를 나타내지 않습니다. 출항 전 최신 항행경보와 관계기관 안내를 확인하세요.";

export type KhoaTrainingFiringZoneProperties = {
  id: string;
  name: string | null;
  locationName: string | null;
  referenceChartNumber: string | null;
  referenceChartScale: string | null;
  referenceChartName: string | null;
  organization: string | null;
  revisionYear: string | null;
  effectiveDateText: string | null;
  source: typeof KHOA_ATTRIBUTION;
  sourceUpdatedAt: string;
  sourceRaw?: string;
};

type Position = [number, number];
type PolygonGeometry = { type: "Polygon"; coordinates: Position[][] };
export type KhoaTrainingFiringZoneFeature = {
  type: "Feature";
  id?: string | number;
  geometry: PolygonGeometry;
  properties: KhoaTrainingFiringZoneProperties;
};
export type KhoaTrainingFiringZoneCollection = {
  type: "FeatureCollection";
  name?: string;
  features: KhoaTrainingFiringZoneFeature[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === "number"
    && Number.isFinite(value[0])
    && value[0] >= -180
    && value[0] <= 180
    && typeof value[1] === "number"
    && Number.isFinite(value[1])
    && value[1] >= -90
    && value[1] <= 90;
}

function isRing(value: unknown): value is Position[] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseProperties(value: unknown): KhoaTrainingFiringZoneProperties {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !value.id.startsWith("khoa-seatn-")
    || !nullableString(value.name)
    || !nullableString(value.locationName)
    || !nullableString(value.referenceChartNumber)
    || !nullableString(value.referenceChartScale)
    || !nullableString(value.referenceChartName)
    || !nullableString(value.organization)
    || !nullableString(value.revisionYear)
    || !nullableString(value.effectiveDateText)
    || value.source !== KHOA_ATTRIBUTION
    || typeof value.sourceUpdatedAt !== "string") {
    throw new Error("Invalid KHOA training/firing-zone properties");
  }
  return value as KhoaTrainingFiringZoneProperties;
}

function parseFeature(value: unknown): KhoaTrainingFiringZoneFeature {
  if (!isRecord(value) || value.type !== "Feature" || !isRecord(value.geometry)) {
    throw new Error("Invalid KHOA training/firing-zone feature");
  }
  const geometry = value.geometry;
  if (geometry.type !== "Polygon"
    || !Array.isArray(geometry.coordinates)
    || geometry.coordinates.length === 0
    || !geometry.coordinates.every(isRing)) {
    throw new Error("Invalid KHOA training/firing-zone coordinates");
  }
  return {
    type: "Feature",
    ...(typeof value.id === "string" || typeof value.id === "number" ? { id: value.id } : {}),
    geometry: geometry as PolygonGeometry,
    properties: parseProperties(value.properties),
  };
}

export function parseKhoaTrainingFiringZoneGeoJson(value: unknown): KhoaTrainingFiringZoneCollection {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error("Invalid KHOA training/firing-zone FeatureCollection");
  }
  return {
    type: "FeatureCollection",
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    features: value.features.map(parseFeature),
  };
}

export function parseKhoaTrainingFiringZoneFeatureProperties(value: unknown): KhoaTrainingFiringZoneProperties | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !value.id.startsWith("khoa-seatn-")
    || value.source !== KHOA_ATTRIBUTION
    || typeof value.sourceUpdatedAt !== "string") return null;
  const optionalString = (field: unknown) => field == null || field === "" ? null : String(field);
  return {
    id: value.id,
    name: optionalString(value.name),
    locationName: optionalString(value.locationName),
    referenceChartNumber: optionalString(value.referenceChartNumber),
    referenceChartScale: optionalString(value.referenceChartScale),
    referenceChartName: optionalString(value.referenceChartName),
    organization: optionalString(value.organization),
    revisionYear: optionalString(value.revisionYear),
    effectiveDateText: optionalString(value.effectiveDateText),
    source: KHOA_ATTRIBUTION,
    sourceUpdatedAt: value.sourceUpdatedAt,
    ...(typeof value.sourceRaw === "string" ? { sourceRaw: value.sourceRaw } : {}),
  };
}

export function createKhoaTrainingFiringZoneLayerConfig(data: KhoaTrainingFiringZoneCollection, visible = false) {
  return {
    id: KHOA_TRAINING_FIRING_ZONE_LAYER_ID,
    order: 15,
    visible,
    source: { type: "geojson" as const, data, attribution: KHOA_ATTRIBUTION },
    layers: [
      {
        id: "area",
        type: "fill" as const,
        source: "",
        paint: { "fill-color": "#a96f38", "fill-opacity": 0.1 },
      },
      {
        id: "outline",
        type: "line" as const,
        source: "",
        paint: { "line-color": "#d0a064", "line-width": 1.15, "line-opacity": 0.82, "line-dasharray": [3, 2] },
      },
    ],
  };
}

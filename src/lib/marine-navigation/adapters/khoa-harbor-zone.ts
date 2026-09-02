import { KHOA_ATTRIBUTION } from "./khoa-deep-water-route";

export const KHOA_HARBOR_ZONE_LAYER_ID = "khoa-harbor-zone";
export const KHOA_HARBOR_ZONE_DATA_URL = "/data/khoa/navigation/khoa-harbor-zone.geojson";

export type KhoaHarborZoneProperties = {
  id: string;
  name: string | null;
  englishName: string | null;
  harborTypeCode: string | null;
  relatedInstitutionCode: string | null;
  statusCode: string | null;
  minimumScale: number | null;
  source: typeof KHOA_ATTRIBUTION;
  sourceUpdatedAt: string;
  sourceRaw?: string;
};

type Position = [number, number];
type PolygonGeometry = { type: "Polygon"; coordinates: Position[][] };
type MultiPolygonGeometry = { type: "MultiPolygon"; coordinates: Position[][][] };
export type KhoaHarborZoneFeature = {
  type: "Feature";
  id?: string | number;
  geometry: PolygonGeometry | MultiPolygonGeometry;
  properties: KhoaHarborZoneProperties;
};
export type KhoaHarborZoneCollection = {
  type: "FeatureCollection";
  name?: string;
  features: KhoaHarborZoneFeature[];
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

function parseProperties(value: unknown): KhoaHarborZoneProperties {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !value.id.startsWith("khoa-hrbare-")
    || !nullableString(value.name)
    || !nullableString(value.englishName)
    || !nullableString(value.harborTypeCode)
    || !nullableString(value.relatedInstitutionCode)
    || !nullableString(value.statusCode)
    || !(value.minimumScale === null || (typeof value.minimumScale === "number" && Number.isFinite(value.minimumScale)))
    || value.source !== KHOA_ATTRIBUTION
    || typeof value.sourceUpdatedAt !== "string") {
    throw new Error("Invalid KHOA harbor-zone properties");
  }
  return value as KhoaHarborZoneProperties;
}

function parseFeature(value: unknown): KhoaHarborZoneFeature {
  if (!isRecord(value) || value.type !== "Feature" || !isRecord(value.geometry)) {
    throw new Error("Invalid KHOA harbor-zone feature");
  }
  const geometry = value.geometry;
  const polygon = geometry.type === "Polygon"
    && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length > 0
    && geometry.coordinates.every(isRing);
  const multiPolygon = geometry.type === "MultiPolygon"
    && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length > 0
    && geometry.coordinates.every((part) => Array.isArray(part) && part.length > 0 && part.every(isRing));
  if (!polygon && !multiPolygon) throw new Error("Invalid KHOA harbor-zone coordinates");
  return {
    type: "Feature",
    ...(typeof value.id === "string" || typeof value.id === "number" ? { id: value.id } : {}),
    geometry: geometry as PolygonGeometry | MultiPolygonGeometry,
    properties: parseProperties(value.properties),
  };
}

export function parseKhoaHarborZoneGeoJson(value: unknown): KhoaHarborZoneCollection {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error("Invalid KHOA harbor-zone FeatureCollection");
  }
  return {
    type: "FeatureCollection",
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    features: value.features.map(parseFeature),
  };
}

export function parseKhoaHarborZoneFeatureProperties(value: unknown): KhoaHarborZoneProperties | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !value.id.startsWith("khoa-hrbare-")
    || value.source !== KHOA_ATTRIBUTION
    || typeof value.sourceUpdatedAt !== "string") return null;
  const optionalString = (field: unknown) => field == null || field === "" ? null : String(field);
  const minimumScale = value.minimumScale == null || value.minimumScale === "" ? null : Number(value.minimumScale);
  if (minimumScale !== null && !Number.isFinite(minimumScale)) return null;
  return {
    id: value.id,
    name: optionalString(value.name),
    englishName: optionalString(value.englishName),
    harborTypeCode: optionalString(value.harborTypeCode),
    relatedInstitutionCode: optionalString(value.relatedInstitutionCode),
    statusCode: optionalString(value.statusCode),
    minimumScale,
    source: KHOA_ATTRIBUTION,
    sourceUpdatedAt: value.sourceUpdatedAt,
    ...(typeof value.sourceRaw === "string" ? { sourceRaw: value.sourceRaw } : {}),
  };
}

export function createKhoaHarborZoneLayerConfig(data: KhoaHarborZoneCollection, visible = false) {
  return {
    id: KHOA_HARBOR_ZONE_LAYER_ID,
    order: 10,
    visible,
    source: { type: "geojson" as const, data, attribution: KHOA_ATTRIBUTION },
    layers: [
      {
        id: "area",
        type: "fill" as const,
        source: "",
        paint: { "fill-color": "#365d68", "fill-opacity": 0.12 },
      },
      {
        id: "outline",
        type: "line" as const,
        source: "",
        paint: { "line-color": "#7d9da6", "line-width": 0.9, "line-opacity": 0.72 },
      },
    ],
  };
}

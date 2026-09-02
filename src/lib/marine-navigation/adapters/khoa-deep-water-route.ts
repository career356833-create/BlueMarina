export const KHOA_DEEP_WATER_ROUTE_LAYER_ID = "khoa-deep-water-route";
export const KHOA_DEEP_WATER_ROUTE_DATA_URL = "/data/khoa/navigation/khoa-deep-water-route.geojson";
export const KHOA_ATTRIBUTION = "국립해양조사원(KHOA)";

export type KhoaDeepWaterRouteProperties = {
  id: string;
  name: string | null;
  minDepth: number | null;
  maxDepth: number | null;
  bearing: number | null;
  surveyCharacteristic: string | null;
  trafficFlow: string | null;
  source: typeof KHOA_ATTRIBUTION;
  sourceUpdatedAt: string;
  sourceRaw?: string;
};

type Position = [number, number];
type PolygonGeometry = { type: "Polygon"; coordinates: Position[][] };
type MultiPolygonGeometry = { type: "MultiPolygon"; coordinates: Position[][][] };
export type KhoaDeepWaterRouteFeature = {
  type: "Feature";
  id?: string | number;
  geometry: PolygonGeometry | MultiPolygonGeometry;
  properties: KhoaDeepWaterRouteProperties;
};
export type KhoaDeepWaterRouteCollection = {
  type: "FeatureCollection";
  name?: string;
  features: KhoaDeepWaterRouteFeature[];
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

function nullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseProperties(value: unknown): KhoaDeepWaterRouteProperties {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !value.id.startsWith("khoa-dwrtpt-")
    || !nullableString(value.name)
    || !nullableNumber(value.minDepth)
    || !nullableNumber(value.maxDepth)
    || !nullableNumber(value.bearing)
    || !nullableString(value.surveyCharacteristic)
    || !nullableString(value.trafficFlow)
    || value.source !== KHOA_ATTRIBUTION
    || typeof value.sourceUpdatedAt !== "string") {
    throw new Error("Invalid KHOA deep-water-route properties");
  }
  return value as KhoaDeepWaterRouteProperties;
}

function parseFeature(value: unknown): KhoaDeepWaterRouteFeature {
  if (!isRecord(value) || value.type !== "Feature" || !isRecord(value.geometry)) {
    throw new Error("Invalid KHOA deep-water-route feature");
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
  if (!polygon && !multiPolygon) throw new Error("Invalid KHOA deep-water-route coordinates");
  return {
    type: "Feature",
    ...(typeof value.id === "string" || typeof value.id === "number" ? { id: value.id } : {}),
    geometry: geometry as PolygonGeometry | MultiPolygonGeometry,
    properties: parseProperties(value.properties),
  };
}

export function parseKhoaDeepWaterRouteGeoJson(value: unknown): KhoaDeepWaterRouteCollection {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error("Invalid KHOA deep-water-route FeatureCollection");
  }
  return {
    type: "FeatureCollection",
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    features: value.features.map(parseFeature),
  };
}

export function parseKhoaDeepWaterRouteFeatureProperties(value: unknown): KhoaDeepWaterRouteProperties | null {
  try {
    if (!isRecord(value)) return null;
    return parseProperties({
      ...value,
      name: value.name ?? null,
      minDepth: value.minDepth == null ? null : Number(value.minDepth),
      maxDepth: value.maxDepth == null ? null : Number(value.maxDepth),
      bearing: value.bearing == null ? null : Number(value.bearing),
      surveyCharacteristic: value.surveyCharacteristic ?? null,
      trafficFlow: value.trafficFlow ?? null,
    });
  } catch {
    return null;
  }
}

export function createKhoaDeepWaterRouteLayerConfig(data: KhoaDeepWaterRouteCollection, visible = true) {
  return {
    id: KHOA_DEEP_WATER_ROUTE_LAYER_ID,
    order: 20,
    visible,
    source: { type: "geojson" as const, data, attribution: KHOA_ATTRIBUTION },
    layers: [
      {
        id: "area",
        type: "fill" as const,
        source: "",
        paint: { "fill-color": "#6f918f", "fill-opacity": 0.16 },
      },
      {
        id: "outline",
        type: "line" as const,
        source: "",
        paint: { "line-color": "#b8c9c3", "line-width": 1.35, "line-opacity": 0.78, "line-dasharray": [2, 1.5] },
      },
    ],
  };
}

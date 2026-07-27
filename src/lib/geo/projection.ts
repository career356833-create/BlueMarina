import { normalizeCoordinates, type CoordinateValidationResult, type Coordinates } from "./coordinates.ts";

export type ProjectedPoint = {
  x: number;
  y: number;
};

export type FishingSpotPointParseResult =
  | {
      ok: true;
      point: ProjectedPoint;
    }
  | {
      ok: false;
      error: "MISSING_POINT" | "INVALID_POINT";
    };

export type FishingSpotProjectionResult =
  | {
      ok: true;
      coordinates: Coordinates;
      point: ProjectedPoint;
    }
  | {
      ok: false;
      error: "MISSING_POINT" | "INVALID_POINT" | "INVALID_TRANSFORMED_COORDINATES";
      coordinateValidation?: CoordinateValidationResult;
    };

// EPSG:5179 Korea 2000 / Unified CS.
// PROJ definition: +proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs
const EPSG_5179 = {
  semiMajorAxis: 6378137,
  inverseFlattening: 298.257222101,
  latitudeOfOriginDegrees: 38,
  centralMeridianDegrees: 127.5,
  scaleFactor: 0.9996,
  falseEasting: 1000000,
  falseNorthing: 2000000
} as const;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function getEccentricitySquared() {
  const flattening = 1 / EPSG_5179.inverseFlattening;
  return flattening * (2 - flattening);
}

function getMeridionalArc(latitudeRadians: number) {
  const e2 = getEccentricitySquared();
  const e4 = e2 * e2;
  const e6 = e4 * e2;

  return (
    EPSG_5179.semiMajorAxis *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latitudeRadians -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * latitudeRadians) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latitudeRadians) -
      ((35 * e6) / 3072) * Math.sin(6 * latitudeRadians))
  );
}

export function parseProjectedPoint(value: string): FishingSpotPointParseResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "MISSING_POINT" };
  }

  const match = trimmed.match(/^POINT\s*\(\s*([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s*\)$/i);

  if (!match) {
    return { ok: false, error: "INVALID_POINT" };
  }

  const x = Number(match[1]);
  const y = Number(match[2]);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { ok: false, error: "INVALID_POINT" };
  }

  return { ok: true, point: { x, y } };
}

export function convertEpsg5179ToWgs84(point: ProjectedPoint): Coordinates {
  const e2 = getEccentricitySquared();
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const ep2 = e2 / (1 - e2);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const e12 = e1 * e1;
  const e13 = e12 * e1;
  const e14 = e13 * e1;

  const latitudeOfOrigin = toRadians(EPSG_5179.latitudeOfOriginDegrees);
  const centralMeridian = toRadians(EPSG_5179.centralMeridianDegrees);
  const meridionalArcOrigin = getMeridionalArc(latitudeOfOrigin);
  const meridionalArc = meridionalArcOrigin + (point.y - EPSG_5179.falseNorthing) / EPSG_5179.scaleFactor;
  const mu =
    meridionalArc /
    (EPSG_5179.semiMajorAxis * (1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256));

  const footprintLatitude =
    mu +
    ((3 * e1) / 2 - (27 * e13) / 32) * Math.sin(2 * mu) +
    ((21 * e12) / 16 - (55 * e14) / 32) * Math.sin(4 * mu) +
    ((151 * e13) / 96) * Math.sin(6 * mu) +
    ((1097 * e14) / 512) * Math.sin(8 * mu);

  const sinFootprint = Math.sin(footprintLatitude);
  const cosFootprint = Math.cos(footprintLatitude);
  const tanFootprint = Math.tan(footprintLatitude);
  const n1 = EPSG_5179.semiMajorAxis / Math.sqrt(1 - e2 * sinFootprint * sinFootprint);
  const r1 = (EPSG_5179.semiMajorAxis * (1 - e2)) / Math.pow(1 - e2 * sinFootprint * sinFootprint, 1.5);
  const t1 = tanFootprint * tanFootprint;
  const c1 = ep2 * cosFootprint * cosFootprint;
  const d = (point.x - EPSG_5179.falseEasting) / (n1 * EPSG_5179.scaleFactor);

  const latitude =
    footprintLatitude -
    ((n1 * tanFootprint) / r1) *
      ((d * d) / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * Math.pow(d, 4)) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * Math.pow(d, 6)) / 720);

  const longitude =
    centralMeridian +
    (d -
      ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * Math.pow(d, 5)) / 120) /
      cosFootprint;

  return {
    lat: toDegrees(latitude),
    lng: toDegrees(longitude)
  };
}

export function convertFishingSpotPointToWgs84(originalPoint: string): FishingSpotProjectionResult {
  const parsed = parseProjectedPoint(originalPoint);

  if (!parsed.ok) {
    return parsed;
  }

  const coordinates = convertEpsg5179ToWgs84(parsed.point);
  const validation = normalizeCoordinates(coordinates);

  if (!validation.ok) {
    return {
      ok: false,
      error: "INVALID_TRANSFORMED_COORDINATES",
      coordinateValidation: validation
    };
  }

  return {
    ok: true,
    coordinates: validation.coordinates,
    point: parsed.point
  };
}

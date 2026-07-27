export type CoordinateInput = string | number | null | undefined;

export type CoordinatePairInput = {
  lat: CoordinateInput;
  lng: CoordinateInput;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export type CoordinateValidationError =
  | "MISSING_LAT"
  | "MISSING_LNG"
  | "INVALID_LAT"
  | "INVALID_LNG"
  | "LAT_OUT_OF_RANGE"
  | "LNG_OUT_OF_RANGE"
  | "COORDINATE_ORDER_SUSPECTED"
  | "OUTSIDE_KOREA_BOUNDS";

export type CoordinateValidationResult =
  | {
      ok: true;
      coordinates: Coordinates;
    }
  | {
      ok: false;
      error: CoordinateValidationError;
    };

export const KOREA_COORDINATE_BOUNDS = {
  minLat: 32,
  maxLat: 39.8,
  minLng: 124,
  maxLng: 132.5
} as const;

function parseCoordinateValue(value: CoordinateInput) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function isCoordinateInKoreaBounds(coordinates: Coordinates) {
  return (
    coordinates.lat >= KOREA_COORDINATE_BOUNDS.minLat &&
    coordinates.lat <= KOREA_COORDINATE_BOUNDS.maxLat &&
    coordinates.lng >= KOREA_COORDINATE_BOUNDS.minLng &&
    coordinates.lng <= KOREA_COORDINATE_BOUNDS.maxLng
  );
}

export function normalizeCoordinates(input: CoordinatePairInput): CoordinateValidationResult {
  const lat = parseCoordinateValue(input.lat);
  const lng = parseCoordinateValue(input.lng);

  if (lat === null) {
    return { ok: false, error: "MISSING_LAT" };
  }

  if (lng === null) {
    return { ok: false, error: "MISSING_LNG" };
  }

  if (!Number.isFinite(lat)) {
    return { ok: false, error: "INVALID_LAT" };
  }

  if (!Number.isFinite(lng)) {
    return { ok: false, error: "INVALID_LNG" };
  }

  if (
    lat >= KOREA_COORDINATE_BOUNDS.minLng &&
    lat <= KOREA_COORDINATE_BOUNDS.maxLng &&
    lng >= KOREA_COORDINATE_BOUNDS.minLat &&
    lng <= KOREA_COORDINATE_BOUNDS.maxLat
  ) {
    return { ok: false, error: "COORDINATE_ORDER_SUSPECTED" };
  }

  if (lat < -90 || lat > 90) {
    return { ok: false, error: "LAT_OUT_OF_RANGE" };
  }

  if (lng < -180 || lng > 180) {
    return { ok: false, error: "LNG_OUT_OF_RANGE" };
  }

  const coordinates = { lat, lng };

  if (!isCoordinateInKoreaBounds(coordinates)) {
    return { ok: false, error: "OUTSIDE_KOREA_BOUNDS" };
  }

  return { ok: true, coordinates };
}

export function isValidCoordinate(input: CoordinatePairInput) {
  return normalizeCoordinates(input).ok;
}

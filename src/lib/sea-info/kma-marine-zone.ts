import largeZonesJson from "../../data/kma-marine-large-zones.json" with { type: "json" };

export type KmaMarineLargeZone = {
  lzone: number;
  baseLat: number;
  baseLng: number;
};

export type KmaMarineZoneBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type KmaMarineZoneMatchStatus = "matched" | "not_found" | "ambiguous" | "boundary";

export type KmaMarineZoneMatch = {
  status: KmaMarineZoneMatchStatus;
  lzone?: number;
  szone?: number;
  largeZoneBounds?: KmaMarineZoneBounds;
  smallZoneBounds?: KmaMarineZoneBounds;
  candidates?: Array<{
    lzone: number;
    baseLat: number;
    baseLng: number;
  }>;
  reason?: string;
};

const LARGE_ZONE_SIZE_DEGREES = 0.5;
const SMALL_ZONE_SIZE_DEGREES = LARGE_ZONE_SIZE_DEGREES / 3;
const EPSILON = 1e-10;

export const KMA_MARINE_SMALL_ZONE_MATRIX = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
] as const;

export const kmaMarineLargeZones = largeZonesJson as KmaMarineLargeZone[];

const lzoneCounts = new Map<number, number>();
for (const zone of kmaMarineLargeZones) {
  lzoneCounts.set(zone.lzone, (lzoneCounts.get(zone.lzone) ?? 0) + 1);
}

export const ambiguousKmaMarineLzones = Array.from(lzoneCounts.entries())
  .filter(([, count]) => count > 1)
  .map(([lzone]) => lzone)
  .sort((a, b) => a - b);

function roundCoordinate(value: number) {
  return Number(value.toFixed(10));
}

export function getLargeZoneBounds(zone: KmaMarineLargeZone): KmaMarineZoneBounds {
  return {
    minLat: roundCoordinate(zone.baseLat - LARGE_ZONE_SIZE_DEGREES),
    maxLat: roundCoordinate(zone.baseLat),
    minLng: roundCoordinate(zone.baseLng),
    maxLng: roundCoordinate(zone.baseLng + LARGE_ZONE_SIZE_DEGREES)
  };
}

function isFiniteCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function containsInclusive(bounds: KmaMarineZoneBounds, lat: number, lng: number) {
  return (
    lat >= bounds.minLat - EPSILON &&
    lat <= bounds.maxLat + EPSILON &&
    lng >= bounds.minLng - EPSILON &&
    lng <= bounds.maxLng + EPSILON
  );
}

function isOnLine(value: number, line: number) {
  return Math.abs(value - line) <= EPSILON;
}

function isOnLargeBoundary(bounds: KmaMarineZoneBounds, lat: number, lng: number) {
  return (
    isOnLine(lat, bounds.minLat) ||
    isOnLine(lat, bounds.maxLat) ||
    isOnLine(lng, bounds.minLng) ||
    isOnLine(lng, bounds.maxLng)
  );
}

function isOnSmallBoundary(bounds: KmaMarineZoneBounds, lat: number, lng: number) {
  const latLine1 = bounds.maxLat - SMALL_ZONE_SIZE_DEGREES;
  const latLine2 = bounds.maxLat - SMALL_ZONE_SIZE_DEGREES * 2;
  const lngLine1 = bounds.minLng + SMALL_ZONE_SIZE_DEGREES;
  const lngLine2 = bounds.minLng + SMALL_ZONE_SIZE_DEGREES * 2;

  return isOnLine(lat, latLine1) || isOnLine(lat, latLine2) || isOnLine(lng, lngLine1) || isOnLine(lng, lngLine2);
}

function clampSmallIndex(value: number) {
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

export function getSmallZoneForCoordinate(bounds: KmaMarineZoneBounds, lat: number, lng: number) {
  const row = clampSmallIndex(Math.floor((bounds.maxLat - lat) / SMALL_ZONE_SIZE_DEGREES));
  const col = clampSmallIndex(Math.floor((lng - bounds.minLng) / SMALL_ZONE_SIZE_DEGREES));
  const szone = KMA_MARINE_SMALL_ZONE_MATRIX[row][col];
  const smallMaxLat = bounds.maxLat - row * SMALL_ZONE_SIZE_DEGREES;
  const smallMinLat = smallMaxLat - SMALL_ZONE_SIZE_DEGREES;
  const smallMinLng = bounds.minLng + col * SMALL_ZONE_SIZE_DEGREES;
  const smallMaxLng = smallMinLng + SMALL_ZONE_SIZE_DEGREES;

  return {
    szone,
    bounds: {
      minLat: roundCoordinate(smallMinLat),
      maxLat: roundCoordinate(smallMaxLat),
      minLng: roundCoordinate(smallMinLng),
      maxLng: roundCoordinate(smallMaxLng)
    }
  };
}

export function findKmaMarineZoneByCoordinate(lat: number, lng: number): KmaMarineZoneMatch {
  if (!isFiniteCoordinate(lat, lng)) {
    return {
      status: "not_found",
      reason: "INVALID_COORDINATE"
    };
  }

  const candidates = kmaMarineLargeZones.filter((zone) => containsInclusive(getLargeZoneBounds(zone), lat, lng));

  if (candidates.length === 0) {
    return {
      status: "not_found",
      reason: "OUT_OF_OFFICIAL_ZONE_TABLE"
    };
  }

  if (candidates.some((candidate) => ambiguousKmaMarineLzones.includes(candidate.lzone))) {
    return {
      status: "ambiguous",
      candidates: candidates.map((candidate) => ({
        lzone: candidate.lzone,
        baseLat: candidate.baseLat,
        baseLng: candidate.baseLng
      })),
      reason: "DUPLICATED_LZONE_ID"
    };
  }

  const selected = candidates[0];
  const bounds = getLargeZoneBounds(selected);
  const small = getSmallZoneForCoordinate(bounds, lat, lng);
  const boundary = candidates.length > 1 || isOnLargeBoundary(bounds, lat, lng) || isOnSmallBoundary(bounds, lat, lng);

  return {
    status: boundary ? "boundary" : "matched",
    lzone: selected.lzone,
    szone: small.szone,
    largeZoneBounds: bounds,
    smallZoneBounds: small.bounds,
    candidates:
      candidates.length > 1
        ? candidates.map((candidate) => ({
            lzone: candidate.lzone,
            baseLat: candidate.baseLat,
            baseLng: candidate.baseLng
          }))
        : undefined,
    reason: boundary ? "ON_GRID_BOUNDARY" : undefined
  };
}

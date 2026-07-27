import fs from "node:fs";
import { calculateDistanceKm } from "../src/lib/sea-info/distance.ts";
import { normalizeCoordinates } from "../src/lib/geo/coordinates.ts";
import { convertFishingSpotPointToWgs84 } from "../src/lib/geo/projection.ts";

type FishingSpotRecord = {
  id: string;
  name: string;
  type: string;
  region: string;
  city: string;
  lat: string;
  lng: string;
  originalPoint: string;
  sourceType: string;
  originalId: string;
};

type ErrorRecord = {
  id: string;
  name: string;
  type: string;
  region: string;
  city: string;
  sourceType: string;
  originalId: string;
  originalPoint: string;
  existingLat: string;
  existingLng: string;
  convertedLat: number;
  convertedLng: number;
  errorMeters: number;
};

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.ceil(sortedValues.length * ratio) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function round(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

const fishingSpots = JSON.parse(fs.readFileSync("src/data/fishing-spots.json", "utf8")) as FishingSpotRecord[];

const recordsWithValidExistingCoordinates: ErrorRecord[] = [];
const recoverableRecords: FishingSpotRecord[] = [];

for (const spot of fishingSpots) {
  const existingCoordinates = normalizeCoordinates({ lat: spot.lat, lng: spot.lng });
  const projected = convertFishingSpotPointToWgs84(spot.originalPoint);

  if (!existingCoordinates.ok && projected.ok) {
    recoverableRecords.push(spot);
    continue;
  }

  if (existingCoordinates.ok && projected.ok) {
    const errorMeters = calculateDistanceKm(projected.coordinates, existingCoordinates.coordinates) * 1000;

    recordsWithValidExistingCoordinates.push({
      id: spot.id,
      name: spot.name,
      type: spot.type,
      region: spot.region,
      city: spot.city,
      sourceType: spot.sourceType,
      originalId: spot.originalId,
      originalPoint: spot.originalPoint,
      existingLat: spot.lat,
      existingLng: spot.lng,
      convertedLat: projected.coordinates.lat,
      convertedLng: projected.coordinates.lng,
      errorMeters
    });
  }
}

const sortedErrors = recordsWithValidExistingCoordinates.map((record) => record.errorMeters).sort((a, b) => a - b);
const totalError = sortedErrors.reduce((sum, value) => sum + value, 0);
const boat143 = fishingSpots.find((spot) => spot.id === "boat-143");
const boat143Projection = boat143 ? convertFishingSpotPointToWgs84(boat143.originalPoint) : null;

const report = {
  comparedCount: recordsWithValidExistingCoordinates.length,
  averageErrorMeters: round(totalError / Math.max(1, sortedErrors.length)),
  medianErrorMeters: round(percentile(sortedErrors, 0.5)),
  p95ErrorMeters: round(percentile(sortedErrors, 0.95)),
  maxErrorMeters: round(sortedErrors[sortedErrors.length - 1] ?? 0),
  over10mCount: sortedErrors.filter((value) => value > 10).length,
  over50mCount: sortedErrors.filter((value) => value > 50).length,
  over100mCount: sortedErrors.filter((value) => value > 100).length,
  recoverableInvalidOrMissingCount: recoverableRecords.length,
  boat143:
    boat143 && boat143Projection?.ok
      ? {
          id: boat143.id,
          name: boat143.name,
          originalPoint: boat143.originalPoint,
          existingLat: boat143.lat,
          existingLng: boat143.lng,
          convertedLat: round(boat143Projection.coordinates.lat, 6),
          convertedLng: round(boat143Projection.coordinates.lng, 6)
        }
      : null,
  largestErrors: recordsWithValidExistingCoordinates
    .sort((a, b) => b.errorMeters - a.errorMeters)
    .slice(0, 20)
    .map((record) => ({
      ...record,
      convertedLat: round(record.convertedLat, 6),
      convertedLng: round(record.convertedLng, 6),
      errorMeters: round(record.errorMeters)
    }))
};

console.log(JSON.stringify(report, null, 2));

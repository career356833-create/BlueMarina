import type { GeoPoint } from "./types";

export const EARTH_RADIUS_METERS = 6_371_008.8;
export const METERS_PER_NAUTICAL_MILE = 1_852;
export const ARRIVAL_RADIUS_METERS = 75;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function distanceMeters(from: GeoPoint, to: GeoPoint): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export const metersToNauticalMiles = (meters: number) => meters / METERS_PER_NAUTICAL_MILE;
export const metersToKilometers = (meters: number) => meters / 1_000;
export const metersPerSecondToKnots = (metersPerSecond: number) => metersPerSecond * 1.9438444924;

export function destinationPoint(from: GeoPoint, bearingDegrees: number, distance: number): GeoPoint {
  const angularDistance = distance / EARTH_RADIUS_METERS;
  const bearing = toRadians(bearingDegrees);
  const latitude1 = toRadians(from.latitude);
  const longitude1 = toRadians(from.longitude);
  const latitude2 = Math.asin(
    Math.sin(latitude1) * Math.cos(angularDistance)
      + Math.cos(latitude1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const longitude2 = longitude1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude1),
    Math.cos(angularDistance) - Math.sin(latitude1) * Math.sin(latitude2),
  );
  return { latitude: toDegrees(latitude2), longitude: toDegrees(longitude2) };
}

export function hasArrived(distance: number, accuracyMeters: number | undefined, arrivalRadiusMeters = ARRIVAL_RADIUS_METERS): boolean {
  if (!Number.isFinite(distance) || accuracyMeters == null || !Number.isFinite(accuracyMeters)) return false;
  if (accuracyMeters > arrivalRadiusMeters) return false;
  return distance + Math.max(0, accuracyMeters) <= arrivalRadiusMeters;
}

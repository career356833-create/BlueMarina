import type { GeoPoint } from "./types";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function initialBearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(latitude2);
  const x = Math.cos(latitude1) * Math.sin(latitude2)
    - Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(longitudeDelta);
  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

export function relativeBearingDegrees(targetBearing: number, currentHeading: number): number {
  const normalized = normalizeDegrees(targetBearing - currentHeading);
  return normalized > 180 ? normalized - 360 : normalized;
}

const compass16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;

export function compassDirection(degrees: number): (typeof compass16)[number] {
  return compass16[Math.round(normalizeDegrees(degrees) / 22.5) % 16];
}

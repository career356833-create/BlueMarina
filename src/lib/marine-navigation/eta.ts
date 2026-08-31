import { METERS_PER_NAUTICAL_MILE } from "./geo";

export const MINIMUM_ETA_SPEED_KNOTS = 0.5;

export function estimateEtaMinutes(distanceMeters: number, speedKnots: number | null | undefined): number | null {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || speedKnots == null || speedKnots < MINIMUM_ETA_SPEED_KNOTS) return null;
  return (distanceMeters / METERS_PER_NAUTICAL_MILE / speedKnots) * 60;
}

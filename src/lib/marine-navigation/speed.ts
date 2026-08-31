import { initialBearingDegrees } from "./bearing";
import { distanceMeters, metersPerSecondToKnots } from "./geo";
import type { VesselPosition } from "./types";

export type DerivedMovement = { speedKnots?: number; heading?: number };

export function deriveMovement(previous: VesselPosition | null, next: Pick<VesselPosition, "latitude" | "longitude" | "timestamp" | "accuracyMeters">): DerivedMovement {
  if (!previous || (previous.accuracyMeters ?? Infinity) > 50 || (next.accuracyMeters ?? Infinity) > 50) return {};
  const elapsedSeconds = (next.timestamp - previous.timestamp) / 1_000;
  if (elapsedSeconds < 1 || elapsedSeconds > 30) return {};
  const moved = distanceMeters(previous, next);
  return {
    speedKnots: metersPerSecondToKnots(moved / elapsedSeconds),
    ...(moved >= 5 ? { heading: initialBearingDegrees(previous, next) } : {}),
  };
}

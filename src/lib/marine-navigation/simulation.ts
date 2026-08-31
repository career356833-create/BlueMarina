import { destinationPoint, distanceMeters } from "./geo";
import { initialBearingDegrees } from "./bearing";
import type { NavigationDestination, VesselPosition } from "./types";

export const simulationOrigin = { latitude: 35.1543, longitude: 129.1267 };

export function simulationEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_MARINE_NAVIGATION_SIMULATION === "true";
}

export function advanceSimulation(current: VesselPosition, destination: NavigationDestination, meters = 4): VesselPosition {
  const remaining = distanceMeters(current, destination);
  const heading = initialBearingDegrees(current, destination);
  const moved = Math.min(meters, remaining);
  return {
    ...destinationPoint(current, heading, moved), heading, headingSource: "SIMULATION",
    speedKnots: moved < 1 ? 0 : 7.8, speedSource: "SIMULATION", accuracyMeters: 3,
    timestamp: Date.now(), source: "SIMULATION",
  };
}

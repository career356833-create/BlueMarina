import type { VesselPosition } from "./types";

export type SpeedSample = { metersPerSecond: number; timestamp: number };
export const KNOTS_PER_MPS = 1.943844;

// Display plausibility limits, not a vessel capability or safety assessment.
export function filterGpsSpeed(raw: number | null, accuracy: number, timestamp: number, now: number, previous: SpeedSample | null): SpeedSample | null {
  if (raw == null || !Number.isFinite(raw) || raw < 0 || raw > 60 || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 50 || !Number.isFinite(timestamp) || now - timestamp > 15_000 || timestamp > now + 2_000) return null;
  const elapsed = previous ? (timestamp - previous.timestamp) / 1000 : Infinity;
  if (elapsed <= 0) return null;
  if (previous && elapsed <= 15 && raw - previous.metersPerSecond > Math.max(4, elapsed * 3)) return null;
  // A valid native zero remains zero; missing speed is never converted to rest.
  const metersPerSecond = raw === 0 ? 0 : previous && elapsed <= 15 ? previous.metersPerSecond + (raw - previous.metersPerSecond) * (1 - Math.exp(-elapsed / 2)) : raw;
  return { metersPerSecond, timestamp };
}

export function speedInUnit(knots: number | null | undefined, unit: "kn" | "km/h"): number | null {
  return knots == null || !Number.isFinite(knots) || knots < 0 ? null : unit === "kn" ? knots : knots / KNOTS_PER_MPS * 3.6;
}

export function reliableCourse(vessel: VesselPosition | null): number | null {
  if (!vessel || (vessel.accuracyMeters ?? Infinity) > 50 || !Number.isFinite(vessel.heading) || vessel.heading! < 0 || vessel.heading! >= 360) return null;
  if (vessel.headingSource === "DEVICE_ORIENTATION") return vessel.heading!;
  return (vessel.speedKnots ?? 0) >= KNOTS_PER_MPS && ["GPS_NATIVE", "SIMULATION"].includes(vessel.headingSource) ? vessel.heading! : null;
}

// Course-up follows movement only. A compass is never substituted for COG.
export function reliableMovementCourse(vessel: VesselPosition | null): number | null {
  return vessel?.headingSource === "DEVICE_ORIENTATION" ? null : reliableCourse(vessel);
}

export function forwardAnchor(height: number, width = 390): number {
  // Responsive 67–72% anchor; reserve room above the collapsed bottom panel.
  return height <= 0 ? 0 : Math.min(height * .22, Math.max(height * .17, width * .34));
}
export function smoothBearing(previous: number, next: number): number {
  const delta = (((next - previous) % 360 + 540) % 360) - 180;
  return previous + Math.max(-35, Math.min(35, delta * .65));
}

export type VesselCamera = { mode: "2d" | "3d"; follow: boolean; courseUp: boolean; recenter: number };
export function cameraView(camera: VesselCamera, vessel: VesselPosition | null, height: number, width = 390) {
  return { pitch: camera.mode === "3d" ? 55 : 0, bearing: camera.courseUp ? reliableMovementCourse(vessel) ?? 0 : 0, offset: [0, camera.mode === "3d" && camera.follow && vessel ? forwardAnchor(height, width) : 0] as [number, number] };
}

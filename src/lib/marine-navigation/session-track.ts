import { distanceMeters } from "./geo";
import { isValidMapPoint } from "./adapters/navigation-map-geojson";
import type { TrackPoint, VesselPosition } from "./types";

export const MAX_SESSION_POINTS = 2400;
export function freshAccurateFix(point: VesselPosition, now: number): boolean {
  return isValidMapPoint(point) && Number.isFinite(point.timestamp) && now - point.timestamp <= 15_000 && point.timestamp <= now + 2_000
    && Number.isFinite(point.accuracyMeters) && point.accuracyMeters! >= 0 && point.accuracyMeters! <= 50;
}
// Position plausibility boundary, not a safe-speed or route judgement.
export function plausibleFix(previous: VesselPosition | null, next: VesselPosition): boolean {
  if (!previous || previous.source !== next.source) return true;
  const seconds = (next.timestamp - previous.timestamp) / 1000;
  return seconds > 0 && distanceMeters(previous, next) <= 60 * seconds + (previous.accuracyMeters ?? 0) + (next.accuracyMeters ?? 0);
}
export function appendSessionTrack(points: TrackPoint[], next: VesselPosition, now: number, breakSegment = false): TrackPoint[] {
  if (!freshAccurateFix(next, now)) return points;
  const previous = points.at(-1);
  if (previous && !plausibleFix(previous, next)) return points;
  const gap = previous ? next.timestamp - previous.timestamp : Infinity;
  const segmentStart = breakSegment || gap > 15_000 || previous?.source !== next.source;
  // Stationary jitter is not a path. A new segment starts without bridging a gap.
  if (previous && !segmentStart && distanceMeters(previous, next) < Math.max(5, Math.min(15, next.accuracyMeters!))) return points;
  return [...points, { ...next, segmentStart }].slice(-MAX_SESSION_POINTS);
}

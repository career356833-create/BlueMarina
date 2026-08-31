import { distanceMeters } from "./geo";
import type { TrackPoint } from "./types";

export const TRACK_MIN_INTERVAL_MS = 10_000;
export const TRACK_MIN_DISTANCE_METERS = 10;

export function shouldAppendTrackPoint(previous: TrackPoint | undefined, next: TrackPoint): boolean {
  if (!previous) return true;
  return next.timestamp - previous.timestamp >= TRACK_MIN_INTERVAL_MS
    || distanceMeters(previous, next) >= TRACK_MIN_DISTANCE_METERS;
}

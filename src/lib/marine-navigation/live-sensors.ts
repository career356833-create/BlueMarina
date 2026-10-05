import type { GeolocationFailure, VesselPosition } from "./types";

// Presentation freshness limits, not navigation accuracy/safety guarantees.
export const POSITION_MAX_AGE_MS = 15_000;
export type PositionQuality = "OFF" | "ACQUIRING" | "GOOD" | "LOW_ACCURACY" | "STALE" | "UNAVAILABLE";
export function positionQuality(vessel: VesselPosition | null, active: boolean, failure: GeolocationFailure | null, now: number): PositionQuality {
  if (failure) return "UNAVAILABLE";
  if (!active) return "OFF";
  if (!vessel) return "ACQUIRING";
  if (!Number.isFinite(vessel.timestamp) || now - vessel.timestamp > POSITION_MAX_AGE_MS || vessel.timestamp > now + 2_000) return "STALE";
  return Number.isFinite(vessel.accuracyMeters) && vessel.accuracyMeters! <= 50 ? "GOOD" : "LOW_ACCURACY";
}
export const positionLabels: Record<PositionQuality, string> = { OFF: "GPS 꺼짐", ACQUIRING: "GPS 수신 중", GOOD: "GPS 수신", LOW_ACCURACY: "GPS 오차 큼", STALE: "위치 오래됨", UNAVAILABLE: "GPS 오류" };

export function watchLivePosition(geo: Pick<Geolocation, "watchPosition" | "clearWatch">, accept: PositionCallback, fail: (failure: GeolocationFailure) => void) {
  let id: number | null = null;
  let closed = false;
  const stop = () => { closed = true; if (id != null) { geo.clearWatch(id); id = null; } };
  try {
    id = geo.watchPosition(position => { if (!closed) accept(position); }, error => {
      if (closed) return;
      stop();
      fail(error.code === 1 ? "permission-denied" : error.code === 2 ? "unavailable" : error.code === 3 ? "timeout" : "unknown");
    }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 2_000 });
    // Also handle synchronous error callbacks in browser adapters/tests.
    if (closed && id != null) stop();
  } catch { stop(); fail("unavailable"); }
  return stop;
}

type CompassReading = { webkitCompassHeading?: number; webkitCompassAccuracy?: number; alpha: number | null; absolute?: boolean };
export function compassHeading(reading: CompassReading): number | null {
  const webkit = reading.webkitCompassHeading;
  const value = Number.isFinite(webkit) && webkit! >= 0 && !(reading.webkitCompassAccuracy != null && reading.webkitCompassAccuracy < 0)
    ? webkit : reading.absolute === true && Number.isFinite(reading.alpha) ? 360 - reading.alpha! : null;
  return value == null ? null : ((value % 360) + 360) % 360;
}

export async function compassPermission(orientation: { requestPermission?: () => Promise<string> }): Promise<boolean> {
  try { return !orientation.requestPermission || await orientation.requestPermission() === "granted"; }
  catch { return false; }
}

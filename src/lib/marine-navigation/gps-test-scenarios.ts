import { destinationPoint } from "./geo";
import type { GeoPoint } from "./types";
import { KNOTS_PER_MPS } from "./vessel-instruments";

export const GPS_TEST_SCENARIOS = ["정지 0 kn", "저속 2.5 kn", "이동 8 kn", "이동 15 kn", "가속 5→15", "감속 15→3", "정확도 저하", "신호 끊김", "오래된 좌표", "위치 점프", "방향 변경", "목적지 반대 이동"] as const;
export function testGpsFrame(index: number, tick: number, origin: GeoPoint, now: number, course = 75): GeolocationPosition | null {
  if (index === 7) return null;
  let knots = index === 0 ? 0 : index === 1 ? 2.5 : index === 3 ? 15 : 8;
  if (index === 4) knots = Math.min(15, 5 + tick);
  if (index === 5) knots = Math.max(3, 15 - tick);
  const heading = index === 10 ? (course + tick * 12) % 360 : index === 11 ? (course + 180) % 360 : course;
  // Position progresses at the scenario speed, using the previous frame as origin.
  const point = destinationPoint(origin, heading, knots / KNOTS_PER_MPS);
  return { timestamp: index === 8 ? now - 20_000 : now, coords: { latitude: index === 9 ? point.latitude + 8 : point.latitude, longitude: point.longitude, accuracy: index === 6 ? 150 : 3, speed: knots / KNOTS_PER_MPS, heading, altitude: null, altitudeAccuracy: null, toJSON: () => ({}) }, toJSON: () => ({}) };
}

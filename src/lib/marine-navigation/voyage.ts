import { distanceMeters } from "./geo";
import { freshAccurateFix, plausibleFix } from "./session-track";
import { reliableMovementCourse, KNOTS_PER_MPS } from "./vessel-instruments";
import type { NavigationDestination, TrackPoint, VesselPosition } from "./types";

export const MAX_VOYAGE_POINTS = 10_000;
export type Voyage = {
  version: 1; id: string; state: "RECORDING" | "PAUSED" | "COMPLETED";
  startedAt: number; endedAt?: number; activeSince: number | null; elapsedMs: number;
  distanceMeters: number; movingMs: number; maxKnots: number | null;
  points: TrackPoint[]; distanceAnchor?: TrackPoint; breakSegment: boolean; destinationName?: string; simulation: boolean;
};
export function startVoyage(id: string, now: number, destination?: string, simulation = false): Voyage {
  return { version: 1, id, state: "RECORDING", startedAt: now, activeSince: now, elapsedMs: 0, distanceMeters: 0, movingMs: 0, maxKnots: null, points: [], breakSegment: true, destinationName: destination?.slice(0,120), simulation };
}
export function voyageElapsed(v: Voyage, now: number): number { return v.elapsedMs + (v.activeSince == null ? 0 : Math.max(0, now - v.activeSince)); }
export function transitionVoyage(v: Voyage, state: Voyage["state"], now: number): Voyage {
  if (v.state === "COMPLETED" || v.state === state) return v;
  return { ...v, state, elapsedMs: voyageElapsed(v, now), activeSince: state === "RECORDING" ? now : null, breakSegment: true, ...(state === "COMPLETED" ? {endedAt: now} : {}) };
}
export function appendVoyage(v: Voyage, fix: VesselPosition | null, now: number): Voyage {
  if (v.state !== "RECORDING") return v;
  if (!fix || !freshAccurateFix(fix, now)) return v.breakSegment ? v : {...v, breakSegment: true};
  const last = v.points.at(-1);
  if (last && fix.timestamp === last.timestamp) return v;
  if ((last && !plausibleFix(last, fix)) || (fix.source === "SIMULATION") !== v.simulation) return {...v, breakSegment: true};
  if (v.points.length >= MAX_VOYAGE_POINTS) return transitionVoyage(v, "PAUSED", now);
  const gap = last ? fix.timestamp - last.timestamp : Infinity;
  const segmentStart = v.breakSegment || gap > 15_000 || last?.source !== fix.source;
  const anchor = v.distanceAnchor ?? last;
  const distance = !segmentStart && anchor ? distanceMeters(anchor, fix) : 0;
  // Count only coherent movement above the accuracy jitter envelope; never bridge outages or pauses.
  const moving = !segmentStart && distance >= Math.max(2, Math.min(15, fix.accuracyMeters ?? 15)) && (fix.speedKnots ?? 0) >= .5;
  const speed = fix.speedKnots != null && Number.isFinite(fix.speedKnots) && fix.speedKnots >= 0 && fix.speedKnots <= 60 * KNOTS_PER_MPS ? fix.speedKnots : null;
  return {...v, points: [...v.points, {...fix, segmentStart}], breakSegment: false,
    distanceAnchor: segmentStart || moving || (fix.speedKnots ?? 0) < .5 ? {...fix,segmentStart} : anchor,
    distanceMeters: v.distanceMeters + (moving ? distance : 0), movingMs: v.movingMs + (moving && anchor ? fix.timestamp-anchor.timestamp : 0),
    maxKnots: speed == null ? v.maxKnots : Math.max(v.maxKnots ?? 0, speed)};
}
export function averageMovingKnots(v: Voyage): number | null { return v.movingMs > 0 ? v.distanceMeters / (v.movingMs / 1000) * KNOTS_PER_MPS : null; }
export function savedVoyage(v: Voyage, now: number): Voyage { return {...v, state: v.state === "COMPLETED" ? "COMPLETED" : "PAUSED", elapsedMs: voyageElapsed(v, now), activeSince: null, breakSegment: true}; }

export type EtaSample = { timestamp: number; approachKnots: number };
export function approachKnots(fix: VesselPosition | null, bearing: number | null, now: number): number | null {
  if (!fix || !freshAccurateFix(fix, now) || bearing == null || !Number.isFinite(bearing)) return null;
  const course = reliableMovementCourse(fix);
  if (course == null || (fix.speedKnots ?? 0) < KNOTS_PER_MPS) return null;
  const delta = ((course - bearing + 540) % 360) - 180;
  const speed = fix.speedKnots! * Math.cos(delta * Math.PI / 180);
  return speed > .5 ? speed : null;
}
export function etaEstimate(distance: number | null, fix: VesselPosition | null, bearing: number | null, now: number, samples: EtaSample[]) {
  const approach = approachKnots(fix, bearing, now);
  if (approach == null || distance == null || !Number.isFinite(distance) || distance < 0) return { minutes: null, samples: [] as EtaSample[] };
  const recent = samples.filter(s => now - s.timestamp <= 10_000 && s.timestamp < fix!.timestamp);
  const next = [...recent, {timestamp: fix!.timestamp, approachKnots: approach}].slice(-5);
  const speed = next.reduce((sum, s) => sum + s.approachKnots, 0) / next.length;
  return {minutes: Math.round(distance / 1852 / speed * 60), samples: next};
}
export type Proximity = { count: number; timestamp: number; alerted: boolean };
export const emptyProximity = (): Proximity => ({count: 0, timestamp: 0, alerted: false});
export function proximityStep(previous: Proximity, radius: number, fix: VesselPosition | null, destination: NavigationDestination | null, now: number): Proximity {
  if (previous.alerted) return previous;
  if (![50,100,300].includes(radius) || !destination || !fix || !freshAccurateFix(fix,now) || fix.accuracyMeters! > radius / 2) return {...previous, count: 0};
  if (fix.timestamp <= previous.timestamp) return previous;
  const inside = distanceMeters(fix,destination) + fix.accuracyMeters! <= radius;
  const count = inside ? (fix.timestamp - previous.timestamp <= 15_000 ? previous.count : 0) + 1 : 0;
  return {count, timestamp: fix.timestamp, alerted: count >= 3};
}

const xml = (s: string) => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!)).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
export function voyageGpx(v: Voyage): string | null {
  const points = v.points.filter(p => Number.isFinite(p.timestamp) && p.timestamp > 0 && Number.isFinite(p.latitude) && Math.abs(p.latitude)<=90 && Number.isFinite(p.longitude) && Math.abs(p.longitude)<=180);
  if (!points.length) return null;
  let segments = ''; let open = false;
  for (const p of points) { if (!open || p.segmentStart) { if (open) segments += '</trkseg>'; segments += '<trkseg>'; open = true; } segments += `<trkpt lat="${p.latitude}" lon="${p.longitude}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`; }
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Blue Marina" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${xml((v.simulation ? 'SIMULATION ' : '') + (v.destinationName ?? 'Voyage'))}</name>${segments}</trkseg></trk></gpx>`;
}
export function gpxFilename(v: Voyage) { return `blue-marina-${v.simulation ? 'simulation-' : ''}${v.id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,70) || 'voyage'}.gpx`; }

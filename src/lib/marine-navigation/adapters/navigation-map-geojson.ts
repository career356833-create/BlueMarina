import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { GeoPoint, NavigationDestination, SavedWaypoint, TrackPoint, VesselPosition } from "../types";

type NavigationPointProperties = {
  id: string;
  kind: "vessel" | "destination" | "waypoint";
  name: string;
  heading: number;
  directionKnown?: boolean;
  state?: string;
};

const emptyCollection = <TGeometry extends Point | LineString | Polygon, TProperties = Record<string, never>>(): FeatureCollection<TGeometry, TProperties> => ({
  type: "FeatureCollection",
  features: [],
});

export function isValidMapPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  return Boolean(point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
}

function pointFeature(point: GeoPoint, properties: NavigationPointProperties): Feature<Point, NavigationPointProperties> {
  return { type: "Feature", geometry: { type: "Point", coordinates: [point.longitude, point.latitude] }, properties };
}

export function toNavigationPointGeoJson(input: {
  vessel: VesselPosition | null;
  displayVessel?: VesselPosition | null;
  vesselState?: string;
  destination: NavigationDestination | null;
  waypoints: SavedWaypoint[];
}): FeatureCollection<Point, NavigationPointProperties> {
  const features: Array<Feature<Point, NavigationPointProperties>> = [];
  const vessel = input.displayVessel === undefined ? input.vessel : input.displayVessel;
  if (isValidMapPoint(vessel)) features.push(pointFeature(vessel, { id: "current-vessel", kind: "vessel", name: input.vesselState === "STALE" ? "마지막 위치 · 오래됨" : "현재 위치", heading: vessel.heading ?? 0, directionKnown: input.vesselState !== "STALE" && input.vesselState !== "LOW_ACCURACY" && Number.isFinite(vessel.heading), state: input.vesselState ?? "LIVE" }));
  if (isValidMapPoint(input.destination)) features.push(pointFeature(input.destination, { id: input.destination.id, kind: "destination", name: input.destination.name, heading: 0 }));
  for (const waypoint of input.waypoints) {
    if (isValidMapPoint(waypoint)) features.push(pointFeature(waypoint, { id: waypoint.id, kind: "waypoint", name: waypoint.name, heading: 0 }));
  }
  return { type: "FeatureCollection", features };
}

export function toTrackGeoJson(track: TrackPoint[]): FeatureCollection<LineString> {
  const segments: number[][][] = [];
  for (const point of track) {
    if (!isValidMapPoint(point)) continue;
    if (!segments.length || point.segmentStart) segments.push([]);
    segments.at(-1)!.push([point.longitude, point.latitude]);
  }
  return { type: "FeatureCollection", features: segments.filter(coordinates => coordinates.length >= 2).map(coordinates => ({ type: "Feature", geometry: { type: "LineString", coordinates }, properties: {} })) };
}

export function toBearingGeoJson(vessel: VesselPosition | null, destination: NavigationDestination | null): FeatureCollection<LineString> {
  if (!isValidMapPoint(vessel) || !isValidMapPoint(destination)) return emptyCollection<LineString>();
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "LineString", coordinates: [[vessel.longitude, vessel.latitude], [destination.longitude, destination.latitude]] }, properties: {} }],
  };
}

export function toAccuracyGeoJson(vessel: VesselPosition | null, segments = 48): FeatureCollection<Polygon> {
  if (!isValidMapPoint(vessel) || vessel.accuracyMeters == null || !Number.isFinite(vessel.accuracyMeters) || vessel.accuracyMeters <= 0) return emptyCollection<Polygon>();
  const earthRadiusMeters = 6_371_008.8;
  const angularDistance = vessel.accuracyMeters / earthRadiusMeters;
  const latitude = vessel.latitude * Math.PI / 180;
  const longitude = vessel.longitude * Math.PI / 180;
  const coordinates: number[][] = [];
  for (let index = 0; index <= segments; index += 1) {
    const bearing = index / segments * Math.PI * 2;
    const pointLatitude = Math.asin(Math.sin(latitude) * Math.cos(angularDistance) + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing));
    const pointLongitude = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude), Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(pointLatitude));
    coordinates.push([pointLongitude * 180 / Math.PI, pointLatitude * 180 / Math.PI]);
  }
  return { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coordinates] }, properties: {} }] };
}

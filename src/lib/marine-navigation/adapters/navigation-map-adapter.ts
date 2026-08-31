import type { GeoPoint, NavigationDestination, SavedWaypoint, TrackPoint, VesselPosition } from "../types";

export type MapPresentation = {
  vessel: VesselPosition | null;
  destination: NavigationDestination | null;
  waypoints: SavedWaypoint[];
  track: TrackPoint[];
};

export type NavigationMapAdapter = {
  id: string;
  label: string;
  prototype: boolean;
  defaultCenter: GeoPoint;
  defaultZoom: number;
};

export const leafletPrototypeAdapter: NavigationMapAdapter = {
  id: "leaflet-osm-prototype",
  label: "BASE MAP PROTOTYPE",
  prototype: true,
  defaultCenter: { latitude: 35.145, longitude: 129.125 },
  defaultZoom: 12,
};

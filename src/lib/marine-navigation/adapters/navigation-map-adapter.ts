import type { GeoPoint, NavigationDestination, SavedWaypoint, TrackPoint, VesselPosition } from "../types";

import type { VesselCamera } from "../vessel-instruments";

export type MapPresentation = {
  fieldObserver?: (observation: import('../field-diagnostics').MapFieldObservation) => void;
  camera?: VesselCamera;
  displayVessel?: VesselPosition | null;
  vesselState?: "LIVE" | "LOW_ACCURACY" | "STALE" | "UNAVAILABLE";
  vessel: VesselPosition | null;
  destination: NavigationDestination | null;
  waypoints: SavedWaypoint[];
  track: TrackPoint[];
  historicalTrackId?: string;
};

export type NavigationMapAdapter = {
  id: string;
  label: string;
  prototype: boolean;
  defaultCenter: GeoPoint;
  defaultZoom: number;
};

export type NavigationMarineLayerConfig<TSource = unknown, TLayer = unknown> = {
  id: string;
  order?: number;
  source: TSource;
  layers: TLayer[];
  visible?: boolean;
};

export type NavigationMapProvider<TSource = unknown, TLayer = unknown> = {
  setPresentation(presentation: MapPresentation): void;
  focus(points: GeoPoint[]): void;
  addMarineLayer(config: NavigationMarineLayerConfig<TSource, TLayer>): void;
  removeMarineLayer(id: string): void;
  setMarineLayerVisibility(id: string, visible: boolean): void;
  resize(): void;
  destroy(): void;
};

export const mapLibrePrototypeAdapter: NavigationMapAdapter = {
  id: "maplibre-osm-raster-prototype",
  label: "TEMPORARY BASE MAP",
  prototype: true,
  defaultCenter: { latitude: 35.145, longitude: 129.125 },
  defaultZoom: 12,
};

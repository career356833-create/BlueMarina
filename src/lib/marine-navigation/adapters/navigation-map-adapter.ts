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

export type NavigationMarineLayerConfig<TSource = unknown, TLayer = unknown> = {
  id: string;
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

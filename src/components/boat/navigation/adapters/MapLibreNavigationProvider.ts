import { AttributionControl, LngLatBounds, Map as MapLibreMap, NavigationControl, type GeoJSONSource, type LayerSpecification, type MapMouseEvent, type SourceSpecification, type StyleSpecification } from "maplibre-gl";
import { toAccuracyGeoJson, toBearingGeoJson, toNavigationPointGeoJson, toTrackGeoJson } from "@/lib/marine-navigation/adapters/navigation-map-geojson";
import { mapLibrePrototypeAdapter, type MapPresentation, type NavigationMapProvider, type NavigationMarineLayerConfig } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { GeoPoint } from "@/lib/marine-navigation/types";

const sourceIds = {
  accuracy: "navigation-accuracy",
  bearing: "navigation-bearing",
  points: "navigation-points",
  track: "navigation-track",
} as const;

const TEMPORARY_BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "temporary-osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "temporary-osm-raster", type: "raster", source: "temporary-osm-raster" }],
};

type MapLibreMarineLayerConfig = NavigationMarineLayerConfig<SourceSpecification, LayerSpecification>;

function emptyGeoJson() {
  return { type: "FeatureCollection" as const, features: [] };
}

export class MapLibreNavigationProvider implements NavigationMapProvider<SourceSpecification, LayerSpecification> {
  private readonly map: MapLibreMap;
  private latestPresentation: MapPresentation | null = null;
  private loaded = false;
  private lastFocusedDestinationId: string | null = null;
  private pointSelectHandler: (point: GeoPoint) => void;
  private readonly marineLayers = new Map<string, string[]>();

  constructor(container: HTMLElement, onPointSelect: (point: GeoPoint) => void) {
    this.pointSelectHandler = onPointSelect;
    this.map = new MapLibreMap({
      container,
      style: TEMPORARY_BASE_STYLE,
      center: [mapLibrePrototypeAdapter.defaultCenter.longitude, mapLibrePrototypeAdapter.defaultCenter.latitude],
      zoom: mapLibrePrototypeAdapter.defaultZoom,
      attributionControl: false,
    });
    this.map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), "top-right");
    this.map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    this.map.on("click", (event: MapMouseEvent) => this.pointSelectHandler({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }));
    this.map.once("load", () => {
      this.loaded = true;
      this.installNavigationLayers();
      if (this.latestPresentation) this.renderPresentation(this.latestPresentation);
    });
  }

  setPointSelectHandler(handler: (point: GeoPoint) => void) {
    this.pointSelectHandler = handler;
  }

  setPresentation(presentation: MapPresentation) {
    this.latestPresentation = presentation;
    if (this.loaded) this.renderPresentation(presentation);
  }

  focus(points: GeoPoint[]) {
    if (!this.loaded || points.length === 0) return;
    if (points.length === 1) {
      this.map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 14 });
      return;
    }
    const bounds = points.reduce((current, point) => current.extend([point.longitude, point.latitude]), new LngLatBounds([points[0].longitude, points[0].latitude], [points[0].longitude, points[0].latitude]));
    this.map.fitBounds(bounds, { padding: 56, maxZoom: 15 });
  }

  addMarineLayer(config: MapLibreMarineLayerConfig) {
    if (!this.loaded || this.marineLayers.has(config.id)) return;
    const sourceId = `marine-source:${config.id}`;
    this.map.addSource(sourceId, config.source);
    const layerIds: string[] = [];
    for (const layer of config.layers) {
      const layerId = `marine-layer:${config.id}:${layer.id}`;
      this.map.addLayer({ ...layer, id: layerId, source: sourceId } as LayerSpecification);
      this.map.setLayoutProperty(layerId, "visibility", config.visible === false ? "none" : "visible");
      layerIds.push(layerId);
    }
    this.marineLayers.set(config.id, layerIds);
  }

  removeMarineLayer(id: string) {
    const layerIds = this.marineLayers.get(id) ?? [];
    for (const layerId of [...layerIds].reverse()) if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    const sourceId = `marine-source:${id}`;
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
    this.marineLayers.delete(id);
  }

  setMarineLayerVisibility(id: string, visible: boolean) {
    for (const layerId of this.marineLayers.get(id) ?? []) {
      if (this.map.getLayer(layerId)) this.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }

  resize() {
    this.map.resize();
  }

  destroy() {
    this.map.remove();
    this.marineLayers.clear();
  }

  private installNavigationLayers() {
    this.map.addSource(sourceIds.accuracy, { type: "geojson", data: emptyGeoJson() });
    this.map.addSource(sourceIds.track, { type: "geojson", data: emptyGeoJson() });
    this.map.addSource(sourceIds.bearing, { type: "geojson", data: emptyGeoJson() });
    this.map.addSource(sourceIds.points, { type: "geojson", data: emptyGeoJson() });

    this.map.addLayer({ id: "navigation-accuracy-fill", type: "fill", source: sourceIds.accuracy, paint: { "fill-color": "#6f9e9d", "fill-opacity": 0.08 } });
    this.map.addLayer({ id: "navigation-accuracy-line", type: "line", source: sourceIds.accuracy, paint: { "line-color": "#6f9e9d", "line-width": 1 } });
    this.map.addLayer({ id: "navigation-track-line", type: "line", source: sourceIds.track, paint: { "line-color": "#1c6c72", "line-width": 4, "line-opacity": 0.9 } });
    this.map.addLayer({ id: "navigation-bearing-line", type: "line", source: sourceIds.bearing, paint: { "line-color": "#caa66c", "line-width": 2, "line-opacity": 0.78, "line-dasharray": [3.5, 4.5] } });
    this.map.addLayer({ id: "navigation-waypoints", type: "circle", source: sourceIds.points, filter: ["==", ["get", "kind"], "waypoint"], paint: { "circle-radius": 7, "circle-color": "#193c40", "circle-stroke-color": "#c9ddd7", "circle-stroke-width": 1 } });
    this.map.addLayer({ id: "navigation-destination", type: "circle", source: sourceIds.points, filter: ["==", ["get", "kind"], "destination"], paint: { "circle-radius": 12, "circle-color": "#7a5b2a", "circle-stroke-color": "#d2b178", "circle-stroke-width": 2 } });
    const vesselImage = document.createElement("canvas");
    vesselImage.width = 64;
    vesselImage.height = 64;
    const context = vesselImage.getContext("2d");
    if (context) {
      context.fillStyle = "#1c5b60";
      context.strokeStyle = "#f2eee3";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(32, 5);
      context.lineTo(55, 54);
      context.lineTo(32, 44);
      context.lineTo(9, 54);
      context.closePath();
      context.fill();
      context.stroke();
      this.map.addImage("navigation-vessel-arrow", context.getImageData(0, 0, 64, 64), { pixelRatio: 2 });
    }
    this.map.addLayer({ id: "navigation-vessel", type: "symbol", source: sourceIds.points, filter: ["==", ["get", "kind"], "vessel"], layout: { "icon-image": "navigation-vessel-arrow", "icon-rotate": ["get", "heading"], "icon-rotation-alignment": "map", "icon-allow-overlap": true } });
  }

  private renderPresentation(presentation: MapPresentation) {
    (this.map.getSource(sourceIds.points) as GeoJSONSource).setData(toNavigationPointGeoJson(presentation));
    (this.map.getSource(sourceIds.track) as GeoJSONSource).setData(toTrackGeoJson(presentation.track));
    (this.map.getSource(sourceIds.bearing) as GeoJSONSource).setData(toBearingGeoJson(presentation.vessel, presentation.destination));
    (this.map.getSource(sourceIds.accuracy) as GeoJSONSource).setData(toAccuracyGeoJson(presentation.vessel));

    if (presentation.destination && presentation.destination.id !== this.lastFocusedDestinationId) {
      this.lastFocusedDestinationId = presentation.destination.id;
      this.focus(presentation.vessel ? [presentation.vessel, presentation.destination] : [presentation.destination]);
    }
  }
}

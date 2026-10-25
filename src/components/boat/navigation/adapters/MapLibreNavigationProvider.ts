import { CoastalTerrainController } from "./CoastalTerrainController";
import type { TerrainState } from "@/lib/marine-navigation/coastal-terrain";
import { distanceMeters } from "@/lib/marine-navigation/geo";
import { cameraView, reliableMovementCourse, smoothBearing } from "@/lib/marine-navigation/vessel-instruments";
import { AttributionControl, LngLatBounds, Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type LayerSpecification, type MapMouseEvent, type SourceSpecification, type StyleSpecification } from "maplibre-gl";
import { toAccuracyGeoJson, toBearingGeoJson, toNavigationPointGeoJson, toTrackGeoJson } from "@/lib/marine-navigation/adapters/navigation-map-geojson";
import { mapLibrePrototypeAdapter, type MapPresentation, type NavigationMapProvider, type NavigationMarineLayerConfig } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { GeoPoint } from "@/lib/marine-navigation/types";

const sourceIds = {
  accuracy: "navigation-accuracy",
  bearing: "navigation-bearing",
  points: "navigation-points",
  track: "navigation-track",
} as const;

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

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
  private readonly terrain: CoastalTerrainController;
  private destroyed = false;
  private latestPresentation: MapPresentation | null = null;
  private loaded = false;
  private manualMoveHandler: () => void = () => undefined;
  private lastCameraKey = "";
  private cameraBearing = 0;
  private lastCameraVessel: MapPresentation["vessel"] = null;
  private lastTrack: MapPresentation["track"] | null = null;
  private lastCameraFollow = false;
  private gestureActive = false;
  private lastCameraAt = 0;
  private lastCameraTimestamp = -1;
  private lastFocusedDestinationId: string | null = null;
  private pointSelectHandler: (point: GeoPoint) => void;
  private marineFeatureSelectHandler: (layerId: string, properties: unknown) => void;
  private readonly marineClicks = new Map<string, (event: MapMouseEvent & { features?: GeoJSON.Feature[] }) => void>();
  private readonly marineLayers = new Map<string, string[]>();
  private readonly marineLayerConfigs = new Map<string, MapLibreMarineLayerConfig>();

  constructor(container: HTMLElement, onPointSelect: (point: GeoPoint) => void, onMarineFeatureSelect: (layerId: string, properties: unknown) => void = () => undefined) {
    this.pointSelectHandler = onPointSelect;
    this.marineFeatureSelectHandler = onMarineFeatureSelect;
    this.map = new MapLibreMap({
      container,
      style: TEMPORARY_BASE_STYLE,
      center: [mapLibrePrototypeAdapter.defaultCenter.longitude, mapLibrePrototypeAdapter.defaultCenter.latitude],
      zoom: mapLibrePrototypeAdapter.defaultZoom,
      attributionControl: false,
    });
    this.terrain = new CoastalTerrainController(this.map);
    const beginGesture = () => { this.gestureActive = true; this.map.stop(); };
    const endGesture = () => { this.gestureActive = false; };
    this.map.on("mousedown", beginGesture);
    this.map.on("touchstart", beginGesture);
    this.map.on("mouseup", endGesture);
    this.map.on("touchend", endGesture);
    this.map.on("touchcancel", endGesture);
    this.map.on("dragend", endGesture);
    this.map.on("dragstart", () => this.manualMoveHandler());
    this.map.on("rotatestart", event => { if (event.originalEvent) this.manualMoveHandler(); });
    this.map.addControl(new NavigationControl({ showCompass: false, showZoom: true }), "top-right");
    this.map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    this.map.on("click", (event: MapMouseEvent) => {
      window.setTimeout(() => {
        if (this.destroyed || event.defaultPrevented) return;
        const marineLayerIds = [...this.marineLayers.values()].flat().filter((id) => this.map.getLayer(id));
        const marineFeature = marineLayerIds.length > 0 ? this.map.queryRenderedFeatures(event.point, { layers: marineLayerIds })[0] : null;
        if (marineFeature?.properties) {
          const marineLayerId = [...this.marineLayers.entries()].find(([, layerIds]) => layerIds.includes(marineFeature.layer.id))?.[0];
          if (marineLayerId) this.marineFeatureSelectHandler(marineLayerId, { ...marineFeature.properties, id: marineFeature.properties.id ?? marineFeature.id });
          return;
        }
        this.pointSelectHandler({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
      }, 0);
    });
    this.map.on("style.load", () => {
      this.loaded = true;
      for (const [id, handler] of this.marineClicks) this.map.off("click", id, handler);
      this.marineClicks.clear();
      this.marineLayers.clear();
      this.lastTrack = null;
      this.lastCameraKey = "";
      this.installNavigationLayers();
      for (const config of this.marineLayerConfigs.values()) this.installMarineLayer(config);
      if (this.latestPresentation) this.renderPresentation(this.latestPresentation);
      this.terrain.styleLoaded();
    });
  }

  setTerrainStateHandler(handler: (state: TerrainState) => void) { this.terrain.setListener(handler); }
  setTerrainEnabled(enabled: boolean) { this.terrain.setEnabled(enabled); }
  testTerrain(action: "ulleung" | "geoje" | "reload" | "failure") {
    if (process.env.NODE_ENV === "production") return;
    if (action === "failure") { this.terrain.simulateFailure(); return; }
    if (action === "reload") { this.map.setStyle(TEMPORARY_BASE_STYLE, { diff: false }); return; }
    this.manualMoveHandler();
    this.map.jumpTo({ center: action === "ulleung" ? [130.9, 37.45] : [128.66, 34.77], zoom: action === "ulleung" ? 11.7 : 11.2, bearing: 0 });
  }

  setManualMoveHandler(handler: () => void) { this.manualMoveHandler = handler; }

  setPointSelectHandler(handler: (point: GeoPoint) => void) {
    this.pointSelectHandler = handler;
  }

  setMarineFeatureSelectHandler(handler: (layerId: string, properties: unknown) => void) {
    this.marineFeatureSelectHandler = handler;
  }

  setPresentation(presentation: MapPresentation) {
    this.latestPresentation = presentation;
    if (this.loaded) this.renderPresentation(presentation);
  }

  focus(points: GeoPoint[]) {
    if (!this.loaded || points.length === 0) return;
    if (points.length === 1) {
      // Keep coastline context visible for offshore destinations whose detailed raster tile is only open water.
      this.map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 12 });
      return;
    }
    const bounds = points.reduce((current, point) => current.extend([point.longitude, point.latitude]), new LngLatBounds([points[0].longitude, points[0].latitude], [points[0].longitude, points[0].latitude]));
    this.map.fitBounds(bounds, { padding: 56, maxZoom: 15 });
  }

  addMarineLayer(config: MapLibreMarineLayerConfig) {
    this.marineLayerConfigs.set(config.id, config);
    if (this.loaded) this.installMarineLayer(config);
  }

  private installMarineLayer(config: MapLibreMarineLayerConfig) {
    if (this.marineLayers.has(config.id)) return;
    const sourceId = `marine-source:${config.id}`;
    this.map.addSource(sourceId, config.source);
    const layerIds: string[] = [];
    const nextMarineLayer = [...this.marineLayerConfigs.values()]
      .filter((candidate) => candidate.id !== config.id && (candidate.order ?? 0) > (config.order ?? 0))
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .map((candidate) => this.marineLayers.get(candidate.id)?.[0])
      .find((layerId): layerId is string => Boolean(layerId && this.map.getLayer(layerId)));
    const beforeId = nextMarineLayer ?? (this.map.getLayer("navigation-accuracy-fill") ? "navigation-accuracy-fill" : undefined);
    for (const layer of config.layers) {
      const layerId = `marine-layer:${config.id}:${layer.id}`;
      this.map.addLayer({ ...layer, id: layerId, source: sourceId } as LayerSpecification, beforeId);
      this.map.setLayoutProperty(layerId, "visibility", config.visible === false ? "none" : "visible");
      const clickHandler = (event: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) return;
        if (properties.cluster_id != null) {
          event.preventDefault();
          const source = this.map.getSource(sourceId) as GeoJSONSource;
          source.getClusterExpansionZoom(Number(properties.cluster_id)).then((zoom) => {
            this.map.easeTo({ center: event.lngLat, zoom });
          }).catch(() => undefined);
          return;
        }
        event.preventDefault();
        this.marineFeatureSelectHandler(config.id, { ...properties, id: properties.id ?? event.features?.[0]?.id });
      };
      this.map.on("click", layerId, clickHandler);
      this.marineClicks.set(layerId, clickHandler);
      layerIds.push(layerId);
    }
    this.marineLayers.set(config.id, layerIds);
  }

  removeMarineLayer(id: string) {
    this.marineLayerConfigs.delete(id);
    const layerIds = this.marineLayers.get(id) ?? [];
    for (const layerId of [...layerIds].reverse()) {
      const handler = this.marineClicks.get(layerId);
      if (handler) this.map.off("click", layerId, handler);
      this.marineClicks.delete(layerId);
      if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    }
    const sourceId = `marine-source:${id}`;
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
    this.marineLayers.delete(id);
  }

  setMarineLayerVisibility(id: string, visible: boolean) {
    const config = this.marineLayerConfigs.get(id);
    if (config) this.marineLayerConfigs.set(id, { ...config, visible });
    for (const layerId of this.marineLayers.get(id) ?? []) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    }
  }

  setMarineLayerData(id: string, data: GeoJSON.GeoJSON) {
    if (!this.loaded) return;
    const source = this.map.getSource(`marine-source:${id}`) as GeoJSONSource | undefined;
    source?.setData(data);
  }

  getViewportSnapshot() {
    const center = this.map.getCenter();
    return { longitude: center.lng, latitude: center.lat, zoom: this.map.getZoom() };
  }

  onViewportChange(handler: (viewport: { longitude: number; latitude: number; zoom: number }) => void) {
    const notify = () => handler(this.getViewportSnapshot());
    this.map.on("moveend", notify);
    if (this.loaded) notify();
    else this.map.once("load", notify);
    return () => this.map.off("moveend", notify);
  }

  resize() {
    this.map.resize();
    this.lastCameraKey = "";
    if (this.loaded && this.latestPresentation && !this.gestureActive) this.renderPresentation(this.latestPresentation);
  }

  destroy() {
    this.destroyed = true;
    this.terrain.destroy();
    this.map.remove();
    this.marineLayers.clear();
    this.marineLayerConfigs.clear();
  }

  private installNavigationLayers() {
    this.map.addSource(sourceIds.accuracy, { type: "geojson", data: emptyGeoJson() });
    this.map.addSource(sourceIds.track, { type: "geojson", data: emptyGeoJson() });
    this.map.addSource(sourceIds.bearing, { type: "geojson", data: emptyGeoJson() });
    this.map.addSource(sourceIds.points, { type: "geojson", data: emptyGeoJson() });

    this.map.addLayer({ id: "navigation-accuracy-fill", type: "fill", source: sourceIds.accuracy, paint: { "fill-color": "#6f9e9d", "fill-opacity": 0.08 } });
    this.map.addLayer({ id: "navigation-accuracy-line", type: "line", source: sourceIds.accuracy, paint: { "line-color": "#6f9e9d", "line-width": 1 } });
    this.map.addLayer({ id: "navigation-track-casing", type: "line", source: sourceIds.track, paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.85 } });
    this.map.addLayer({ id: "navigation-track-line", type: "line", source: sourceIds.track, paint: { "line-color": "#005dc2", "line-width": 4, "line-opacity": 0.9 } });
    this.map.addLayer({ id: "navigation-bearing-line", type: "line", source: sourceIds.bearing, paint: { "line-color": "#caa66c", "line-width": 2, "line-opacity": 0.78, "line-dasharray": [3.5, 4.5] } });
    this.map.addLayer({ id: "navigation-waypoints", type: "circle", source: sourceIds.points, filter: ["==", ["get", "kind"], "waypoint"], paint: { "circle-radius": 7, "circle-color": "#193c40", "circle-stroke-color": "#c9ddd7", "circle-stroke-width": 1 } });
    this.map.addLayer({ id: "navigation-destination", type: "circle", source: sourceIds.points, filter: ["==", ["get", "kind"], "destination"], paint: { "circle-radius": 12, "circle-color": "#b45e00", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
    this.map.addLayer({ id: "navigation-vessel-ring", type: "circle", source: sourceIds.points, filter: ["==", ["get", "kind"], "vessel"], paint: { "circle-radius": 25, "circle-color": "#ffffff", "circle-opacity": .2, "circle-stroke-width": 2, "circle-stroke-color": ["match", ["get", "state"], "STALE", "#64748b", "LOW_ACCURACY", "#b45309", "#006b75"] } });
    this.map.addLayer({ id: "navigation-vessel-unknown", type: "circle", source: sourceIds.points, filter: ["all", ["==", ["get", "kind"], "vessel"], ["!=", ["get", "directionKnown"], true]], paint: { "circle-radius": 9, "circle-color": ["match", ["get", "state"], "STALE", "#64748b", "LOW_ACCURACY", "#b45309", "#006b75"], "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
    const vesselImage = document.createElement("canvas");
    vesselImage.width = 64;
    vesselImage.height = 64;
    const context = vesselImage.getContext("2d");
    if (context) {
      context.fillStyle = "#003d50";
      context.strokeStyle = "#f2eee3";
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(32, 5);
      context.lineTo(49, 29);
      context.lineTo(46, 57);
      context.lineTo(18, 57);
      context.lineTo(15, 29);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = "#f2eee3";
      context.fillRect(25, 28, 14, 17);
      this.map.addImage("navigation-vessel-arrow", context.getImageData(0, 0, 64, 64), { pixelRatio: 2 });
    }
    this.map.addLayer({ id: "navigation-vessel", type: "symbol", source: sourceIds.points, filter: ["all", ["==", ["get", "kind"], "vessel"], ["==", ["get", "directionKnown"], true]], layout: { "icon-image": "navigation-vessel-arrow", "icon-rotate": ["get", "heading"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-size": 1.65, "icon-pitch-alignment": "viewport" } });
  }

  private renderPresentation(presentation: MapPresentation) {
    (this.map.getSource(sourceIds.points) as GeoJSONSource).setData(toNavigationPointGeoJson(presentation));
    if (this.lastTrack !== presentation.track) { (this.map.getSource(sourceIds.track) as GeoJSONSource).setData(toTrackGeoJson(presentation.track)); this.lastTrack = presentation.track; }
    (this.map.getSource(sourceIds.bearing) as GeoJSONSource).setData(toBearingGeoJson(presentation.vessel, presentation.destination));
    (this.map.getSource(sourceIds.accuracy) as GeoJSONSource).setData(toAccuracyGeoJson(presentation.vessel));

    const camera = presentation.camera;
    this.terrain.setMode(camera?.mode ?? "2d");
    const newDestination = presentation.destination && presentation.destination.id !== this.lastFocusedDestinationId;
    if (newDestination && presentation.destination) {
      this.lastFocusedDestinationId = presentation.destination.id;
      // Establish an initial destination before resize/mode updates can interrupt an ease.
      if (camera && !presentation.vessel) this.map.jumpTo({ center: [presentation.destination.longitude, presentation.destination.latitude], zoom: 12 });
      if (!camera) this.focus(presentation.vessel ? [presentation.vessel, presentation.destination] : [presentation.destination]);
    }
    if (camera) {
      const key = JSON.stringify([camera.mode, camera.courseUp, camera.recenter, camera.follow, camera.courseUp && reliableMovementCourse(presentation.vessel) != null]);
      const changed = key !== this.lastCameraKey;
      const justSuspended = this.lastCameraFollow && !camera.follow;
      this.lastCameraFollow = camera.follow;
      if (justSuspended) { this.lastCameraKey = key; return; }
      const now = Date.now();
      const vessel = presentation.vessel;
      const moved = vessel && (!this.lastCameraVessel || distanceMeters(vessel, this.lastCameraVessel) >= Math.max(3, (vessel.accuracyMeters ?? 0) / 2));
      const turned = camera.courseUp && reliableMovementCourse(vessel) != null && Math.abs((((reliableMovementCourse(vessel)! - this.cameraBearing) % 360 + 540) % 360) - 180) > 3;
      const update = (moved || turned) && !this.gestureActive && camera.follow && vessel && vessel.timestamp !== this.lastCameraTimestamp && now - this.lastCameraAt >= 750;
      if (changed || update || newDestination) {
        this.lastCameraKey = key;
        this.lastCameraAt = now;
        this.lastCameraTimestamp = vessel?.timestamp ?? -1;
        if (vessel) this.lastCameraVessel = vessel;
        const cameraAnchor = vessel ?? (newDestination ? null : this.lastCameraVessel);
        const view = cameraView(camera, cameraAnchor, this.map.getContainer().clientHeight, this.map.getContainer().clientWidth);
        this.cameraBearing = camera.courseUp && reliableMovementCourse(vessel) != null ? smoothBearing(this.cameraBearing, view.bearing) : 0;
        this.map.easeTo({ ...view, bearing: this.cameraBearing, ...(camera.follow && cameraAnchor ? { center: [cameraAnchor.longitude, cameraAnchor.latitude] as [number, number] } : newDestination && presentation.destination ? { center: [presentation.destination.longitude, presentation.destination.latitude] as [number, number], zoom: 12 } : {}), duration: changed ? 550 : 650 });
      }
    }
  }
}

import type { Map as MapLibreMap } from "maplibre-gl";
import { COASTAL_DEM, terrainCoverage, type TerrainState } from "@/lib/marine-navigation/coastal-terrain";

const SHADE = "navigation-land-hillshade";

/** One controller per existing map. No GPS payloads, additional map or style replacement. */
export class CoastalTerrainController {
  private mode = "2d";
  private enabled = true;
  private failed = false;
  private disposed = false;
  private ready = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private state: TerrainState = "FLAT";
  private listener: (state: TerrainState) => void = () => undefined;
  constructor(private map: MapLibreMap) {
    map.on("moveend", this.sync);
    map.on("sourcedata", this.onData);
    map.on("error", this.onError);
  }
  setListener(listener: (state: TerrainState) => void) { this.listener = listener; listener(this.state); }
  getState() { return this.state; }
  private publish(next: TerrainState) { if (this.state !== next) { this.state = next; this.listener(next); } }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = undefined; }
  private onData = (event: { sourceId?: string; isSourceLoaded?: boolean }) => {
    if (event.sourceId === COASTAL_DEM.id && event.isSourceLoaded) this.sync();
  };
  private onError = (event: unknown) => { if (event && typeof event === "object" && "sourceId" in event && event.sourceId === COASTAL_DEM.id) this.fail(); };
  private fail() { if (this.disposed) return; this.failed = true; this.sync(); }
  setMode(mode: "2d" | "3d") { if (this.mode !== mode) { this.mode = mode; this.sync(); } }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && this.failed) {
      this.failed = false;
      this.map.setTerrain(null);
      if (this.map.getLayer(SHADE)) this.map.removeLayer(SHADE);
      if (this.map.getSource(COASTAL_DEM.id)) this.map.removeSource(COASTAL_DEM.id);
    }
    this.sync();
  }
  styleLoaded() { this.ready = true; this.failed = false; this.clearTimer(); this.sync(); }
  sync = () => {
    if (this.disposed || !this.ready) return;
    const center = this.map.getCenter();
    const supported = terrainCoverage(center.lng, center.lat, this.map.getZoom());
    const off: TerrainState | null = this.mode !== "3d" ? "FLAT" : !this.enabled ? "PITCH_ONLY" : !supported ? "UNSUPPORTED" : this.failed ? "UNAVAILABLE" : null;
    if (off) {
      this.clearTimer();
      if (this.map.getTerrain()) this.map.setTerrain(null);
      if (this.map.getLayer(SHADE)) this.map.setLayoutProperty(SHADE, "visibility", "none");
      this.publish(off); return;
    }
    if (!this.map.getSource(COASTAL_DEM.id)) this.map.addSource(COASTAL_DEM.id, {
      type: "raster-dem", tiles: [COASTAL_DEM.tiles], tileSize: 256, encoding: "terrarium",
      bounds: [...COASTAL_DEM.bounds], minzoom: COASTAL_DEM.minzoom, maxzoom: COASTAL_DEM.maxzoom,
      attribution: COASTAL_DEM.attribution,
    });
    if (!this.map.getLayer(SHADE)) this.map.addLayer({ id: SHADE, type: "hillshade", source: COASTAL_DEM.id,
      paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#354934", "hillshade-highlight-color": "#fff9e4" },
    }, this.map.getLayer("navigation-accuracy-fill") ? "navigation-accuracy-fill" : undefined);
    this.map.setLayoutProperty(SHADE, "visibility", "visible");
    if (!this.map.getTerrain()) this.map.setTerrain({ source: COASTAL_DEM.id, exaggeration: COASTAL_DEM.exaggeration });
    if (this.map.isSourceLoaded(COASTAL_DEM.id)) { this.clearTimer(); this.publish("ACTIVE"); }
    else {
      this.publish("LOADING");
      if (!this.timer) this.timer = setTimeout(() => this.fail(), 12000);
    }
  };
  // Explicit development test control; never reachable from production UI or query strings.
  simulateFailure() { if (process.env.NODE_ENV !== "production") this.fail(); }
  destroy() {
    this.disposed = true; this.clearTimer();
    this.map.off("moveend", this.sync); this.map.off("sourcedata", this.onData); this.map.off("error", this.onError);
    this.listener = () => undefined;
  }
}

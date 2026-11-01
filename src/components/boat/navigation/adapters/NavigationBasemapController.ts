import type { Map as MapLibreMap, MapSourceDataEvent, LayerSpecification } from 'maplibre-gl';
import { BASEMAP_FALLBACK_ID, hasMapTilerKey, isBasemapId, INITIAL_BASEMAP_STATE, type BasemapId, type BasemapState } from '@/lib/marine-navigation/basemaps';
import { loadMapDetailStyle, type BasemapLoader } from '@/lib/marine-navigation/map-detail-style';

type Slot = { id: string; choice: BasemapId; sources: string[]; layers: string[]; receivedTile: boolean; installed: boolean; abort: AbortController };
/** Replace only the owned background/detail bundle. GPS, camera, marine layers and DEM survive. */
export class NavigationBasemapController {
  private state: BasemapState = {...INITIAL_BASEMAP_STATE};
  private listener: (state: BasemapState) => void = () => undefined;
  private active: Slot | null = null;
  private pending: Slot | null = null;
  private sequence = 0;
  private ready = false;
  private disposed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private map: MapLibreMap, private key: string | undefined, private timeoutMs = 30000, private loader: BasemapLoader = loadMapDetailStyle) {
    map.on('sourcedata',this.onData); map.on('idle',this.onIdle); map.on('error',this.onError);
  }
  setListener(listener: (state: BasemapState) => void) { this.listener=listener; listener({...this.state}); }
  private publish(state: BasemapState) { this.state=state; if (!this.disposed) this.listener({...state}); }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer=undefined; }
  private remove(slot: Slot | null) {
    if (!slot) return;
    slot.abort.abort();
    for (const id of [...slot.layers].reverse()) if (this.map.getLayer(id)) this.map.removeLayer(id);
    for (const id of slot.sources) if (this.map.getSource(id)) this.map.removeSource(id);
  }
  private cancelPending() { this.clearTimer(); const slot=this.pending; this.pending=null; this.remove(slot); }
  private showFallback() { if (this.map.getLayer(BASEMAP_FALLBACK_ID)) this.map.setLayoutProperty(BASEMAP_FALLBACK_ID,'visibility','visible'); }
  styleLoaded() {
    const selected=this.state.selected;
    this.cancelPending(); this.active=null; this.ready=true;
    this.publish({selected:'standard',displayed:'standard',status:'READY'});
    if (selected!=='standard') this.select(selected);
  }
  select(choice: BasemapId) {
    if (this.disposed || !isBasemapId(choice)) return;
    if (!this.ready) { this.publish({...this.state,selected:choice}); return; }
    if (this.pending?.choice===choice || (this.state.status==='READY' && this.state.displayed===choice)) return;
    this.cancelPending();
    if (choice==='standard') {
      this.showFallback(); const previous=this.active; this.active=null; this.remove(previous);
      this.publish({selected:choice,displayed:choice,status:'READY'}); return;
    }
    if (this.active?.choice===choice) { this.publish({selected:choice,displayed:choice,status:'READY'}); return; }
    if (!hasMapTilerKey(this.key)) { this.publish({...this.state,selected:choice,status:'UNAVAILABLE',reason:'KEY_REQUIRED'}); return; }
    const slot: Slot={id:`navigation-basemap-${++this.sequence}`,choice,sources:[],layers:[],receivedTile:false,installed:false,abort:new AbortController()};
    this.pending=slot;
    this.publish({selected:choice,displayed:this.state.displayed,status:'LOADING'});
    this.timer=setTimeout(()=>this.failPending(slot.id,'TIMEOUT'),this.timeoutMs);
    void this.install(slot);
  }
  private async install(slot: Slot) {
    try {
      const bundle=await this.loader(slot.choice,this.key!,slot.abort.signal);
      if (this.disposed || this.pending!==slot) return;
      this.map.setGlyphs(bundle.glyphs);
      const ids=new Map(Object.keys(bundle.sources).map(id=>[id,`${slot.id}:source:${id}`]));
      const before=this.active?.layers[0] ?? BASEMAP_FALLBACK_ID;
      for (const [id,source] of Object.entries(bundle.sources)) {
        if (this.pending!==slot) return;
        const sourceId=ids.get(id)!; slot.sources.push(sourceId); this.map.addSource(sourceId,source);
      }
      for (const layer of bundle.layers) {
        if (this.pending!==slot) return;
        const id=`${slot.id}:layer:${layer.id}`;
        const namespaced={...layer,id,...('source' in layer?{source:ids.get(layer.source as string)}:{})} as LayerSpecification;
        slot.layers.push(id); this.map.addLayer(namespaced,before);
      }
      slot.installed=true;
    } catch { this.failPending(slot.id,'SOURCE_ERROR'); }
  }
  private onData = (event: MapSourceDataEvent) => {
    if (this.pending?.sources.includes(event.sourceId) && event.tile?.state==='loaded') this.pending.receivedTile=true;
  };
  private onIdle = () => {
    const slot=this.pending;
    // Idle waits for visible tiles and glyphs, not just TileJSON metadata.
    if (!slot?.installed || !slot.receivedTile || !slot.sources.every(id=>this.map.isSourceLoaded(id))) return;
    this.clearTimer(); this.pending=null; const previous=this.active; this.active=slot;
    this.map.setLayoutProperty(BASEMAP_FALLBACK_ID,'visibility','none'); this.remove(previous);
    this.publish({selected:slot.choice,displayed:slot.choice,status:'READY'});
  };
  private failPending(id: string,reason:'SOURCE_ERROR'|'TIMEOUT') {
    if (this.disposed || this.pending?.id!==id) return;
    const selected=this.pending.choice; this.cancelPending();
    this.publish({selected,displayed:this.state.displayed,status:'UNAVAILABLE',reason});
  }
  private onError = (event: unknown) => {
    if (this.disposed || !event || typeof event!=='object') return;
    const sourceId='sourceId' in event?event.sourceId:undefined;
    const glyphFailure='error' in event && event.error instanceof Error && /\/fonts\//.test(event.error.message);
    if (this.pending && (this.pending.sources.includes(sourceId as string) || glyphFailure)) { this.failPending(this.pending.id,'SOURCE_ERROR'); return; }
    if (this.active && (this.active.sources.includes(sourceId as string) || glyphFailure)) {
      const selected=this.state.selected; this.cancelPending(); this.showFallback(); const previous=this.active; this.active=null; this.remove(previous);
      this.publish({selected,displayed:'standard',status:'UNAVAILABLE',reason:'SOURCE_ERROR'});
    }
  };
  destroy() {
    this.disposed=true; this.clearTimer(); this.pending?.abort.abort(); this.listener=()=>undefined;
    this.map.off('sourcedata',this.onData); this.map.off('idle',this.onIdle); this.map.off('error',this.onError);
  }
}

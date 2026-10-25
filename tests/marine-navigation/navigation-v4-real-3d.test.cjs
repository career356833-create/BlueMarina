const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '../..');
function load(file, overrides = {}) {
  const mod = { exports: {} };
  const req = id => overrides[id] ?? (id.startsWith('@/') || id.startsWith('.') ? load((id.startsWith('@/') ? 'src/' + id.slice(2) : path.join(path.dirname(file), id)).replaceAll('\\', '/') + '.ts', overrides) : require(id));
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', js)(req, mod, mod.exports); return mod.exports;
}
const dem = load('src/lib/marine-navigation/coastal-terrain.ts');
const { CoastalTerrainController } = load('src/components/boat/navigation/adapters/CoastalTerrainController.ts');
class Map {
  constructor() { this.sources = {}; this.layers = {}; this.handlers = {}; this.center = {lng:130.9,lat:37.45}; this.zoom = 12; this.loaded = true; this.terrain = null; this.calls = 0; }
  on(e, f) { (this.handlers[e] ??= new Set()).add(f); }
  off(e, f) { this.handlers[e]?.delete(f); }
  emit(e, data = {}) { for(const f of this.handlers[e] ?? []) f(data); }
  getSource(id) { return this.sources[id]; } addSource(id, source) { this.sources[id] = source; }
  removeSource(id) { assert.equal(this.terrain, null); delete this.sources[id]; }
  getLayer(id) { return this.layers[id]; } addLayer(layer) { this.layers[layer.id] = layer; }
  removeLayer(id) { delete this.layers[id]; } setLayoutProperty(id, key, value) { this.layers[id][key] = value; }
  getTerrain() { return this.terrain; } setTerrain(t) { this.terrain = t; this.calls++; }
  getCenter() { return this.center; } getZoom() { return this.zoom; } isSourceLoaded() { return this.loaded; }
}
function setup() { const map = new Map(); const controller = new CoastalTerrainController(map); let state; controller.setListener(s => state = s); controller.styleLoaded(); return {map, controller, state: () => state}; }
function png() { const p = new PNG({width:256,height:256}); for(let i=0;i<p.data.length;i+=4) { p.data[i]=127;p.data[i+1]=255;p.data[i+2]=0;p.data[i+3]=255; } p.data[0]=131; p.data[1]=193; return PNG.sync.write(p); }

test('NAV-V4-01 real raster-dem contract uses bounded same-origin Terrarium and 1x relief',()=>{const x=setup();x.controller.setMode('3d');assert.equal(x.map.sources[dem.COASTAL_DEM.id].type,'raster-dem');assert.equal(x.map.sources[dem.COASTAL_DEM.id].encoding,'terrarium');assert.deepEqual(x.map.getTerrain(),{source:dem.COASTAL_DEM.id,exaggeration:1});assert.equal(x.state(),'ACTIVE');x.controller.destroy();});
test('NAV-V4-02 terrain is separate from pitch-only and flat modes',()=>{const x=setup();x.controller.setMode('3d');x.controller.setEnabled(false);assert.equal(x.state(),'PITCH_ONLY');assert.equal(x.map.getTerrain(),null);x.controller.setMode('2d');assert.equal(x.state(),'FLAT');x.controller.destroy();});
test('NAV-V4-03 unsupported viewport falls back and returns to real coverage',()=>{const x=setup();x.controller.setMode('3d');x.map.center.lng=140;x.map.emit('moveend');assert.equal(x.state(),'UNSUPPORTED');assert.equal(x.map.getTerrain(),null);x.map.center.lng=130.9;x.map.emit('moveend');assert.equal(x.state(),'ACTIVE');x.controller.destroy();});
test('NAV-V4-04 loading never claims ACTIVE until source loaded',()=>{const x=setup();x.map.loaded=false;x.controller.setMode('3d');assert.equal(x.state(),'LOADING');x.map.loaded=true;x.map.emit('sourcedata',{sourceId:dem.COASTAL_DEM.id,isSourceLoaded:true});assert.equal(x.state(),'ACTIVE');x.controller.destroy();});
test('NAV-V4-05 DEM network error removes terrain, preserves map, explicit retry recovers',()=>{const x=setup();x.controller.setMode('3d');x.map.emit('error',{sourceId:dem.COASTAL_DEM.id});assert.equal(x.state(),'UNAVAILABLE');assert.equal(x.map.getTerrain(),null);x.map.emit('sourcedata',{sourceId:dem.COASTAL_DEM.id,isSourceLoaded:true});assert.equal(x.state(),'UNAVAILABLE');x.controller.setEnabled(true);assert.equal(x.state(),'ACTIVE');x.controller.destroy();});
test('NAV-V4-06 unrelated source errors do not disable terrain',()=>{const x=setup();x.controller.setMode('3d');x.map.emit('error',{sourceId:'marine-weather'});assert.equal(x.state(),'ACTIVE');x.controller.destroy();});
test('NAV-V4-07 style reload reinstalls DEM; repeated frames do not recreate terrain',()=>{const x=setup();x.controller.setMode('3d');const n=x.map.calls;for(let i=0;i<50;i++)x.controller.setMode('3d');assert.equal(x.map.calls,n);x.map.sources={};x.map.layers={};x.map.terrain=null;x.controller.styleLoaded();assert.equal(x.state(),'ACTIVE');assert.ok(x.map.getSource(dem.COASTAL_DEM.id));x.controller.destroy();});
test('NAV-V4-08 repeated mode transitions and cleanup leave no terrain listeners',()=>{const x=setup();for(let i=0;i<20;i++){x.controller.setMode('3d');x.controller.setMode('2d');}x.controller.destroy();for(const listeners of Object.values(x.map.handlers))assert.equal(listeners.size,0);x.map.emit('error',{sourceId:dem.COASTAL_DEM.id});});
test('NAV-V4-09 Korean z7–12 tile allowlist rejects invalid and distant coordinates',()=>{assert.ok(dem.terrainTileAllowed(12,3537,1587));for(const args of [[13,7074,3174],[12,-1,1],[12,99999,1],[12,1,1],[8.5,1,1],[NaN,1,1]])assert.equal(dem.terrainTileAllowed(...args),false);assert.equal(dem.terrainCoverage(130,37,6),false);});
test('NAV-V4-10 sea clamp retains measured land heights and removes bathymetry',()=>{const input=Uint8Array.from([127,255,0,128,0,0,131,193,0]);assert.deepEqual([...dem.clampTerrariumToSeaLevel(input,3)],[128,0,0,128,0,0,131,193,0]);});
test('NAV-V4-11 PNG transformation preserves positive metres, clamps sea and validates input',()=>{const {landOnlyPng}=load('src/lib/marine-navigation/terrain-tile-server.ts');const image=PNG.sync.read(landOnlyPng(png()));assert.equal(image.data[0]*256+image.data[1]+image.data[2]/256-32768,961);assert.equal(image.data[4]*256+image.data[5]+image.data[6]/256-32768,0);assert.throws(()=>landOnlyPng(Buffer.alloc(40)));const bomb=png();bomb.writeUInt32BE(100000,16);assert.throws(()=>landOnlyPng(bomb));});
test('NAV-V4-12 tile fetch dedupes concurrent work and caches successful data',async()=>{const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;return new Response(png(),{headers:{'content-type':'image/png'}});};try{const {landTerrainTile}=load('src/lib/marine-navigation/terrain-tile-server.ts');const [a,b]=await Promise.all([landTerrainTile(12,3537,1587),landTerrainTile(12,3537,1587)]);assert.deepEqual(a,b);await landTerrainTile(12,3537,1587);assert.equal(calls,1);}finally{global.fetch=original;}});
test('NAV-V4-13 invalid routes avoid upstream; failures return noncacheable 503',async()=>{const {GET}=load('src/app/api/navigation/terrain/v1/[z]/[x]/[y]/route.ts',{'@/lib/marine-navigation/terrain-tile-server':{landTerrainTile:async()=>{throw Error('upstream');}}});const req=new Request('http://localhost/api/navigation/terrain');assert.equal((await GET(req,{params:Promise.resolve({z:'12',x:'-1',y:'1'})})).status,404);const failed=await GET(req,{params:Promise.resolve({z:'12',x:'3537',y:'1587'})});assert.equal(failed.status,503);assert.equal(failed.headers.get('cache-control'),'no-store');});
test('NAV-V4-14 source timeout cancels loading and fails honestly',()=>{const oldSet=global.setTimeout,oldClear=global.clearTimeout;let timeout;global.setTimeout=fn=>(timeout=fn,1);global.clearTimeout=()=>{};try{const x=setup();x.map.loaded=false;x.controller.setMode('3d');timeout();assert.equal(x.state(),'UNAVAILABLE');assert.equal(x.map.getTerrain(),null);x.controller.destroy();}finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;}});

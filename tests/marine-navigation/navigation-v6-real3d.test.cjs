const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const cache = new Map();
function load(p) {
  if(cache.has(p)) return cache.get(p);
  const m={exports:{}};
  const req=id=>load(path.join(path.dirname(p),id)+'.ts');
  new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,p),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(req,m,m.exports);
  cache.set(p,m.exports);return m.exports;
}
const r=load('src/lib/marine-navigation/real3d.ts');
const source=r.real3dSource('/navigation-3d-data/licensed/tileset.json','Licensed provider');
const point={latitude:35.1,longitude:129.1,timestamp:123,accuracyMeters:5,heading:90,headingSource:'GPS_NATIVE',speedKnots:8};
const base={vessel:null,destination:null,waypoints:[],track:[]};
test('V6 source fails closed; remote URLs, traversal, queries and missing attribution rejected',()=>{
  assert.ok(source);
  for(const url of [undefined,'https://example.org/tileset.json','//example.org/t.json','/navigation-3d-data/../x/tileset.json','/navigation-3d-data/a/tileset.json?key=secret']) assert.equal(r.real3dSource(url,'provider'),null);
  assert.equal(r.real3dSource(source.url,''),null);
});
test('V6 data, offline and low-memory gates retain MapLibre',()=>{
  assert.ok(r.real3dGate(null,8,true));assert.ok(r.real3dGate(source,8,false));assert.ok(r.real3dGate(source,2,true));
  assert.equal(r.real3dGate(source,4,true),null);assert.equal(r.real3dGate(source,undefined,true),null);
  assert.ok(r.real3dGate(source,8,true,false));
});
test('V6 no fix means no fabricated boat or GPS altitude',()=>{
  const out=r.real3dPresentation(base);assert.equal(out.vessel,null);assert.equal(out.points.length,0);assert.equal(out.accuracy,null);
});
test('V6 canonical coordinates and waypoint/destination identities are retained',()=>{
  const p={...base,vessel:point,destination:{...point,id:'d',name:'destination'},waypoints:[{...point,id:'w',name:'waypoint'}]};
  const out=r.real3dPresentation(p);assert.deepEqual(out.points.map(f=>f.geometry.coordinates),[[129.1,35.1],[129.1,35.1],[129.1,35.1]]);
  assert.deepEqual(out.points.map(f=>f.properties.id),['current-vessel','d','w']);assert.equal(out.accuracy,5);assert.equal(out.course,90);
});
test('V6 compass orientation is never substituted for movement course',()=>{
  assert.equal(r.real3dPresentation({...base,vessel:{...point,headingSource:'DEVICE_ORIENTATION'}}).course,null);
});
test('V6 last-known fix retains stale label, never live camera target',()=>{
  const out=r.real3dPresentation({...base,displayVessel:point,vesselState:'STALE'});assert.equal(out.vessel,null);assert.equal(out.points[0].properties.state,'STALE');assert.match(out.points[0].properties.name,/오래됨/);
});
test('V6 historical/resumed track does not bridge segment boundary',()=>{
  const track=[point,{...point,longitude:129.2},{...point,longitude:130,segmentStart:true},{...point,longitude:130.1}];
  const out=r.real3dPresentation({...base,track});assert.equal(out.track.length,2);assert.deepEqual(out.track[0].geometry.coordinates,[[129.1,35.1],[129.2,35.1]]);
});
test('V6 invalid coordinates are excluded',()=>{
  assert.equal(r.real3dPresentation({...base,vessel:{...point,latitude:999}}).points.length,0);
});
test('V6 renderer lease releases old WebGL before accepting next owner',()=>{
  const l=new r.RendererLease(),events=[];const first=l.begin();l.attach(first,()=>events.push('destroy-first'));
  const second=l.begin();assert.deepEqual(events,['destroy-first']);assert.equal(l.current(first),false);
  l.attach(second,()=>events.push('destroy-second'));l.clear();l.clear();assert.deepEqual(events,['destroy-first','destroy-second']);
});
test('V6 late async renderer cannot leak after unmount/switch',()=>{
  const l=new r.RendererLease();const old=l.begin();l.clear();let destroyed=0;assert.equal(l.attach(old,()=>destroyed++),false);assert.equal(destroyed,1);
});
test('V6 handoff rejects nonfinite/invalid camera values',()=>{
  const v={longitude:129,latitude:35,height:2000,heading:0,pitch:-45};assert.ok(r.validRendererView(v));
  for(const patch of [{height:NaN},{latitude:91},{height:0},{heading:Infinity}])assert.equal(r.validRendererView({...v,...patch}),false);
});
function loaderFixture() {
  const window={},scripts=[],module={exports:{}};
  const document={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild:s=>scripts.push(s)}};
  const source=fs.readFileSync(path.join(root,'src/lib/marine-navigation/load-cesium.ts'),'utf8');
  new Function('window','document','module','exports','setTimeout','clearTimeout',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(window,document,module,module.exports,setTimeout,clearTimeout);
  return {window,scripts,load:module.exports.loadCesium};
}
test('V6 vendor loader is lazy and deduplicates concurrent renderer requests',async()=>{
  const f=loaderFixture();assert.equal(f.scripts.length,0);
  const first=f.load(),second=f.load();assert.equal(first,second);assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].src,'/cesium/Cesium.js');
  f.window.Cesium={Viewer:class{}};f.scripts[0].onload();assert.equal(await first,f.window.Cesium);await f.load();assert.equal(f.scripts.length,1);
});
test('V6 failed script can retry without retaining failed loader',async()=>{
  const f=loaderFixture();const first=f.load();f.scripts[0].onerror();await assert.rejects(first,/CESIUM_SCRIPT_UNAVAILABLE/);assert.equal(f.scripts[0].removed,true);
  const retry=f.load();assert.equal(f.scripts.length,2);f.window.Cesium={};f.scripts[1].onload();await retry;
});
test('V6 pinned vendor distribution parses without Next minifier byte-string corruption',()=>{
  const vendor=fs.readFileSync(path.join(path.dirname(require.resolve('cesium/package.json')),'Build/Cesium/Cesium.js'),'utf8');
  assert.doesNotThrow(()=>new(require('node:vm').Script)(vendor));
});

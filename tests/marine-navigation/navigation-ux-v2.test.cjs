const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const cache = new Map();
function load(p, overrides={}) {
 if(cache.has(p) && !Object.keys(overrides).length) return cache.get(p);
 const mod={exports:{}};
 const req=id=> overrides[id] ?? load((id.startsWith('@/') ? 'src/'+id.slice(2) : path.join(path.dirname(p),id)).replaceAll('\\','/')+'.ts');
 new Function('require','module','exports',ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(req,mod,mod.exports);
 if(!Object.keys(overrides).length) cache.set(p,mod.exports);
 return mod.exports;
}
const instruments=load('src/lib/marine-navigation/vessel-instruments.ts');
const sensors=load('src/lib/marine-navigation/live-sensors.ts');
const geo=load('src/lib/marine-navigation/geo.ts');
const points=load('src/lib/marine-navigation/adapters/navigation-map-geojson.ts');
const camera={mode:'2d',follow:true,courseUp:false,recenter:0};
const vessel={latitude:35.1543,longitude:129.1267,timestamp:100000,accuracyMeters:3,heading:90,headingSource:'GPS_NATIVE',speedKnots:8,speedSource:'NATIVE_GEOLOCATION',source:'GPS_NATIVE'};
class FakeMap {
 static instances=[];
 constructor(){this.handlers={};this.sources={};this.layers={};this.moves=[];this.removed=false;FakeMap.instances.push(this);}
 on(event,...args){(this.handlers[event]??=[]).push(args.at(-1));return this;}
 once(event,fn){return this.on(event,fn);}
 off(){return this;}
 emit(event,data={}){for(const fn of this.handlers[event]??[])fn(data);}
 stop(){this.stopped=true;} addControl(){} addImage(){} setLayoutProperty(){} resize(){}
 addSource(id){this.sources[id]={setData(data){this.data=data;}};}
 getSource(id){return this.sources[id];}
 addLayer(layer){this.layers[layer.id]=layer;}
 getLayer(id){return this.layers[id];}
 getContainer(){return {clientHeight:600};}
 easeTo(options){this.moves.push(options);}
 remove(){this.removed=true;}
}
const providerModule=load('src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts',{'maplibre-gl':{Map:FakeMap,setWorkerUrl(){},NavigationControl:class{},AttributionControl:class{},LngLatBounds:class{extend(){return this;}}}});
function provider(){
 const saved=global.document;global.document={createElement(){return {getContext(){return null;}}}};
 const p=new providerModule.MapLibreNavigationProvider({},()=>{});const map=FakeMap.instances.at(-1);map.emit('load');global.document=saved;
 return {p,map,present(extra={}){p.setPresentation({vessel,destination:null,waypoints:[],track:[],camera,...extra});}};
}
test('NAV-V2-01 mode changes retain follow state',()=>{const c={...camera,mode:'3d',follow:false};assert.equal(instruments.cameraView(c,vessel,600).pitch,55);assert.equal(c.follow,false);});
test('NAV-V2-02 provider sends real easeTo pitch and lower-third offset',()=>{const x=provider();x.present();assert.equal(x.map.moves.at(-1).pitch,0);x.present({camera:{...camera,mode:'3d'}});assert.equal(x.map.moves.at(-1).pitch,55);assert.deepEqual(x.map.moves.at(-1).offset,[0,instruments.forwardAnchor(600)]);});
test('NAV-V2-03 vessel marker only exists for a valid real/model position',()=>{assert.equal(points.toNavigationPointGeoJson({vessel:null,destination:null,waypoints:[]}).features.length,0);const f=points.toNavigationPointGeoJson({vessel,destination:null,waypoints:[]}).features[0];assert.equal(f.properties.kind,'vessel');assert.deepEqual(f.geometry.coordinates,[vessel.longitude,vessel.latitude]);});
test('NAV-V2-04 follow off does not recenter on fixes',()=>{const x=provider();x.present({camera:{...camera,follow:false}});const n=x.map.moves.length;x.present({camera:{...camera,follow:false},vessel:{...vessel,timestamp:102000,longitude:130}});assert.equal(x.map.moves.length,n);});
test('NAV-V2-05 drag suspends without fighting gesture and recenter resumes',()=>{const x=provider();let count=0;x.p.setManualMoveHandler(()=>count++);x.present();x.map.emit('mousedown');assert.ok(x.map.stopped);x.map.emit('dragstart');assert.equal(count,1);const n=x.map.moves.length;x.present({camera:{...camera,follow:false}});assert.equal(x.map.moves.length,n);x.present({camera:{...camera,recenter:1}});assert.deepEqual(x.map.moves.at(-1).center,[vessel.longitude,vessel.latitude]);});
test('NAV-V2-06 native m/s conversions',()=>{assert.equal(instruments.KNOTS_PER_MPS,1.943844);assert.equal(instruments.speedInUnit(1.943844,'kn'),1.943844);assert.equal(instruments.speedInUnit(1.943844,'km/h'),3.6);});
test('NAV-V2-07 null, NaN and negative are unknown, native zero remains zero',()=>{for(const raw of [null,NaN,-1])assert.equal(instruments.filterGpsSpeed(raw,3,100000,100000,null),null);assert.equal(instruments.filterGpsSpeed(0,3,100000,100000,null).metersPerSecond,0);});
test('NAV-V2-08 stale, future and poor accuracy cannot supply live speed',()=>{assert.equal(instruments.filterGpsSpeed(3,3,100000,116000,null),null);assert.equal(instruments.filterGpsSpeed(3,60,100000,100000,null),null);assert.equal(instruments.filterGpsSpeed(3,3,104000,100000,null),null);assert.equal(sensors.positionQuality(vessel,true,null,116000),'STALE');});
test('NAV-V2-09 stationary course jitter does not rotate camera',()=>{for(const heading of [0,90,180,359])assert.equal(instruments.cameraView({...camera,courseUp:true},{...vessel,speedKnots:.4,heading},600).bearing,0);});
test('NAV-V2-10 speed spikes rejected, normal noise smoothed',()=>{const old={metersPerSecond:4,timestamp:100000};assert.equal(instruments.filterGpsSpeed(40,3,101000,101000,old),null);const v=instruments.filterGpsSpeed(5,3,101000,101000,old).metersPerSecond;assert.ok(v>4&&v<5);assert.equal(instruments.filterGpsSpeed(70,3,101000,101000,null),null);});
test('NAV-V2-11 destination bearing never feeds course, relative orientation ignored',()=>{assert.equal(instruments.reliableCourse(vessel),90);assert.equal(instruments.reliableCourse({...vessel,headingSource:'UNAVAILABLE'}),null);assert.equal(sensors.compassHeading({alpha:20,absolute:false}),null);const x=provider();x.present({camera:{...camera,courseUp:true},destination:{...vessel,id:'d',latitude:36}});assert.ok(x.map.moves.at(-1).bearing>0 && x.map.moves.at(-1).bearing<=90);});
test('NAV-V2-12 permission denied releases watcher',()=>{let cleared=false,failed;const stop=sensors.watchLivePosition({watchPosition(ok,bad){bad({code:1});return 9;},clearWatch(){cleared=true;}},()=>assert.fail(),e=>failed=e);stop();assert.equal(failed,'permission-denied');assert.ok(cleared);});
test('NAV-V2-13 distance is nautical straight line',()=>{assert.equal(geo.metersToNauticalMiles(1852),1);assert.equal(geo.distanceMeters(vessel,vessel),0);});
test('NAV-V2-14 destination handoff preserves coordinates and ID',()=>{const d=load('src/lib/marine-navigation/adapters/navigation-destination-adapter.ts');const spot={id:'rock-151',name:'test spot',lat:35.2,lng:129.2};const dest=d.navigationDestinationFromFishingSpot(spot);const query=Object.fromEntries(new URL(d.buildNavigationHref(dest),'https://example.com').searchParams);assert.deepEqual(d.parseNavigationDestinationQuery(query).destination,dest);});
test('NAV-V2-15 return links retain fishing source ID',()=>{assert.match(read('src/components/boat/navigation/MarineNavigation.tsx'),/encodeURIComponent\(destination.sourceId\)/);});
test('NAV-V2-16 provider entry exit does not add another map on mode changes',()=>{for(let i=0;i<3;i++){const x=provider();const n=FakeMap.instances.length;for(let j=0;j<6;j++)x.present({camera:{...camera,mode:j%2?'3d':'2d'}});assert.equal(FakeMap.instances.length,n);x.p.destroy();assert.ok(x.map.removed);}});
test('NAV-V2-17 drawer and collapsed details retained',()=>{const s=read('src/components/boat/navigation/MarineNavigation.tsx');assert.match(s,/\[detailsOpen, setDetailsOpen\] = useState\(false\)/);assert.match(s,/id="navigation-layer-drawer"/);assert.match(s,/hidden={!detailsOpen}/);});
test('NAV-V2-18 mobile layout contract keeps instruments out of map controls',()=>{const s=read('src/components/boat/navigation/NavigationInstruments.tsx');assert.match(s,/grid-cols-3/);assert.match(s,/min-h-11/);assert.match(read('src/components/boat/navigation/MarineNavigation.tsx'),/<\/header>\s*<NavigationInstruments/);});

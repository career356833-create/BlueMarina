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
 getCenter(){return {lng:129,lat:35};} getZoom(){return 12;} getTerrain(){return this.terrain;} setTerrain(t){this.terrain=t;} isSourceLoaded(){return true;}
 stop(){this.stopped=true;} addControl(){} addImage(){} setLayoutProperty(){} resize(){}
 addSource(id){this.sources[id]={setData(data){this.data=data;}};}
 getSource(id){return this.sources[id];}
 addLayer(layer){this.layers[layer.id]=layer;}
 getLayer(id){return this.layers[id];}
 getContainer(){return {clientHeight:600};}
 jumpTo(options){this.center=options.center;this.moves.push(options);}
 easeTo(options){this.moves.push(options);}
 remove(){this.removed=true;}
}
const providerModule=load('src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts',{'maplibre-gl':{Map:FakeMap,setWorkerUrl(){},NavigationControl:class{},AttributionControl:class{},LngLatBounds:class{extend(){return this;}}}});
function provider(){
 const saved=global.document;global.document={createElement(){return {getContext(){return null;}}}};
 const p=new providerModule.MapLibreNavigationProvider({},()=>{});const map=FakeMap.instances.at(-1);map.emit('style.load');global.document=saved;
 return {p,map,present(extra={}){p.setPresentation({vessel,destination:null,waypoints:[],track:[],camera,...extra});}};
}
const trail=load('src/lib/marine-navigation/session-track.ts');
const scenarios=load('src/lib/marine-navigation/gps-test-scenarios.ts');
const fix=(seconds,meters=0,extra={})=>({...vessel,...geo.destinationPoint(vessel,90,meters),timestamp:vessel.timestamp+seconds*1000,...extra});

test('NAV-V3-01 responsive 3D camera offset keeps forward view at 67–72%',()=>{for(const [height,width] of [[640,360],[650,390],[650,430],[720,1280]]){const view=instruments.cameraView({...camera,mode:'3d'},vessel,height,width);assert.equal(view.pitch,55);const ratio=.5+view.offset[1]/height;assert.ok(ratio>=.67&&ratio<=.72);}});
test('NAV-V3-02 boat anchor resets to center in 2D and free exploration',()=>{assert.deepEqual(instruments.cameraView(camera,vessel,600).offset,[0,0]);assert.deepEqual(instruments.cameraView({...camera,mode:'3d',follow:false},vessel,600).offset,[0,0]);});
test('NAV-V3-03 continuous fixes use eased throttled updates and shortest rotation',()=>{assert.ok(instruments.smoothBearing(359,1)>359);assert.ok(instruments.smoothBearing(1,359)<1);const x=provider();x.present();const n=x.map.moves.length;for(let i=1;i<50;i++)x.present({vessel:fix(i,i*4)});assert.ok(x.map.moves.length<=n+1);assert.ok(x.map.moves.at(-1).duration<=650);});
test('NAV-V3-04 dragging pauses follow without moving camera back',()=>{const x=provider();let paused=false;x.p.setManualMoveHandler(()=>paused=true);x.present();x.map.emit('dragstart');assert.ok(paused);const n=x.map.moves.length;x.present({camera:{...camera,follow:false},vessel:fix(2,10)});assert.equal(x.map.moves.length,n);});
test('NAV-V3-05 recenter and resize restore responsive boat anchor',()=>{const x=provider();x.present({camera:{...camera,mode:'3d'}});x.p.resize();assert.equal(x.map.moves.at(-1).pitch,55);x.present({camera:{...camera,recenter:2}});assert.deepEqual(x.map.moves.at(-1).center,[vessel.longitude,vessel.latitude]);});
test('NAV-V3-06 smoothing responds to acceleration and deceleration within seconds',()=>{let s={metersPerSecond:5/instruments.KNOTS_PER_MPS,timestamp:100000};for(let i=1;i<=8;i++)s=instruments.filterGpsSpeed(15/instruments.KNOTS_PER_MPS,3,100000+i*1000,100000+i*1000,s);assert.ok(s.metersPerSecond*instruments.KNOTS_PER_MPS>14);for(let i=9;i<=16;i++)s=instruments.filterGpsSpeed(3/instruments.KNOTS_PER_MPS,3,100000+i*1000,100000+i*1000,s);assert.ok(s.metersPerSecond*instruments.KNOTS_PER_MPS<3.5);});
test('NAV-V3-07 speed spike and impossible coordinate jump rejected',()=>{assert.equal(instruments.filterGpsSpeed(40,3,101000,101000,{metersPerSecond:4,timestamp:100000}),null);assert.equal(trail.plausibleFix(vessel,fix(1,100000)),false);assert.equal(trail.plausibleFix(vessel,fix(1,5)),true);});
test('NAV-V3-08 rest distinct from unknown and low speed disables COG',()=>{assert.equal(instruments.filterGpsSpeed(0,3,100000,100000,null).metersPerSecond,0);assert.equal(instruments.filterGpsSpeed(null,3,100000,100000,null),null);assert.equal(instruments.reliableMovementCourse({...vessel,speedKnots:.8}),null);});
test('NAV-V3-09 unknown direction is a dot rather than a false north-facing boat',()=>{const result=points.toNavigationPointGeoJson({vessel:{...vessel,heading:undefined},destination:null,waypoints:[]});assert.equal(result.features[0].properties.directionKnown,false);});
test('NAV-V3-10 course up never substitutes compass or destination bearing',()=>{assert.equal(instruments.cameraView({...camera,courseUp:true},{...vessel,headingSource:'DEVICE_ORIENTATION'},600).bearing,0);assert.equal(instruments.cameraView({...camera,courseUp:true},vessel,600).bearing,90);assert.equal(instruments.cameraView(camera,vessel,600).bearing,0);const x=provider();x.present({camera:{...camera,mode:'3d',courseUp:true}});x.present({camera:{...camera,mode:'3d',courseUp:true},vessel:null});assert.equal(x.map.moves.at(-1).bearing,0);assert.deepEqual(x.map.moves.at(-1).center,[vessel.longitude,vessel.latitude]);});
test('NAV-V3-11 trail records movement but not stationary jitter; memory bounded',()=>{let list=trail.appendSessionTrack([],vessel,100000);assert.equal(trail.appendSessionTrack(list,fix(1,1),101000),list);list=trail.appendSessionTrack(list,fix(2,10),102000);assert.equal(list.length,2);const many=Array.from({length:2400},(_,i)=>fix(i,i*6));assert.equal(trail.appendSessionTrack(many,fix(2400,14400),2500000).length,2400);});
test('NAV-V3-12 accuracy/stale/jumps are excluded and gaps do not draw false lines',()=>{const first=[vessel];for(const point of [fix(1,8,{accuracyMeters:51}),fix(1,100000)])assert.equal(trail.appendSessionTrack(first,point,point.timestamp),first);assert.equal(trail.appendSessionTrack(first,fix(1,8),120000),first);let list=trail.appendSessionTrack(first,fix(20,50),120000);assert.ok(list[1].segmentStart);list=trail.appendSessionTrack(list,fix(21,60),121000);const lines=points.toTrackGeoJson(list).features;assert.equal(lines.length,1);assert.equal(lines[0].geometry.coordinates.length,2);});
test('NAV-V3-13 clearing starts a new session path with no persistent storage',()=>{const next=trail.appendSessionTrack([],fix(10,50),110000);assert.equal(next.length,1);assert.equal(points.toTrackGeoJson(next).features.length,0);const s=read('src/components/boat/navigation/MarineNavigation.tsx');assert.doesNotMatch(s,/trackStorage|tracks.*fetch|JSON.stringify\(tracks/);assert.match(s,/points: \[\]/);});
test('NAV-V3-14 stale point retained only as labeled stale marker without direction',()=>{assert.equal(sensors.positionQuality(vessel,true,null,116000),'STALE');const f=points.toNavigationPointGeoJson({vessel:null,displayVessel:vessel,vesselState:'STALE',destination:null,waypoints:[]}).features[0];assert.equal(f.properties.state,'STALE');assert.equal(f.properties.directionKnown,false);assert.match(f.properties.name,/오래됨/);});
test('NAV-V3-15 signal lost clears live values and watcher cleanup rejects late callback',()=>{let callback,clears=0,accepted=0;const stop=sensors.watchLivePosition({watchPosition(ok){callback=ok;return 1;},clearWatch(){clears++;}},()=>accepted++,()=>{});stop();stop();callback({});assert.equal(clears,1);assert.equal(accepted,0);assert.equal(sensors.positionQuality(vessel,true,'unavailable',100000),'UNAVAILABLE');});
test('NAV-V3-16 repeated mode switching reuses one map and keeps track source',()=>{const x=provider();const n=FakeMap.instances.length;for(let i=0;i<20;i++)x.present({camera:{...camera,mode:i%2?'3d':'2d'},track:[vessel,fix(2,10)]});assert.equal(FakeMap.instances.length,n);assert.equal(x.map.sources['navigation-track'].data.features.length,1);});
test('NAV-V3-17 three entry/exit cycles remove map and dev scenario timer has cleanup',()=>{for(let i=0;i<3;i++){const x=provider();x.present();x.p.destroy();assert.ok(x.map.removed);}assert.match(read('src/components/boat/navigation/NavigationGpsSimulator.tsx'),/clearInterval\(timer\)/);});
test('NAV-V3-18 destination handoff survives 3D and track options',()=>{const d=load('src/lib/marine-navigation/adapters/navigation-destination-adapter.ts');const dest=d.navigationDestinationFromFishingSpot({id:'rock-151',name:'개야도',lat:36.036417,lng:126.513083});assert.deepEqual(d.parseNavigationDestinationQuery(Object.fromEntries(new URL(d.buildNavigationHref(dest),'https://example.com').searchParams)).destination,dest);});
test('NAV-V3-19 visual QA contract: dominant SOG, 44px controls, pointer-transparent HUD',()=>{assert.match(read('src/components/boat/navigation/NavigationInstruments.tsx'),/text-\[clamp\(3rem/);assert.match(read('src/components/boat/navigation/TrackRecorder.tsx'),/size-11/);assert.match(read('src/components/boat/navigation/NavigationTurnHUD.tsx'),/pointer-events-none/);});
test('NAV-V3-20 dev scenarios A–K use real filter path, never production or safety claims',()=>{for(let i=0;i<12;i++){const frame=scenarios.testGpsFrame(i,1,vessel,100000);if(i===7)assert.equal(frame,null);else assert.ok(Number.isFinite(frame.coords.latitude));}const s=read('src/components/boat/navigation/MarineNavigation.tsx');assert.match(s,/acceptPosition\(fix, true\)/);assert.match(s,/process.env.NODE_ENV !== "production"/);assert.match(s,/안전항로가 아닙니다/);assert.doesNotMatch(read('src/lib/marine-navigation/simulation.ts'),/NEXT_PUBLIC_MARINE_NAVIGATION_SIMULATION/);});


test('NAV-V4 initial destination is established before an interrupted animation or resize',()=>{const x=provider(); const destination={id:'manual:ulleung',name:'DEM QA',latitude:37.45,longitude:130.9,sourceType:'manual'};x.present({vessel:null,destination});assert.deepEqual(x.map.center,[130.9,37.45]);x.p.resize();x.present({vessel:null,destination,camera:{...camera,mode:'3d'}});assert.deepEqual(x.map.center,[130.9,37.45]);x.p.destroy();});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const mod = {exports:{}};
new Function('module','exports',ts.transpileModule(read('src/lib/marine-navigation/field-diagnostics.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
const {FieldRecorder,sanitizeFieldValues,coarseDevice,FIELD_CHECKLIST,FIELD_EVENT_LIMIT} = mod.exports;
const t = 1793100000000;
test('FIELD-01 inactive and stopped recorders ignore observations and actions',()=>{
  const r=new FieldRecorder();r.observe({gpsQuality:'GOOD'},t);r.action('GPS_REQUESTED',t);assert.equal(r.report().events.length,0);
  r.start(t);r.observe({gpsQuality:'STALE'},t+1000);r.stop(t+2000);const before=JSON.stringify(r.report());r.observe({gpsQuality:'GOOD'},t+3000);r.action('VOYAGE_STARTED');assert.equal(JSON.stringify(r.report()),before);
});
test('FIELD-02 fresh start resets events timing and all manual results',()=>{
  const r=new FieldRecorder();r.start(t);r.setManual('NAV-R02','PASS');r.stop();r.start(t+100);assert.equal(r.report().manualTests['NAV-R02'],'NOT_TESTED');assert.equal(r.report().events.length,1);assert.equal(r.report().automatedObservations.permission,'UNKNOWN');
});
test('FIELD-03 first fix measured only after explicit GPS request',()=>{
  const r=new FieldRecorder();r.start(t);r.fix({timestamp:t+1000,speedAvailable:false,cogAvailable:false,simulation:false},t+1000);assert.equal(r.report().automatedObservations.firstFixMs,null);
  r.action('GPS_REQUESTED',t+2000);r.fix({timestamp:t+5000,speedAvailable:true,cogAvailable:true,simulation:false},t+5000);assert.equal(r.report().automatedObservations.firstFixMs,3000);
});
test('FIELD-04 duplicate/reversed updates do not alter fix intervals',()=>{
  const r=new FieldRecorder();r.start(t);const fix=n=>r.fix({timestamp:t+n,speedAvailable:false,cogAvailable:false,simulation:false},t+n);
  fix(1000);fix(2000);const before=JSON.stringify(r.report());fix(2000);fix(1500);assert.equal(JSON.stringify(r.report()),before);assert.equal(r.report().automatedObservations.updateIntervalMs,1000);
});
test('FIELD-05 stale and recovery are separate observations not automatic PASS',()=>{
  const r=new FieldRecorder();r.start(t);r.observe({gpsQuality:'STALE'},t+16000);r.observe({gpsQuality:'GOOD'},t+17000);
  assert.ok(r.report().events.some(e=>e.type==='GPS_RECOVERED'));assert.equal(r.report().manualTests['NAV-R05'],'NOT_TESTED');assert.equal(r.report().realDeviceGate,'MANUAL_TEST_REQUIRED');
});
test('FIELD-06 missing native speed is distinct from unavailable displayed SOG',()=>{
  const r=new FieldRecorder();r.start(t);r.fix({timestamp:t,speedAvailable:false,cogAvailable:false,simulation:false},t);r.observe({sogDisplay:'UNAVAILABLE'});
  assert.equal(r.report().automatedObservations.nativeSpeed,'NOT_PROVIDED');assert.equal(r.report().automatedObservations.sogDisplay,'UNAVAILABLE');
});
test('FIELD-07 telemetry accepts only fixed enums and bounded numbers',()=>{
  assert.deepEqual(sanitizeFieldValues({latitude:37.123456,longitude:129.987654,email:'private@example.test',token:'secret-token',url:'https://secret.test',accuracyMeters:7.4,fixAgeMs:Infinity,lastFixAt:NaN,mapError:'secret-token',permission:'GRANTED'}),{permission:'GRANTED',accuracyMeters:7});
});
test('FIELD-08 errors never serialize provider message or URL',()=>{
  const r=new FieldRecorder();r.start(t);r.observe({mapError:'DEM_SOURCE_ERROR',message:'secret-token',url:'https://secret.test'});r.action('secret-token');
  const output=JSON.stringify(r.report());assert.ok(output.includes('DEM_SOURCE_ERROR'));assert.ok(!output.includes('secret-token'));assert.ok(!output.includes('secret.test'));
});
test('FIELD-09 DEM state not inferred from 3D camera pitch',()=>{
  const r=new FieldRecorder();r.start(t);r.observe({camera:'3d',terrain:'PITCH_ONLY'});assert.equal(r.report().automatedObservations.terrain,'PITCH_ONLY');assert.equal(r.report().manualTests['NAV-F01'],'NOT_TESTED');r.observe({terrain:'ACTIVE'});assert.equal(r.report().automatedObservations.terrain,'ACTIVE');
});
test('FIELD-10 capability and acquisition remain independent',()=>{
  const r=new FieldRecorder();r.start(t);r.observe({wakeSupported:'SUPPORTED',wake:'FAILED'});assert.equal(r.report().automatedObservations.wake,'FAILED');assert.equal(r.report().errors.length,1);
});
test('FIELD-11 ring buffer bounded and snapshot immutable to callers',()=>{
  const r=new FieldRecorder();r.start(t);for(let i=0;i<1000;i++)r.observe({follow:i%2?'ON':'OFF'},t+i);
  const report=r.report();assert.equal(report.events.length,FIELD_EVENT_LIMIT);assert.ok(report.droppedEvents>0);report.events[0].value='secret';report.manualTests['NAV-R01']='PASS';assert.notEqual(r.report().events[0].value,'secret');assert.equal(r.report().manualTests['NAV-R01'],'NOT_TESTED');
});
test('FIELD-12 manual results allowlisted and never infer device readiness',()=>{
  const r=new FieldRecorder();r.start(t);for(const [id] of FIELD_CHECKLIST)r.setManual(id,'PASS');r.setManual('email','private@example.test');r.setManual('NAV-R01','injected');
  assert.equal(r.report().manualTests['NAV-R01'],'PASS');assert.equal(r.report().manualTests.email,undefined);assert.equal(r.report().decision,'FIELD_DIAGNOSTICS_READY');assert.equal(FIELD_CHECKLIST.filter(([id])=>id.startsWith('NAV-R')).length,15);
});
test('FIELD-13 simulation explicitly separate from physical GPS',()=>{
  const r=new FieldRecorder();r.start(t);r.fix({timestamp:t,speedAvailable:true,cogAvailable:true,simulation:true},t);assert.equal(r.report().automatedObservations.fixSource,'SIMULATION');assert.equal(r.report().manualTests['NAV-R05'],'NOT_TESTED');
});
test('FIELD-14 coarse browser categories omit raw user agent identifiers',()=>{
  assert.deepEqual(coarseDevice('Android private-device Chrome/123'),{deviceType:'ANDROID',browser:'CHROME'});assert.equal(coarseDevice('iPhone Safari').deviceType,'IOS');assert.equal(coarseDevice('unknown').deviceType,'UNKNOWN');
});
test('FIELD-15 observer lifecycle adds no GPS watcher or permission prompt',()=>{
  const hook=read('src/components/boat/navigation/useFieldDiagnostics.ts');assert.doesNotMatch(hook,/watchPosition|getCurrentPosition|requestPermission|fetch\(|sendBeacon|localStorage|indexedDB/);
  assert.match(hook,/if \(!active\) return/);assert.match(hook,/live = false/);assert.match(hook,/removeEventListener\('change'/);assert.match(hook,/clearInterval/);
  const nav=read('src/components/boat/navigation/MarineNavigation.tsx');assert.equal((nav.match(/watchLivePosition\(/g)||[]).length,1);
});
test('FIELD-16 map error observers are detached on stop and destruction',()=>{
  const p=read('src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts');assert.match(p,/if \(!observer\) return/);assert.match(p,/this\.map\.off\('webglcontextlost'/);assert.match(p,/destroy\(\) \{\s*this\.setFieldObserver\(undefined\)/);assert.match(p,/terrain:this\.terrain\.getState\(\)/);assert.doesNotMatch(p,/fieldObserver\?\.\([^\n]*event\.error/);
});
test('FIELD-17 browser lifecycle produces no cross-instance history',()=>{
  const a=new FieldRecorder();a.start(t);a.observe({permission:'GRANTED'});a.stop();for(let i=0;i<3;i++){const next=new FieldRecorder();assert.equal(next.report().events.length,0);next.start(t);assert.equal(next.report().automatedObservations.permission,'UNKNOWN');next.stop();}
});
test('FIELD-18 exports explicit, panel wraps and manual instructions cover lock and physical gestures',()=>{
  const panel=read('src/components/boat/navigation/FieldDiagnosticsPanel.tsx');assert.match(panel,/navigator\.clipboard\.writeText/);assert.match(panel,/application\/json/);assert.match(panel,/overflow-wrap:anywhere/);assert.match(panel,/min-h-11/);assert.match(panel,/직접 복사할 진단 JSON/);assert.doesNotMatch(panel,/fetch\(|sendBeacon|console\.log/);
  assert.ok(FIELD_CHECKLIST.find(([id])=>id==='NAV-R09')[2].includes('30초'));assert.ok(FIELD_CHECKLIST.find(([id])=>id==='NAV-R07')[2].includes('마우스'));
});
test('FIELD-19 storage success events occur after write and failure is a fixed code',()=>{
  const source=read('src/components/boat/navigation/useVoyageManager.ts');assert.match(source,/await work\(\);await reload\(\);setNotice\(message\);if\(action\)onFieldAction/);assert.match(source,/onFieldAction\?\.\('STORAGE_FAILED'\)/);assert.match(source,/'VOYAGE_SAVED_LOCALLY'/);
});
test('FIELD-20 loss preserves last measurement time and age freezes after stop',()=>{
  const r=new FieldRecorder();r.start(t);r.observe({lastFixAt:t,gpsQuality:'GOOD'});r.observe({lastFixAt:null,gpsQuality:'UNAVAILABLE'});r.tick(t+16000);
  assert.equal(r.report().automatedObservations.lastFixAt,t);assert.equal(r.report().automatedObservations.fixAgeMs,16000);r.stop(t+17000);r.tick(t+30000);assert.equal(r.report().automatedObservations.fixAgeMs,17000);
});

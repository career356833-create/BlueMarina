const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const moduleUnderTest = {exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/marine-navigation/live-sensors.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(moduleUnderTest,moduleUnderTest.exports);
const {positionQuality, watchLivePosition, compassHeading, compassPermission} = moduleUnderTest.exports;
const fix = {timestamp:100_000,accuracyMeters:5};
test('freshness transitions on elapsed time and resume; stopped/error fixes are not current',()=>{
  assert.equal(positionQuality(fix,true,null,110_000),'GOOD');
  assert.equal(positionQuality(fix,true,null,116_000),'STALE');
  assert.equal(positionQuality(fix,true,null,3_700_000),'STALE');
  assert.equal(positionQuality(fix,false,null,110_000),'OFF');
  assert.equal(positionQuality(fix,true,'permission-denied',110_000),'UNAVAILABLE');
  assert.equal(positionQuality(null,true,null,110_000),'ACQUIRING');
});
test('low accuracy, future and invalid clocks never masquerade as a good fix',()=>{
  assert.equal(positionQuality({...fix,accuracyMeters:51},true,null,100_000),'LOW_ACCURACY');
  assert.equal(positionQuality({...fix,accuracyMeters:NaN},true,null,100_000),'LOW_ACCURACY');
  assert.equal(positionQuality({...fix,timestamp:104_000},true,null,100_000),'STALE');
  assert.equal(positionQuality({...fix,timestamp:NaN},true,null,100_000),'STALE');
});
function sensor() { const handlers=[]; const active=new Set(); return {handlers,active,geo:{watchPosition(ok,fail){const id=handlers.length;handlers.push({ok,fail});active.add(id);return id;},clearWatch(id){active.delete(id);}}}; }
test('permission denial, timeout and unavailable release watch and ignore queued callbacks',()=>{
  for(const [code,expected] of [[1,'permission-denied'],[2,'unavailable'],[3,'timeout'],[9,'unknown']]) {
    const s=sensor(),errors=[],positions=[];const stop=watchLivePosition(s.geo,x=>positions.push(x),x=>errors.push(x));
    s.handlers[0].ok(fix);s.handlers[0].fail({code});s.handlers[0].ok(fix);stop();
    assert.equal(s.active.size,0);assert.deepEqual(errors,[expected]);assert.equal(positions.length,1);
  }
});
test('leave/re-enter and repeated stop do not accumulate watchers',()=>{
  const s=sensor(); let calls=0; for(let i=0;i<10;i++){const stop=watchLivePosition(s.geo,()=>calls++,()=>{});assert.equal(s.active.size,1);stop();stop();s.handlers[i].ok(fix);}
  assert.equal(s.active.size,0);assert.equal(calls,0);
});
test('synchronous API failure and synchronous denial are contained',()=>{
  const errors=[];watchLivePosition({watchPosition(){throw Error('sensor');},clearWatch(){}},()=>{},e=>errors.push(e))();
  assert.deepEqual(errors,['unavailable']);let cleared=null;
  watchLivePosition({watchPosition(ok,fail){fail({code:1});return 7;},clearWatch(id){cleared=id;}},()=>{},()=>{});
  assert.equal(cleared,7);
});
test('relative orientation alpha is not advertised as a compass; absolute and WebKit are supported',()=>{
  assert.equal(compassHeading({alpha:90,absolute:false}),null);
  assert.equal(compassHeading({alpha:90,absolute:true}),270);
  assert.equal(compassHeading({alpha:null,webkitCompassHeading:123}),123);
  assert.equal(compassHeading({alpha:null,webkitCompassHeading:123,webkitCompassAccuracy:-1}),null);
  assert.equal(compassHeading({alpha:NaN,absolute:true}),null);
});
test('iOS permission rejection/denial never leaves an unhandled promise',async()=>{
  assert.equal(await compassPermission({requestPermission:async()=>{throw Error('denied');}}),false);
  assert.equal(await compassPermission({requestPermission:async()=>'denied'}),false);
  assert.equal(await compassPermission({requestPermission:async()=>'granted'}),true);
  assert.equal(await compassPermission({}),true);
});
test('component integrates quality gating, resume refresh and listener cleanup',()=>{
  const s=fs.readFileSync(path.join(root,'src/components/boat/navigation/MarineNavigation.tsx'),'utf8');
  assert.match(s,/quality !== "GOOD" && quality !== "LOW_ACCURACY"\) return null/);
  assert.match(s,/document.addEventListener\("visibilitychange", refresh\)/);
  assert.match(s,/document.removeEventListener\("visibilitychange", refresh\)/);
  assert.match(s,/gpsCleanup.current\?\.\(\); compassGeneration.current\+\+/);
  assert.match(s,/generation !== compassGeneration.current/);
  assert.match(s,/window.removeEventListener\("deviceorientationabsolute", listener\)/);
});

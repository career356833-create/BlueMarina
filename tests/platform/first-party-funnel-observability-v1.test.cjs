const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.resolve(root, p), 'utf8');
function load(p, mocks = {}) {
  const absolute = path.resolve(root, p), exports = {};
  vm.runInNewContext(ts.transpileModule(read(absolute), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, Buffer, process, URL, URLSearchParams, Request, Response, AbortSignal, setTimeout, clearTimeout, fetch,
      require: name => Object.hasOwn(mocks, name) ? mocks[name] : name === 'server-only' ? {} : name.startsWith('node:') ? require(name) : load(name.startsWith('@/') ? `src/${name.slice(2)}.ts` : path.resolve(path.dirname(absolute), `${name}.ts`), mocks) });
  return exports;
}
const events = load('src/lib/acquisition/events.ts');
const actor = { id: 'real', app_metadata: {} };
const row = (event_name, extra = {}) => ({ event_name, occurred_at: '2026-10-10T10:00:00.000Z', user_id: 'real', session_id: 's', actor_class: 'REAL', subject_class: null, domain: 'GENERAL', ...extra });
test('client allowlist accepts only supported event/route pairs', () => {
  assert.ok(events.validateClientEvent({ name: 'landing_view', route: 'HOME' }));
  for (const name of ['kakao_login_complete','saved_item_created','moderation_approved','content_published','arbitrary']) assert.equal(events.validateClientEvent({ name, route: 'HOME' }), null);
  assert.equal(events.validateClientEvent({ name: 'community_new_start', route: 'HOME' }), null);
  assert.ok(events.validateClientEvent({ name: 'community_new_start', route: 'COMMUNITY_NEW' }));
});
test('client cannot set identity, timestamps, freeform content or secrets', () => {
  for (const key of ['actor_class','user_id','session_id','email','phone','token','password','content','metadata','occurred_at','entityId']) assert.equal(events.validateClientEvent({ name:'landing_view',route:'HOME',[key]:'injected' }),null);
});
test('attribution drops URLs, queries, HTML and unknown campaign values', () => {
  const clean = events.attribution(new URLSearchParams('utm_source=google&utm_medium=organic&utm_campaign=<script>secret</script>'), 'https://www.google.com/search?q=secret');
  assert.equal(clean.source,'google'); assert.equal(clean.referrer,'GOOGLE'); assert.equal(clean.campaign,'UNKNOWN'); assert.ok(!JSON.stringify(clean).includes('secret'));
  assert.equal(events.validateClientEvent({ name:'landing_view',route:'HOME',referrer:'https://host/private' }),null);
});
test('trusted app metadata classifies QA/admin; missing identity stays unknown', () => {
  assert.equal(events.actorClass(actor),'REAL'); assert.equal(events.actorClass(null),'UNKNOWN');
  assert.equal(events.actorClass({...actor, app_metadata:{blue_marina_qa:true}}),'QA');
  assert.equal(events.actorClass({...actor, app_metadata:{operations_role:'operations_admin'}}),'ADMIN');
  assert.equal(events.actorClass(actor,'[QA] private fixture'),'QA');
  assert.equal(events.actorClass({...actor,user_metadata:{operations_role:'operations_admin'}}),'REAL');
});
test('QA, admin and unknown do not become real activation or anonymous conversion', () => {
  const rows = [row('landing_view',{user_id:null,actor_class:'ANONYMOUS'}),row('kakao_login_start',{user_id:null,actor_class:'ANONYMOUS'}),row('kakao_login_complete',{actor_class:'QA'}),row('saved_item_created',{actor_class:'ADMIN'}),row('community_submission_complete',{actor_class:'UNKNOWN'})];
  const result = events.aggregateEvents(rows,'2026-10-10','ALL','REAL');
  assert.equal(result.stages.landing_view.events,0); assert.equal(result.firstActionUsers,0); assert.equal(result.loginCompletion.percent,null);
});
test('conversion is matched and ordered, not unrelated counts divided', () => {
  const rows=[row('kakao_login_start',{user_id:null,actor_class:'ANONYMOUS'}),row('kakao_login_complete',{session_id:'other'}),row('saved_item_created',{occurred_at:'2026-10-10T09:00:00.000Z'})];
  let result=events.aggregateEvents(rows,'2026-10-10','ALL','REAL');
  assert.equal(result.loginCompletion.percent,0); assert.equal(result.loginToFirstAction.percent,0);
  rows.push(row('kakao_login_complete',{occurred_at:'2026-10-10T11:00:00.000Z'}));
  result=events.aggregateEvents(rows,'2026-10-10','ALL','REAL'); assert.equal(result.loginCompletion.percent,100);
  assert.equal(events.aggregateEvents([],'2026-10-10','ALL','REAL').loginCompletion.percent,null);
});
test('saved event count, unique users and first retained saved users differ', () => {
  const rows=[row('saved_item_created',{occurred_at:'2026-10-09T10:00:00.000Z'}),row('saved_item_created'),row('saved_item_created')];
  const result=events.aggregateEvents(rows,'2026-10-10','ALL','REAL');
  assert.equal(result.stages.saved_item_created.events,2); assert.equal(result.stages.saved_item_created.users,1); assert.equal(result.firstObservedSavedUsers,0);
});
test('QA content approved by admin is excluded; approval is not publication', () => {
  const rows=[row('moderation_approved',{actor_class:'ADMIN',subject_class:'QA'}),row('moderation_approved',{actor_class:'ADMIN',subject_class:'REAL',domain:'CHARTER'})];
  const result=events.aggregateEvents(rows,'2026-10-10','ALL','REAL');
  assert.equal(result.stages.moderation_approved.events,1); assert.equal(result.stages.content_published.events,0); assert.equal(result.firstActionUsers,0);
});
test('Kakao completion needs the current signed-in identity, not stale linked provider', () => {
  const at='2026-10-10T10:00:00Z';
  assert.equal(events.isKakaoSession({last_sign_in_at:at,identities:[{provider:'kakao',last_sign_in_at:at}]}),true);
  assert.equal(events.isKakaoSession({last_sign_in_at:at,identities:[{provider:'kakao',last_sign_in_at:'2026-10-09T00:00:00Z'},{provider:'google',last_sign_in_at:at}]}),false);
  assert.equal(events.isKakaoSession({}),false);
});
test('Today uses the Korean day boundary',()=>assert.equal(events.windowStart('today',Date.parse('2026-10-10T01:00:00Z')),'2026-10-09T15:00:00.000Z'));
test('background scheduler and failed event writes never reject business flow',async()=>{
  const server=load('src/lib/acquisition/event-server.ts',{'next/server':{after:()=>{throw Error('no lifecycle')}},'@supabase/supabase-js':{createClient:()=>{throw Error('unavailable')}}});
  assert.doesNotThrow(()=>server.bestEffort(async()=>{throw Error('write')}));
  let scheduled;
  server.bestEffort(async()=>{throw Error('secret should not log')}, callback=>{scheduled=callback});
  await assert.doesNotReject(scheduled);
});

function routeHarness(user=null) {
  let writes=0;
  class Reply extends Response { constructor(body,options){super(body,options);this.cookies={set(){}}} static json(body,options){return new Reply(JSON.stringify(body),options)} }
  const mock={PRIVATE_HEADERS:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'},acceptRate:()=>true,sessionFor:()=>null,setSession:()=>({id:'test'}),setLoginAttempt:()=>{},eventClient:()=>({auth:{getUser:async()=>({data:{user},error:null})}}),writeEvent:async()=>{writes++;return true}};
  return {route:load('src/app/api/acquisition/events/route.ts',{'next/server':{NextResponse:Reply},'@/lib/acquisition/event-server':mock}),writes:()=>writes};
}
const request=(value,extra={})=>new Request('https://example.test/api/acquisition/events',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json',...extra},body:JSON.stringify(value)});
test('ingestion enforces origin, body size and strict fields before writes',async()=>{
  const h=routeHarness();
  assert.equal((await h.route.POST(request({name:'landing_view',route:'HOME'},{origin:'https://evil.test'}))).status,403);
  assert.equal((await h.route.POST(request({name:'landing_view',route:'HOME',source:'x'.repeat(1100)}))).status,413);
  assert.equal((await h.route.POST(request({name:'landing_view',route:'HOME',actor_class:'REAL'}))).status,400);
  assert.equal(h.writes(),0);
  assert.equal((await h.route.POST(request({name:'landing_view',route:'HOME'}))).status,204);
  assert.equal(h.writes(),1);
});
test('compose event requires verified auth; invalid tokens never become anonymous',async()=>{
  const h=routeHarness();
  assert.equal((await h.route.POST(request({name:'community_new_start',route:'COMMUNITY_NEW'}))).status,401);
  assert.equal((await h.route.POST(request({name:'landing_view',route:'HOME'},{authorization:'Bearer invalid'}))).status,401);
  assert.equal(h.writes(),0);
});
test('Operations aggregate endpoint denies non-admin before raw reads and accepts authorized aggregates',async()=>{
  class AuthError extends Error {constructor(status,code){super(code);this.status=status;this.code=code}}
  class Reply extends Response {static json(body,options){return new Reply(JSON.stringify(body),options)}}
  let reads=0;
  const client={from(table){reads++;const query={select(){return query},eq(){return query},gte(){return query},order(){return query},maybeSingle:async()=>({data:{started_at:'2026-10-10T00:00:00Z'}}),range:async()=>({data:[]})};return query}};
  const route=load('src/app/api/operations/funnel/route.ts',{'next/server':{NextResponse:Reply},'@/lib/operations/server':{OperationsAuthError:AuthError,authorizeOperationsToken:async token=>{if(token!=='admin')throw new AuthError(token?403:401,'DENIED')}},'@/lib/acquisition/event-server':{environment:()=> 'preview',eventClient:()=>client,PRIVATE_HEADERS:{'Cache-Control':'private, no-store'}}});
  assert.equal((await route.GET(new Request('https://example.test/api/operations/funnel'))).status,401);
  assert.equal((await route.GET(new Request('https://example.test/api/operations/funnel',{headers:{authorization:'Bearer user'}}))).status,403);assert.equal(reads,0);
  const response=await route.GET(new Request('https://example.test/api/operations/funnel',{headers:{authorization:'Bearer admin'}}));assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.metrics.loginCompletion.percent,null);assert.ok(!JSON.stringify(body).includes('user_id'));
});
test('migration is append-only, RLS-protected and service-only; no business DDL or raw JSON',()=>{
  const sql=read('supabase/migrations/20261010123757_first_party_funnel_observability_v1.sql');
  for(const table of ['operational_funnel_events','operational_funnel_baselines'])assert.match(sql,new RegExp(`alter table public.${table} enable row level security`));
  assert.match(sql,/revoke all[\s\S]*from public, anon, authenticated, service_role/);assert.match(sql,/grant select, insert[\s\S]*to service_role/);
  assert.doesNotMatch(sql,/grant[^;]*(?:to anon|to authenticated)|\bjsonb?\b|alter table public\.(?:profiles|market|charter|community)/i);
});
test('mutation hooks follow successful writes and skip idempotent submissions',()=>{
  for(const domain of ['charters/supply/submissions','market/listings']){
    const source=read(`src/app/api/${domain}/route.ts`);assert.ok(source.indexOf('service.create(')<source.indexOf('observeMutation(request'));assert.match(source,/if\(!result.idempotent\) observeMutation/);
  }
  const community=read('src/app/api/community/posts/route.ts');assert.ok(community.indexOf('if (error || !data)')<community.indexOf('observeMutation(request'));
  assert.doesNotMatch(read('src/app/api/charters/supply/submissions/[id]/review/route.ts'),/content_published/);
  const saved=read('src/lib/account/server.ts');assert.match(saved,/ignoreDuplicates: true/);assert.match(saved,/if \(data\?\.\[0\]\) observeMutation/);
});
test('client instrumentation is limited, nonblocking and free of external vendor SDKs',()=>{
  const observer=read('src/components/platform/FunnelObserver.tsx'),client=read('src/lib/acquisition/event-client.ts');
  assert.match(observer,/event.isTrusted/);assert.match(observer,/focusin/);assert.match(observer,/Object.hasOwn\(LANDINGS/);
  assert.doesNotMatch(client,/localStorage|console\.|google-analytics|facebook\.net|navigator\.geolocation/);
  assert.match(client,/keepalive: true/);assert.match(client,/1800000/);
});

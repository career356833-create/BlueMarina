const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const migrationFile = fs.readdirSync(path.join(root, 'supabase/migrations')).find(x => x.endsWith('_event_retention_purge_operations_v1.sql'));
const sql = read(`supabase/migrations/${migrationFile}`);
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Request, Response, Date, require: key => mocks[key] });
  return exports;
}
const { retentionHealth } = load('src/lib/acquisition/retention.ts');

test('retention distinguishes expected daily tail, failure, clock anomalies and missed runs', () => {
  const s = {checkedAt:'2026-10-10T12:00:00Z', configuredAt:'2026-10-10T00:00:00Z', lastRunAt:null,lastResult:'NEVER_RUN',eligibleRows:2,futureRows:0};
  assert.equal(retentionHealth(s),'PENDING');
  assert.equal(retentionHealth({...s,lastResult:'SUCCESS',lastRunAt:s.configuredAt}),'OK');
  for (const extra of [{lastResult:'ERROR'},{futureRows:1},{configuredAt:'2026-10-08T00:00:00Z'},{configuredAt:'2026-10-11T00:00:00Z'},{configuredAt:'malformed'}]) assert.equal(retentionHealth({...s,...extra}),'NEEDS_ATTENTION');
});

test('retention endpoint authorizes before RPC and fails independently of funnel ingest', async () => {
  class AuthError extends Error {constructor(status){super();this.status=status;this.code='DENIED';}}
  class Reply extends Response {static json(body,options){return new Reply(JSON.stringify(body),options);}}
  let calls=0, failure=false;
  const summary={checkedAt:'2026-10-10T12:00:00Z',configuredAt:'2026-10-10T00:00:00Z',lastRunAt:null,lastResult:'NEVER_RUN',eligibleRows:0,futureRows:0};
  const { GET }=load('src/app/api/operations/retention/route.ts',{
    'next/server':{NextResponse:Reply},'@/lib/acquisition/retention':{retentionHealth},
    '@/lib/operations/server':{OperationsAuthError:AuthError,authorizeOperationsToken:async t=>{if(t!=='admin')throw new AuthError(t?403:401);}},
    '@/lib/acquisition/event-server':{environment:()=> 'production',PRIVATE_HEADERS:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'},eventClient:()=>({rpc:async(name,args)=>{calls++;assert.equal(name,'operational_funnel_retention_summary');assert.equal(args.p_environment,'production');return failure?{error:{message:'secret'}}:{data:summary};}})}
  });
  for (const [token,status] of [[null,401],['user',403]]) assert.equal((await GET(new Request('https://example.test/api/operations/retention',{headers:token?{authorization:`Bearer ${token}`}:{}}))).status,status);
  assert.equal(calls,0);
  const request=new Request('https://example.test/api/operations/retention',{headers:{authorization:'Bearer admin'}});
  const good=await GET(request);assert.equal(good.status,200);assert.equal(good.headers.get('cache-control'),'private, no-store');assert.equal(good.headers.get('x-robots-tag'),'noindex, nofollow');
  assert.equal((await good.json()).status,'PENDING');
  failure=true;const bad=await GET(request);assert.equal(bad.status,503);assert.ok(!(await bad.text()).includes('secret'));
  assert.ok(!read('src/lib/acquisition/event-server.ts').includes('retention'));
  assert.ok(!read('src/app/api/acquisition/events/route.ts').includes('retention'));
});

test('purge has fixed cutoff, no client execution, no definer, key or external scheduler', () => {
  assert.match(sql,/occurred_at < cutoff/);assert.match(sql,/now\(\) - interval '90 days'/);
  assert.ok(!/security definer|net\.http|service_role_key|https:\/\//i.test(sql));
  assert.match(sql,/revoke all on function bm_operations_private\.purge_operational_funnel_events\(\) from public, anon, authenticated, service_role/);
  assert.match(sql,/17 3 \* \* \*/);
  assert.deepEqual([...sql.matchAll(/delete from\s+([a-z_.]+)/gi)].map(x=>x[1]),['public.operational_funnel_events']);
  assert.ok(!/create index/i.test(sql));
  assert.match(read('src/lib/acquisition/event-server.ts'),/1800000/);
});

// Set PGLITE_TEST_MODULE to an externally installed @electric-sql/pglite module.
// No secrets or remote access; actual PostgreSQL function/roles/transactions execute locally.
test('isolated PostgreSQL retention safety', {skip:!process.env.PGLITE_TEST_MODULE && 'Set PGLITE_TEST_MODULE to run isolated PostgreSQL assertions'}, async t => {
  const { PGlite }=require(process.env.PGLITE_TEST_MODULE);
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.business_sentinel(id int primary key, value text); insert into public.business_sentinel values (1,'unchanged');`);
    await db.exec(read('supabase/migrations/20261010123757_first_party_funnel_observability_v1.sql'));
    await db.exec(sql.replace(/-- BEGIN PG_CRON:[\s\S]*?-- END PG_CRON/,''));
    await db.exec(`insert into public.operational_funnel_baselines(environment) values('production'),('preview'),('development');`);
    const insert=(age,actor='REAL',env='production')=>db.query(`insert into public.operational_funnel_events(environment,event_name,actor_class,domain,route_key,dedupe_key,occurred_at) values ($1,'landing_view',$2,'GENERAL','HOME',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),now()+$3::interval)`,[env,actor,age]);
    const count=async()=>Number((await db.query('select count(*) n from public.operational_funnel_events')).rows[0].n);
    const purge=()=>db.exec('select bm_operations_private.purge_operational_funnel_events();');
    await t.test('exact cutoff is retained, older rows of every actor/environment are deleted',async()=>{
      await db.exec('begin'); // now() stable for exact-boundary assertion
      for(const actor of ['REAL','QA','ADMIN','UNKNOWN','ANONYMOUS']) for(const env of ['production','preview','development']) await insert('-91 days',actor,env);
      await insert('-89 days');await insert('-90 days');await insert('-90 days -1 microsecond');await insert('1 day');
      await purge();assert.equal(await count(),3);
      const status=(await db.query('select * from public.operational_funnel_retention_status')).rows[0];assert.equal(status.last_status,'SUCCESS');assert.equal(Number(status.last_deleted_count),16);
      await db.exec('commit');
    });
    await t.test('future retained and malformed/null/infinite timestamps refused',async()=>{
      for(const invalid of ['broken','infinity','-infinity']) await assert.rejects(()=>db.query('update public.operational_funnel_events set occurred_at=$1::timestamptz',[invalid]));
      await assert.rejects(()=>db.exec('update public.operational_funnel_events set occurred_at=null'));
      const s=(await db.query("select public.operational_funnel_retention_summary('production') s")).rows[0].s;assert.equal(s.futureRows,1);
      assert.ok(!/user_id|session_id|entity_id|dedupe_key|last_error_code/.test(JSON.stringify(s)));
    });
    await t.test('business rows and baseline are untouched',async()=>{
      assert.equal((await db.query('select value from public.business_sentinel')).rows[0].value,'unchanged');
      assert.equal((await db.query('select count(*)::int n from public.operational_funnel_baselines')).rows[0].n,3);
    });
    await t.test('zero eligible and repeated purge safe',async()=>{
      await purge();const n=await count();await purge();assert.equal(await count(),n);
      assert.equal(Number((await db.query('select last_deleted_count n from public.operational_funnel_retention_status')).rows[0].n),0);
    });
    await t.test('anon/authenticated/service cannot invoke purge, server can read aggregates only',async()=>{
      for(const role of ['anon','authenticated','service_role']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(purge);
        await assert.rejects(()=>db.exec('delete from public.operational_funnel_events'));
        if(role==='service_role') assert.ok((await db.query("select public.operational_funnel_retention_summary('production') s")).rows[0].s);
        else {await assert.rejects(()=>db.exec('select * from public.operational_funnel_events'));await assert.rejects(()=>db.exec("select public.operational_funnel_retention_summary('production')"));}
        await db.exec('reset role');
      }
    });
    await t.test('failure rolls back delete, stores no raw error, and subsequent ingestion works',async()=>{
      await insert('-100 days');const before=await count();
      await db.exec(`create function public.test_failure() returns trigger language plpgsql as $$ begin raise exception 'private test payload'; end $$;
        create trigger forced_failure before delete on public.operational_funnel_events for each statement execute function public.test_failure();`);
      await purge();assert.equal(await count(),before);
      const state=(await db.query('select last_status,last_error_code from public.operational_funnel_retention_status')).rows[0];assert.equal(state.last_status,'ERROR');assert.equal(state.last_error_code,'P0001');
      await db.exec('set role service_role');await insert('0 days');await db.exec('reset role');assert.equal(await count(),before+1);
      await db.exec('drop trigger forced_failure on public.operational_funnel_events');await purge();assert.equal(await count(),before);
    });
  } finally {await db.close();}
});

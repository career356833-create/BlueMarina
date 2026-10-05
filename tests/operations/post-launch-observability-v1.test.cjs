const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function load(p) { const context = { exports: {}, AbortSignal, URL }; vm.runInNewContext(ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context); return context.exports; }
const m = load('src/lib/operations/summary-model.ts');
const roles = load('src/lib/operations/moderation-access.ts');
const health = load('src/lib/operations/model.ts');
const now = Date.parse('2026-10-05T12:00:00Z');
const owners = new Map([['real', { id: 'real', app_metadata: {} }], ['qa', { id: 'qa', app_metadata: { blue_marina_qa: true } }]]);
const row = (id, owner, status = 'SUBMITTED', marker = '', at = '2026-10-04T12:00:00Z') => ({ id, owner, status, marker, at });

test('operations home allows only exact operations role; domain roles retain moderation access', () => {
  assert.equal(roles.canAccessAdminPath('/admin/operations', { operations_role: 'operations_admin' }), true);
  for (const metadata of [undefined, {}, { operations_role: true }, { charter_role: 'charter_admin' }, { market_role: 'market_admin' }, { community_role: 'community_admin' }]) assert.equal(roles.canAccessAdminPath('/admin/operations', metadata), false);
  assert.equal(roles.canAccessAdminPath('/admin/operations/moderation', { market_role: 'market_admin' }), true);
  assert.equal(roles.canActModeration(roles.moderationRoles({ operations_role: 'operations_admin' }), 'market'), false);
});
test('QA identity and explicit QA record markers are excluded from Real KPI', () => {
  const count = m.split([row('a','real'), row('b','qa'), row('c','real','SUBMITTED','[QA] test')], owners, true);
  assert.equal(count.total, 3); assert.equal(count.qa, 2); assert.equal(count.real, 1);
});
test('unknown/deleted owner or missing Auth cannot be silently counted as real', () => {
  const count = m.split([row('a','unknown'),row('b','qa')], owners, false);
  assert.equal(count.qa, 1); assert.equal(count.real, null); assert.equal(count.unclassified, 1);
});
test('public counts follow actual state and reject unapproved Community active rows', () => {
  const s = m.summarizeQueue([row('a','real','ACTIVE'),row('b','qa','ACTIVE'),row('c','real','HIDDEN'),{...row('d','real','ACTIVE'),publicEligible:false}], owners,true,['SUBMITTED'],['ACTIVE'],now);
  assert.equal(s.public.total,2);assert.equal(s.public.real,1);assert.equal(s.public.qa,1);
});
test('pending age separates oldest overall from oldest real and ignores future timestamps', () => {
  const s=m.summarizeQueue([row('a','qa'),row('b','real','SUBMITTED','','2026-10-05T06:00:00Z'),row('c','real','REJECTED'),row('d','real','SUBMITTED','','2099-01-01')],owners,true,['SUBMITTED'],['ACTIVE'],now);
  assert.equal(s.oldestPendingHours,24);assert.equal(s.oldestRealPendingHours,6);assert.equal(s.latestSubmissionAt,'2026-10-05T06:00:00Z');
});
test('missing tables show UNKNOWN, empty successful table shows genuine zero', () => {
  assert.equal(m.summarizeQueue(null,owners,true,[],[],now).pending,null);
  assert.equal(m.summarizeQueue([],owners,true,[],[],now).pending.total,0);
  assert.equal(m.ageHours('invalid',now),null);assert.equal(m.ageHours('2099-01-01',now),null);
});
test('source semantics preserve PARTIAL, STALE and TIMEOUT without a safety conclusion', () => {
  assert.equal(health.sourceHealth('PARTIAL'),'DEGRADED');assert.equal(health.sourceHealth('TIMEOUT'),'ERROR');assert.equal(health.sourceHealth('STALE'),'DEGRADED');
  const server=read('src/lib/operations/server.ts');assert.match(server,/Navigation aids snapshot/);assert.match(server,/"ROMS"/);
  assert.match(read('src/lib/operations/post-launch-summary.ts'),/CURRENT_STATUS_UNAVAILABLE" \? null/);
});
test('runtime aggregation counts bounded errors and strips PII, query, ids, messages and tokens', () => {
  const result=m.summarizeRuntime([{requestPath:'/api/account/private-user-id?token=SECRET',responseStatusCode:500,level:'error',message:'user@example.com SECRET',timestamp:'2026-10-05T10:00:00Z'},{requestPath:'/unexpected/private-email',responseStatusCode:401}],2);
  assert.equal(result.http5xx,1);assert.equal(result.http4xx,1);assert.equal(result.http401,1);assert.equal(result.errorCount,1);
  assert.equal(result.topFailingRoute,'/api/account/[route]');assert.equal(result.possiblyTruncated,true);assert.equal(result.successfulSessions,null);
  assert.doesNotMatch(JSON.stringify(result),/SECRET|example.com|private-user|private-email|message/);
});
test('unknown routes are collapsed rather than leaking path fragments',()=>{assert.equal(m.routeTemplate('/account/auth/callback?code=secret'),'/account/auth/callback');assert.equal(m.routeTemplate('/hidden/person@email.test'),'OTHER');});
test('data integrity reference values are explicit, timestamped and not per-request scans',()=>{assert.equal(m.DATA_REFERENCE.fishingSpots,1405);assert.equal(m.DATA_REFERENCE.fishSpecies,1258);assert.equal(m.DATA_REFERENCE.marineOrganisms,3016);assert.match(read('src/lib/operations/post-launch-summary.ts'),/AUDITED_REFERENCE_NOT_LIVE_SCAN/);});
test('bounded DB reads contain no mutations and return aggregate-only auth',()=>{
  const source=read('src/lib/operations/business-summary.ts');assert.match(source,/MAX_ROWS = 1000/);assert.match(source,/READ_TIMEOUT_MS = 5000/);assert.match(source,/data.length >= MAX_ROWS/);assert.doesNotMatch(source,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
  assert.match(source,/blue_marina_qa|isQaIdentity/);assert.doesNotMatch(source,/user\.email|user\.user_metadata/);
});
test('private endpoint verifies actor before any read and sends no-store/noindex',()=>{const api=read('src/app/api/operations/health/route.ts');assert.ok(api.indexOf('await authorizeOperationsToken')<api.indexOf('await getOperationsSnapshot'));assert.match(api,/private, no-store/);assert.match(api,/noindex, nofollow/);});
test('control-plane evidence cannot label a different deployment READY',()=>{const source=read('src/lib/operations/post-launch-summary.ts');assert.match(source,/deploymentId === audit\?\.deploymentId/);assert.match(source,/sameDeployment &&.*< 1 \? audit.state : "UNKNOWN"/);assert.match(source,/mainSha && deployedSha \? mainSha === deployedSha : null/);});
test('UI uses shared health summary, manual refresh and existing moderation navigation',()=>{const ui=read('src/app/admin/operations/operations-dashboard.tsx');const panel=read('src/app/admin/operations/post-launch-panels.tsx');assert.match(ui,/PostLaunchPanels/);assert.doesNotMatch(ui,/fetch\("\/api\/operations\/moderation/);assert.doesNotMatch(ui+panel,/setInterval|SUPABASE_SERVICE_ROLE_KEY|user_metadata/);assert.match(panel,/\/admin\/operations\/moderation/);assert.match(panel,/UNKNOWN/);});

test('legacy activation QA markers remain QA even for a real Kakao owner',()=>{for(const marker of ['BLUE_MARINA_CHARTER_E2E_TEST','BLUE_MARINA_MARKET_E2E_TEST','https://blue-marina.vercel.app/blue-marina-e2e-test']){const result=m.split([row('old','real','SUBMITTED',marker)],owners,true);assert.equal(result.qa,1);assert.equal(result.real,0);}});

const production=load('src/lib/operations/production-status.ts');
const sha='a'.repeat(40),host='blue-marina-test.vercel.app';
const statusFetch=(overrides={})=>async url=>({ok:true,json:async()=>url.includes('/statuses')?[{state:'success',environment:'Production',environment_url:'https://'+host,created_at:'2026-10-05T12:00:00Z',...overrides}]:[{id:123,sha,environment:'Production'}]});
test('current Production READY requires both exact SHA and runtime deployment URL',async()=>{const result=await production.readProductionStatus(sha,host,statusFetch());assert.equal(result.state,'READY');assert.equal(result.evidence,'GITHUB_VERCEL_PRODUCTION_SHA_AND_URL_MATCH');});
test('Preview, different host and failed GitHub lookup never become READY',async()=>{for(const change of [{environment:'Preview'},{environment_url:'https://another.vercel.app'},{environment_url:'https://'+host+'/?secret=x'}])assert.equal((await production.readProductionStatus(sha,host,statusFetch(change))).state,'UNKNOWN');assert.equal((await production.readProductionStatus(sha,host,async()=>{throw Error('TIMEOUT')})).state,'UNKNOWN');});
test('missing SHA/host and mismatched deployment SHA stay UNKNOWN without unsafe fetches',async()=>{assert.equal((await production.readProductionStatus(null,host,statusFetch())).state,'UNKNOWN');assert.equal((await production.readProductionStatus(sha,'attacker.example',statusFetch())).state,'UNKNOWN');assert.equal((await production.readProductionStatus(sha,host,async()=>({ok:true,json:async()=>[{id:123,sha:'b'.repeat(40),environment:'Production'}]}))).state,'UNKNOWN');});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function load(p) {
  const absolute = path.resolve(root, p), exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, URL, URLSearchParams, require: name => load(path.resolve(path.dirname(absolute), name + '.ts')) });
  return exports;
}
const contract = load('src/lib/acquisition/contract.ts');
const { buildActivationFunnel, ratio } = load('src/lib/acquisition/funnel.ts');
const { safeAuthReturnTo } = load('src/lib/account/auth-return.ts');
const identities = new Map([
  ['real', { id:'real', app_metadata:{} }], ['other', {id:'other',app_metadata:{}}],
  ['qa', {id:'qa',app_metadata:{blue_marina_qa:true}}],
  ['admin', {id:'admin',app_metadata:{market_role:'market_admin'}}],
]);
const row = (id, owner='real', status='SUBMITTED', extra={}) => ({ id,owner,status,at:'2026-10-04T00:00:00Z',...extra });
const base = () => ({identities,identitiesComplete:true,saved:[],charter:[],market:[],community:[],charterReviews:[],marketReviews:[],communityReviews:[],charterPublic:0});
const review = (target,action='APPROVE') => ({target,action,at:'2026-10-04T01:00:00Z'});

test('first actions deduplicate retained saves and submissions, not logins or drafts', () => {
  const f = buildActivationFunnel({...base(),saved:[row('s'),row('s2')],market:[row('m')],community:[row('d','other','DRAFT')]});
  assert.equal(f.realRegisteredUsers,2); assert.equal(f.firstActions.real,1); assert.equal(f.firstSaved.real,1);
  assert.equal(f.community.submissions.real,0); assert.equal(f.loginToFirstActionPercent,null);
});
test('QA identities, legacy QA records and admin actions stay separate from Real', () => {
  const f=buildActivationFunnel({...base(),market:[row('1'),row('2','qa'),row('3','other','SUBMITTED',{marker:'BLUE_MARINA_MARKET_E2E_TEST'}),row('4','admin')]});
  assert.equal(f.market.submissions.total,4);assert.equal(f.market.submissions.real,1);assert.equal(f.market.submissions.qa,2);assert.equal(f.market.submissions.admin,1);
});
test('a marked test record does not hide the same ordinary owner real action',()=>{
  const f=buildActivationFunnel({...base(),saved:[row('s','real','RECORDED',{marker:'[QA] temporary'})],market:[row('m')]});
  assert.equal(f.firstActions.total,1);assert.equal(f.firstActions.real,1);
});
test('failed reads and unclassified owners yield unknown, never fabricated zero',()=>{
  const f=buildActivationFunnel({...base(),saved:null,market:[row('m','deleted-owner')]});
  assert.equal(f.firstActions,null);assert.equal(f.firstSaved,null);assert.equal(f.market.submissions.real,null);assert.equal(f.market.submissions.unclassified,1);
  assert.equal(buildActivationFunnel({...base(),identitiesComplete:false}).realRegisteredUsers,null);
});
test('approval/rejection use unique review targets and publication uses approved current public stock',()=>{
  const f=buildActivationFunnel({...base(),community:[row('p','real','ACTIVE'),row('hidden','other','HIDDEN'),row('bad','other','ACTIVE',{publicEligible:false})],communityReviews:[review('p'),review('p'),review('hidden'),review('hidden','REJECT'),review('deleted')]});
  assert.equal(f.community.approved.real,2);assert.equal(f.community.rejected.real,1);assert.equal(f.community.published.real,1);
  assert.equal(f.community.submissionToApprovedPercent,66.7);assert.equal(f.community.approvedToCurrentlyPublicPercent,50);
});
test('charter approval is not publication; no denominator produces no rate',()=>{
  const f=buildActivationFunnel({...base(),charter:[row('c','real','APPROVED')],charterReviews:[review('c')]});
  assert.equal(f.charter.approved.real,1);assert.equal(f.charter.published.total,0);assert.equal(f.charter.approvedToCurrentlyPublicPercent,null);
  assert.equal(ratio(0,0),null);assert.equal(ratio(2,1),null);assert.equal(ratio(null,1),null);
});
test('event contract labels unobserved stages and current stock honestly',()=>{
  assert.equal(contract.ACQUISITION_EVENTS.kakao_login_complete,'UNOBSERVED');
  assert.equal(contract.ACQUISITION_EVENTS.public_content_created,'CURRENT_PUBLIC_STOCK_NOT_LIFETIME_EVENT');
  const f=buildActivationFunnel(base());assert.equal(f.visitors,null);assert.equal(f.attribution,'UNKNOWN_NOT_COLLECTED');
  assert.doesNotMatch(JSON.stringify(f),/deleted-owner|BLUE_MARINA_MARKET_E2E_TEST/);
});
test('attribution strips identities, arbitrary campaigns, URLs and hostile referrers',()=>{
  const a=contract.sanitizeAttribution({utm_source:'GOOGLE',utm_medium:'cpc',utm_campaign:'launch-v1',referrer:'https://www.google.com/search?q=private#secret'});
  assert.equal(a.source,'google');assert.equal(a.referrer,'google');assert.doesNotMatch(JSON.stringify(a),/private|secret|search/);
  for(const referrer of ['javascript:alert(1)','https://user:password@google.com','https://google.com.attacker.test','https://constructor/','https://__proto__/','not-a-url']) assert.equal(contract.sanitizeAttribution({referrer}).referrer,'UNKNOWN');
  assert.equal(contract.sanitizeAttribution({utm_campaign:'someone@example.com'}).campaign,'UNKNOWN');
});
test('community context keeps explicit catalog IDs only, never names or array input',()=>{
  const catalog={species:[{id:'species-1'}],fishingSpots:[{id:'rock-151'}]};
  const valid=contract.checkedCreationContext({speciesId:'species-1',spotId:'rock-151'},catalog);
  assert.equal(valid.speciesId,'species-1');assert.equal(valid.spotId,'rock-151');
  const invalid=contract.checkedCreationContext({speciesId:'감성돔',spotId:['rock-151']},catalog);
  assert.equal(invalid.speciesId,null);assert.equal(invalid.spotId,null);
  assert.equal(contract.communityCreationHref(valid),'/community/new?spotId=rock-151&speciesId=species-1');
});
test('login return preserves exact creation and saved content routes without external redirects',()=>{
  for(const target of ['/community/new?spotId=rock-151&speciesId=species-1','/market/new','/charters/onboarding','/fishing-spots/rock-151','/fishing-spots/conditions?speciesId=species-1','/account/saved']) assert.equal(safeAuthReturnTo(target),target);
  for(const target of ['//evil.test','https://evil.test','/\\evil.test','/charters/admin','/market/admin','/account/../market/new','/%2f%2fevil.test','/community/new\n']) assert.equal(safeAuthReturnTo(target),'/account');
});
test('participation and saved CTA require session and retain safe internal return',()=>{
  const link=read('src/components/account/ParticipationLink.tsx'),save=read('src/components/account/AccountSaveButton.tsx');
  assert.match(link,/safeAuthReturnTo\(href\)/);assert.match(link,/auth\.getUser/);assert.match(link,/result\?\.data\.user && !result.error \? target : login/);
  assert.doesNotMatch(link,/auth\.getSession/);assert.match(save,/user.error \|\| !user.data.user \|\| !data.session/);
  assert.match(save,/window\.location\.assign/);assert.match(save,/safeAuthReturnTo\(props.href\)/);
  for(const file of ['src/app/market/page.tsx','src/app/community/page.tsx','src/app/charters/partners/page.tsx']) assert.match(read(file),/ParticipationLink/);
});
test('empty states offer real first participation and keep moderation boundaries',()=>{
  assert.match(read('src/app/market/page.tsx'),/첫 판매글 등록/);assert.match(read('src/app/community/page.tsx'),/첫 글 작성/);
  assert.match(read('src/app/charters/page.tsx'),/출조상품 등록/);
  assert.match(read('src/app/community/new/page.tsx'),/checkedCreationContext/);
  assert.match(read('src/app/fishing-spots/[id]/page.tsx'),/communityCreationHref\(\{\s*spotId:\s*spot.id\s*\}\)/);
});
test('operations acquisition is aggregate-only and server reads remain bounded, read-only',()=>{
  const reader=read('src/lib/operations/business-summary.ts');
  assert.match(reader,/import "server-only"/);assert.match(reader,/data.length >= MAX_ROWS/);assert.match(reader,/buildActivationFunnel/);
  assert.doesNotMatch(reader,/\.insert\(|\.update\(|\.delete\(/);
  assert.match(read('src/app/admin/operations/post-launch-panels.tsx'),/AcquisitionPanel/);
  assert.match(read('src/app/admin/operations/acquisition-panel.tsx'),/UNKNOWN/);
});

function businessReader(tables) {
  const client = {auth:{admin:{listUsers:async()=>({data:{users:[...identities.values()]},error:null})}},
    from:table=>({select:()=>({limit:async()=>({data:tables[table]??[],error:null})})}),
    storage:{listBuckets:async()=>({data:[],error:null})},schema:()=>({from:()=>({select:()=>({eq:async()=>({count:0,error:null})})})})};
  const exports={};
  vm.runInNewContext(ts.transpileModule(read('src/lib/operations/business-summary.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,AbortSignal,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-not-a-key'}},
    require:name=>name==='server-only'?{}:name==='@supabase/supabase-js'?{createClient:()=>client}:name.includes('charters/registry')?{productionCharterDataset:{charters:[]}}:name.includes('summary-model')?load('src/lib/operations/summary-model.ts'):load('src/lib/acquisition/funnel.ts')});
  return exports.collectBusinessSummary;
}
test('server adapter reconciles saved, submissions and POST review facts without exposing identities',async()=>{
  const data=await businessReader({user_saved_items:[{id:'s',user_id:'real',label:'point',created_at:'2026-10-04'}],community_posts:[{id:'p',author_id:'real',title:'experience',status:'ACTIVE',moderation_status:'APPROVED',created_at:'2026-10-04'}],community_moderation_events:[{target_type:'POST',target_id:'p',action:'APPROVE',created_at:'2026-10-04'},{target_type:'REPORT',target_id:'p',action:'REJECT',created_at:'2026-10-04'}]})();
  assert.equal(data.acquisition.firstActions.real,1);assert.equal(data.acquisition.community.approved.real,1);assert.equal(data.acquisition.community.rejected.real,0);
  assert.doesNotMatch(JSON.stringify(data),/fixture-not-a-key|"user_id"|"author_id"|"title"|"app_metadata"/);
});
test('server cap cannot present a truncated table as a complete real funnel',async()=>{
  const data=await businessReader({user_saved_items:Array.from({length:1000},(_,i)=>({id:String(i),user_id:'real'}))})();
  assert.equal(data.acquisition.firstSaved,null);assert.equal(data.acquisition.firstActions,null);assert.ok(data.failures.includes('user_saved_items'));
});

test('CTA runtime validates Auth: revoked sessions go to login, verified users keep exact context',async()=>{
  async function click(result) {
    const exports={},destinations=[];
    const client={auth:{getUser:async()=>{if(result instanceof Error)throw result;return result},getSession:()=>{throw Error('cached session must not decide routing')}}};
    vm.runInNewContext(ts.transpileModule(read('src/components/account/ParticipationLink.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{
      if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props})};
      if(name==='react')return{useState:()=>[false,()=>{}]};
      if(name==='next/navigation')return{useRouter:()=>({push:href=>destinations.push(href)})};
      if(name==='next/link')return{default:()=>null};
      if(name.includes('supabase/client'))return{createClient:()=>client};
      if(name.includes('auth-return'))return{safeAuthReturnTo};
      throw Error(name);
    }});
    const element=exports.ParticipationLink({href:'/community/new?spotId=rock-151',children:'Write'});
    await element.props.onClick({preventDefault(){}});return destinations[0];
  }
  assert.equal(await click({data:{user:{id:'fixture'}},error:null}),'/community/new?spotId=rock-151');
  const login='/account/login?returnTo=%2Fcommunity%2Fnew%3FspotId%3Drock-151';
  assert.equal(await click({data:{user:null},error:{code:'session_expired'}}),login);
  assert.equal(await click(new Error('unavailable')),login);
});

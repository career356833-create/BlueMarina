const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/lib/operations/public-route-probe.ts'), 'utf8');
const server = fs.readFileSync(path.join(root, 'src/lib/operations/server.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: exportsObject, URL, Set, fetch });
const { productionProbeOrigin, probePublicRoute } = exportsObject;
const origin = 'https://blue-marina.vercel.app';
const reply = (status, location) => new Response(null, { status, headers: location ? { location } : {} });

test('production probe uses only a configured HTTPS public origin', () => {
  assert.equal(productionProbeOrigin(`${origin}/`), origin);
  for (const invalid of [undefined, 'http://blue-marina.vercel.app', 'https://user:pass@blue-marina.vercel.app', `${origin}/private`, `${origin}/?token=x`]) {
    assert.equal(productionProbeOrigin(invalid), null);
  }
  assert.match(server, /VERCEL_ENV === "production"\) return productionProbeOrigin\(process\.env\.NEXT_PUBLIC_SITE_URL\)/);
});

test('direct 2xx and a single same-origin canonical redirect are healthy', async () => {
  const direct = await probePublicRoute(origin, '/sea', async () => reply(200));
  assert.equal(direct.status, 'HEALTHY');
  assert.equal(direct.redirectCount, 0);
  const redirected = await probePublicRoute(origin, '/sea', async (url) => url.pathname === '/sea' ? reply(308, '/sea/') : reply(200));
  assert.equal(redirected.status, 'HEALTHY');
  assert.equal(redirected.httpStatus, 200);
  assert.equal(redirected.redirectCount, 1);
  assert.equal(redirected.finalUrl, `${origin}/sea/`);
});

test('unexpected internal redirects degrade; auth redirects and off-origin redirects fail closed', async () => {
  const internal = await probePublicRoute(origin, '/sea', async (url) => url.pathname === '/sea' ? reply(302, '/today-sea') : reply(200));
  assert.equal(internal.status, 'DEGRADED');
  const auth = await probePublicRoute(origin, '/sea', async () => reply(302, '/account/login?next=%2Fsea'));
  assert.equal(auth.status, 'ERROR');
  const external = await probePublicRoute(origin, '/sea', async () => reply(302, 'https://vercel.com/sso-api?nonce=secret'));
  assert.equal(external.status, 'ERROR');
  assert.equal(external.finalUrl, 'https://vercel.com/sso-api');
  assert.doesNotMatch(external.finalUrl, /nonce|secret/);
});

test('redirect loops, excessive chains, final failures and timeouts remain errors', async () => {
  const loop = await probePublicRoute(origin, '/sea', async () => reply(302, '/sea'));
  assert.equal(loop.status, 'ERROR');
  assert.match(loop.reason, /loop/i);
  const longChain = await probePublicRoute(origin, '/sea', async (url) => reply(302, `/sea?step=${Number(url.searchParams.get('step') ?? 0) + 1}`));
  assert.equal(longChain.status, 'ERROR');
  assert.match(longChain.reason, /limit/i);
  const failed = await probePublicRoute(origin, '/sea', async () => reply(503));
  assert.equal(failed.status, 'ERROR');
  assert.equal(failed.httpStatus, 503);
  const timeout = await probePublicRoute(origin, '/sea', async () => { throw new Error('timeout'); });
  assert.equal(timeout.status, 'ERROR');
});

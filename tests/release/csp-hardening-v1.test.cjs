const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function config(mode = 'production') {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'next.config.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('module', 'exports', 'process', code)(module, module.exports, { env: { NODE_ENV: mode } });
  return module.exports.default;
}
async function directives() {
  const global = (await config().headers()).find(row => row.source === '/:path*');
  const header = global.headers.find(h => h.key === 'Content-Security-Policy');
  assert.ok(header);
  return Object.fromEntries(header.value.split('; ').map(part => { const [name, ...values] = part.split(' '); return [name, values]; }));
}

test('enforced production CSP restricts defaults objects forms bases and embedding', async () => {
  const d = await directives();
  for (const name of ['default-src', 'base-uri', 'form-action', 'frame-ancestors', 'manifest-src']) assert.deepEqual(d[name], ["'self'"]);
  assert.deepEqual(d['object-src'], ["'none'"]);
  assert.deepEqual(d['frame-src'], ["'none'"]);
});

test('Kakao origins are allowed only in observed script and image destinations', async () => {
  const d = await directives();
  assert.deepEqual(d['script-src'], ["'self'", "'unsafe-inline'", 'https://dapi.kakao.com', 'https://t1.daumcdn.net']);
  assert.deepEqual(d['img-src'], ["'self'", 'data:', 'blob:', 'https://t1.daumcdn.net', 'https://mts.daumcdn.net']);
});

test('MapLibre uses its local worker and explicit OSM fetch origin', async () => {
  const d = await directives();
  assert.deepEqual(d['worker-src'], ["'self'"]);
  assert.deepEqual(d['connect-src'], ["'self'", 'https://tile.openstreetmap.org']);
  const source = fs.readFileSync(path.join(root, 'src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts'), 'utf8');
  assert.match(source, /setWorkerUrl\("\/maplibre\/maplibre-gl-worker.mjs"\)/);
});

test('no wildcard global scheme eval or speculative Supabase origin is allowed', async () => {
  const d = await directives();
  for (const values of Object.values(d)) for (const value of values) {
    assert.ok(!value.includes('*'));
    assert.ok(!['https:', 'http:', "'unsafe-eval'", "'wasm-unsafe-eval'"].includes(value));
    assert.ok(!value.includes('supabase'));
  }
  assert.deepEqual(d['media-src'], ["'self'"]);
  assert.deepEqual(d['font-src'], ["'self'"]);
});

test('existing security headers and API noindex remain intact', async () => {
  const rows = await config().headers();
  const headers = Object.fromEntries(rows.find(r => r.source === '/:path*').headers.map(h => [h.key, h.value]));
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), payment=(), usb=()');
  assert.ok(rows.find(r => r.source === '/api/:path*').headers.some(h => h.key === 'X-Robots-Tag' && h.value === 'noindex, nofollow'));
});

test('development does not require weakening production with unsafe-eval', async () => {
  const rows = await config('development').headers();
  assert.ok(rows.every(r => r.headers.every(h => !h.key.startsWith('Content-Security-Policy'))));
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadAuthReturn() {
  const source = read("src/lib/account/auth-return.ts");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(javascript, { module, exports: module.exports, URL });
  return module.exports.safeAuthReturnTo;
}

test("auth return targets stay on the explicit internal allowlist", () => {
  const safeAuthReturnTo = loadAuthReturn();
  assert.equal(safeAuthReturnTo("/account/profile?section=saved"), "/account/profile?section=saved");
  assert.equal(safeAuthReturnTo("/account/saved"), "/account/saved");
  for (const input of [null, "https://example.com", "//example.com", "/\\example.com", "/admin/operations", "/account/../market/new", "/account/%2F%2Fexample.com"]) {
    assert.equal(safeAuthReturnTo(input), "/account", String(input));
  }
});

test("the account login page supports signup, login, and confirmation without credential logging", () => {
  const page = read("src/app/account/login/page.tsx");
  assert.match(page, /client\.auth\.signUp\(/);
  assert.match(page, /client\.auth\.signInWithPassword\(/);
  assert.match(page, /mode === "signup" \? "login" : "signup"/);
  assert.match(page, /emailRedirectTo: `\$\{window\.location\.origin\}\/account\/login`/);
  assert.match(page, /if \(!result\.session\)/);
  assert.match(page, /safeAuthReturnTo\(/);
  assert.doesNotMatch(page, /console\.(?:log|info|warn|error)|SUPABASE_SERVICE_ROLE_KEY/);
});

test("all account API responses carry private no-store and noindex headers", () => {
  const api = read("src/app/api/account/route.ts");
  assert.match(api, /"Cache-Control": "private, no-store"/);
  assert.match(api, /"X-Robots-Tag": "noindex, nofollow"/);
  assert.equal((api.match(/headers: privateHeaders/g) ?? []).length, 6);
  assert.match(api, /export const dynamic = "force-dynamic"/);
});

test("the browser only receives public Supabase configuration and server revalidates tokens", () => {
  const browser = read("src/lib/supabase/client.ts");
  const account = read("src/app/account/account-client.tsx");
  const server = read("src/lib/account/server.ts");
  assert.match(browser, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(browser + account, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(server, /auth\.getUser\(token\)/);
  assert.match(server, /MARKET_BACKEND_ENABLED === "true"/);
  assert.match(account, /TOKEN_REFRESHED/);
});

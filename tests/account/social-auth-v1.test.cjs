const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadSocialAuth() {
  const source = read("src/lib/account/social-auth.ts");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(javascript, {
    module,
    exports: module.exports,
    require(request) {
      assert.equal(request, "./auth-return");
      const authReturn = read("src/lib/account/auth-return.ts");
      const compiled = ts.transpileModule(authReturn, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      const dependent = { exports: {} };
      vm.runInNewContext(compiled, { module: dependent, exports: dependent.exports, URL });
      return dependent.exports;
    },
  });
  return module.exports;
}

test("OAuth return targets use the established internal allowlist", () => {
  const { socialAuthReturnTo } = loadSocialAuth();
  assert.equal(socialAuthReturnTo("/market/new?draft=1"), "/market/new?draft=1");
  assert.equal(socialAuthReturnTo("/charters/onboarding"), "/charters/onboarding");
  for (const target of ["https://example.com", "//example.com", "/admin/operations", "/account/../market/new", "/\\example.com"]) {
    assert.equal(socialAuthReturnTo(target), "/account", target);
  }
});

test("provider labels disclose only the sign-in method", () => {
  const { socialProviderLabel } = loadSocialAuth();
  assert.equal(socialProviderLabel("kakao"), "Kakao");
  assert.equal(socialProviderLabel("google"), "Google");
  assert.equal(socialProviderLabel("email"), "Email");
  assert.equal(socialProviderLabel(null), "Email");
  assert.equal(socialProviderLabel({ access_token: "secret" }), "기타");
});

test("OAuth uses an exact same-origin callback and exchanges the PKCE code once", () => {
  const login = read("src/app/account/login/page.tsx");
  const callback = read("src/app/account/auth/callback/route.ts");
  const complete = read("src/app/account/auth/complete/page.tsx");
  const helper = read("src/lib/account/social-auth.ts");
  assert.match(login, /client\.auth\.signInWithOAuth\(/);
  assert.match(login, /provider: "kakao" \| "google"/);
  assert.match(login, /window\.location\.origin\}\$\{SOCIAL_AUTH_CALLBACK_PATH\}/);
  assert.match(callback, /auth\.exchangeCodeForSession\(code\)/);
  assert.match(callback, /request\.nextUrl\.clone\(\)/);
  assert.match(callback, /"Cache-Control": "private, no-store"/);
  assert.match(callback, /"X-Robots-Tag": "noindex, nofollow"/);
  assert.match(complete, /window\.location\.replace\(returnTo\)/);
  assert.match(complete, /socialAuthReturnTo\(window\.sessionStorage\.getItem/);
  assert.match(helper, /\/account\/auth\/callback/);
  assert.doesNotMatch(login + callback + complete, /console\.(?:log|info|warn|error)|SUPABASE_SERVICE_ROLE_KEY|localStorage/);
});

test("email login remains available and Account backend stays fail-closed", () => {
  const login = read("src/app/account/login/page.tsx");
  const server = read("src/lib/account/server.ts");
  assert.match(login, /auth\.signInWithPassword/);
  assert.match(login, /auth\.signUp/);
  assert.match(login, /NEXT_PUBLIC_KAKAO_OAUTH_ENABLED === "true"/);
  assert.match(login, /disabled=\{pending \|\| !kakaoReady\}/);
  assert.match(server, /ACCOUNT_BACKEND_ENABLED === "true"/);
  assert.match(server, /auth\.getUser\(token\)/);
});

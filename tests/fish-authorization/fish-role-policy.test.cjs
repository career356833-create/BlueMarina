const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const Module = require("node:module");

const root = path.resolve(__dirname, "../..");
const cache = new Map();
function loadTs(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;
  const output = ts.transpileModule(fs.readFileSync(absolutePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = new Module(absolutePath, module); cache.set(absolutePath, mod); mod.filename = absolutePath; mod.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  const baseRequire = mod.require.bind(mod);
  mod.require = (request) => request.startsWith(".") ? loadTs(path.relative(root, `${path.resolve(path.dirname(absolutePath), request)}.ts`)) : baseRequire(request);
  mod._compile(output, absolutePath); return mod.exports;
}
const policy = loadTs("src/domain/fish-authorization/drafts/fish-role-policy.ts");

function request(overrides = {}) { return { targetUserId: "user-2", role: "fish_reviewer", reason: "Approved review duty", requestedBy: "admin-1", approvalReference: "OPS-42", idempotencyKey: "key-1", ...overrides }; }
function context(overrides = {}) { return { action: "grant", request: request(), issuer: { userId: "admin-1", role: "fish_admin" }, targetCurrentRole: null, activeAdminCount: 2, ...overrides }; }

test("blocks non-admin issuer and self elevation", () => {
  assert.equal(policy.evaluateFishRoleChange(context({ issuer: { userId: "reviewer-1", role: "fish_reviewer" } })).blockReason, "issuer_not_authorized");
  assert.equal(policy.evaluateFishRoleChange(context({ request: request({ targetUserId: "admin-1", role: "fish_admin" }) })).blockReason, "self_escalation");
});
test("protects the final administrator and requires an auditable reason", () => {
  assert.equal(policy.evaluateFishRoleChange(context({ action: "revoke", targetCurrentRole: "fish_admin", activeAdminCount: 1 })).blockReason, "last_admin_protected");
  assert.equal(policy.evaluateFishRoleChange(context({ request: request({ reason: " " }) })).blockReason, "missing_reason");
});
test("models reviewer, crawler, and location access with least privilege", () => {
  assert.equal(policy.FISH_ROLE_PERMISSION_MATRIX.fish_reviewer.expert_confirmation, "allow");
  assert.equal(policy.FISH_ROLE_PERMISSION_MATRIX.fish_reviewer.private_location_read, "deny");
  assert.equal(policy.FISH_ROLE_PERMISSION_MATRIX.fish_crawler.user_photo_original_read, "deny");
  assert.equal(policy.FISH_ROLE_PERMISSION_MATRIX.fish_crawler.crawler_source_write, "service_only");
});

module.exports = policy;

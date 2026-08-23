const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const root = path.resolve(__dirname, "../..");
const contract = fs.readFileSync(path.join(root, "src/domain/fish-authorization/drafts/fish-role-change-contract.ts"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/drafts/202608030004_fish_role_helpers_and_audit.sql"), "utf8");
const absolutePolicy = path.join(root, "src/domain/fish-authorization/drafts/fish-role-policy.ts");
const absoluteRole = path.join(root, "src/domain/fish-authorization/drafts/fish-role.ts");
const output = ts.transpileModule(fs.readFileSync(absolutePolicy, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const roleOutput = ts.transpileModule(fs.readFileSync(absoluteRole, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const roleModule = new Module(absoluteRole, module);
roleModule.filename = absoluteRole;
roleModule._compile(roleOutput, absoluteRole);
const policyModule = new Module(absolutePolicy, module);
policyModule.filename = absolutePolicy;
const originalRequire = policyModule.require.bind(policyModule);
policyModule.require = (request) => request === "./fish-role" ? roleModule.exports : originalRequire(request);
policyModule._compile(output, absolutePolicy);
const policy = policyModule.exports;

test("requires approval, reason, and idempotency on each role change", () => {
  for (const field of ["reason", "approvalReference", "idempotencyKey", "requestedBy", "targetUserId"]) assert.match(contract, new RegExp(`\\b${field}\\b`));
});

test("draft helper functions are JWT-only and audit logs are append-only", () => {
  assert.match(sql, /auth\.jwt\(\)\s*->\s*'app_metadata'/);
  assert.match(sql, /No INSERT\/UPDATE\/DELETE policy/);
  assert.doesNotMatch(sql, /user_metadata/);
});

test("identical idempotency returns a no-write result and a conflicting request is blocked", () => {
  const request = { targetUserId: "user-2", role: "fish_reviewer", reason: "approved", requestedBy: "admin-1", approvalReference: "OPS-1", idempotencyKey: "same-key" };
  const applied = policy.evaluateFishRoleChange({ action: "grant", request, issuer: { userId: "admin-1", role: "fish_admin" }, targetCurrentRole: null, activeAdminCount: 2 });
  const fingerprint = policy.fingerprintFishRoleChange("grant", request);
  const repeated = policy.evaluateFishRoleChange({ action: "grant", request, issuer: { userId: "admin-1", role: "fish_admin" }, targetCurrentRole: null, activeAdminCount: 2, existingIdempotency: { requestFingerprint: fingerprint, result: applied } });
  assert.equal(repeated.status, "idempotent");
  const conflict = policy.evaluateFishRoleChange({ action: "grant", request: { ...request, role: "fish_crawler" }, issuer: { userId: "admin-1", role: "fish_admin" }, targetCurrentRole: null, activeAdminCount: 2, existingIdempotency: { requestFingerprint: fingerprint, result: applied } });
  assert.equal(conflict.blockReason, "idempotency_conflict");
});

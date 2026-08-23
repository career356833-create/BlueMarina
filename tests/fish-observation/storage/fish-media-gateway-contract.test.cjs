const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const Module = require("node:module");
const root = path.resolve(__dirname, "../../..");
const file = path.join(root, "src/domain/fish-observation/storage/drafts/fish-media-gateway-contract.ts");
const out = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = new Module(file, module); mod.filename = file; mod._compile(out, file); const gateway = mod.exports;

test("blocks another user's observation and pending deletion", () => {
  assert.equal(gateway.authorizeObservationMediaRequest("user-2", { observationOwnerUserId: "user-1", observationDeletionStatus: "active", mediaState: "ready_private" }), "OBSERVATION_NOT_OWNED");
  assert.equal(gateway.authorizeObservationMediaRequest("user-1", { observationOwnerUserId: "user-1", observationDeletionStatus: "active", mediaState: "delete_pending" }), "MEDIA_DELETE_PENDING");
});

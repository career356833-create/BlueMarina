const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const Module = require("node:module");
const root = path.resolve(__dirname, "../../..");
const file = path.join(root, "src/domain/fish-observation/storage/drafts/fish-media-cleanup-contract.ts");
const out = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const mod = new Module(file, module); mod.filename = file; mod._compile(out, file); const cleanup = mod.exports;

test("defers TTL while processing and makes failed delete retryable", () => {
  assert.equal(cleanup.shouldDeferOriginalTtl({ uploadedAt: "2026-08-01T00:00:00.000Z", now: "2026-08-03T00:00:00.000Z", processing: true, legalHold: false }), true);
  assert.equal(cleanup.nextCleanupStatus({ storageDeleteSucceeded: false, attemptCount: 1, maxAttempts: 3 }), "retry_scheduled");
  assert.equal(cleanup.nextCleanupStatus({ storageDeleteSucceeded: false, attemptCount: 3, maxAttempts: 3 }), "manual_review");
});

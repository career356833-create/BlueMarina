const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const Module = require("node:module");
const root = path.resolve(__dirname, "../../..");
function load(relative) { const file = path.join(root, relative); const out = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const mod = new Module(file, module); mod.filename = file; mod._compile(out, file); return mod.exports; }
const states = load("src/domain/fish-observation/storage/drafts/fish-media-state-machine.ts");

test("blocks AI before verification and public output until all gates pass", () => {
  assert.equal(states.canRequestAiIdentification("uploaded_unverified"), false);
  assert.equal(states.canRequestAiIdentification("ready_for_ai"), true);
  assert.equal(states.canPublishPublicDerivative({ state: "public_review_pending", exifRemoved: true, reviewApproved: true, observationPublic: true, publicConsent: true }), true);
  assert.equal(states.canPublishPublicDerivative({ state: "public_review_pending", exifRemoved: false, reviewApproved: true, observationPublic: true, publicConsent: true }), false);
});
test("allows deletion but rejects illegal transition from deleted", () => {
  assert.equal(states.canTransitionFishMediaState("ready_private", "delete_pending"), true);
  assert.equal(states.canTransitionFishMediaState("deleted", "ready_private"), false);
});
test("expired uploads cannot request AI or publish", () => {
  assert.equal(states.canTransitionFishMediaState("upload_url_issued", "expired"), true);
  assert.equal(states.canRequestAiIdentification("expired"), false);
  assert.equal(states.canPublishPublicDerivative({ state: "expired", exifRemoved: true, reviewApproved: true, observationPublic: true, publicConsent: true }), false);
});

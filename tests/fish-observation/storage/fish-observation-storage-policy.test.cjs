const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const Module = require("node:module");

const root = path.resolve(__dirname, "../../..");

function loadTs(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  const output = ts.transpileModule(fs.readFileSync(absolutePath, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = new Module(absolutePath, module);
  mod.filename = absolutePath;
  mod.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  mod._compile(output, absolutePath);
  return mod.exports;
}

const policy = loadTs("src/domain/fish-observation/storage/drafts/fish-observation-media-policy.ts");

function paths() {
  return policy.buildFishObservationStoragePaths({
    userId: "user-uuid", observationId: "observation-uuid", mediaId: "media-uuid", extension: "jpg", variantType: "upload_original",
  });
}

test("keeps storage paths owner-scoped and free of display data", () => {
  const result = paths();
  assert.equal(result.originalsPath, "user-uuid/observation-uuid/original/media-uuid.jpg");
  assert.equal(policy.isFishObservationPathOwnedByUser(result.thumbnailPath, "user-uuid"), true);
  assert.equal(policy.isFishObservationPathOwnedByUser(result.thumbnailPath, "other-user"), false);
});

test("sets short signed URL policy and disabled-by-default training consent", () => {
  assert.equal(policy.FISH_OBSERVATION_MEDIA_POLICY.signedUploadTtlSeconds, 600);
  assert.equal(policy.FISH_OBSERVATION_MEDIA_POLICY.originalReadSignedUrlTtlSeconds, 60);
  assert.equal(policy.FISH_OBSERVATION_MEDIA_POLICY.trainingEligibleDefault, false);
  assert.equal(policy.FISH_OBSERVATION_MEDIA_POLICY.retainOriginalExif, false);
});

test("limits duplicate hash reuse to the same user and strips EXIF from retained media", () => {
  assert.equal(policy.FISH_OBSERVATION_MEDIA_POLICY.dedupeScope, "same_user_only");
  assert.equal(policy.FISH_OBSERVATION_MEDIA_POLICY.retainOriginalExif, false);
  assert.equal(policy.FISH_OBSERVATION_MEDIA_POLICY.temporaryOriginalTtlHours, 24);
});

test("rejects MIME spoofing, oversized files, and animation", () => {
  const result = policy.validateFishObservationUploadFile({
    declaredMimeType: "image/jpeg", detectedMimeType: "image/png", byteSize: 21 * 1024 * 1024, width: 1000, height: 1000, frameCount: 2,
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reasons.includes("mime_mismatch"), true);
  assert.equal(result.reasons.includes("file_too_large"), true);
  assert.equal(result.reasons.includes("animated_image_not_allowed"), true);
});

test("builds deletion work that revokes public output and removes derived data", () => {
  const plan = policy.buildFishObservationMediaDeletionPlan("media-uuid", paths());
  assert.equal(plan.revokePublicDerivatives, true);
  assert.equal(plan.removeEmbeddings, true);
  assert.equal(plan.cancelPendingIdentification, true);
  assert.equal(plan.storagePathsToHardDeleteAfterRetention.includes(paths().originalsPath), true);
});

test("storage SQL keeps all private media access behind the gateway", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/drafts/202608030003_fish_observation_storage_policy.sql"), "utf8");
  assert.match(sql, /fish-observation-originals', 'fish-observation-originals', false/);
  assert.match(sql, /fish-observation-processed', 'fish-observation-processed', false/);
  assert.match(sql, /fish-observation-public', 'fish-observation-public', true/);
  assert.equal(/create policy/i.test(sql), false);
  assert.match(sql, /no authenticated policy/i);
  assert.match(sql, /server-side media\s+-- gateway/i);
});

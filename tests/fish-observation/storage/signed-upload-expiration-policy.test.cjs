const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createFixture } = require("./application/test-helpers.cjs");

const root = path.resolve(__dirname, "../../..");

test("gateway advertises ten minutes without persisting a signed URL", async () => {
  const fixture = createFixture();
  const result = await fixture.service.createObservationUpload({
    actorUserId: "user-1",
    actorRole: "user",
    observationId: "obs-1",
    expectedMimeType: "image/jpeg",
    expectedByteSize: 1000,
    purpose: "user_original_upload",
    idempotencyKey: "signed-upload-expiration-1",
  });

  assert.equal(result.expiresAt, "2026-08-03T00:10:00.000Z");
  const persisted = fixture.repository.idempotency.get("signed-upload-expiration-1");
  assert.equal("signedUploadUrl" in persisted.result, false);
  assert.equal("expiresAt" in persisted.result, false);
  assert.equal(JSON.stringify(fixture.auditLog.events).includes("fake://"), false);
  const session = await fixture.repository.findUploadSessionByMediaId(result.mediaId);
  assert.equal(session.gatewayExpiresAt, "2026-08-03T00:10:00.000Z");
  assert.equal(session.providerExpiresAt, "2026-08-03T02:00:00.000Z");
  assert.equal(session.providerExpiresAt > session.gatewayExpiresAt, true);
});

test("Supabase signed upload adapter cannot forward the ten-minute expiration", () => {
  const provider = fs.readFileSync(path.join(root, "src/infrastructure/fish-observation/supabase/supabase-fish-storage-provider.ts"), "utf8");
  const transport = fs.readFileSync(path.join(root, "src/infrastructure/fish-observation/supabase/supabase-js-fish-storage-transport.ts"), "utf8");

  assert.match(provider, /SUPABASE_SIGNED_UPLOAD_PROVIDER_TTL_SECONDS = 7200/);
  assert.match(provider, /createSignedUploadUrl\(i\.bucket, i\.storagePath, SUPABASE_SIGNED_UPLOAD_PROVIDER_TTL_SECONDS\)/);
  assert.match(transport, /void expiresIn/);
  assert.match(transport, /createSignedUploadUrl\(path, \{ upsert: false \}\)/);
  assert.doesNotMatch(transport, /createSignedUploadUrl\(path,\s*expiresIn/);
});

test("live adapter persists both expirations but never a signed URL", () => {
  const repository = fs.readFileSync(path.join(root, "src/infrastructure/fish-observation/supabase/supabase-fish-media-repository.ts"), "utf8");
  const schema = fs.readFileSync(path.join(root, "supabase/migrations/drafts/staging-ready/002_fish_observation_regulation_media.sql"), "utf8");

  assert.match(schema, /create table public\.fish_media_upload_sessions[\s\S]*expires_at timestamptz not null/i);
  assert.match(repository, /gateway_expires_at: session\.gatewayExpiresAt/);
  assert.match(repository, /provider_expires_at: session\.providerExpiresAt/);
  assert.doesNotMatch(repository, /signedUploadUrl|signed_upload_url/);
});

test("database hotfix is limited to upload-session expiration metadata", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/drafts/staging-hotfix/20260818_fish_media_upload_expiration.sql"), "utf8");
  assert.match(sql, /gateway_expires_at timestamptz/);
  assert.match(sql, /provider_expires_at timestamptz/);
  assert.match(sql, /'expired'/);
  assert.match(sql, /gateway_expires_at <= provider_expires_at/);
  assert.doesNotMatch(sql, /storage\.(?:buckets|objects)/i);
  assert.doesNotMatch(sql, /signed[_ ]?url/i);
});

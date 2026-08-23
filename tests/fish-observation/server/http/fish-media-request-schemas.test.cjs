const test = require("node:test");
const { assert, loadTs } = require("./test-helpers.cjs");

const schemas = loadTs("src/server/fish-observation/media/http/fish-media-request-schemas.ts");

test("strict upload schema rejects unknown fields and oversized files", () => {
  assert.equal(schemas.uploadBody.safeParse({ mimeType: "image/jpeg", byteSize: 1, purpose: "user_original_upload", actorUserId: "x" }).success, false);
  assert.equal(schemas.uploadBody.safeParse({ mimeType: "image/jpeg", byteSize: 15 * 1024 * 1024 + 1, purpose: "user_original_upload" }).success, false);
});

test("finalize schema validates checksum shape and strict metadata", () => {
  assert.equal(schemas.finalizeBody.safeParse({ uploadedObjectMetadata: { byteSize: 1, mimeType: "image/jpeg", checksum: "g" } }).success, false);
  assert.equal(schemas.finalizeBody.safeParse({ uploadedObjectMetadata: { byteSize: 1, mimeType: "image/jpeg" } }).success, true);
});

test("idempotency key policy accepts bounded tokens only", () => {
  assert.equal(schemas.idempotencyKey.safeParse("abc").success, false);
  assert.equal(schemas.idempotencyKey.safeParse("abcd1234").success, true);
});

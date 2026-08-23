const test = require("node:test");
const { assert, loadTs, createFakeContext } = require("./test-helpers.cjs");

const { createUploadRequestHandler, createFinalizeHandler, createDeleteHandler, createPublishHandler } = loadTs("src/server/fish-observation/media/http/index.ts");

const uploadReq = {
  method: "POST",
  origin: "https://app.test",
  headers: { "idempotency-key": "abcd1234" },
  pathParams: {
    observationId: "550e8400-e29b-41d4-a716-446655440000",
    mediaId: "550e8400-e29b-41d4-a716-446655440001",
  },
  body: { mimeType: "image/jpeg", byteSize: 1024, purpose: "user_original_upload" },
};

test("feature flag false returns 503 and skips auth and gateway", async () => {
  const { ctx, calls } = createFakeContext({ enabled: false, auth: { authenticate: async () => { calls.auth += 1; return null; } } });
  const res = await createUploadRequestHandler(ctx, uploadReq);
  assert.equal(res.status, 503);
  assert.equal(calls.auth, 0);
  assert.equal(calls.upload, 0);
});

test("rejects wrong method and missing origin", async () => {
  const { ctx } = createFakeContext();
  const wrongMethod = await createUploadRequestHandler(ctx, { ...uploadReq, method: "GET" });
  assert.equal(wrongMethod.status, 405);
  const missingOrigin = await createUploadRequestHandler(ctx, { ...uploadReq, origin: null });
  assert.equal(missingOrigin.status, 403);
});

test("rejects unauthenticated and unknown body fields", async () => {
  const { ctx } = createFakeContext({ auth: { authenticate: async () => null } });
  const unauth = await createUploadRequestHandler(ctx, uploadReq);
  assert.equal(unauth.status, 401);

  const strictCtx = createFakeContext();
  const strict = await createUploadRequestHandler(strictCtx.ctx, { ...uploadReq, body: { ...uploadReq.body, actorUserId: "user-2" } });
  assert.equal(strict.status, 400);
  assert.match(JSON.stringify(strict.body), /VALIDATION_ERROR/);
});

test("validates idempotency key and rate limits", async () => {
  const { ctx } = createFakeContext({ limiter: { consume: async () => ({ allowed: false, retryAfterSeconds: 12 }) } });
  const invalidKey = await createUploadRequestHandler(ctx, { ...uploadReq, headers: { "idempotency-key": "abc" } });
  assert.equal(invalidKey.status, 400);
  const limited = await createUploadRequestHandler(ctx, uploadReq);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers?.["Retry-After"], "12");
});

test("upload passes mapped gateway input and returns signed URL only on success", async () => {
  const { ctx, calls } = createFakeContext();
  const res = await createUploadRequestHandler(ctx, uploadReq);
  assert.equal(res.status, 200);
  assert.equal(calls.upload, 1);
  assert.equal(calls.auth, 1);
  assert.equal(calls.limiter, 1);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.kind, "upload");
  assert.equal(res.body.data.input.expectedMimeType, "image/jpeg");
  assert.equal(res.body.data.input.expectedByteSize, 1024);
  assert.equal(res.body.data.input.purpose, "user_original_upload");
});

test("finalize maps metadata and sanitizes errors", async () => {
  const { ctx } = createFakeContext({
    gateway: {
      createObservationUpload: async () => ({}),
      finalizeObservationUpload: async () => { throw new Error("SOME_INTERNAL_STACK"); },
      requestMediaDeletion: async (input) => ({ kind: "delete", input }),
      publishObservationMedia: async (input) => ({ kind: "publish", input }),
    },
  });
  const res = await createFinalizeHandler(ctx, {
    method: "POST",
    origin: "https://app.test",
    headers: { "idempotency-key": "abcd1234" },
    pathParams: {
      observationId: "550e8400-e29b-41d4-a716-446655440000",
      mediaId: "550e8400-e29b-41d4-a716-446655440001",
    },
    body: { uploadedObjectMetadata: { byteSize: 1024, mimeType: "image/jpeg", checksum: "a".repeat(64) } },
  });
  assert.equal(res.status, 500);
  assert.equal(JSON.stringify(res.body).includes("SOME_INTERNAL_STACK"), false);
});

test("delete returns 202 and publish is role guarded", async () => {
  const { ctx } = createFakeContext();
  const del = await createDeleteHandler(ctx, {
    method: "DELETE",
    origin: "https://app.test",
    headers: { "idempotency-key": "abcd1234" },
    pathParams: {
      observationId: "550e8400-e29b-41d4-a716-446655440000",
      mediaId: "550e8400-e29b-41d4-a716-446655440001",
    },
    body: { reasonCode: "user_request" },
  });
  assert.equal(del.status, 202);
  assert.equal(del.body.data.input.purpose, "delete_media");

  const deleteDenied = await createDeleteHandler(
    {
      ...ctx,
      auth: { authenticate: async () => ({ actorUserId: "user-2", authRole: "user", fishRole: "user", requestId: "req-1" }) },
      gateway: {
        ...ctx.gateway,
        requestMediaDeletion: async () => {
          throw new Error("OBSERVATION_NOT_OWNED");
        },
      },
    },
    {
      method: "DELETE",
      origin: "https://app.test",
      headers: { "idempotency-key": "abcd1234" },
      pathParams: {
        observationId: "550e8400-e29b-41d4-a716-446655440000",
        mediaId: "550e8400-e29b-41d4-a716-446655440001",
      },
      body: { reasonCode: "user_request" },
    },
  );
  assert.equal(deleteDenied.status, 403);

  const publishBlocked = await createPublishHandler(
    {
      ...ctx,
      auth: { authenticate: async () => ({ actorUserId: "user-1", authRole: "user", fishRole: undefined, requestId: "req-1" }) },
    },
    {
      method: "POST",
      origin: "https://app.test",
      headers: { "idempotency-key": "abcd1234" },
      pathParams: {
        observationId: "550e8400-e29b-41d4-a716-446655440000",
        mediaId: "550e8400-e29b-41d4-a716-446655440001",
      },
      body: { approvalReference: "APR-1" },
    },
  );
  assert.equal(publishBlocked.status, 403);

  const publishCrawlerBlocked = await createPublishHandler(
    {
      ...ctx,
      auth: { authenticate: async () => ({ actorUserId: "crawler-1", authRole: "user", fishRole: "fish_crawler", requestId: "req-1" }) },
    },
    {
      method: "POST",
      origin: "https://app.test",
      headers: { "idempotency-key": "abcd1234" },
      pathParams: {
        observationId: "550e8400-e29b-41d4-a716-446655440000",
        mediaId: "550e8400-e29b-41d4-a716-446655440001",
      },
      body: { approvalReference: "APR-1" },
    },
  );
  assert.equal(publishCrawlerBlocked.status, 403);

  const adminCtx = createFakeContext({ auth: { authenticate: async () => ({ actorUserId: "admin-1", authRole: "admin", fishRole: "fish_admin", requestId: "req-1" }) } });
  const publishMissingApproval = await createPublishHandler(
    {
      ...adminCtx.ctx,
    },
    {
      method: "POST",
      origin: "https://app.test",
      headers: { "idempotency-key": "abcd1234" },
      pathParams: {
        observationId: "550e8400-e29b-41d4-a716-446655440000",
        mediaId: "550e8400-e29b-41d4-a716-446655440001",
      },
      body: {},
    },
  );
  assert.equal(publishMissingApproval.status, 400);

  const publish = await createPublishHandler(adminCtx.ctx, {
    method: "POST",
    origin: "https://app.test",
    headers: { "idempotency-key": "abcd1234" },
    pathParams: {
      observationId: "550e8400-e29b-41d4-a716-446655440000",
      mediaId: "550e8400-e29b-41d4-a716-446655440001",
    },
    body: { approvalReference: "APR-1" },
  });
  assert.equal(publish.status, 200);
  assert.equal(publish.body.data.input.purpose, "public_review");
});

const test = require("node:test");
const { assert, loadTs } = require("./test-helpers.cjs");

const { originAllowed } = loadTs("src/server/fish-observation/media/http/fish-media-origin-policy.ts");
const { InMemoryFishMediaRateLimiter } = loadTs("src/server/fish-observation/media/http/fish-media-rate-limiter.ts");
const { mapFishMediaHttpError } = loadTs("src/server/fish-observation/media/http/fish-media-http-error-mapper.ts");

test("origin allowlist requires exact match", () => {
  assert.equal(originAllowed("https://app.test", ["https://app.test"]), true);
  assert.equal(originAllowed("https://evil.test", ["https://app.test"]), false);
  assert.equal(originAllowed(null, ["https://app.test"]), false);
});

test("in-memory rate limiter throttles per actor action observation tuple", async () => {
  const limiter = new InMemoryFishMediaRateLimiter(() => 0, {
    upload_request: { limit: 1, windowMs: 1000 },
    finalize: { limit: 1, windowMs: 1000 },
    delete: { limit: 1, windowMs: 1000 },
    publish: { limit: 1, windowMs: 1000 },
  });
  assert.equal((await limiter.consume({ actorUserId: "u", action: "upload_request", observationId: "o" })).allowed, true);
  const second = await limiter.consume({ actorUserId: "u", action: "upload_request", observationId: "o" });
  assert.equal(second.allowed, false);
});

test("error mapper sanitizes unknown internal errors", () => {
  const response = mapFishMediaHttpError("req-1", new Error("SOME_INTERNAL_STACK"));
  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(JSON.stringify(response.body).includes("SOME_INTERNAL_STACK"), false);
});

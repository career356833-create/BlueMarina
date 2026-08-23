const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "../../..");
const live = fs.readFileSync(path.join(root, "src/server/fish-observation/media/create-live-fish-media-gateway.ts"), "utf8");
const config = fs.readFileSync(path.join(root, "src/server/fish-observation/media/fish-media-server-config.ts"), "utf8");

test("live composition is server-only and double-gated to exact staging project", () => {
  assert.match(live, /^import "server-only";/);
  assert.match(live, /environment !== "staging"/);
  assert.match(live, /mlfvpaikfpjrgrhwlrjn/);
  assert.match(live, /FISH_MEDIA_GATEWAY_ENABLED !== "true"/);
  assert.match(live, /FISH_MEDIA_LIVE_SMOKE_ENABLED !== "true"/);
  assert.match(config, /requestedMode === "live"/);
  assert.doesNotMatch(live, /SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY/);
});

test("live composition injects all reviewed adapters and creates no route", () => {
  for (const name of ["SupabaseFishMediaRepository", "SupabaseFishStorageProvider", "SupabaseFishObservationAccess", "SupabaseFishMediaAuditLog", "SupabaseFishCleanupQueue", "StorageBackedSharpFishImageProcessor"]) assert.match(live, new RegExp(name));
  const routes = [];
  const api = path.join(root, "src/app/api");
  if (fs.existsSync(api)) for (const entry of fs.readdirSync(api, { recursive: true })) if (String(entry).endsWith("route.ts") && String(entry).includes("fish-observations")) routes.push(entry);
  assert.deepEqual(routes, []);
});

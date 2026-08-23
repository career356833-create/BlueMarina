const assert = require("node:assert/strict");
const test = require("node:test");
const sharp = require("sharp");
const { loadTs } = require("./test-helpers.cjs");
const { StorageBackedSharpFishImageProcessor } = loadTs("src/infrastructure/fish-observation/image/storage-backed-sharp-fish-image-processor.ts");
const { FakeSupabaseFishClient } = loadTs("src/infrastructure/fish-observation/supabase/testing/fake-supabase-fish-client.ts");
const { FakeStorageTransport } = loadTs("src/infrastructure/fish-observation/supabase/testing/fake-storage-transport.ts");

test("stores three EXIF-free private variants with parent lineage", async () => {
  const database = new FakeSupabaseFishClient();
  const storage = new FakeStorageTransport();
  const source = await sharp({ create: { width: 640, height: 640, channels: 3, background: { r: 12, g: 80, b: 140 } } }).jpeg().toBuffer();
  storage.objects.set("fish-observation-originals:user/observation/original/media.jpg", source);
  let id = 0;
  const processor = new StorageBackedSharpFishImageProcessor(storage, database, undefined, () => `variant-${++id}`);
  const result = await processor.sanitizeAndCreatePrivateVariants({ exists: true, detectedMimeType: "image/jpeg", byteSize: source.length, magicBytesValid: true, decodes: true, width: 640, height: 640, checksum: "ignored" }, { media: { id: "media", observationId: "observation", ownerUserId: "user", bucket: "fish-observation-originals", storagePath: "user/observation/original/media.jpg", state: "processing", version: 3, exifRemoved: false, reviewApproved: false, observationPublic: false, publicConsent: false } });
  assert.equal(result.variants.length, 3);
  assert.deepEqual(result.variants.map((item) => item.variantType), ["processed_master", "thumbnail", "ai_analysis"]);
  assert.equal(result.hadGpsExif, false);
  assert.equal([...storage.objects.keys()].filter((key) => key.startsWith("fish-observation-processed:")).length, 3);
  const rows = database.tables.get("fish_media");
  assert.equal(rows.length, 3);
  assert.equal(rows.every((row) => row.referenced_source_media_id === "media" && row.exif_status === "stripped" && row.storage_bucket === "fish-observation-processed"), true);
  assert.equal(rows.every((row) => row.generation_metadata.exifRemoved === true), true);
});

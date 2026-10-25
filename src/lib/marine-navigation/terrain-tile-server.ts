import { PNG } from "pngjs";
import { clampTerrariumToSeaLevel, terrainTileAllowed } from "./coastal-terrain";

const cache = new Map<string, { png: Buffer; expires: number }>();
const pending = new Map<string, Promise<Buffer>>();
const MAX_BYTES = 512 * 1024;

export async function landTerrainTile(z: number, x: number, y: number): Promise<Buffer> {
  if (!terrainTileAllowed(z, x, y)) throw new Error("Unsupported DEM tile");
  const key = `${z}/${x}/${y}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.png;
  const inflight = pending.get(key);
  if (inflight) return inflight;
  // Bound work per function instance; CDN cache handles repeated public tiles.
  if (pending.size >= 16) throw new Error("DEM busy");
  const task = (async () => {
    const response = await fetch(`https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${key}.png`, {
      signal: AbortSignal.timeout(6000), redirect: "error", cache: "force-cache", next: { revalidate: 86400 },
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("image/png") || Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("DEM unavailable");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty DEM");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.length;
        if (size > MAX_BYTES) throw new Error("DEM size limit");
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel(); }
    const png = landOnlyPng(Buffer.concat(chunks));
    while (cache.size >= 96) cache.delete(cache.keys().next().value!);
    cache.set(key, { png, expires: Date.now() + 86400000 });
    return png;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

export function landOnlyPng(input: Buffer): Buffer {
  // Bound allocations before decoding an untrusted compressed image.
  if (input.length > MAX_BYTES || input.length < 33 || input.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || input.toString("ascii", 12, 16) !== "IHDR" || input.readUInt32BE(16) !== 256 || input.readUInt32BE(20) !== 256
    || input[24] !== 8 || ![2, 6].includes(input[25]) || input[28] !== 0) throw new Error("Invalid DEM image");
  const image = PNG.sync.read(input, { checkCRC: true });
  clampTerrariumToSeaLevel(image.data, 4);
  return PNG.sync.write(image, { colorType: 2, inputColorType: 6, bitDepth: 8 });
}

import { landTerrainTile } from "@/lib/marine-navigation/terrain-tile-server";
import { terrainTileAllowed } from "@/lib/marine-navigation/coastal-terrain";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const raw = await params;
  const values = [raw.z, raw.x, raw.y];
  const [z, x, y] = values.map(Number);
  const headers = { "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!values.every(value => /^(0|[1-9]\d{0,3})$/.test(value)) || !terrainTileAllowed(z, x, y)) return new Response(null, { status: 404, headers });
  try {
    const png = await landTerrainTile(z, x, y);
    return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=604800", "X-Terrain-Model": "mapzen-land-only-v1" } });
  } catch {
    return new Response(null, { status: 503, headers: { ...headers, "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}

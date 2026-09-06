import { NextResponse } from "next/server";
import {
  normalizeKhoaTideStations,
  summarizeKhoaTideStationQuality,
  toKhoaTideStationsGeoJson,
  type KhoaTideStationsResponse,
} from "@/lib/marine-navigation/adapters/khoa-tide-stations";

export const revalidate = 86_400;

export async function GET() {
  const stations = normalizeKhoaTideStations();
  const body: KhoaTideStationsResponse = {
    ok: true,
    stations,
    geoJson: toKhoaTideStationsGeoJson(stations),
    generatedAt: new Date().toISOString(),
    freshness: "snapshot",
    source: "국립해양조사원(KHOA)",
    quality: summarizeKhoaTideStationQuality(),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" } });
}

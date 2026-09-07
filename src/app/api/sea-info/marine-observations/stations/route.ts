import { NextResponse } from "next/server";
import { toKmaMarineStationGeoJson } from "@/lib/marine-navigation/adapters/kma-marine-observations";
import { getKmaMarineStations, KmaMarineObservationSourceError } from "@/lib/sea-info/kma-marine-observation-server";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const code = error instanceof KmaMarineObservationSourceError ? error.code : "UPSTREAM_ERROR";
  const status = code === "API_KEY_MISSING" ? 503 : code === "UPSTREAM_TIMEOUT" ? 504 : 502;
  return NextResponse.json({ ok: false, code, message: "KMA 해양기상 관측소 정보를 불러올 수 없습니다." }, { status });
}

export async function GET() {
  try {
    const snapshot = await getKmaMarineStations();
    return NextResponse.json({
      ok: true,
      stations: snapshot.data.stations,
      geoJson: toKmaMarineStationGeoJson(snapshot.data.stations),
      quality: snapshot.data.quality,
      freshness: snapshot.freshness,
      fetchedAt: snapshot.fetchedAt,
      lastSuccessfulFetchAt: snapshot.lastSuccessfulFetchAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

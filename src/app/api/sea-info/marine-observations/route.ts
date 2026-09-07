import { NextResponse } from "next/server";
import { getKmaMarineObservationSnapshot, KmaMarineObservationSourceError } from "@/lib/sea-info/kma-marine-observation-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const stationId = new URL(request.url).searchParams.get("stationId");
  if (stationId !== null && !/^\d{1,10}$/.test(stationId)) {
    return NextResponse.json({ ok: false, code: "INVALID_STATION_ID", message: "관측소 ID 형식이 올바르지 않습니다." }, { status: 400 });
  }
  try {
    const snapshot = await getKmaMarineObservationSnapshot();
    const observations = stationId ? snapshot.data.filter((row) => row.stationId === stationId) : snapshot.data;
    return NextResponse.json({ ok: true, observations, freshness: snapshot.freshness, fetchedAt: snapshot.fetchedAt, lastSuccessfulFetchAt: snapshot.lastSuccessfulFetchAt });
  } catch (error) {
    const code = error instanceof KmaMarineObservationSourceError ? error.code : "UPSTREAM_ERROR";
    return NextResponse.json({ ok: false, code, message: "KMA 최신 종합관측을 불러올 수 없습니다." }, { status: code === "UPSTREAM_TIMEOUT" ? 504 : code === "API_KEY_MISSING" ? 503 : 502 });
  }
}

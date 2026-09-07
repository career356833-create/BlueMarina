import { NextResponse } from "next/server";
import { deriveKmaObservationFreshness, latestKmaObservationByStation } from "@/lib/sea-info/kma-marine-observation";
import { getKmaBuoyDetailSnapshot, getKmaMarineObservationSnapshot } from "@/lib/sea-info/kma-marine-observation-server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await context.params;
  if (!/^\d{1,10}$/.test(stationId)) {
    return NextResponse.json({ ok: false, code: "INVALID_STATION_ID", message: "관측소 ID 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const [observationResult, buoyResult] = await Promise.allSettled([
    getKmaMarineObservationSnapshot(),
    getKmaBuoyDetailSnapshot(),
  ]);
  if (observationResult.status === "rejected" && buoyResult.status === "rejected") {
    return NextResponse.json({ ok: false, code: "OBSERVATION_UNAVAILABLE", message: "KMA 해양기상 관측을 불러올 수 없습니다." }, { status: 502 });
  }

  const observation = observationResult.status === "fulfilled" ? latestKmaObservationByStation(observationResult.value.data).get(stationId) ?? null : null;
  const buoyDetail = buoyResult.status === "fulfilled" ? latestKmaObservationByStation(buoyResult.value.data).get(stationId) ?? null : null;
  const observedAt = observation?.observedAt ?? buoyDetail?.observedAt ?? null;
  return NextResponse.json({
    ok: true,
    stationId,
    observation,
    buoyDetail,
    observationSourceState: observationResult.status === "fulfilled" ? "ready" : "unavailable",
    buoySourceState: buoyResult.status === "fulfilled" ? "ready" : "unavailable",
    freshness: deriveKmaObservationFreshness(observedAt),
    fetchedAt: new Date().toISOString(),
  });
}

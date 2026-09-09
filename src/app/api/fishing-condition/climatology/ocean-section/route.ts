import { type NextRequest, NextResponse } from "next/server";
import {
  getNifsOceanSectionClimatology,
  NifsOceanSectionClimatologyError,
} from "@/lib/fishing-condition/nifs-ocean-section-climatology-server";

export const dynamic = "force-dynamic";

function optionalNumber(value: string | null) {
  return value === null ? undefined : Number(value);
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    return NextResponse.json(await getNifsOceanSectionClimatology({
      stationId: params.get("stationId") ?? undefined,
      month: optionalNumber(params.get("month")),
      depth: optionalNumber(params.get("depth")),
      limit: optionalNumber(params.get("limit")),
    }), { headers: { "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (error) {
    const code = error instanceof NifsOceanSectionClimatologyError ? error.code : "ARTIFACT_UNAVAILABLE";
    return NextResponse.json({
      ok: false,
      source: { provider: "NIFS", sourceId: "nifs-soo-climatology", qualityClass: "DERIVED_HISTORICAL_BASELINE", derivedFrom: "nifs-soo" },
      code,
      message: "NIFS 정선해양관측 월별 수심 기준선을 현재 불러올 수 없습니다.",
    }, { status: code === "INVALID_QUERY" ? 400 : 503 });
  }
}

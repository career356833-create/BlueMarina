import { type NextRequest, NextResponse } from "next/server";
import { getNifsOceanSection, NifsOceanSectionSourceError } from "@/lib/fishing-condition/nifs-ocean-section-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    return NextResponse.json(await getNifsOceanSection({
      region: params.get("region") ?? undefined,
      lineCode: params.get("lineCode") ?? undefined,
      stationCode: params.get("stationCode") ?? undefined,
      startDate: params.get("sdate") ?? undefined,
      endDate: params.get("edate") ?? undefined,
    }), { headers: { "Cache-Control": "public, max-age=0, s-maxage=43200, stale-while-revalidate=561600" } });
  } catch (error) {
    const code = error instanceof NifsOceanSectionSourceError ? error.code : "UPSTREAM_ERROR";
    const status = code === "INVALID_QUERY" ? 400 : code === "UPSTREAM_TIMEOUT" ? 504 : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503 : 502;
    return NextResponse.json({
      ok: false,
      source: { provider: "NIFS", sourceId: "nifs-soo", qualityClass: "HISTORICAL_OCEANOGRAPHIC_PROFILE" },
      code,
      message: "NIFS 정선해양관측 자료를 현재 불러올 수 없습니다.",
    }, { status });
  }
}

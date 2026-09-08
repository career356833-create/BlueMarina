import { NextResponse } from "next/server";
import { getNifsRealtimeFishingEnvironment, NifsRealtimeFishingSourceError } from "@/lib/fishing-condition/nifs-realtime-fishing-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getNifsRealtimeFishingEnvironment(), {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=6600" },
    });
  } catch (error) {
    const code = error instanceof NifsRealtimeFishingSourceError ? error.code : "UPSTREAM_ERROR";
    const status = code === "UPSTREAM_TIMEOUT" ? 504 : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503 : 502;
    return NextResponse.json({
      ok: false,
      source: { provider: "NIFS", sourceId: "nifs-risa", qualityClass: "OBSERVED" },
      freshness: "unavailable",
      code,
      message: "NIFS 실시간 어장환경 자료를 현재 불러올 수 없습니다.",
    }, { status });
  }
}

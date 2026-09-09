import { NextResponse } from "next/server";
import { getNifsFisheryEnvironment, NifsFisheryEnvironmentSourceError } from "@/lib/fishing-condition/nifs-fishery-environment-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getNifsFisheryEnvironment(), {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=518400" },
    });
  } catch (error) {
    const code = error instanceof NifsFisheryEnvironmentSourceError ? error.code : "UPSTREAM_ERROR";
    const status = code === "UPSTREAM_TIMEOUT" ? 504 : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503 : 502;
    return NextResponse.json({
      ok: false,
      source: { provider: "NIFS", sourceId: "nifs-femo-sea", qualityClass: "OBSERVED_PERIODIC_ENVIRONMENT" },
      freshness: "unavailable",
      code,
      message: "NIFS 주기적 어장환경 자료를 현재 불러올 수 없습니다.",
    }, { status });
  }
}

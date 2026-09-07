import { NextResponse } from "next/server";
import { getKmaMarineWeatherWarnings, KmaMarineWeatherWarningSourceError } from "@/lib/sea-info/kma-marine-weather-warning-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getKmaMarineWeatherWarnings());
  } catch (error) {
    const code = error instanceof KmaMarineWeatherWarningSourceError ? error.code : "UPSTREAM_ERROR";
    const status = code === "UPSTREAM_TIMEOUT" ? 504 : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503 : 502;
    return NextResponse.json({ ok: false, code, message: "KMA 해상특보를 불러올 수 없습니다." }, { status });
  }
}

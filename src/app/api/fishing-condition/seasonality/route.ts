import { type NextRequest, NextResponse } from "next/server";
import {
  getSpeciesSeasonality,
  SEASONALITY_CONTEXTS,
  SEASONALITY_RUNTIME_SOURCE_ID,
  SeasonalityRuntimeError,
  type SeasonalityContext,
} from "@/lib/fishing-condition/seasonality-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const speciesId = request.nextUrl.searchParams.get("speciesId")?.trim() ?? "";
  const monthInput = request.nextUrl.searchParams.get("month")?.trim();
  const contextInput = request.nextUrl.searchParams.get("context")?.trim();

  if (!/^BM-SPECIES-\d{6}$/.test(speciesId)) {
    return NextResponse.json({ ok: false, sourceId: SEASONALITY_RUNTIME_SOURCE_ID, code: "INVALID_SPECIES_ID" }, { status: 400 });
  }
  if (!monthInput) {
    return NextResponse.json({ ok: false, sourceId: SEASONALITY_RUNTIME_SOURCE_ID, code: "MONTH_REQUIRED" }, { status: 400 });
  }
  if (!/^\d{1,2}$/.test(monthInput) || Number(monthInput) < 1 || Number(monthInput) > 12) {
    return NextResponse.json({ ok: false, sourceId: SEASONALITY_RUNTIME_SOURCE_ID, code: "INVALID_MONTH" }, { status: 400 });
  }
  if (contextInput && !SEASONALITY_CONTEXTS.includes(contextInput as SeasonalityContext)) {
    return NextResponse.json({ ok: false, sourceId: SEASONALITY_RUNTIME_SOURCE_ID, code: "INVALID_CONTEXT" }, { status: 400 });
  }

  try {
    const seasonality = getSpeciesSeasonality({
      speciesId,
      month: Number(monthInput),
      context: contextInput as SeasonalityContext | undefined,
    });
    return NextResponse.json({ ok: true, sourceId: SEASONALITY_RUNTIME_SOURCE_ID, seasonality }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const code = error instanceof SeasonalityRuntimeError ? error.code : "RUNTIME_ERROR";
    const status = code === "SPECIES_NOT_FOUND" ? 404 : code === "RUNTIME_ERROR" ? 500 : 400;
    return NextResponse.json({ ok: false, sourceId: SEASONALITY_RUNTIME_SOURCE_ID, code }, { status });
  }
}

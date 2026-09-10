import { type NextRequest, NextResponse } from "next/server";
import { FISHING_CONDITION_COMPARISON_SOURCES } from "@/lib/fishing-condition/comparator";
import { FishingConditionComparatorError, runFishingConditionComparison, type FishingConditionComparisonRequest } from "@/lib/fishing-condition/comparator-server";

export const dynamic = "force-dynamic";

function parseRequest(input: unknown): FishingConditionComparisonRequest | null {
  if (!input || typeof input !== "object") return null;
  const root = input as Record<string, unknown>;
  const environment = root.environment;
  if (!environment || typeof environment !== "object") return null;
  const source = environment as Record<string, unknown>;
  const speciesId = typeof root.speciesId === "string" ? root.speciesId.trim() : "";
  const sourceId = typeof source.sourceId === "string" ? source.sourceId.trim() : "";
  const stationId = typeof source.stationId === "string" ? source.stationId.trim() : undefined;
  const siteId = typeof source.siteId === "string" ? source.siteId.trim() : undefined;
  const depthContext = typeof source.depthContext === "string" ? source.depthContext.trim() : "";
  if (!/^BM-SPECIES-\d{6}$/.test(speciesId)) return null;
  if (!FISHING_CONDITION_COMPARISON_SOURCES.includes(sourceId as FishingConditionComparisonRequest["environment"]["sourceId"])) return null;
  if (!(["SURFACE", "MIDDLE", "BOTTOM"] as const).includes(depthContext as FishingConditionComparisonRequest["environment"]["depthContext"])) return null;
  if (sourceId === "nifs-risa" && (!stationId || siteId)) return null;
  if (sourceId === "nifs-femo-sea" && (!siteId || stationId || depthContext === "MIDDLE")) return null;
  return {
    speciesId,
    environment: {
      sourceId: sourceId as FishingConditionComparisonRequest["environment"]["sourceId"],
      stationId,
      siteId,
      depthContext: depthContext as FishingConditionComparisonRequest["environment"]["depthContext"],
    },
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }
  const parsed = parseRequest(body);
  if (!parsed) return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });

  try {
    const comparison = await runFishingConditionComparison(parsed);
    return NextResponse.json({ ok: true, comparison }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof FishingConditionComparatorError ? error.code : "UPSTREAM_ERROR";
    const status = code === "INVALID_REQUEST" ? 400
      : code === "PROFILE_NOT_FOUND" || code === "ENVIRONMENT_LOCATION_NOT_FOUND" ? 404
        : code === "UPSTREAM_TIMEOUT" ? 504
          : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503
            : 502;
    return NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

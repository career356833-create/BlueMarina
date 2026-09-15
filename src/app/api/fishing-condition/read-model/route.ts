import { type NextRequest, NextResponse } from "next/server";
import { parseConditionEvidenceBundleRequest } from "@/lib/fishing-condition/evidence-bundle-request";
import {
  FishingConditionReadModelError,
  runFishingConditionReadModel,
} from "@/lib/fishing-condition/read-model-server";

export const dynamic = "force-dynamic";

function publicErrorCode(code: FishingConditionReadModelError["code"]) {
  if (code === "PROFILE_NOT_FOUND") return "UNKNOWN_SPECIES";
  if (code === "ENVIRONMENT_LOCATION_NOT_FOUND") return "MISSING_ENVIRONMENT";
  if (code === "SOURCE_DISABLED" || code === "API_KEY_MISSING") return "UNSUPPORTED_SOURCE";
  return code;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }
  const parsed = parseConditionEvidenceBundleRequest(body);
  if (!parsed) return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });

  try {
    const readModel = await runFishingConditionReadModel(parsed);
    return NextResponse.json({ ok: true, readModel }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof FishingConditionReadModelError ? error.code : "UPSTREAM_ERROR";
    const status = code === "INVALID_REQUEST" ? 400
      : code === "PROFILE_NOT_FOUND" || code === "ENVIRONMENT_LOCATION_NOT_FOUND" ? 404
        : code === "UPSTREAM_TIMEOUT" ? 504
          : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503
            : 502;
    return NextResponse.json({ ok: false, code: publicErrorCode(code) }, { status });
  }
}

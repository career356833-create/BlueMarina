import { type NextRequest, NextResponse } from "next/server";
import {
  ConditionEvidenceBundleError,
  runConditionEvidenceBundle,
} from "@/lib/fishing-condition/evidence-bundle-server";
import { parseConditionEvidenceBundleRequest } from "@/lib/fishing-condition/evidence-bundle-request";

export const dynamic = "force-dynamic";

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
    const bundle = await runConditionEvidenceBundle(parsed);
    return NextResponse.json({ ok: true, ...bundle }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof ConditionEvidenceBundleError ? error.code : "UPSTREAM_ERROR";
    const status = code === "INVALID_REQUEST" ? 400
      : code === "PROFILE_NOT_FOUND" || code === "ENVIRONMENT_LOCATION_NOT_FOUND" ? 404
        : code === "UPSTREAM_TIMEOUT" ? 504
          : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503
            : 502;
    return NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

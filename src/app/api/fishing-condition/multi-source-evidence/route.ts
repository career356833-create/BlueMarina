import { type NextRequest, NextResponse } from "next/server";
import { parseMultiSourceEvidenceRequest } from "@/lib/fishing-condition/multi-source-evidence-request";
import { MultiSourceEvidenceError, runMultiSourceEvidence } from "@/lib/fishing-condition/multi-source-evidence-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 }); }
  const parsed = parseMultiSourceEvidenceRequest(body);
  if (!parsed) return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const result = await runMultiSourceEvidence(parsed);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof MultiSourceEvidenceError ? error.code : "ORCHESTRATION_ERROR";
    return NextResponse.json({ ok: false, code }, { status: code === "PROFILE_NOT_FOUND" ? 404 : 500, headers: { "Cache-Control": "no-store" } });
  }
}

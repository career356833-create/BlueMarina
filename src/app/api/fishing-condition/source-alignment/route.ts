import { type NextRequest, NextResponse } from "next/server";
import { parseSourceAlignmentRequest } from "@/lib/fishing-condition/source-alignment-request";
import { runSourceAlignment } from "@/lib/fishing-condition/source-alignment-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 }); }
  const parsed = parseSourceAlignmentRequest(body);
  if (!parsed) return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  const context = await runSourceAlignment(parsed);
  return NextResponse.json({ ok: true, ...context }, { headers: { "Cache-Control": "no-store" } });
}

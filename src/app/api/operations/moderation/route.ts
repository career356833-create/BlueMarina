import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { moderationActor, ModerationError, moderationSnapshot } from "@/lib/operations/moderation";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: NextRequest) {
  try {
    const { client, roles } = await moderationActor(request);
    return NextResponse.json({ ok: true, snapshot: await moderationSnapshot(client, roles) }, { headers });
  } catch (error) {
    return NextResponse.json({ ok: false, code: error instanceof ModerationError ? error.code : "INTERNAL_ERROR" },
      { status: error instanceof ModerationError ? error.status : 500, headers });
  }
}

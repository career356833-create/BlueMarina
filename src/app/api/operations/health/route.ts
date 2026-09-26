import { NextResponse } from "next/server";
import { authorizeOperationsToken, getOperationsSnapshot, OperationsAuthError } from "@/lib/operations/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
    await authorizeOperationsToken(token);
    return NextResponse.json({ ok: true, snapshot: await getOperationsSnapshot() }, { headers: privateHeaders });
  } catch (error) {
    const status = error instanceof OperationsAuthError ? error.status : 500;
    const code = error instanceof OperationsAuthError ? error.code : "OPERATIONS_UNAVAILABLE";
    return NextResponse.json({ ok: false, code }, { status, headers: privateHeaders });
  }
}

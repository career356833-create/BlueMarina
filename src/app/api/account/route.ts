import { NextResponse } from "next/server";
import { AccountApiError, readAccount, removeAccountItem, saveAccountItem, updateAccountProfile } from "@/lib/account/server";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function responseForError(error: unknown) {
  if (error instanceof AccountApiError) return NextResponse.json({ error: error.code }, { status: error.status, headers: privateHeaders });
  return NextResponse.json({ error: "ACCOUNT_REQUEST_FAILED" }, { status: 400, headers: privateHeaders });
}

async function body(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16_384) throw new AccountApiError(413, "PAYLOAD_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 16_384) throw new AccountApiError(413, "PAYLOAD_TOO_LARGE");
  try { return JSON.parse(text) as unknown; }
  catch { throw new AccountApiError(400, "INVALID_JSON"); }
}

export async function GET(request: Request) {
  try { return NextResponse.json(await readAccount(request), { headers: privateHeaders }); } catch (error) { return responseForError(error); }
}

export async function PATCH(request: Request) {
  try { return NextResponse.json({ profile: await updateAccountProfile(request, await body(request)) }, { headers: privateHeaders }); } catch (error) { return responseForError(error); }
}

export async function POST(request: Request) {
  try { return NextResponse.json({ saved: await saveAccountItem(request, await body(request)) }, { status: 201, headers: privateHeaders }); } catch (error) { return responseForError(error); }
}

export async function DELETE(request: Request) {
  try { await removeAccountItem(request, await body(request)); return new NextResponse(null, { status: 204, headers: privateHeaders }); } catch (error) { return responseForError(error); }
}

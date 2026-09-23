import { NextResponse } from "next/server";
import { AccountApiError, readAccount, removeAccountItem, saveAccountItem, updateAccountProfile } from "@/lib/account/server";

export const dynamic = "force-dynamic";

function responseForError(error: unknown) {
  if (error instanceof AccountApiError) return NextResponse.json({ error: error.code }, { status: error.status });
  return NextResponse.json({ error: "ACCOUNT_REQUEST_FAILED" }, { status: 400 });
}

async function body(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16_384) throw new AccountApiError(413, "PAYLOAD_TOO_LARGE");
  return request.json();
}

export async function GET(request: Request) {
  try { return NextResponse.json(await readAccount(request)); } catch (error) { return responseForError(error); }
}

export async function PATCH(request: Request) {
  try { return NextResponse.json({ profile: await updateAccountProfile(request, await body(request)) }); } catch (error) { return responseForError(error); }
}

export async function POST(request: Request) {
  try { return NextResponse.json({ saved: await saveAccountItem(request, await body(request)) }, { status: 201 }); } catch (error) { return responseForError(error); }
}

export async function DELETE(request: Request) {
  try { await removeAccountItem(request, await body(request)); return new NextResponse(null, { status: 204 }); } catch (error) { return responseForError(error); }
}

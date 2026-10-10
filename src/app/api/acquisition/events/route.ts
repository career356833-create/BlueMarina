import { NextResponse } from "next/server";
import { actorClass, validateClientEvent } from "@/lib/acquisition/events";
import { acceptRate, eventClient, PRIVATE_HEADERS, sessionFor, setLoginAttempt, setSession, writeEvent } from "@/lib/acquisition/event-server";

export const dynamic = "force-dynamic";
const reply = (status: number) => new NextResponse(null, { status, headers: PRIVATE_HEADERS });
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply(403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415);
    if (Number(request.headers.get("content-length")) > 1024) return reply(413);
    if (!acceptRate(sessionFor(request)?.id ?? "new")) return reply(429);
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 1024) { await reader.cancel(); return reply(413); } chunks.push(value); }
    const event = validateClientEvent(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!event) return reply(400);
    const client = eventClient();
    if (!client) return reply(503);
    let user = null;
    const auth = request.headers.get("authorization");
    if (auth) {
      if (!auth.startsWith("Bearer ")) return reply(401);
      const result = await client.auth.getUser(auth.slice(7));
      if (result.error || !result.data.user) return reply(401);
      user = result.data.user;
    }
    if (event.name !== "landing_view" && event.name !== "kakao_login_start" && !user) return reply(401);
    const response = reply(204), session = setSession(response, request);
    const ok = await writeEvent({ ...event, userId: user?.id, actor: user ? actorClass(user) : "ANONYMOUS", sessionId: session.id, dedupe: `client:${session.id}:${event.name}:${event.route}` });
    if (!ok) return reply(503);
    if (event.name === "kakao_login_start") setLoginAttempt(response, request, event.returnRoute ?? "UNKNOWN");
    return response;
  } catch { return reply(400); }
}

import { NextResponse } from "next/server";
import { environment, eventClient, PRIVATE_HEADERS } from "@/lib/acquisition/event-server";
import { retentionHealth, type RetentionSummary } from "@/lib/acquisition/retention";
import { authorizeOperationsToken, OperationsAuthError } from "@/lib/operations/server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
  try {
    const header = request.headers.get("authorization") ?? "";
    await authorizeOperationsToken(header.startsWith("Bearer ") ? header.slice(7) : null);
    const client = eventClient();
    if (!client) return reply({ status: "UNAVAILABLE" }, 503);
    const { data, error } = await client.rpc("operational_funnel_retention_summary", { p_environment: environment() });
    if (error || !data) return reply({ status: "UNAVAILABLE" }, 503);
    const summary = data as RetentionSummary;
    return reply({ status: retentionHealth(summary), summary });
  } catch (error) {
    return error instanceof OperationsAuthError ? reply({ code: error.code }, error.status) : reply({ status: "UNAVAILABLE" }, 503);
  }
}

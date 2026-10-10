import { NextResponse } from "next/server";
import { aggregateEvents, windowStart, type Domain, type ObservedEvent } from "@/lib/acquisition/events";
import { environment, eventClient, PRIVATE_HEADERS } from "@/lib/acquisition/event-server";
import { authorizeOperationsToken, OperationsAuthError } from "@/lib/operations/server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
  try {
    const header = request.headers.get("authorization") ?? "";
    await authorizeOperationsToken(header.startsWith("Bearer ") ? header.slice(7) : null);
    const query = new URL(request.url).searchParams, period = query.get("period") ?? "7d", domain = query.get("domain") ?? "ALL", group = query.get("group") ?? "REAL";
    if (!["today", "7d", "30d"].includes(period) || !["ALL", "GENERAL", "CHARTER", "MARKET", "COMMUNITY"].includes(domain) || !["REAL", "QA"].includes(group) || [...query.keys()].some(k => !["period", "domain", "group"].includes(k))) return reply({ code: "INVALID_FILTER" }, 400);
    const client = eventClient();
    if (!client) return reply({ code: "FUNNEL_UNAVAILABLE" }, 503);
    const env = environment();
    const baseline = await client.from("operational_funnel_baselines").select("started_at").eq("environment", env).maybeSingle();
    if (baseline.error) return reply({ code: "FUNNEL_UNAVAILABLE" }, 503);
    const all: ObservedEvent[] = [];
    // Read a bounded history, including the preceding window for QA-session exclusions and earliest retained saves.
    for (let offset = 0; offset <= 10000; offset += 1000) {
      const result = await client.from("operational_funnel_events").select("event_name,occurred_at,user_id,session_id,actor_class,subject_class,domain").eq("environment", env).gte("occurred_at", new Date(Date.now() - 90 * 86400000).toISOString()).order("occurred_at").order("id").range(offset, offset + 999);
      if (result.error) return reply({ code: "FUNNEL_UNAVAILABLE" }, 503);
      all.push(...(result.data ?? []) as ObservedEvent[]);
      if (all.length > 10000) return reply({ code: "FUNNEL_CAPACITY_LIMIT", metrics: null }, 503);
      if ((result.data?.length ?? 0) < 1000) break;
    }
    const from = windowStart(period as "today" | "7d" | "30d");
    return reply({ status: baseline.data ? "OBSERVED" : "NO_EVENT_DATA", observedSince: baseline.data?.started_at ?? null, environment: env, period, from, domain, group,
      metrics: aggregateEvents(all, from, domain as Domain | "ALL", group as "REAL" | "QA"),
      limitations: ["BEST_EFFORT_NOT_AUDIT_LOG", "ANONYMOUS_IS_NOT_VERIFIED_REAL", "MATCHED_WITHIN_WINDOW_COHORTS_ONLY", "FIRST_SAVE_IS_FIRST_RETAINED_OBSERVATION_90D", "AUTHENTICATED_EVENT_E2E_PENDING"] });
  } catch (error) {
    return error instanceof OperationsAuthError ? reply({ code: error.code }, error.status) : reply({ code: "FUNNEL_UNAVAILABLE" }, 503);
  }
}

import "server-only";
import { createHmac, randomUUID, timingSafeEqual, createHash } from "node:crypto";
import { after, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { actorClass, eventDomain, type ActorClass, type Domain, type EventName } from "./events";
import { isActivationAdmin } from "./funnel";

export const EVENT_COOKIE = "bm_funnel_v1";
export const LOGIN_COOKIE = "bm_funnel_kakao_v1";
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export const environment = () => process.env.VERCEL_ENV === "production" ? "production" : process.env.VERCEL_ENV === "preview" ? "preview" : "development";
export function eventClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(3000) }) } }) : null;
}
function signed(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return `${value}.${createHmac("sha256", key).update(`funnel-v1:${value}`).digest("hex")}`;
}
export function cookieValue(request: Request, name: string) {
  return (request.headers.get("cookie") ?? "").split(";").map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
}
export function checkedCookie(value: string, now = Date.now()) {
  if (value.length > 250) return null;
  const parts = value.split(".");
  if (parts.length < 3) return null;
  const signature = parts.pop()!, body = parts.join("."), expected = signed(body)?.split(".").pop();
  if (!expected || !/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const [id, expiry, route] = parts;
  if (!/^[a-f0-9-]{36}$/.test(id) || !Number.isFinite(Number(expiry)) || Number(expiry) < now || Number(expiry) > now + 1800000) return null;
  return { id, expiry: Number(expiry), route };
}
export function sessionFor(request: Request) {
  return checkedCookie(cookieValue(request, EVENT_COOKIE));
}
export function setSession(response: NextResponse, request: Request) {
  const session = sessionFor(request) ?? { id: randomUUID(), expiry: Date.now() + 1800000 };
  const value = signed(`${session.id}.${session.expiry}`);
  if (value) response.cookies.set(EVENT_COOKIE, value, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: Math.max(1, Math.floor((session.expiry - Date.now()) / 1000)) });
  return session;
}
export function setLoginAttempt(response: NextResponse, request: Request, route: string) {
  const value = signed(`${randomUUID()}.${Date.now() + 1800000}.${route}`);
  if (value) response.cookies.set(LOGIN_COOKIE, value, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 1800 });
}

export type WriteEvent = { name: EventName; route: string; domain?: Domain; userId?: string; actor: ActorClass; subject?: ActorClass; entityId?: string; sessionId?: string; dedupe: string; source?: string; medium?: string; campaign?: string; referrer?: string; returnRoute?: string };
export async function writeEvent(event: WriteEvent) {
  const client = eventClient();
  if (!client) return false;
  try {
    const env = environment();
    const baseline = await client.from("operational_funnel_baselines").upsert({ environment: env }, { onConflict: "environment", ignoreDuplicates: true });
    if (baseline.error) return false;
    const { error } = await client.from("operational_funnel_events").upsert({
      environment: env, event_name: event.name, domain: event.domain ?? eventDomain(event.name, event.returnRoute ?? event.route), route_key: event.route,
      actor_class: event.actor, subject_class: event.subject ?? null, user_id: event.userId ?? null, session_id: event.sessionId ?? null,
      entity_id: event.entityId ?? null, dedupe_key: createHash("sha256").update(event.dedupe).digest("hex"),
      utm_source: event.source ?? "UNKNOWN", utm_medium: event.medium ?? "UNKNOWN", utm_campaign: event.campaign ?? "UNKNOWN", referrer_category: event.referrer ?? "UNKNOWN", return_route: event.returnRoute ?? null,
    }, { onConflict: "environment,dedupe_key", ignoreDuplicates: true });
    return !error;
  } catch { return false; }
}
export function bestEffort(task: () => Promise<unknown>, schedule: (callback: () => Promise<void>) => void = after) {
  try { schedule(async () => { try { await task(); } catch { /* No tokens, payloads or provider errors are logged. */ } }); } catch { /* Business response remains successful even outside a Next request lifecycle. */ }
}

/** Called only AFTER an authorized, successful database mutation. No raw content reaches storage. */
export function observeMutation(request: Request, input: { name: EventName; domain: Domain; actorId: string; ownerId: string; entityId: string; marker?: string; revision?: string }) {
  try {
  const sessionId = sessionFor(request)?.id;
  bestEffort(async () => {
    const client = eventClient();
    if (!client) return;
    const actor = await client.auth.admin.getUserById(input.actorId);
    const owner = input.ownerId === input.actorId ? actor : await client.auth.admin.getUserById(input.ownerId);
    const classification = actorClass(actor.error ? null : actor.data.user);
    const subject = actorClass(owner.error ? null : owner.data.user, input.marker);
    const moderation = input.name.startsWith("moderation_");
    await writeEvent({ name: input.name, route: moderation || input.name === "content_published" ? "MODERATION" : input.domain === "GENERAL" ? "ACCOUNT" : `${input.domain}_${input.domain === "CHARTER" ? "ONBOARDING" : "NEW"}`,
      domain: input.domain, userId: input.actorId, actor: moderation ? (!actor.error && actor.data.user && isActivationAdmin(actor.data.user) ? "ADMIN" : "UNKNOWN") : (subject === "QA" ? "QA" : classification), subject,
      entityId: input.entityId, sessionId, dedupe: `${input.domain}:${input.name}:${input.entityId}:${input.name === "content_published" ? "first" : input.revision ?? "first"}` });
  });
  } catch { /* Even telemetry preparation cannot affect a completed mutation. */ }
}

const buckets = new Map<string, { count: number; until: number }>();
export function acceptRate(id: string, now = Date.now()) {
  for (const [key, item] of buckets) if (item.until <= now) buckets.delete(key);
  if (buckets.size > 2000) return false;
  for (const [key, limit] of [["all", 120], [id, 20]] as const) {
    const current = buckets.get(key) ?? { count: 0, until: now + 60000 };
    if (current.count >= limit) return false;
    current.count++; buckets.set(key, current);
  }
  return true;
}

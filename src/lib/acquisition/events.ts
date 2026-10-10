import { sanitizeAttribution } from "./contract";
import { isActivationAdmin } from "./funnel";
import { isQaIdentity, QA_MARKER, type Identity } from "../operations/summary-model";

export const EVENT_NAMES = ["landing_view", "kakao_login_start", "kakao_login_complete", "charter_submission_start", "market_new_start", "community_new_start", "saved_item_created", "charter_submission_complete", "market_submission_complete", "community_submission_complete", "moderation_approved", "moderation_rejected", "content_published"] as const;
export type EventName = typeof EVENT_NAMES[number];
export type ActorClass = "ANONYMOUS" | "REAL" | "QA" | "ADMIN" | "UNKNOWN";
export type Domain = "GENERAL" | "CHARTER" | "MARKET" | "COMMUNITY";
export const LANDINGS: Record<string, string> = { "/": "HOME", "/fishing-spots": "FISHING_SPOTS", "/fish": "FISH", "/today-sea": "TODAY_SEA", "/charters": "CHARTERS", "/market": "MARKET", "/community": "COMMUNITY", "/license-guide": "LICENSE_GUIDE" };
export const STARTS: Record<string, EventName> = { "/charters/onboarding": "charter_submission_start", "/market/new": "market_new_start", "/community/new": "community_new_start" };
export const ROUTES = [...Object.values(LANDINGS), "LOGIN", "ACCOUNT", "CHARTER_ONBOARDING", "MARKET_NEW", "COMMUNITY_NEW", "MODERATION", "UNKNOWN"] as const;
export function routeKey(path: string) {
  if (Object.hasOwn(LANDINGS, path)) return LANDINGS[path];
  return ({ "/account/login": "LOGIN", "/account": "ACCOUNT", "/charters/onboarding": "CHARTER_ONBOARDING", "/market/new": "MARKET_NEW", "/community/new": "COMMUNITY_NEW" } as Record<string, string>)[path] ?? "UNKNOWN";
}
export function eventDomain(name: EventName, route: string): Domain {
  if (name.startsWith("charter_") || ["CHARTERS", "CHARTER_ONBOARDING"].includes(route)) return "CHARTER";
  if (name.startsWith("market_") || ["MARKET", "MARKET_NEW"].includes(route)) return "MARKET";
  if (name.startsWith("community_") || ["COMMUNITY", "COMMUNITY_NEW"].includes(route)) return "COMMUNITY";
  return "GENERAL";
}
export function actorClass(identity: Identity | null, marker?: string): ActorClass {
  if (marker && QA_MARKER.test(marker)) return "QA";
  if (!identity) return "UNKNOWN";
  if (isQaIdentity(identity)) return "QA";
  return isActivationAdmin(identity) ? "ADMIN" : "REAL";
}
export function isKakaoSession(user: { last_sign_in_at?: string; identities?: { provider?: string; last_sign_in_at?: string }[] }) {
  const at = Date.parse(user.last_sign_in_at ?? "");
  return Number.isFinite(at) && !!user.identities?.some(i => i.provider === "kakao" && Date.parse(i.last_sign_in_at ?? "") === at);
}
export function attribution(query: URLSearchParams, referrer: string) {
  const clean = sanitizeAttribution({ utm_source: query.get("utm_source"), utm_medium: query.get("utm_medium"), utm_campaign: query.get("utm_campaign"), referrer });
  return { ...clean, referrer: !referrer ? "DIRECT" : clean.referrer.toUpperCase() };
}
export type ClientEvent = { name: EventName; route: string; returnRoute?: string; source?: string; medium?: string; campaign?: string; referrer?: string };
const choices: Record<string, readonly string[]> = {
  source: ["UNKNOWN", "google", "naver", "kakao", "instagram", "facebook", "youtube"],
  medium: ["UNKNOWN", "cpc", "organic", "social", "referral", "email"],
  campaign: ["UNKNOWN", "launch-v1", "charter-pilot-v1", "market-pilot-v1", "community-pilot-v1"],
  referrer: ["UNKNOWN", "DIRECT", "GOOGLE", "NAVER", "INSTAGRAM", "YOUTUBE"],
};
export function validateClientEvent(value: unknown): ClientEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const x = value as Record<string, unknown>;
  if (Object.keys(x).some(k => !["name", "route", "returnRoute", ...Object.keys(choices)].includes(k))) return null;
  if (typeof x.name !== "string" || typeof x.route !== "string" || !ROUTES.includes(x.route)) return null;
  const allowed = x.name === "landing_view" ? Object.values(LANDINGS).includes(x.route)
    : x.name === "kakao_login_start" ? x.route === "LOGIN"
      : ({ charter_submission_start: "CHARTER_ONBOARDING", market_new_start: "MARKET_NEW", community_new_start: "COMMUNITY_NEW" } as Record<string, string>)[x.name] === x.route;
  if (!allowed || (x.returnRoute !== undefined && (x.name !== "kakao_login_start" || typeof x.returnRoute !== "string" || !ROUTES.includes(x.returnRoute)))) return null;
  for (const [key, allow] of Object.entries(choices)) if (x[key] !== undefined && (typeof x[key] !== "string" || !allow.includes(x[key]))) return null;
  return x as ClientEvent;
}

export type ObservedEvent = { event_name: EventName; occurred_at: string; user_id: string | null; session_id: string | null; actor_class: ActorClass; subject_class: ActorClass | null; domain: Domain; entity_id?: string | null };
export function windowStart(period: "today" | "7d" | "30d", now = Date.now()) {
  if (period !== "today") return new Date(now - (period === "7d" ? 7 : 30) * 86400000).toISOString();
  const kst = new Date(now + 9 * 3600000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600000).toISOString();
}
const unique = (rows: ObservedEvent[], key: "user_id" | "session_id") => new Set(rows.map(r => r[key]).filter(Boolean)).size;
function cohortRatio(rows: ObservedEvent[], start: EventName[], end: EventName[], key: "user_id" | "session_id") {
  const starters = new Map<string, number>();
  for (const row of rows) if (start.includes(row.event_name) && row[key]) starters.set(row[key]!, Math.min(starters.get(row[key]!) ?? Infinity, Date.parse(row.occurred_at)));
  const converted = new Set(rows.filter(r => end.includes(r.event_name) && r[key] && starters.has(r[key]!) && Date.parse(r.occurred_at) >= starters.get(r[key]!)!).map(r => r[key]));
  return { numerator: converted.size, denominator: starters.size, percent: starters.size ? Math.round(converted.size / starters.size * 1000) / 10 : null };
}
export function aggregateEvents(all: ObservedEvent[], from: string, domain: Domain | "ALL", group: "REAL" | "QA") {
  // Never merge anonymous rows into a user identity. Exclude the whole observed session if it contains QA/admin/unknown authentication.
  const excludedSessions = new Set(all.filter(r => r.actor_class !== group && r.actor_class !== "ANONYMOUS").map(r => r.session_id).filter(Boolean));
  const candidates = all.filter(r => r.occurred_at >= from && (domain === "ALL" || r.domain === domain));
  const rows = candidates.filter(r => r.actor_class === group || (group === "REAL" && r.actor_class === "ANONYMOUS" && r.session_id && !excludedSessions.has(r.session_id)));
  const stages: Record<string, { events: number; sessions: number; users: number }> = {};
  for (const name of EVENT_NAMES) {
    const selected = ["moderation_approved", "moderation_rejected", "content_published"].includes(name)
      ? candidates.filter(r => r.event_name === name && r.subject_class === group)
      : rows.filter(r => r.event_name === name);
    stages[name] = { events: selected.length, sessions: unique(selected, "session_id"), users: unique(selected.filter(r => r.actor_class === group), "user_id") };
  }
  const realRows = rows.filter(r => r.actor_class === group);
  const actions: EventName[] = ["saved_item_created", "charter_submission_complete", "market_submission_complete", "community_submission_complete"];
  const starts: EventName[] = ["charter_submission_start", "market_new_start", "community_new_start"];
  const submissions = actions.filter(n => n !== "saved_item_created");
  const earliestSave = new Map<string, string>();
  for (const r of all) if (r.actor_class === group && r.event_name === "saved_item_created" && r.user_id) earliestSave.set(r.user_id, [earliestSave.get(r.user_id) ?? r.occurred_at, r.occurred_at].sort()[0]);
  return { stages, firstActionUsers: unique(realRows.filter(r => actions.includes(r.event_name)), "user_id"),
    firstObservedSavedUsers: domain === "GENERAL" || domain === "ALL" ? [...earliestSave.values()].filter(t => t >= from).length : 0,
    loginCompletion: cohortRatio(rows, ["kakao_login_start"], ["kakao_login_complete"], "session_id"),
    loginToFirstAction: cohortRatio(realRows, ["kakao_login_complete"], actions, "user_id"),
    submissionCompletion: Object.fromEntries(starts.map((start, i) => [start, cohortRatio(realRows, [start], [submissions[i]], "user_id")])),
  };
}

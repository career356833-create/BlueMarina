import "server-only";

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { canReadModeration, moderationRoles, type ModerationRole } from "./moderation-access";
export { moderationRoles } from "./moderation-access";

export type { ModerationDomain, ModerationRole } from "./moderation-access";
export type ModerationItem = {
  id: string;
  title: string;
  submittedAt: string | null;
  status: string;
  issue: string | null;
  detail: string | null;
  qa: boolean;
};
export type ModerationQueue = { count: number; items: ModerationItem[]; available: boolean };
export type ModerationSnapshot = {
  roles: ModerationRole;
  charter: ModerationQueue;
  market: ModerationQueue;
  community: ModerationQueue;
  reports: ModerationQueue;
};

export class ModerationError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

export async function moderationActor(request: NextRequest): Promise<{ client: SupabaseClient; roles: ModerationRole }> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ModerationError("AUTH_REQUIRED", 401);
  const client = createServiceClient();
  if (!client) throw new ModerationError("BACKEND_UNAVAILABLE", 503);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new ModerationError("AUTH_REQUIRED", 401);
  const roles = moderationRoles(data.user.app_metadata);
  if (!Object.values(roles).some(Boolean)) throw new ModerationError("FORBIDDEN", 403);
  return { client, roles };
}

const empty = (available: boolean): ModerationQueue => ({ count: 0, items: [], available });
const text = (value: unknown) => typeof value === "string" ? value : "";
const qa = (value: string) => /(?:^|\W)QA(?:\W|$)|\[QA\]/i.test(value);

async function charterQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("charter_supply_submissions")
    .select("id,submission_type,status,submitted_at,validation_result,review_notes,normalized_payload", { count: "exact" })
    .eq("status", "REVIEW_REQUIRED").order("submitted_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { count: count ?? 0, available: true, items: (data ?? []).map(row => ({
    id: row.id, title: `${text((row.normalized_payload as { operator?: { name?: unknown } } | null)?.operator?.name) || row.submission_type} · ${row.submission_type}`, submittedAt: row.submitted_at,
    status: row.status, issue: text(row.review_notes) || (Array.isArray((row.validation_result as { errors?: unknown })?.errors) ? "검증 이슈 확인" : null),
    detail: `/charters/admin/submissions/${encodeURIComponent(row.id)}`, qa: qa(text((row.normalized_payload as { operator?: { name?: unknown } } | null)?.operator?.name)),
  })) };
}

async function marketQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("market_listings")
    .select("id,title,status,moderation_status,submitted_at,validation_result", { count: "exact" })
    .eq("status", "SUBMITTED").eq("moderation_status", "REVIEW_REQUIRED")
    .order("submitted_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { count: count ?? 0, available: true, items: (data ?? []).map(row => ({
    id: row.id, title: row.title, submittedAt: row.submitted_at, status: `${row.status}/${row.moderation_status}`,
    issue: Array.isArray((row.validation_result as { warnings?: unknown })?.warnings) && (row.validation_result as { warnings: unknown[] }).warnings.length ? "검증 경고 확인" : null,
    detail: `/market/admin/listings/${encodeURIComponent(row.id)}`, qa: qa(row.title),
  })) };
}

async function communityQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("community_posts")
    .select("id,title,status,moderation_status,created_at", { count: "exact" })
    .eq("status", "SUBMITTED").eq("moderation_status", "REVIEW_REQUIRED")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { count: count ?? 0, available: true, items: (data ?? []).map(row => ({
    id: row.id, title: row.title, submittedAt: row.created_at, status: `${row.status}/${row.moderation_status}`,
    issue: null, detail: `/community/${encodeURIComponent(row.id)}`, qa: qa(row.title),
  })) };
}

async function reportQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("community_reports")
    .select("id,target_type,target_id,reason,status,created_at", { count: "exact" })
    .eq("status", "SUBMITTED").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { count: count ?? 0, available: true, items: (data ?? []).map(row => ({
    id: row.id, title: `${row.target_type} · ${row.reason}`, submittedAt: row.created_at,
    status: row.status, issue: null, detail: row.target_type === "POST" ? `/community/${encodeURIComponent(row.target_id)}` : null, qa: false,
  })) };
}

export async function moderationSnapshot(client: SupabaseClient, roles: ModerationRole): Promise<ModerationSnapshot> {
  const canCharter = canReadModeration(roles, "charter");
  const canMarket = canReadModeration(roles, "market");
  const canCommunity = canReadModeration(roles, "community");
  const [charter, market, community, reports] = await Promise.all([
    canCharter && process.env.CHARTER_SUPPLY_INTAKE_ENABLED === "true" ? charterQueue(client) : empty(false),
    canMarket && process.env.MARKET_BACKEND_ENABLED === "true" ? marketQueue(client) : empty(false),
    canCommunity && process.env.COMMUNITY_BACKEND_ENABLED === "true" ? communityQueue(client) : empty(false),
    canCommunity && process.env.COMMUNITY_BACKEND_ENABLED === "true" ? reportQueue(client) : empty(false),
  ]);
  // Operations can observe workload counts without gaining submission content.
  return {
    roles,
    charter: roles.charter ? charter : { ...charter, items: [] },
    market: roles.market ? market : { ...market, items: [] },
    community: roles.community ? community : { ...community, items: [] },
    reports: roles.community ? reports : { ...reports, items: [] },
  };
}

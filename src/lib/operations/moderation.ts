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
  owner: string | null;
  submittedAt: string | null;
  status: string;
  issue: string | null;
  detail: string | null;
  preview: string | null;
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
const owner = (value: unknown) => {
  const id = text(value);
  return /^[0-9a-f-]{36}$/i.test(id) ? `${id.slice(0, 8)}…${id.slice(-4)}` : null;
};

async function charterQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("charter_supply_submissions")
    .select("id,submitted_by,submission_type,status,submitted_at,validation_result,review_notes,normalized_payload", { count: "exact" })
    .eq("status", "REVIEW_REQUIRED").order("submitted_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { count: count ?? 0, available: true, items: (data ?? []).map(row => ({
    id: row.id, title: `${text((row.normalized_payload as { operator?: { name?: unknown } } | null)?.operator?.name) || row.submission_type} · ${row.submission_type}`, owner: owner(row.submitted_by), submittedAt: row.submitted_at,
    status: row.status, issue: text(row.review_notes) || (Array.isArray((row.validation_result as { errors?: unknown })?.errors) ? "검증 이슈 확인" : null),
    detail: `/charters/admin/submissions/${encodeURIComponent(row.id)}`, preview: null, qa: qa(text((row.normalized_payload as { operator?: { name?: unknown } } | null)?.operator?.name)),
  })) };
}

async function marketQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("market_listings")
    .select("id,seller_id,title,status,moderation_status,submitted_at,validation_result", { count: "exact" })
    .eq("status", "SUBMITTED").eq("moderation_status", "REVIEW_REQUIRED")
    .order("submitted_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { count: count ?? 0, available: true, items: (data ?? []).map(row => ({
    id: row.id, title: row.title, owner: owner(row.seller_id), submittedAt: row.submitted_at, status: `${row.status}/${row.moderation_status}`,
    issue: Array.isArray((row.validation_result as { warnings?: unknown })?.warnings) && (row.validation_result as { warnings: unknown[] }).warnings.length ? "검증 경고 확인" : null,
    detail: `/market/admin/listings/${encodeURIComponent(row.id)}`, preview: null, qa: qa(row.title),
  })) };
}

async function communityQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("community_posts")
    .select("id,author_id,title,body,status,moderation_status,created_at", { count: "exact" })
    .eq("status", "SUBMITTED").eq("moderation_status", "REVIEW_REQUIRED")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { count: count ?? 0, available: true, items: (data ?? []).map(row => ({
    id: row.id, title: row.title, owner: owner(row.author_id), submittedAt: row.created_at, status: `${row.status}/${row.moderation_status}`,
    issue: null, detail: null, preview: row.body, qa: qa(row.title),
  })) };
}

async function reportQueue(client: SupabaseClient): Promise<ModerationQueue> {
  const { data, count, error } = await client.from("community_reports")
    .select("id,reporter_id,target_type,target_id,reason,detail,status,created_at", { count: "exact" })
    .eq("status", "SUBMITTED").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  const reports = data ?? [];
  const postIds = reports.filter(row => row.target_type === "POST").map(row => row.target_id);
  const commentIds = reports.filter(row => row.target_type === "COMMENT").map(row => row.target_id);
  const [posts, comments] = await Promise.all([
    postIds.length ? client.from("community_posts").select("id,title,body").in("id", postIds) : Promise.resolve({ data: [], error: null }),
    commentIds.length ? client.from("community_comments").select("id,body").in("id", commentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (posts.error || comments.error) throw posts.error ?? comments.error;
  const postById = new Map((posts.data ?? []).map(row => [row.id, `${row.title}\n${row.body}`]));
  const commentById = new Map((comments.data ?? []).map(row => [row.id, row.body]));
  return { count: count ?? 0, available: true, items: reports.map(row => {
    const target = row.target_type === "POST" ? postById.get(row.target_id) : commentById.get(row.target_id);
    const preview = `대상 ${row.target_type} ${row.target_id}\n${target ?? "대상 내용을 찾을 수 없습니다."}${row.detail ? `\n신고 설명: ${row.detail}` : ""}`;
    return {
      id: row.id, title: `${row.target_type} · ${row.reason}`, owner: owner(row.reporter_id), submittedAt: row.created_at,
      status: row.status, issue: null, detail: null, preview, qa: qa(preview),
    };
  }) };
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

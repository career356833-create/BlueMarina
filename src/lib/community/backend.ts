import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fishingSpots } from "@/data/fishing-spots";
import { getFishingConditionProfileSpecies } from "@/lib/fishing-condition/profile-registry";
import { createServiceClient } from "@/lib/supabase/server";
import { productionCharterDataset } from "@/lib/charters/registry";
import { productionMarketDataset } from "@/lib/market/registry";
import { COMMUNITY_REACTION_TYPES, COMMUNITY_REPORT_REASONS, type CommunityPost, type CommunityPostDraft } from "./types";
import { prepareCommunityReport, validateCommunityComment, validateCommunityPostDraft } from "./validation";

export class CommunityError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export const communityReply = (body: Record<string, unknown>, status = 200) => NextResponse.json({ ok: true, ...body }, { status, headers: privateHeaders });
export const communityFailure = (error: unknown) => NextResponse.json({ ok: false, code: error instanceof CommunityError ? error.code : "INTERNAL_ERROR" }, { status: error instanceof CommunityError ? error.status : 500, headers: privateHeaders });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hits = new Map<string, { count: number; resetAt: number }>();
export function communityRateLimit(actor: string, action: "post" | "comment" | "reaction" | "report") {
  const key = `${actor}:${action}`, now = Date.now(), previous = hits.get(key);
  if (!previous || previous.resetAt <= now) { hits.set(key, { count: 1, resetAt: now + 600_000 }); return; }
  const max = action === "reaction" ? 60 : action === "comment" ? 20 : action === "report" ? 5 : 10;
  if (previous.count >= max) throw new CommunityError("RATE_LIMITED", 429);
  previous.count++;
}
export function communityBackend() {
  if (process.env.COMMUNITY_BACKEND_ENABLED !== "true") return null;
  return createServiceClient();
}
export async function communityActor(request: NextRequest) {
  const client = communityBackend();
  if (!client) throw new CommunityError("BACKEND_DISABLED", 503);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new CommunityError("AUTH_REQUIRED", 401);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new CommunityError("AUTH_REQUIRED", 401);
  return { client, userId: data.user.id, isAdmin: data.user.app_metadata?.community_role === "community_admin" };
}
export async function communityJson(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 65536) throw new CommunityError("PAYLOAD_TOO_LARGE", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 65536) throw new CommunityError("PAYLOAD_TOO_LARGE", 413);
  try { return JSON.parse(raw) as unknown; } catch { throw new CommunityError("INVALID_JSON", 400); }
}
const catalog = () => ({
  speciesIds: new Set(getFishingConditionProfileSpecies().map(item => item.id)),
  fishingSpotIds: new Set(fishingSpots.map(item => item.id)),
  charterIds: new Set(productionCharterDataset.charters.map(item => item.id)),
  marketListingIds: new Set(productionMarketDataset.listings.map(item => item.id)),
});
export function checkedDraft(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CommunityError("VALIDATION_ERROR", 400);
  const value = raw as Record<string, unknown>;
  if (typeof value.title !== "string" || typeof value.body !== "string" || typeof value.type !== "string" || typeof value.province !== "string" ||
      !Array.isArray(value.images) || !Array.isArray(value.linkedSpeciesIds) || !Array.isArray(value.linkedFishingSpotIds) ||
      !Array.isArray(value.linkedCharterIds) || !Array.isArray(value.linkedMarketListingIds) ||
      [...value.linkedSpeciesIds, ...value.linkedFishingSpotIds, ...value.linkedCharterIds, ...value.linkedMarketListingIds].some(item => typeof item !== "string") ||
      (value.district != null && typeof value.district !== "string")) throw new CommunityError("VALIDATION_ERROR", 400);
  if (value.images.length) throw new CommunityError("IMAGE_UPLOAD_UNAVAILABLE", 409);
  const result = validateCommunityPostDraft(value as CommunityPostDraft, catalog());
  if (!result.valid) throw new CommunityError("VALIDATION_ERROR", 400);
  return result;
}
export function postColumns(draft: CommunityPostDraft) {
  return { type: draft.type, title: draft.title, body: draft.body, province: draft.province,
    district: draft.district ?? null, linked_species_ids: draft.linkedSpeciesIds,
    linked_fishing_spot_ids: draft.linkedFishingSpotIds, linked_charter_ids: draft.linkedCharterIds,
    linked_market_listing_ids: draft.linkedMarketListingIds };
}
type PostRow = Record<string, unknown>;
export function mapPost(row: PostRow): CommunityPost {
  return { id: String(row.id), authorId: String(row.author_id), type: row.type as CommunityPost["type"],
    title: String(row.title), body: String(row.body), region: { province: String(row.province ?? ""), district: row.district as string | null }, images: [],
    linkedSpeciesIds: row.linked_species_ids as string[], linkedFishingSpotIds: row.linked_fishing_spot_ids as string[],
    linkedCharterIds: row.linked_charter_ids as string[], linkedMarketListingIds: row.linked_market_listing_ids as string[],
    catchMetadata: null, tripMetadata: null, status: row.status as CommunityPost["status"],
    moderationStatus: row.moderation_status as CommunityPost["moderationStatus"], createdAt: String(row.created_at),
    updatedAt: String(row.updated_at), sourceType: "USER_SUBMITTED" };
}
export async function publicPosts(strict = false) {
  const client = communityBackend();
  if (!client) { if (strict) throw new Error("PUBLIC_CONTENT_UNAVAILABLE"); return []; }
  const { data, error } = await client.from("community_posts").select("*").eq("status", "ACTIVE").eq("moderation_status", "APPROVED").order("created_at", { ascending: false }).limit(100);
  if (error) { if (strict) throw new Error("PUBLIC_CONTENT_UNAVAILABLE"); return []; }
  return (data ?? []).map(mapPost);
}
export async function publicPost(id: string) {
  if (!uuid.test(id)) return null;
  const client = communityBackend();
  if (!client) return null;
  const { data, error } = await client.from("community_posts").select("*").eq("id", id).eq("status", "ACTIVE").eq("moderation_status", "APPROVED").maybeSingle();
  return error || !data ? null : mapPost(data);
}
export async function visiblePost(client: NonNullable<ReturnType<typeof communityBackend>>, id: string, actor: string) {
  if (!uuid.test(id)) throw new CommunityError("NOT_FOUND", 404);
  const { data, error } = await client.from("community_posts").select("*").eq("id", id).maybeSingle();
  if (error || !data || data.status === "DELETED" || (data.author_id !== actor && (data.status !== "ACTIVE" || data.moderation_status !== "APPROVED"))) throw new CommunityError("NOT_FOUND", 404);
  return data;
}
export async function interactablePost(client: NonNullable<ReturnType<typeof communityBackend>>, id: string, actor: string) {
  const post = await visiblePost(client, id, actor);
  if (post.status !== "ACTIVE" && !(post.status === "SUBMITTED" && post.author_id === actor)) throw new CommunityError("INVALID_STATE", 409);
  return post;
}
export function checkedReaction(raw: unknown) {
  const type = (raw as { type?: unknown } | null)?.type;
  if (!COMMUNITY_REACTION_TYPES.includes(type as never)) throw new CommunityError("VALIDATION_ERROR", 400);
  return type as "LIKE" | "HELPFUL";
}
export function checkedReport(raw: unknown, postId: string) {
  const value = raw as { reason?: unknown; detail?: unknown } | null;
  if (!value || !COMMUNITY_REPORT_REASONS.includes(value.reason as never) || (value.detail != null && typeof value.detail !== "string")) throw new CommunityError("VALIDATION_ERROR", 400);
  const report = prepareCommunityReport("POST", postId, value.reason as string, value.detail as string ?? "");
  if (!report) throw new CommunityError("VALIDATION_ERROR", 400);
  return report;
}
export function checkedComment(raw: unknown) {
  const body = (raw as { body?: unknown } | null)?.body;
  if (typeof body !== "string") throw new CommunityError("VALIDATION_ERROR", 400);
  const result = validateCommunityComment(body);
  if (!result.valid) throw new CommunityError("VALIDATION_ERROR", 400);
  return result.body;
}
export function newCommunityId() { return randomUUID(); }

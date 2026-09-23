import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { AccountProfile, AccountReadModel, MarketActivity, SavedItem } from "./types";
import { validateProfilePatch, validateSavedItem } from "./validation";

export const isAccountBackendEnabled = () => process.env.ACCOUNT_BACKEND_ENABLED === "true";

export class AccountApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function authenticateAccountRequest(request: Request) {
  if (!isAccountBackendEnabled()) throw new AccountApiError(503, "ACCOUNT_BACKEND_DISABLED");
  const client = createServiceClient();
  if (!client) throw new AccountApiError(503, "ACCOUNT_BACKEND_UNAVAILABLE");
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new AccountApiError(401, "AUTH_REQUIRED");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new AccountApiError(401, "SESSION_INVALID");
  return { client, user: data.user };
}

function mapProfile(row: Record<string, unknown>, id: string, email: string | null): AccountProfile {
  return { id, email, displayName: (row.display_name as string | null) ?? (row.full_name as string | null) ?? null, avatarUrl: row.avatar_url as string | null ?? null, region: row.region as string | null ?? null, bio: row.bio as string | null ?? null, updatedAt: row.updated_at as string | null ?? null };
}

export async function readAccount(request: Request): Promise<AccountReadModel> {
  const { client, user } = await authenticateAccountRequest(request);
  const [profileResult, savedResult, marketResult] = await Promise.all([
    client.from("profiles").select("full_name,display_name,avatar_url,region,bio,updated_at").eq("id", user.id).maybeSingle(),
    client.from("user_saved_items").select("id,entity_type,entity_id,label,href,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    client.from("market_listings").select("id,title,status,updated_at").eq("seller_id", user.id).order("updated_at", { ascending: false }).limit(50),
  ]);
  if (profileResult.error || savedResult.error || marketResult.error) throw new AccountApiError(500, "ACCOUNT_READ_FAILED");
  const row = (profileResult.data ?? {}) as Record<string, unknown>;
  return {
    profile: mapProfile(row, user.id, user.email ?? null),
    savedItems: (savedResult.data ?? []).map((item) => ({ id: item.id, entityType: item.entity_type, entityId: item.entity_id, label: item.label, href: item.href, savedAt: item.created_at })) as SavedItem[],
    marketActivity: (marketResult.data ?? []).map((item) => ({ id: item.id, title: item.title, status: item.status, updatedAt: item.updated_at })) as MarketActivity[],
    charterActivity: [],
  };
}

export async function updateAccountProfile(request: Request, input: unknown) {
  const { client, user } = await authenticateAccountRequest(request);
  const value = validateProfilePatch(input);
  const { error } = await client.from("profiles").upsert({ id: user.id, email: user.email ?? null, display_name: value.displayName, avatar_url: value.avatarUrl, region: value.region, bio: value.bio, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new AccountApiError(500, "PROFILE_UPDATE_FAILED");
  return value;
}

export async function saveAccountItem(request: Request, input: unknown) {
  const { client, user } = await authenticateAccountRequest(request);
  const value = validateSavedItem(input);
  const { error } = await client.from("user_saved_items").upsert({ user_id: user.id, entity_type: value.entityType, entity_id: value.entityId, label: value.label, href: value.href }, { onConflict: "user_id,entity_type,entity_id" });
  if (error) throw new AccountApiError(500, "SAVE_FAILED");
  return value;
}

export async function removeAccountItem(request: Request, input: unknown) {
  const { client, user } = await authenticateAccountRequest(request);
  const value = validateSavedItem(input);
  const { error } = await client.from("user_saved_items").delete().eq("user_id", user.id).eq("entity_type", value.entityType).eq("entity_id", value.entityId);
  if (error) throw new AccountApiError(500, "UNSAVE_FAILED");
}

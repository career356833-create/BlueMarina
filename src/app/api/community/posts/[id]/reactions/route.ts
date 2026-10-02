import type { NextRequest } from "next/server";
import { checkedReaction, communityActor, communityBackend, communityFailure, communityJson, communityRateLimit, communityReply, interactablePost, publicPost, visiblePost, CommunityError } from "@/lib/community/backend";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const client = communityBackend();
    if (!client) throw new CommunityError("BACKEND_DISABLED", 503);
    const publicRecord = await publicPost(id);
    let userId: string | null = null;
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (token) {
      const actor = await communityActor(request);
      userId = actor.userId;
    } else if (!publicRecord) throw new CommunityError("NOT_FOUND", 404);
    if (!publicRecord && userId) await visiblePost(client, id, userId);
    const { count, error } = await client.from("community_reactions").select("actor_id", { count: "exact", head: true }).eq("post_id", id);
    if (error) throw error;
    if (!userId) return communityReply({ count: count ?? 0, mine: [] });
    const own = await client.from("community_reactions").select("type").eq("post_id", id).eq("actor_id", userId);
    if (own.error) throw own.error;
    return communityReply({ count: count ?? 0, mine: (own.data ?? []).map(row => row.type) });
  } catch (error) { return communityFailure(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    communityRateLimit(userId, "reaction");
    const { id } = await context.params;
    await interactablePost(client, id, userId);
    const type = checkedReaction(await communityJson(request));
    const { error } = await client.from("community_reactions").upsert({ post_id: id, actor_id: userId, type }, { onConflict: "post_id,actor_id,type" });
    if (error) throw error;
    return communityReply({ active: true, type });
  } catch (error) { return communityFailure(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    const { id } = await context.params;
    await visiblePost(client, id, userId);
    const type = checkedReaction(await communityJson(request));
    const { error } = await client.from("community_reactions").delete().eq("post_id", id).eq("actor_id", userId).eq("type", type);
    if (error) throw error;
    return communityReply({ active: false, type });
  } catch (error) { return communityFailure(error); }
}

import type { NextRequest } from "next/server";
import { checkedComment, communityActor, communityBackend, communityFailure, communityJson, communityRateLimit, communityReply, interactablePost, newCommunityId, publicPost, visiblePost, CommunityError } from "@/lib/community/backend";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    let client = communityBackend();
    if (!client) throw new CommunityError("BACKEND_DISABLED", 503);
    if (!(await publicPost(id))) {
      const actor = await communityActor(request);
      client = actor.client;
      await visiblePost(client, id, actor.userId);
    }
    const { data, error } = await client.from("community_comments").select("id,post_id,author_id,body,status,created_at,updated_at")
      .eq("post_id", id).eq("status", "ACTIVE").order("created_at", { ascending: true }).limit(100);
    if (error) throw error;
    return communityReply({ comments: data ?? [] });
  } catch (error) { return communityFailure(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    communityRateLimit(userId, "comment");
    const { id } = await context.params;
    await interactablePost(client, id, userId);
    const body = checkedComment(await communityJson(request));
    const { data, error } = await client.from("community_comments").insert({ id: newCommunityId(), post_id: id, author_id: userId, body, status: "ACTIVE" }).select("id,post_id,author_id,body,status,created_at,updated_at").single();
    if (error || !data) throw error ?? new Error("insert failed");
    return communityReply({ comment: data }, 201);
  } catch (error) { return communityFailure(error); }
}

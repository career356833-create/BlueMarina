import type { NextRequest } from "next/server";
import { checkedDraft, communityActor, communityFailure, communityJson, communityReply, mapPost, postColumns, publicPost, visiblePost, CommunityError } from "@/lib/community/backend";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const publicRecord = await publicPost(id);
    if (publicRecord) return communityReply({ post: publicRecord });
    const { client, userId } = await communityActor(request);
    return communityReply({ post: mapPost(await visiblePost(client, id, userId)) });
  } catch (error) { return communityFailure(error); }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    const { id } = await context.params;
    const existing = await visiblePost(client, id, userId);
    if (existing.author_id !== userId) throw new CommunityError("FORBIDDEN", 403);
    if (existing.status !== "SUBMITTED" || existing.moderation_status !== "REVIEW_REQUIRED") throw new CommunityError("INVALID_STATE", 409);
    const result = checkedDraft(await communityJson(request));
    const { data, error } = await client.from("community_posts").update({ ...postColumns(result.sanitized), updated_at: new Date().toISOString() })
      .eq("id", id).eq("author_id", userId).eq("status", "SUBMITTED").eq("moderation_status", "REVIEW_REQUIRED").select("*").maybeSingle();
    if (error) throw error;
    if (!data) throw new CommunityError("INVALID_STATE", 409);
    return communityReply({ post: mapPost(data) });
  } catch (error) { return communityFailure(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    const { id } = await context.params;
    const existing = await visiblePost(client, id, userId);
    if (existing.author_id !== userId) throw new CommunityError("FORBIDDEN", 403);
    const { data, error } = await client.from("community_posts").update({ status: "DELETED", updated_at: new Date().toISOString() })
      .eq("id", id).eq("author_id", userId).in("status", ["DRAFT", "SUBMITTED"]).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new CommunityError("INVALID_STATE", 409);
    return communityReply({ deleted: true });
  } catch (error) { return communityFailure(error); }
}

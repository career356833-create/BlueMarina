import type { NextRequest } from "next/server";
import { checkedComment, communityActor, communityFailure, communityJson, communityReply, CommunityError } from "@/lib/community/backend";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    const { id } = await context.params;
    const body = checkedComment(await communityJson(request));
    const { data, error } = await client.from("community_comments").update({ body, updated_at: new Date().toISOString() })
      .eq("id", id).eq("author_id", userId).eq("status", "ACTIVE").select("id,body,updated_at").maybeSingle();
    if (error) throw error;
    if (!data) throw new CommunityError("NOT_FOUND", 404);
    return communityReply({ comment: data });
  } catch (error) { return communityFailure(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    const { id } = await context.params;
    const { data, error } = await client.from("community_comments").update({ status: "DELETED", updated_at: new Date().toISOString() })
      .eq("id", id).eq("author_id", userId).eq("status", "ACTIVE").select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new CommunityError("NOT_FOUND", 404);
    return communityReply({ deleted: true });
  } catch (error) { return communityFailure(error); }
}

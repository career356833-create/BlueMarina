import type { NextRequest } from "next/server";
import { checkedDraft, communityActor, communityFailure, communityJson, communityRateLimit, communityReply, mapPost, newCommunityId, postColumns, publicPosts } from "@/lib/community/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("scope") === "mine") {
      const { client, userId } = await communityActor(request);
      const { data, error } = await client.from("community_posts").select("*").eq("author_id", userId).neq("status", "DELETED").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return communityReply({ posts: (data ?? []).map(mapPost) });
    }
    return communityReply({ posts: await publicPosts() });
  } catch (error) { return communityFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await communityActor(request);
    communityRateLimit(userId, "post");
    const result = checkedDraft(await communityJson(request));
    const { data, error } = await client.from("community_posts").insert({ id: newCommunityId(), author_id: userId,
      ...postColumns(result.sanitized), status: "SUBMITTED", moderation_status: "REVIEW_REQUIRED" }).select("*").single();
    if (error || !data) throw error ?? new Error("insert failed");
    return communityReply({ post: mapPost(data), warnings: result.warnings }, 201);
  } catch (error) { return communityFailure(error); }
}

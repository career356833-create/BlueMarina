import { observeMutation } from "@/lib/acquisition/event-server";
import type { NextRequest } from "next/server";
import { communityActor, communityFailure, communityJson, communityReply, CommunityError, mapPost } from "@/lib/community/backend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client, userId, isAdmin } = await communityActor(request);
    if (!isAdmin) throw new CommunityError("FORBIDDEN", 403);
    const body = await communityJson(request) as { action?: unknown };
    if (!["APPROVE", "REJECT", "HIDE"].includes(String(body?.action))) throw new CommunityError("INVALID_ACTION", 400);
    const { data, error } = await client.rpc("community_review_post", { p_id: (await params).id, p_actor: userId, p_action: body.action });
    if (error?.code === "P0002") throw new CommunityError("NOT_FOUND", 404);
    if (error?.code === "22023") throw new CommunityError("INVALID_STATE", 409);
    if (error?.code === "42501") throw new CommunityError("FORBIDDEN", 403);
    if (error || !data) throw error ?? new Error("review failed");
    const event = { domain: "COMMUNITY" as const, actorId: userId, ownerId: data.author_id, entityId: data.id, marker: data.title, revision: data.updated_at };
    if (body.action === "APPROVE" || body.action === "REJECT") observeMutation(request, { ...event, name: body.action === "APPROVE" ? "moderation_approved" : "moderation_rejected" });
    if (data.status === "ACTIVE" && data.moderation_status === "APPROVED") observeMutation(request, { ...event, name: "content_published" });
    return communityReply({ post: mapPost(data) });
  } catch (error) { return communityFailure(error); }
}

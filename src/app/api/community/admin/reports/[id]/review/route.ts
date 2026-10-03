import type { NextRequest } from "next/server";
import { communityActor, communityFailure, communityJson, communityReply, CommunityError } from "@/lib/community/backend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client, userId, isAdmin } = await communityActor(request);
    if (!isAdmin) throw new CommunityError("FORBIDDEN", 403);
    const body = await communityJson(request) as { action?: unknown };
    if (!["RESOLVE", "DISMISS"].includes(String(body?.action))) throw new CommunityError("INVALID_ACTION", 400);
    const { data, error } = await client.rpc("community_review_report", { p_id: (await params).id, p_actor: userId, p_action: body.action });
    if (error?.code === "P0002") throw new CommunityError("NOT_FOUND", 404);
    if (error?.code === "22023") throw new CommunityError("INVALID_STATE", 409);
    if (error?.code === "42501") throw new CommunityError("FORBIDDEN", 403);
    if (error || !data) throw error ?? new Error("review failed");
    return communityReply({ report: { id: data.id, status: data.status } });
  } catch (error) { return communityFailure(error); }
}

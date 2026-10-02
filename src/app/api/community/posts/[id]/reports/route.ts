import type { NextRequest } from "next/server";
import { checkedReport, communityActor, communityFailure, communityJson, communityRateLimit, communityReply, CommunityError, visiblePost, newCommunityId } from "@/lib/community/backend";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { client, userId } = await communityActor(request);
    communityRateLimit(userId, "report");
    const { id } = await context.params;
    const post = await visiblePost(client, id, userId);
    if (post.author_id === userId) throw new CommunityError("SELF_REPORT_NOT_ALLOWED", 403);
    const report = checkedReport(await communityJson(request), id);
    const { data, error } = await client.from("community_reports").insert({ id: newCommunityId(), target_type: "POST", target_id: id,
      reporter_id: userId, reason: report.reason, detail: report.detail, status: "SUBMITTED" }).select("id,status").single();
    if (error?.code === "23505") throw new CommunityError("ALREADY_REPORTED", 409);
    if (error || !data) throw error ?? new Error("insert failed");
    return communityReply({ report: data }, 201);
  } catch (error) { return communityFailure(error); }
}

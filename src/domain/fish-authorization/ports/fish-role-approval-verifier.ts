import type { FishRoleAction, FishRoleApproval, FishRoleIdentityType } from "../application/types";
import type { FishRoleOrNone } from "../drafts/fish-role";
export interface FishRoleApprovalVerifier {
  verify(input: { approvalReference: string; actorUserId: string; targetUserId: string; action: FishRoleAction; requestedRole: FishRoleOrNone; targetIdentityType?: FishRoleIdentityType; operationId?: string }): Promise<FishRoleApproval>;
}

import type { FishRoleApproval } from "../application/types";
import type { FishRoleApprovalVerifier } from "../ports/fish-role-approval-verifier";
export class FakeFishRoleApprovalVerifier implements FishRoleApprovalVerifier {
  approval: FishRoleApproval = { valid: true, approvalId: "approval-1", approvedBy: "approver-1", expiresAt: "2030-01-01T00:00:00.000Z", scope: "fish_role" };
  async verify() { return this.approval; }
}

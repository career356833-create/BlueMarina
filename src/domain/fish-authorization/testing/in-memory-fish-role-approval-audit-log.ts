import type { FishRoleApprovalAuditLog } from "../ports/fish-role-approval-audit-log"; import type { FishRoleApprovalAuditEvent } from "../approval/types";
export class InMemoryFishRoleApprovalAuditLog implements FishRoleApprovalAuditLog { readonly events: FishRoleApprovalAuditEvent[] = []; async append(event: FishRoleApprovalAuditEvent) { this.events.push(event); } }

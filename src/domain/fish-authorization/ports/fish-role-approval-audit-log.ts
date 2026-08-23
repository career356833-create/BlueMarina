import type { FishRoleApprovalAuditEvent } from "../approval/types";
export interface FishRoleApprovalAuditLog { append(event: FishRoleApprovalAuditEvent): Promise<void>; }

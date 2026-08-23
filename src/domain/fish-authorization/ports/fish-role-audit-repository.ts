import type { FishRoleAuditEvent } from "../application/types";
export interface FishRoleAuditRepository { append(event: FishRoleAuditEvent): Promise<string>; }

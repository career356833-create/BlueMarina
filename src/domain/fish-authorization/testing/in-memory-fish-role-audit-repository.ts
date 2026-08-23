import { randomUUID } from "node:crypto";
import type { FishRoleAuditEvent } from "../application/types";
import type { FishRoleAuditRepository } from "../ports/fish-role-audit-repository";
export class InMemoryFishRoleAuditRepository implements FishRoleAuditRepository {
  readonly events: FishRoleAuditEvent[] = []; fail = false;
  async append(event: FishRoleAuditEvent) { if (this.fail) throw new Error("audit unavailable"); const id = event.eventId || randomUUID(); this.events.push({ ...event, eventId: id }); return id; }
}

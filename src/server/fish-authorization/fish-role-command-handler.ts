import type { FishRoleActorContext, GrantFishRoleInput, RevokeFishRoleInput } from "@/domain/fish-authorization/application";
import type { FishRoleManagementService } from "@/domain/fish-authorization/application";
export type FishRoleCommand = { command: "grant"; input: GrantFishRoleInput } | { command: "revoke"; input: RevokeFishRoleInput } | { command: "inspect"; targetUserId: string };
export class FishRoleCommandHandler {
  constructor(private readonly service: FishRoleManagementService) {}
  async handle(command: FishRoleCommand, actor: FishRoleActorContext) {
    if (command.command === "grant") return this.service.grant(command.input, actor);
    if (command.command === "revoke") return this.service.revoke(command.input, actor);
    return { targetUserId: command.targetUserId, inspectAvailable: false } as const;
  }
}

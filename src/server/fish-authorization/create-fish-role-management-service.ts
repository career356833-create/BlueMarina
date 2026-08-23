import { FishRoleManagementService, type FishRoleManagementDependencies } from "@/domain/fish-authorization/application";
import type { FishRoleServerConfig } from "./fish-role-server-config";
export function createFishRoleManagementService(config: FishRoleServerConfig, dependencies: Omit<FishRoleManagementDependencies, "enabled">) { return new FishRoleManagementService({ ...dependencies, enabled: config.enabled }); }

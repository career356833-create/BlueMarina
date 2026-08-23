import type { FishRoleManagementDependencies } from "@/domain/fish-authorization/application";
import type { FishAuthAdminTransport, FishRoleDatabaseClient } from "@/infrastructure/fish-authorization/supabase";
import { SupabaseFishRoleAdminProvider, SupabaseFishRoleAuditRepository, SupabaseFishRoleDirectory, SupabaseFishRoleIdempotencyRepository, SupabaseFishRoleRevocationQueue, SupabaseFishRoleSessionRevoker } from "@/infrastructure/fish-authorization/supabase";
import type { FishRoleServerConfig } from "./fish-role-server-config";
export function createLiveFishRoleManagementDependencies(config: FishRoleServerConfig, transports: { authTransport?: FishAuthAdminTransport; databaseClient?: FishRoleDatabaseClient; approvalVerifier?: FishRoleManagementDependencies["approvalVerifier"]; clock?: FishRoleManagementDependencies["clock"] }): Omit<FishRoleManagementDependencies, "enabled"> {
  if (!config.enabled || !transports.authTransport || !transports.databaseClient || !transports.approvalVerifier || !transports.clock) throw new Error("FISH_ROLE_ADAPTER_CONFIGURATION_ERROR");
  const directory = new SupabaseFishRoleDirectory(transports.databaseClient, transports.authTransport); const queue = new SupabaseFishRoleRevocationQueue(transports.databaseClient);
  return { adminProvider: new SupabaseFishRoleAdminProvider(transports.authTransport), directory, auditRepository: new SupabaseFishRoleAuditRepository(transports.databaseClient), idempotencyRepository: new SupabaseFishRoleIdempotencyRepository(transports.databaseClient), sessionRevoker: new SupabaseFishRoleSessionRevoker(transports.authTransport, queue), approvalVerifier: transports.approvalVerifier, clock: transports.clock };
}
